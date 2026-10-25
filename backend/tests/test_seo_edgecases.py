"""Isolated public-route QA: no Mongo connection, network or real user data."""
import asyncio
import copy
import importlib.util
import json
import sys
from html.parser import HTMLParser
from pathlib import Path
import xml.etree.ElementTree as ET

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

MODULE_PATH = Path(__file__).resolve().parents[1] / "public_seo.py"
sys.path.insert(0, str(MODULE_PATH.parent))
spec = importlib.util.spec_from_file_location("public_seo_edgecase_review", MODULE_PATH)
seo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(seo)


class ParsedPage(HTMLParser):
    """Compare semantic head values, independent of Helmet ownership attributes."""
    def __init__(self, document):
        super().__init__(convert_charrefs=True)
        self.titles, self.headings, self.canonicals, self.meta = [], [], [], {}
        self._text_tag, self._text = None, []
        self.feed(document)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in {"title", "h1"}:
            self._text_tag, self._text = tag, []
        if tag == "meta" and attrs.get("name"):
            self.meta.setdefault(attrs["name"], []).append(attrs.get("content"))
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonicals.append(attrs.get("href"))

    def handle_endtag(self, tag):
        if tag == self._text_tag:
            (self.titles if tag == "title" else self.headings).append("".join(self._text))
            self._text_tag, self._text = None, []

    def handle_data(self, text):
        if self._text_tag:
            self._text.append(text)


def match(row, query):
    for key, value in query.items():
        if key == "$or":
            if not any(match(row, part) for part in value): return False
        elif isinstance(value, dict) and "$ne" in value:
            if row.get(key) == value["$ne"]: return False
        elif row.get(key) != value:
            return False
    return True


class Cursor:
    def __init__(self, rows): self.rows = copy.deepcopy(rows)
    def sort(self, *args): return self
    async def to_list(self, count): return self.rows[:count]


class Collection:
    def __init__(self, rows=()): self.rows = list(rows)
    def find(self, query, projection=None): return Cursor([row for row in self.rows if match(row, query)])
    async def find_one(self, query, projection=None):
        return copy.deepcopy(next((row for row in self.rows if match(row, query)), None))


@pytest.fixture
def env(tmp_path):
    settings = {"seo": {"site_name": "Rajeev Freelancer", "canonical_domain": "https://www.rajeevfreelancer.com", "robots_index": True}, "contact": {"phone": "+919711623561", "email": "hello@rajeevfreelancer.com"}, "business": {"founder_name": "Rajeev Gits"}}
    async def get_settings(): return settings
    build = tmp_path / "build"; build.mkdir()
    (build / "index.html").write_text('<html><head><title>Home</title></head><body><div id="root"></div></body></html>')
    (build / "contact").mkdir()
    (build / "contact/index.html").write_text('<html><h1>Contact</h1></html>')
    (build / "static").mkdir()
    (build / "static/test.css").write_text('body{color:black}')
    (build / "seo-manifest.json").write_text(json.dumps({"pages": [{"path": "/", "index": True}, {"path": "/contact", "index": True}, {"path": "/admin", "index": False}, {"path": "/website-designer/old-market", "index": True}, {"path": "/website-designer/new-market", "index": True}]}))
    db = type("FakeDB", (), {})()
    db.blog_posts = Collection()
    db.case_studies = Collection()
    db.location_pages = Collection()
    services = [{"slug": "website-designer", "name": "Website Designer"}]
    cities = {"old-market": {"city": "Original City", "loc_slug": "old-market"}, "new-market": {"city": "New City", "loc_slug": "new-market", "is_new_location": True}}
    def fallback(service, city):
        return {"title": f"Original title — {city['city']}", "h1": f"Website Designer in {city['city']}", "meta_description": "Original description; preserve this copy.", "intro": ["This is source service copy."], "service_details": "Website scope.", "process": [], "why_choose": [], "faqs": []}
    app = FastAPI()
    app.include_router(seo.build_public_router(db=db, get_settings=get_settings, services=services, city_map=cities, fallback_content=fallback, build_dir=build))
    return {"client": TestClient(app), "db": db, "settings": settings, "build": build, "services": services, "cities": cities, "fallback": fallback, "get_settings": get_settings}


def blog(slug, published=True, **kwargs):
    result = {"slug": slug, "title": "Source title", "excerpt": "Source description.", "body_md": "## Source heading\n\nSource body text.", "published": published}
    result.update(kwargs)
    return result


