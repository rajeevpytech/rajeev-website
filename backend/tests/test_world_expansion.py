"""The expansion is additive, paged and read-only until a named admin reviews it."""
import copy
import json
from types import SimpleNamespace
import xml.etree.ElementTree as ET

import pytest
from fastapi import FastAPI, Header, HTTPException
from fastapi.testclient import TestClient

from data import CITY_MAP, SERVICES
from live_service_catalog import with_live_services, canonical_service_path
from public_seo import build_public_router
from test_seo_edgecases import ParsedPage
from world_expansion import (SERVICE_MAP, build_router, catalog, expansion_location,
                             expansion_page_document, REVIEW_CHECKS)


def matches(row, query):
    for key, value in query.items():
        if key == "$or":
            if not any(matches(row, branch) for branch in value): return False
        elif isinstance(value, dict):
            if "$in" in value and row.get(key) not in value["$in"]: return False
            if "$ne" in value and row.get(key) == value["$ne"]: return False
        elif row.get(key) != value:
            return False
    return True


class Cursor:
    def __init__(self, rows): self.rows = copy.deepcopy(rows)
    def sort(self, *args): return self
    async def to_list(self, length): return self.rows[:length]


class Collection:
    def __init__(self): self.rows, self.writes = [], 0
    def find(self, query, projection=None): return Cursor([row for row in self.rows if matches(row, query)])
    async def find_one(self, query, projection=None):
        return copy.deepcopy(next((row for row in self.rows if matches(row, query)), None))
    async def update_one(self, query, update, upsert=False):
        row = next((row for row in self.rows if matches(row, query)), None)
        if row is not None:
            if "$set" in update:
                row.update(copy.deepcopy(update["$set"])); self.writes += 1
            return SimpleNamespace(matched_count=1, upserted_id=None)
        if upsert:
            row = copy.deepcopy(update.get("$setOnInsert", {})); row.update(update.get("$set", {}))
            self.rows.append(row); self.writes += 1
            return SimpleNamespace(matched_count=0, upserted_id="fixture-new-id")
        return SimpleNamespace(matched_count=0, upserted_id=None)


@pytest.fixture
def expansion_env(tmp_path):
    db = SimpleNamespace(location_pages=Collection(), blog_posts=Collection(), case_studies=Collection())
    settings = {"seo": {"site_name": "Rajeev Freelancer", "robots_index": True}, "business": {}, "contact": {"email": "hello@rajeevfreelancer.com", "phone": "+919711623561"}}
    async def get_settings(): return settings
    async def admin(authorization: str = Header("")):
        if authorization != "Bearer fixture-admin": raise HTTPException(401, "Authentication required")
        return {"email": "private-reviewer@example.test"}
    build = tmp_path / "build"; build.mkdir()
    (build / "index.html").write_text('<html><head></head><body><h1>Frozen home</h1></body></html>')
    (build / "seo-manifest.json").write_text(json.dumps({"pages": [{"path": "/", "index": True}]}))
    app = FastAPI()
    app.include_router(build_router(db, admin), prefix="/api")
    app.include_router(build_public_router(db=db, get_settings=get_settings, services=list(with_live_services(SERVICES).values()), city_map=CITY_MAP, fallback_content=lambda service, loc: {"title": "Unchanged original fallback", "h1": "Original", "meta_description": "Original description"}, build_dir=build))
    loc = next(iter(catalog()["additional"].values()))
    service = next(iter(SERVICE_MAP.values()))
    return SimpleNamespace(client=TestClient(app), db=db, settings=settings, loc=loc, service=service, admin={"Authorization": "Bearer fixture-admin"})


def test_catalog_is_additive_real_and_not_in_frontend_bundle():
    before = copy.deepcopy(CITY_MAP)
    data = catalog()
    assert len(data["additional"]) == 4530
    assert len(data["by_slug"]) == 5001
    assert data["stats"]["candidate_url_count"] == 40008
    assert not (set(data["additional"]) & set(CITY_MAP))
    assert CITY_MAP == before
    assert len({row["geoname_id"] for row in data["additional"].values()}) == 4530
    assert all(row["source_url"].startswith("https://www.geonames.org/") and row["seo_reviewed"] is False and row["is_new_location"] for row in data["additional"].values())
    assert all(canonical_service_path(f"/{service}/{slug}") == f"/{service}/{slug}" for slug in list(data["additional"])[:100] for service in SERVICE_MAP)


