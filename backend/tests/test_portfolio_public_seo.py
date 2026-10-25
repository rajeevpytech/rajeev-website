"""Published CMS Work is live in HTML and crawl files without a rebuild."""
import copy
import json
import sys
from pathlib import Path
import xml.etree.ElementTree as ET

import pytest
from bs4 import BeautifulSoup
from fastapi import FastAPI
from fastapi.testclient import TestClient

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
import portfolio
import public_seo


class Cursor:
    def __init__(self, rows): self.rows = copy.deepcopy(rows)
    async def to_list(self, count): return self.rows[:count]
    def sort(self, *args): return self


class Collection:
    def __init__(self, rows=()): self.rows = list(rows)
    def find(self, query, projection=None):
        return Cursor([row for row in self.rows if all(row.get(key) == value for key, value in query.items())])
    async def find_one(self, query, projection=None):
        return next((copy.deepcopy(row) for row in self.rows if all(row.get(key) == value for key, value in query.items())), None)


class Database:
    def __init__(self):
        self.blog_posts = Collection()
        self.case_studies = Collection()
        self.location_pages = Collection()
        self.portfolio_projects = Collection()
    def __getitem__(self, name): return getattr(self, name)


def project(slug="hotel-project", **changes):
    row = {"id": slug, "slug": slug, "title": "Hotel website", "client_name": "Hotel", "summary": "We redesigned the hotel website.", "industry": "hospitality", "services": ["website-redesign", "seo"], "website_url": "https://hotel.example/", "image_url": "/assets/work/hotel.webp", "image_alt": "Hotel homepage", "gallery": [{"url": "/api/uploads/hotel.webp", "alt": "Room page", "caption": "Accommodation page"}], "story": {"overview": "We built a visitor journey around rooms and enquiries.", "scope": ["Website redesign", "Search-ready page structure"], "process": ["Reviewed visitor journeys"], "delivery": ["Published the redesigned website"], "handover": ["Provided editing access"]}, "published": True, "updated_at": "2026-10-25T12:00:00Z"}
    row.update(changes)
    return row


@pytest.fixture
def env(tmp_path, monkeypatch):
    catalog = tmp_path / "catalog.json"
    catalog.write_text(json.dumps({"projects": [project("catalog-project")]}))
    monkeypatch.setattr(portfolio, "CATALOG_PATH", catalog)
    build = tmp_path / "build"
    build.mkdir()
    (build / "index.html").write_text('<html><head><title>Home</title></head><body><div id="root"></div></body></html>')
    for slug in ("catalog-project", "archived-project", "draft-project"):
        page = build / "work" / slug
        page.mkdir(parents=True)
        (page / "index.html").write_text('<html><h1>Stale published project</h1></html>')
    (build / "seo-manifest.json").write_text(json.dumps({"pages": [{"path": "/", "index": True}, {"path": "/work/catalog-project", "index": True}, {"path": "/work/archived-project", "index": True}, {"path": "/work/draft-project", "index": True}]}))
    db = Database()
    db.portfolio_projects.rows = [project(), project("draft-project", published=False), project("archived-project", archived=True)]
    settings = {"seo": {"site_name": "Rajeev Freelancer", "canonical_domain": "https://rajeevfreelancer.com", "robots_index": True}, "contact": {"whatsapp": "+91 97116 23561"}, "business": {}}
    async def get_settings(): return settings
    app = FastAPI()
    app.include_router(public_seo.build_public_router(db=db, get_settings=get_settings, services=[], city_map={}, fallback_content=lambda *args: None, build_dir=build))
    return {"client": TestClient(app), "db": db, "settings": settings, "build": build}


def test_work_html_contains_real_link_story_gallery_and_bootstrap(env):
    response = env["client"].get("/work/hotel-project")
    assert response.status_code == 200
    page = BeautifulSoup(response.text, "html.parser")
    assert page.h1.get_text() == "Hotel website"
    assert page.select_one('link[rel="canonical"]')["href"] == "https://rajeevfreelancer.com/work/hotel-project"
    assert page.select_one('a[href="https://hotel.example/"]')["rel"] == ["noopener", "noreferrer"]
    assert "We built a visitor journey" in page.get_text()
    assert "Provided editing access" in page.get_text()
    assert page.select_one('img[alt="Hotel homepage"]')["height"] == "900"
    assert page.select_one('img[alt="Room page"]')["src"] == "https://rajeevfreelancer.com/api/uploads/hotel.webp"
    assert page.select_one("figcaption").get_text() == "Accommodation page"
    assert page.select_one('a[href^="https://wa.me/919711623561"]')
    assert '"portfolioProject"' in response.text
    assert response.headers["cache-control"] == "public, max-age=0, must-revalidate"
    assert env["client"].head("/work/hotel-project").status_code == 200