def test_sitemap_only_current_published_and_reviewed_new_markets(env):
    db, client = env["db"], env["client"]
    db.blog_posts.rows = [blog("published"), blog("draft", published=False), blog("hidden", seo={"robots": "noindex,follow"})]
    service, city = env["services"][0], env["cities"]["new-market"]
    db.location_pages.rows = [{"canonical": "/website-designer/new-market", "key": "website-designer::new-market", "service": service, "location": city, "content": env["fallback"](service, city), "seo_reviewed": False, "is_new_location": True}]
    response = client.get("/sitemap.xml")
    assert response.status_code == 200
    root = ET.fromstring(response.text)
    urls = [node.text for node in root.findall("{*}url/{*}loc")]
    assert "https://rajeevfreelancer.com/blog" in urls
    assert "https://rajeevfreelancer.com/case-studies" in urls
    assert "https://rajeevfreelancer.com/website-designer/old-market" in urls
    assert "https://rajeevfreelancer.com/blog/published" in urls
    assert not any("www." in url or "draft" in url or "hidden" in url or "new-market" in url or "/admin" in url for url in urls)
    assert len(urls) == len(set(urls))
    db.location_pages.rows[0]["seo_reviewed"] = True
    assert "/website-designer/new-market" in client.get("/sitemap.xml").text


def test_article_meta_preserves_source_and_draft_is_real_404(env):
    env["db"].blog_posts.rows = [blog("published", seo={"title": "Source SEO title", "description": "Source SEO description"}), blog("draft", published=False)]
    response = env["client"].get("/blog/published")
    page = ParsedPage(response.text)
    assert page.titles == ["Source SEO title | Rajeev Freelancer"]
    assert page.meta.get("description") == ["Source SEO description"]
    assert page.headings == ["Source title"]
    assert page.canonicals == ["https://rajeevfreelancer.com/blog/published"]
    assert len(page.meta.get("robots", [])) == 1
    assert page.meta["robots"][0].startswith("index, follow,")
    assert "Source body text." in response.text
    missing = env["client"].get("/blog/draft")
    assert missing.status_code == 404
    assert "noindex" in missing.headers.get("x-robots-tag", "")
    assert ParsedPage(missing.text).meta.get("robots") == ["noindex, follow"]
    assert ParsedPage(missing.text).canonicals == []
    assert "Source body text." not in missing.text


def test_explicit_new_document_stays_noindex_until_reviewed(env):
    service, city = env["services"][0], env["cities"]["new-market"]
    env["db"].location_pages.rows = [{"key": "website-designer::new-market", "service": service, "location": city, "content": env["fallback"](service, city), "is_new_location": True, "seo_reviewed": False}]
    response = env["client"].get("/website-designer/new-market")
    assert response.status_code == 200
    assert response.headers.get("x-robots-tag") == "noindex, follow"
    page = ParsedPage(response.text)
    assert page.meta.get("robots") == ["noindex, follow"]
    assert page.canonicals == []
    assert page.titles == ["Original title — New City"]
    assert page.meta.get("description") == ["Original description; preserve this copy."]


def test_original_landing_preserves_source_meta_and_is_indexable(env):
    response = env["client"].get("/website-designer/old-market")
    assert response.status_code == 200
    page = ParsedPage(response.text)
    assert page.titles == ["Original title — Original City"]
    assert page.headings == ["Website Designer in Original City"]
    assert page.meta.get("description") == ["Original description; preserve this copy."]
    assert len(page.meta.get("robots", [])) == 1
    assert page.meta["robots"][0].startswith("index, follow,")
    assert page.canonicals == ["https://rajeevfreelancer.com/website-designer/old-market"]


def test_unknown_paths_are_404_and_case_slash_variants_redirect_once(env):
    response = env["client"].get("/Contact/?ref=mail", follow_redirects=False)
    assert response.status_code == 308
    assert response.headers["location"] == "/contact?ref=mail"
    assert env["client"].get("/unknown-path").status_code == 404
    assert env["client"].get("/api/nonexistent").status_code == 404
    assert env["client"].head("/contact").status_code == 200


def test_sanitization_handles_script_and_invalid_url_without_exception(env):
    env["db"].blog_posts.rows = [blog("malformed-link", body_md='<script>alert(1)</script>\n\n[bad](javascript:alert(2))\n\n[broken](https://[)')]
    response = env["client"].get("/blog/malformed-link")
    assert response.status_code == 200
    assert '<script>alert(1)</script>' not in response.text
    assert 'href="javascript:' not in response.text


def test_settings_url_invalid_port_is_graceful():
    assert seo.canonical_origin({"seo": {"canonical_domain": "https://demo.example:invalid"}}) == "https://rajeevfreelancer.com"
    assert seo.canonical_origin({"seo": {"canonical_domain": "https://["}}) == "https://rajeevfreelancer.com"


def test_static_assets_do_not_require_database(env):
    async def unavailable(): raise RuntimeError("database unavailable")
    app = FastAPI()
    app.include_router(seo.build_public_router(db=env["db"], get_settings=unavailable, services=env["services"], city_map=env["cities"], fallback_content=env["fallback"], build_dir=env["build"]))
    client = TestClient(app)
    assert client.get("/static/test.css").status_code == 200