def test_directory_api_is_bounded_stable_searchable_and_read_only(expansion_env):
    env = expansion_env
    first = env.client.get('/api/service-areas?page_size=100').json()
    assert len(first['items']) == 100
    assert first['pagination']['total'] == 5001
    second = env.client.get('/api/service-areas?page_size=100&page=2').json()
    assert not ({row['loc_slug'] for row in first['items']} & {row['loc_slug'] for row in second['items']})
    search = env.client.get('/api/service-areas', params={'q': env.loc['city'], 'country': env.loc['country_slug']}).json()
    assert any(row['loc_slug'] == env.loc['loc_slug'] for row in search['items'])
    for params, status in [({'page_size': 101},422), ({'limit':101},422), ({'page':0},422), ({'page':999999},404), ({'country':'not-a-country'},404), ({'service':'not-a-service'},404)]:
        assert env.client.get('/api/service-areas', params=params).status_code == status
    assert env.client.get('/api/service-areas?q=zz-no-location-match-zz').json()['items'] == []
    assert env.db.location_pages.writes == 0
    assert env.client.head('/api/service-areas').status_code == 200


def test_directory_html_filter_policy_and_old_home_are_unchanged(expansion_env):
    client = expansion_env.client
    home = client.get('/').text
    response = client.get('/service-areas')
    parsed = ParsedPage(response.text)
    assert response.status_code == 200 and len(parsed.headings) == 1
    assert parsed.canonicals == ['https://rajeevfreelancer.com/service-areas']
    assert parsed.meta['robots'][0].startswith('index, follow')
    assert 'Remote project delivery from India' in response.text
    assert 'Find service areas' in response.text and 'window.__RF_BOOTSTRAP__=' in response.text
    filtered = client.get('/service-areas?page=2')
    parsed_filter = ParsedPage(filtered.text)
    assert parsed_filter.meta['robots'] == ['noindex, follow']
    assert parsed_filter.canonicals == ['https://rajeevfreelancer.com/service-areas']
    assert filtered.headers['x-robots-tag'] == 'noindex, follow'
    assert client.get('/service-areas?page=no').status_code == 422
    assert client.get('/service-areas?page=999999').status_code == 404
    assert client.get('/').text == home == '<html><head></head><body><h1>Frozen home</h1></body></html>'


def test_new_page_is_full_remote_html_noindex_no_write_and_no_xml(expansion_env):
    env = expansion_env
    path = f"/{env.service['slug']}/{env.loc['loc_slug']}"
    response = env.client.get(path)
    assert response.status_code == 200
    parsed = ParsedPage(response.text)
    assert len(parsed.headings) == 1
    assert parsed.meta['robots'] == ['noindex, follow'] and not parsed.canonicals
    assert response.headers['x-robots-tag'] == 'noindex, follow'
    assert env.loc['city'] in response.text and env.loc['country'] in response.text
    assert env.loc['source_url'] in response.text
    assert 'delivered remotely from India' in response.text
    assert 'Project process' in response.text and 'Frequently asked questions' in response.text
    assert path not in env.client.get('/sitemap.xml').text
    assert env.db.location_pages.writes == 0
    assert env.client.get(path + '/extra').status_code == 404
    assert env.client.get('/freelance-ai-consultant/' + env.loc['loc_slug']).status_code == 404


def test_original_mongo_record_always_wins_expansion_and_cross_alias_review(expansion_env):
    env = expansion_env
    source = SERVICES[0]
    path = f"/{source['slug']}/{env.loc['loc_slug']}"
    original = {'key': f"{source['slug']}::{env.loc['loc_slug']}", 'canonical': path, 'service': source, 'location': env.loc,
                'content': {'title': 'Exact stored legacy title', 'h1': 'Stored legacy heading', 'meta_description': 'Exact stored legacy description', 'intro': ['Original authored content.']}}
    env.db.location_pages.rows.append(copy.deepcopy(original))
    parsed = ParsedPage(env.client.get(path).text)
    assert parsed.titles == ['Exact stored legacy title']
    assert parsed.meta['description'] == ['Exact stored legacy description']
    assert parsed.meta['robots'][0].startswith('index, follow')
    assert parsed.canonicals == ['https://rajeevfreelancer.com' + path]
    assert path in env.client.get('/sitemap.xml').text
    endpoint = f"/api/admin/service-areas/page/{env.service['slug']}/{env.loc['loc_slug']}"
    assert env.client.get(endpoint, headers=env.admin).json()['pre_existing_record'] is True
    assert env.client.put(endpoint, headers=env.admin, json={'reviewed':False, 'content':original['content']}).status_code == 409
    assert env.db.location_pages.rows == [original] and env.db.location_pages.writes == 0