def test_published_update_and_unpublish_take_effect_without_rebuild(env):
    client = env["client"]
    assert "Hotel website" in client.get("/work/hotel-project").text
    env["db"].portfolio_projects.rows[0]["title"] = "Updated hotel website"
    assert "Updated hotel website" in client.get("/work/hotel-project").text
    env["db"].portfolio_projects.rows[0]["published"] = False
    missing = client.get("/work/hotel-project")
    assert missing.status_code == 404 and "noindex" in missing.headers["x-robots-tag"]
    assert "Updated hotel website" not in client.get("/work").text
    assert "/work/hotel-project" not in client.get("/sitemap.xml").text


@pytest.mark.parametrize("slug", ["draft-project", "archived-project", "missing-project", "hotel-project/extra"])
def test_hidden_projects_are_true_404_even_with_stale_built_files(env, slug):
    response = env["client"].get("/work/" + slug)
    assert response.status_code == 404
    assert "Stale published project" not in response.text
    assert "noindex" in response.headers["x-robots-tag"]


def test_catalog_draft_override_and_archive_do_not_resurrect(env):
    client, db = env["client"], env["db"]
    assert client.get("/work/catalog-project").status_code == 200
    db.portfolio_projects.rows.append(project("catalog-project", published=False))
    assert client.get("/work/catalog-project").status_code == 404
    db.portfolio_projects.rows[-1] = {"id": "catalog-project", "archived": True}
    assert client.get("/work/catalog-project").status_code == 404
    assert "/work/catalog-project" not in client.get("/sitemap.xml").text


def test_index_industry_and_service_filters_are_independent_and_canonical(env):
    client = env["client"]
    env["db"].portfolio_projects.rows.append(project("school-app", title="School application", industry="education", services=["applications"]))
    index = client.get("/work")
    assert index.status_code == 200
    page = BeautifulSoup(index.text, "html.parser")
    assert page.select_one('select[name="industry"]')
    assert page.select_one('select[name="service"]')
    assert page.select_one('meta[name="robots"]')["content"].startswith("index")
    response = client.get("/work?industry=education&service=applications&q=School")
    page = BeautifulSoup(response.text, "html.parser")
    assert response.status_code == 200
    assert page.select_one('link[rel="canonical"]')["href"] == "https://rajeevfreelancer.com/work"
    assert page.select_one('meta[name="robots"]')["content"] == "noindex, follow"
    assert response.headers["x-robots-tag"] == "noindex, follow"
    assert 'href="/work/school-app"' in response.text
    assert 'href="/work/hotel-project"' not in response.text
    assert '"portfolio"' in response.text


def test_sitemap_clears_stale_work_manifest_and_only_adds_current_public_rows(env):
    response = env["client"].get("/sitemap.xml")
    urls = [node.text for node in ET.fromstring(response.text).findall("{*}url/{*}loc")]
    assert "https://rajeevfreelancer.com/work" in urls
    assert "https://rajeevfreelancer.com/work/hotel-project" in urls
    assert "https://rajeevfreelancer.com/work/catalog-project" in urls
    assert not any("draft-project" in url or "archived-project" in url for url in urls)
    dynamic = env["client"].get("/api/sitemaps/content.xml").text
    assert "/work/hotel-project" in dynamic
    assert "draft-project" not in dynamic and "archived-project" not in dynamic


def test_project_content_and_bootstrap_cannot_execute_scripts(env):
    env["db"].portfolio_projects.rows[0].update(title='Hotel </script><script>alert(1)</script>', summary='<img src=x onerror=alert(2)>', website_url='javascript:alert(3)', image_url='javascript:alert(4)', story={"scope": ['<script>alert(5)</script>']})
    response = env["client"].get("/work/hotel-project")
    assert response.status_code == 200
    page = BeautifulSoup(response.text, "html.parser")
    assert not page.select('script:not([type="application/ld+json"]):not(:-soup-contains("window.__RF_BOOTSTRAP__"))')
    assert not page.select('img[onerror]')
    assert not page.select('a[href^="javascript:"]')
    assert '<script>alert(1)</script>' not in response.text
    assert '<script>alert(5)</script>' not in response.text
    assert '\\u003c/script>' in response.text


def test_global_noindex_applies_to_work_index_and_detail(env):
    env["settings"]["seo"]["robots_index"] = False
    for path in ("/work", "/work/hotel-project"):
        response = env["client"].get(path)
        assert response.status_code == 200
        assert response.headers["x-robots-tag"] == "noindex, follow"
        assert BeautifulSoup(response.text, "html.parser").select_one('meta[name="robots"]')["content"] == "noindex, follow"
    assert "/work/hotel-project" not in env["client"].get("/sitemap.xml").text


def test_invalid_pagination_and_nested_work_paths_never_fall_back(env):
    assert env["client"].get("/work?page=bad").status_code == 422
    assert env["client"].get("/work?page=0").status_code == 422
    assert env["client"].get("/work?q=" + "x" * 121).status_code == 422
    assert env["client"].get("/work?page=999").status_code == 404