def test_missing_build_is_503_instead_of_indexable_shell(env, tmp_path):
    app = FastAPI()
    absent = tmp_path / "absent"
    app.include_router(seo.build_public_router(db=env["db"], get_settings=env["get_settings"], services=env["services"], city_map=env["cities"], fallback_content=env["fallback"], build_dir=absent))
    response = TestClient(app).get("/")
    assert response.status_code == 503
    assert response.headers["retry-after"] == "300"
    assert "noindex" in response.headers["x-robots-tag"]


def test_complete_legacy_database_pages_outside_catalog_remain_live_and_indexable(env):
    service = {"slug": "legacy-service", "name": "Legacy Service"}
    city = {"city": "Legacy Live Market", "loc_slug": "legacy-market"}
    env["db"].location_pages.rows = [{"key": "legacy-service::legacy-market", "canonical": "/legacy-service/legacy-market", "service": service, "location": city, "content": env["fallback"](service, city)}]
    response = env["client"].get("/legacy-service/legacy-market")
    assert response.status_code == 200
    page = ParsedPage(response.text)
    assert page.titles == ["Original title — Legacy Live Market"]
    assert page.meta.get("description") == ["Original description; preserve this copy."]
    assert len(page.meta.get("robots", [])) == 1
    assert page.meta["robots"][0].startswith("index, follow,")
    assert page.canonicals == ["https://rajeevfreelancer.com/legacy-service/legacy-market"]
    assert "https://rajeevfreelancer.com/legacy-service/legacy-market" in env["client"].get("/sitemap.xml").text


def test_existing_catalog_new_city_database_page_without_new_marker_preserves_legacy_indexing(env):
    service, city = env["services"][0], env["cities"]["new-market"]
    env["db"].location_pages.rows = [{"key": "website-designer::new-market", "canonical": "/website-designer/new-market", "service": service, "location": city, "content": env["fallback"](service, city)}]
    response = env["client"].get("/website-designer/new-market")
    assert response.status_code == 200
    page = ParsedPage(response.text)
    assert page.titles == ["Original title — New City"]
    assert page.meta.get("description") == ["Original description; preserve this copy."]
    assert len(page.meta.get("robots", [])) == 1
    assert page.meta["robots"][0].startswith("index, follow,")
    assert page.canonicals == ["https://rajeevfreelancer.com/website-designer/new-market"]
    assert "https://rajeevfreelancer.com/website-designer/new-market" in env["client"].get("/sitemap.xml").text


@pytest.mark.parametrize("slug,city,catalog_location", [
    ("chandni-chowk-delhi", "Chandni Chowk", False),
    ("kabul-afghanistan", "Kabul", True),
    ("qa-outside-catalog-market", "Existing Outside Catalog Market", False),
], ids=["existing-legacy-alias", "existing-document-in-new-catalog", "existing-unknown-catalog-document"])
def test_existing_database_source_never_canonicalizes_to_unreviewed_or_missing_counterpart(env, slug, city, catalog_location):
    """A working source record cannot nominate a gated or unavailable prefix alias."""
    service = {"slug": "freelance-ai-consultant", "name": "Source AI Consultant"}
    location = {"city": city, "loc_slug": slug}
    cities = dict(env["cities"])
    if catalog_location:
        cities[slug] = {**location, "is_new_location": True}
    source_path = f"/{service['slug']}/{slug}"
    # This valid pre-existing database record intentionally has no new/review flags.
    env["db"].location_pages.rows = [{
        "key": f"{service['slug']}::{slug}", "canonical": source_path,
        "service": service, "location": location,
        "content": env["fallback"](service, location),
    }]
    app = FastAPI()
    app.include_router(seo.build_public_router(
        db=env["db"], get_settings=env["get_settings"],
        services=[*env["services"], service], city_map=cities,
        fallback_content=env["fallback"], build_dir=env["build"],
    ))
    client = TestClient(app)
    response = client.get(source_path)
    assert response.status_code == 200
    page = ParsedPage(response.text)
    assert page.titles == [f"Original title — {city}"]
    assert page.meta.get("description") == ["Original description; preserve this copy."]
    assert len(page.meta.get("robots", [])) == 1
    assert page.meta["robots"][0].startswith("index, follow,")
    assert page.canonicals == ["https://rajeevfreelancer.com" + source_path]
    sitemap = ET.fromstring(client.get("/sitemap.xml").text)
    urls = [node.text for node in sitemap.findall("{*}url/{*}loc")]
    assert "https://rajeevfreelancer.com" + source_path in urls
    assert "https://rajeevfreelancer.com" + source_path.replace("/freelance-", "/freelancer-", 1) not in urls
    assert len(urls) == len(set(urls))