def test_new_curated_approval_is_explicit_revisioned_private_and_sitemap_eligible(expansion_env):
    env = expansion_env
    endpoint = f"/api/admin/service-areas/page/{env.service['slug']}/{env.loc['loc_slug']}"
    assert env.client.get(endpoint).status_code == 401
    preview = env.client.get(endpoint, headers=env.admin).json()
    assert not preview['pre_existing_record'] and env.db.location_pages.writes == 0
    payload = {'reviewed': True, 'content': preview['page']['content']}
    assert env.client.put(endpoint, headers=env.admin, json=payload).status_code == 422
    payload.update({'checks': {name: True for name in REVIEW_CHECKS}, 'evidence_notes': 'Private human-reviewed geographic and remote-delivery evidence.'})
    assert env.client.put(endpoint, headers=env.admin, json=payload).status_code == 200
    path = preview['page']['canonical']
    response = env.client.get(path)
    parsed = ParsedPage(response.text)
    assert parsed.meta['robots'][0].startswith('index, follow')
    assert parsed.canonicals == ['https://rajeevfreelancer.com' + path]
    assert path in env.client.get('/sitemap.xml').text
    assert payload['evidence_notes'] not in response.text
    assert 'private-reviewer@example.test' not in response.text
    status = env.client.get('/api/admin/service-areas/status', headers=env.admin).json()
    assert status['approved_url_count'] == 1 and status['startup_seeding'] is False
    payload['expected_revision'] = 0
    assert env.client.put(endpoint, headers=env.admin, json=payload).status_code == 409
    payload['expected_revision'] = 1
    payload['reviewed'] = False
    assert env.client.put(endpoint, headers=env.admin, json=payload).status_code == 200
    assert path not in env.client.get('/sitemap.xml').text


def test_world_locality_copy_never_inherits_delhi_and_has_service_specific_scope():
    loc = next(row for row in catalog()['additional'].values() if row['location_type'] == 'locality' and row['country'] != 'India')
    service = SERVICE_MAP['freelancer-seo-expert']
    doc = expansion_page_document(service, loc)
    assert 'Delhi' not in doc['content']['title']
    assert 'Search Console' in doc['content']['service_details']
    assert loc['timezone'] in json.dumps(doc['content'])
    assert expansion_location(loc['loc_slug'], 'freelance-seo-expert') is None
    assert canonical_service_path(doc['canonical']) == doc['canonical']


def test_sharded_sitemap_routes_are_xml_head_safe_and_review_gated(expansion_env, monkeypatch):
    import sitemap_shards
    monkeypatch.setattr(sitemap_shards, 'MAX_URLS', 1000)
    client = expansion_env.client
    root = ET.fromstring(client.get('/sitemap.xml').text)
    assert root.tag.endswith('sitemapindex')
    paths = [node.text.removeprefix('https://rajeevfreelancer.com') for node in root.findall('{*}sitemap/{*}loc')]
    assert paths and all(path.startswith('/sitemaps/public-') for path in paths)
    urls = set()
    for path in paths:
        response = client.get(path)
        assert response.status_code == 200 and response.headers['content-type'].startswith('application/xml')
        shard = ET.fromstring(response.text)
        shard_urls = [node.text for node in shard.findall('{*}url/{*}loc')]
        assert len(shard_urls) <= 1000
        urls.update(shard_urls)
        head = client.head(path)
        assert head.status_code == 200 and not head.content
    assert 'https://rajeevfreelancer.com/service-areas' in urls
    assert not any(expansion_env.loc['loc_slug'] in url for url in urls)
    content_root = ET.fromstring(client.get('/api/sitemaps/content.xml').text)
    assert all('/sitemaps/content-' in node.text for node in content_root.findall('{*}sitemap/{*}loc'))
    assert client.get('/sitemaps/public-9999.xml').status_code == 404
    expansion_env.settings['seo']['robots_index'] = False
    assert client.get(paths[0]).status_code == 404