def test_case_gallery_and_live_link_do_not_change_existing_metadata(env):
    env["db"].case_studies.rows = [{"slug": "existing-case", "title": "Existing title", "excerpt": "Existing description", "challenge": "Original challenge", "approach": [], "results": [], "published": True, "website_url": "https://case.example/", "gallery": [{"url": "/api/uploads/case.webp", "alt": "Case study screen", "caption": "Delivered project"}]}]
    response = env["client"].get("/case-studies/existing-case")
    page = BeautifulSoup(response.text, "html.parser")
    assert page.title.get_text() == "Existing title — Case Study | Rajeev Freelancer"
    assert page.select_one('meta[name="description"]')["content"] == "Existing description"
    assert page.select_one('link[rel="canonical"]')["href"] == "https://rajeevfreelancer.com/case-studies/existing-case"
    assert page.select_one('a[href="https://case.example/"]')
    assert page.select_one('img[alt="Case study screen"]')


def test_homepage_initial_proof_uses_current_cms_without_stale_draft_source(env):
    old = project("catalog-project")
    old["title"] = "Stale catalog hotel"
    old["image_url"] = "/assets/work/stale-catalog-project.webp"
    bootstrap = {"path": "/", "settings": {}, "data": {"homePortfolio": {"items": [old]}, "locations": {"countries": []}}, "renderedBy": "react"}
    source = '<!doctype html><html><head><title>Original home title</title><meta name="description" content="Original home description"><link rel="canonical" href="https://rajeevfreelancer.com/"><link rel="preload" as="image" href="/assets/work/stale-catalog-project.webp"><link rel="preload" as="image" href="/portrait.webp"></head><body><main><h1>Websites. Apps. AI Automation.</h1><div data-rf-home-featured="true"><div>Stale catalog hotel</div></div><section id="selected-work"><h2>Existing Work heading</h2><div data-rf-home-industries="true"><div>Old industry</div></div><div data-rf-home-projects="true"><div><p>Stale catalog hotel</p></div></div></section><section><p>Original next section.</p></section></main><script>window.__RF_BOOTSTRAP__=' + json.dumps(bootstrap) + '</script></body></html>'
    (env["build"] / "index.html").write_text(source)
    # An override draft suppresses the source row even when its old HTML was built.
    env["db"].portfolio_projects.rows.append(project("catalog-project", published=False))
    response = env["client"].get("/")
    assert response.status_code == 200 and response.headers["cache-control"] == "no-store"
    assert "Stale catalog hotel" not in response.text
    assert "stale-catalog-project.webp" not in response.text
    assert "Old industry" not in response.text
    assert 'href="/work/hotel-project"' in response.text
    assert "We redesigned the hotel website." in response.text
    page = BeautifulSoup(response.text, "html.parser")
    assert page.title.get_text() == "Original home title"
    assert page.select_one('meta[name="description"]')["content"] == "Original home description"
    assert page.select_one('link[rel="canonical"]')["href"] == "https://rajeevfreelancer.com/"
    assert page.select_one('link[href="/portrait.webp"]')
    assert "Original next section." in page.get_text()
    assert "Existing Work heading" in page.get_text()
    script = next(script.get_text() for script in page.select('script') if script.get_text().startswith('window.__RF_BOOTSTRAP__='))
    current = json.loads(script.split('=', 1)[1])
    assert current['data']['homePortfolio']['items'][0]['slug'] == 'hotel-project'
    assert current['data']['locations'] == {'countries': []}
    assert 'renderedBy' not in current
    env["db"].portfolio_projects.rows[0]['published'] = False
    second = env["client"].get("/")
    assert 'href="/work/hotel-project"' not in second.text
    assert "Let’s build your next project." in second.text


def test_home_region_replacement_preserves_outer_page_and_nested_divs():
    original = '<div class="outer"><div\n data-rf-home-projects="true"><div><span>old</span><div>nested</div></div></div><div>unchanged</div></div>'
    result = public_seo.replace_home_region(original, 'data-rf-home-projects', '<p>fresh</p>')
    assert result == '<div class="outer"><div\n data-rf-home-projects="true"><p>fresh</p></div><div>unchanged</div></div>'


def test_original_demo_html_served_only_from_public_demo_directory(env):
    build = env["build"]
    (build / "demos").mkdir()
    (build / "demos" / "voice.html").write_text('<html><head><title>Original demo</title></head><body>Interactive demo</body></html>')
    (build / "other.html").write_text('<html>Not a public demo</html>')
    response = env["client"].get("/demos/voice.html")
    assert response.status_code == 200
    assert "Interactive demo" in response.text
    assert response.headers["x-robots-tag"] == "noindex, follow"
    assert env["client"].head("/demos/voice.html").status_code == 200
    assert env["client"].get("/demos/missing.html").status_code == 404
    assert env["client"].get("/other.html").status_code == 404

def test_demo_project_type_survives_public_normalization():
    row = portfolio._normalize(project(project_type="demo"))
    assert row["project_type"] == "demo"
    assert portfolio.summary(row)["project_type"] == "demo"
