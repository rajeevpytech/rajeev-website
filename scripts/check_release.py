#!/usr/bin/env python3
"""Check release HTML and public route compatibility without production writes.

Static-only uses the standard library. Full route checks additionally need the
backend's FastAPI/httpx dependencies. Dynamic editorial records are in-memory QA
fixtures, never publication data or proof of production database contents.
"""
import argparse
import ast
import copy
from collections import Counter, defaultdict
from datetime import datetime, timezone
import html
from html.parser import HTMLParser
import importlib.util
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urljoin, urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
BUILD = ROOT / "frontend" / "build"
DOCS = ROOT / "docs"
sys.path.insert(0, str(BACKEND))


def read_json(path, default=None):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def normalized_path(value):
    path = unquote(urlsplit(str(value)).path)
    return "/" + path.strip("/") if path.strip("/") else "/"


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.titles, self.descriptions, self.robots, self.canonicals = [], [], [], []
        self.h1 = 0
        self.language = ""
        self.links, self.jsonld = [], []
        self._capture = None
        self._buffer = []
        self.feed(source)
        self.close()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "html": self.language = attrs.get("lang", "")
        elif tag == "h1": self.h1 += 1
        elif tag == "title": self._capture, self._buffer = "title", []
        elif tag == "meta":
            name = attrs.get("name", "").lower()
            if name == "description": self.descriptions.append(attrs.get("content", ""))
            elif name == "robots": self.robots.append(attrs.get("content", ""))
        elif tag == "link" and "canonical" in attrs.get("rel", "").lower().split():
            self.canonicals.append(attrs.get("href", ""))
        elif tag == "script" and attrs.get("type", "").lower() == "application/ld+json":
            self._capture, self._buffer = "jsonld", []
        if tag in {"a", "area"} and attrs.get("href"):
            self.links.append(attrs["href"])

    def handle_startendtag(self, tag, attrs): self.handle_starttag(tag, attrs)
    def handle_data(self, data):
        if self._capture: self._buffer.append(data)
    def handle_endtag(self, tag):
        if tag == "title" and self._capture == "title":
            self.titles.append("".join(self._buffer).strip()); self._capture = None
        elif tag == "script" and self._capture == "jsonld":
            self.jsonld.append("".join(self._buffer)); self._capture = None


def types_in(value):
    if isinstance(value, list):
        for item in value: yield from types_in(item)
    elif isinstance(value, dict):
        node_type = value.get("@type")
        if node_type:
            for item in node_type if isinstance(node_type, list) else [node_type]: yield str(item)
        if "aggregateRating" in value: yield "aggregateRating-property"
        for item in value.values(): yield from types_in(item)


class Checks:
    def __init__(self):
        self.errors, self.warnings = [], []
        self.counts = Counter()
        self._messages = set()
        self.checked_links = set()
        self.language_counts = Counter()
        self.schema_counts = Counter()

    def error(self, code, path, detail):
        self.errors.append({"code": code, "path": path, "detail": str(detail)})

    def warning(self, code, path, detail):
        token = (code, path, str(detail))
        if token not in self._messages:
            self._messages.add(token)
            self.warnings.append({"code": code, "path": path, "detail": str(detail)})

    def inspect(self, source, path, expected_canonical=None, expected_index=True, admin=False):
        page = Page(source)
        for label, values in (("title", page.titles), ("description", page.descriptions), ("robots", page.robots)):
            if len(values) != 1 or not values[0].strip():
                self.error("metadata-count", path, f"Expected exactly one nonempty {label}; found {len(values)}")
        if expected_index and len(page.canonicals) != 1:
            self.error("canonical-count", path, f"Expected one canonical; found {len(page.canonicals)}")
        elif len(page.canonicals) > 1:
            self.error("canonical-count", path, f"Multiple canonicals: {page.canonicals}")
        if expected_canonical and page.canonicals != [expected_canonical]:
            self.error("canonical-target", path, {"expected": expected_canonical, "actual": page.canonicals})
        if page.h1 != 1 and not admin:
            self.error("heading-count", path, f"Expected one H1; found {page.h1}")
        if not page.language or not re.fullmatch(r"[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*", page.language):
            self.error("html-language", path, page.language)
        self.language_counts[page.language] += 1
        has_noindex = any("noindex" in robot.lower() for robot in page.robots)
        if expected_index == has_noindex:
            self.error("robots-directive", path, f"Expected {'index' if expected_index else 'noindex'}; got {page.robots}")
        if not page.jsonld and expected_index:
            self.error("structured-data-missing", path, "No JSON-LD blocks")
        for raw in page.jsonld:
            try:
                value = json.loads(raw)
            except (TypeError, ValueError) as exc:
                self.error("structured-data-json", path, exc)
                continue
            for typ in types_in(value):
                self.schema_counts[typ] += 1
                if typ in {"Review", "AggregateRating", "aggregateRating-property"}:
                    self.error("unverified-rating-markup", path, typ)
        return page


def import_backend(name):
    spec = importlib.util.spec_from_file_location(name, BACKEND / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def catalog_and_inventory():
    catalog = import_backend("data")
    aliases = import_backend("live_service_catalog")
    inventory = read_json(DOCS / "live-url-inventory.json", [])
    urls = inventory.get("urls", []) if isinstance(inventory, dict) else inventory
    return catalog, aliases, urls


def source_contract_checks(checks):
    """Compare original source declarations, without replacing their baseline."""
    file = ROOT / "scripts" / "test_metadata_preservation.py"
    spec = importlib.util.spec_from_file_location("release_metadata_contract", file)
    contract = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(contract)
    baseline = contract.BASELINE
    for relative, expected in baseline["pages"].items():
        source = ROOT / relative
        if not source.is_file():
            checks.error("original-source-page-missing", relative, "Original page source is absent")
            continue
        pairs = lambda items: {(p.get("title"), p.get("description")) for p in items}
        if pairs(expected) != pairs(contract.seo_props(source.read_text())):
            checks.error("original-source-metadata-changed", relative, "Title/description declarations differ from the uploaded source baseline")
        checks.counts["original_seo_declarations_checked"] += len(expected)
    checks_map = [
        ("frontend-defaults", baseline["frontend_defaults"], contract.js_defaults((ROOT / "frontend/src/lib/siteConfig.js").read_text())),
        ("backend-defaults", baseline["backend_defaults"], contract.python_defaults((BACKEND / "server.py").read_text())),
        ("location-metadata-template", baseline["location_template"], contract.fallback_meta((BACKEND / "server.py").read_text())),
    ]
    for name, expected, actual in checks_map:
        if expected != actual: checks.error("original-source-contract-changed", name, "Stored source baseline differs")
    current_copy = contract.service_copy((ROOT / "frontend/src/data/serviceContent.js").read_text())
    for slug, expected in baseline["service_copy"].items():
        if current_copy.get(slug) != expected: checks.error("original-service-copy-changed", slug, "Service description declarations differ")
        checks.counts["original_service_copy_records_checked"] += 1


def portfolio_source(checks):
    """Read the new public catalog without importing web dependencies."""
    source = BACKEND / "portfolio-projects.json"
    data = read_json(source)
    if not isinstance(data, dict) or not isinstance(data.get("projects"), list):
        checks.error("portfolio-source", "/work", "Missing or invalid backend/portfolio-projects.json")
        return []
    projects, seen = [], set()
    for project in data["projects"]:
        if not isinstance(project, dict) or project.get("published") is not True:
            continue
        slug = project.get("slug")
        if not isinstance(slug, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
            checks.error("portfolio-source-slug", "/work", "Published project has an invalid slug")
            continue
        if slug in seen:
            checks.error("portfolio-source-duplicate", "/work/" + slug, "Duplicate published slug")
            continue
        seen.add(slug)
        projects.append(project)
    if not projects:
        checks.error("portfolio-source-empty", "/work", "No published source projects")
    checks.counts["portfolio_source_projects"] = len(projects)
    # Inspect the actual API registration without importing server startup/Mongo.
    tree = ast.parse((BACKEND / "server.py").read_text())
    names = {alias.asname or alias.name for node in tree.body if isinstance(node, ast.ImportFrom) and node.module == "portfolio" for alias in node.names if alias.name == "build_router"}
    registered = any(isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr == "include_router" and isinstance(node.func.value, ast.Name) and node.func.value.id == "api_router" and any(isinstance(arg, ast.Call) and isinstance(arg.func, ast.Name) and arg.func.id in names for arg in node.args) for node in ast.walk(tree))
    if not registered:
        checks.error("portfolio-api-registration", "/api/portfolio", "Read-only portfolio router is not registered in server.py")
    return projects


def route_supported(path, static_paths, services, cities, editorial_paths):
    if path in static_paths or path in editorial_paths or path in {"/blog", "/case-studies", "/feed.xml", "/sitemap.xml", "/robots.txt", "/llms.txt"}:
        return True
    bits = path.strip("/").split("/")
    if len(bits) == 2 and bits[0] in services and bits[1] in cities:
        return True
    if (BUILD / path.lstrip("/")).is_file(): return True
    return False


def static_checks(checks, manifest, catalog, aliases, live_urls):
    entries = manifest.get("pages", [])
    origin = manifest.get("origin", "https://rajeevfreelancer.com")
    static_paths = {normalized_path(entry["path"]) for entry in entries}
    services = aliases.with_live_services(catalog.SERVICES)
    editorial_paths = {normalized_path(url) for url in live_urls if normalized_path(url).startswith(("/blog/", "/case-studies/"))}
    projects = portfolio_source(checks)
    editorial_paths.update({"/work", *("/work/" + project["slug"] for project in projects)})
    for module_name, key, prefix in (("blog_seed", "BLOG_SEED", "/blog/"), ("case_seed", "CASE_SEED", "/case-studies/")):
        module = import_backend(module_name)
        editorial_paths.update(prefix + item["slug"] for item in getattr(module, key))
    title_groups = defaultdict(set)
    seen_paths = set()
    live_meta = read_json(ROOT / "frontend/src/seo/live-route-meta.json", {})
    if live_meta != read_json(BACKEND / "live_route_meta.json", {}):
        checks.error("live-metadata-frontend-backend-mismatch", "", "Captured public title/description snapshots differ between renderers")
    for entry in entries:
        path = entry["path"]
        if path in seen_paths: checks.error("duplicate-manifest-path", path, "Path occurs twice")
        seen_paths.add(path)
        file = BUILD / "404.html" if path == "/404" else BUILD / path.lstrip("/") / "index.html"
        if not file.is_file():
            checks.error("missing-static-html", path, str(file.relative_to(ROOT))); continue
        page = checks.inspect(file.read_text(encoding="utf-8"), path, expected_canonical=entry.get("canonical"), expected_index=entry.get("index", True), admin=path == "/admin")
        checks.counts["static_html_pages_checked"] += 1
        if page.titles and html.unescape(entry.get("title", "")) != page.titles[0]:
            checks.error("manifest-title-mismatch", path, "Manifest and HTML differ")
        if page.descriptions and html.unescape(entry.get("description", "")) != page.descriptions[0]:
            checks.error("manifest-description-mismatch", path, "Manifest and HTML differ")
        if path in live_meta:
            expected = live_meta[path]
            if page.titles != [expected["title"]] or page.descriptions != [expected["description"]]:
                checks.error("captured-live-metadata-changed", path, {"expected": expected, "actual_title": page.titles, "actual_description": page.descriptions})
            checks.counts["captured_live_static_metadata_snapshots_checked"] += 1
        if entry.get("index") and page.titles and page.canonicals:
            title_groups[page.titles[0]].add(page.canonicals[0])
        expected_lang = {"/hi": "hi", "/ar": "ar", "/es": "es", "/fr": "fr", "/us": "en-US", "/uk": "en-GB", "/de": "de-DE"}.get(path, "en")
        if page.language != expected_lang: checks.error("locale-mismatch", path, f"Expected {expected_lang}, got {page.language}")
        if path in {"/hi", "/ar", "/es", "/fr"}: checks.counts["preserved_locale_pages_checked"] += 1
        for href in page.links:
            try:
                absolute = urlsplit(urljoin(origin + path, href))
            except ValueError:
                checks.error("invalid-internal-link", path, href); continue
            if absolute.scheme not in {"http", "https"} or absolute.hostname not in {urlsplit(origin).hostname, "www.rajeevfreelancer.com"}: continue
            target = normalized_path(absolute.path)
            checks.counts["internal_link_occurrences"] += 1
            checks.checked_links.add(target)
            if not route_supported(target, static_paths, services, catalog.CITY_MAP, editorial_paths):
                checks.error("unresolved-internal-link", path, target)
    for title, canonicals in title_groups.items():
        if len(canonicals) > 1: checks.warning("shared-static-title", "", {"title": title, "canonicals": sorted(canonicals)})
    checks.counts["unique_internal_link_targets"] = len(checks.checked_links)
    for shard in manifest.get("sitemaps", []):
        file = BUILD / shard["name"]
        try:
            tree = ET.fromstring(file.read_text())
            locations = [node.text for node in tree.findall("{*}url/{*}loc")]
            checks.counts["static_sitemap_urls_checked"] += len(locations)
            if len(locations) != shard["count"]: checks.error("sitemap-manifest-count", shard["name"], f"XML {len(locations)} != manifest {shard['count']}")
            for url in locations:
                path = normalized_path(url)
                entry = next((e for e in entries if e["path"] == path), None)
                if not entry or not entry.get("index") or entry.get("canonical") != url:
                    checks.error("sitemap-noncanonical-url", shard["name"], url)
        except (OSError, ET.ParseError) as exc:
            checks.error("sitemap-read", shard["name"], exc)
    return static_paths, services, editorial_paths


class MemoryCursor:
    def __init__(self, rows): self.rows = copy.deepcopy(rows)
    def sort(self, *args): return self
    async def to_list(self, count): return self.rows[:count]


def matches(row, query):
    for key, value in query.items():
        if key == "$or":
            if not any(matches(row, part) for part in value): return False
        elif isinstance(value, dict) and "$ne" in value:
            if row.get(key) == value["$ne"]: return False
        elif row.get(key) != value: return False
    return True


class MemoryCollection:
    def __init__(self, rows=()): self.rows = list(rows)
    def find(self, query, projection=None): return MemoryCursor([r for r in self.rows if matches(r, query)])
    async def find_one(self, query, projection=None): return copy.deepcopy(next((r for r in self.rows if matches(r, query)), None))


def fallback_functions(aliases):
    """Reuse actual source fallback functions without importing server/Mongo."""
    source = ast.parse((BACKEND / "server.py").read_text())
    nodes = [node for node in source.body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name in {"_fallback_content", "_page_content"}]
    namespace = {"source_service_slug": aliases.source_service_slug}
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(BACKEND / "server.py"), "exec"), namespace)
    return namespace["_page_content"]


def portfolio_route_checks(checks, client, origin, projects, db):
    """Exercise the new source-only API/HTML alongside unchanged Mongo cases."""
    before_cases = copy.deepcopy(db.case_studies.rows)
    source_slugs = {project["slug"] for project in projects}
    listed = set()
    page_number = 1
    while page_number <= 1000:
        response = client.get(f"/api/portfolio?page={page_number}&page_size=60")
        if response.status_code != 200:
            checks.error("portfolio-api-status", "/api/portfolio", response.status_code)
            break
        data = response.json()
        listed.update(project.get("slug") for project in data.get("items", []))
        if data.get("total_projects") != len(source_slugs):
            checks.error("portfolio-api-count", "/api/portfolio", {"expected": len(source_slugs), "actual": data.get("total_projects")})
        checks.counts["portfolio_api_pages_checked"] += 1
        if page_number >= int((data.get("pagination") or {}).get("total_pages") or 1):
            break
        page_number += 1
    if listed != source_slugs:
        checks.error("portfolio-api-inventory", "/api/portfolio", {"missing": sorted(source_slugs - listed), "unexpected": sorted(str(item) for item in listed - source_slugs)})
    paths = ["/work", *("/work/" + project["slug"] for project in projects)]
    for path in paths:
        response = client.get(path, follow_redirects=False)
        if response.status_code != 200:
            checks.error("portfolio-html-status", path, response.status_code)
            continue
        checks.inspect(response.text, path, expected_canonical=origin + path, expected_index=True)
        checks.counts["portfolio_html_routes_checked"] += 1
        head = client.head(path)
        if head.status_code != 200 or head.content:
            checks.error("portfolio-head-response", path, {"status": head.status_code, "body_bytes": len(head.content)})
        checks.counts["portfolio_head_routes_checked"] += 1
    for project in projects:
        path = "/api/portfolio/" + project["slug"]
        response = client.get(path)
        if response.status_code != 200 or response.json().get("project", {}).get("slug") != project["slug"]:
            checks.error("portfolio-detail-api", path, response.status_code)
        checks.counts["portfolio_detail_api_routes_checked"] += 1
    filtered = client.get("/work?category=all")
    if filtered.status_code != 200:
        checks.error("portfolio-filter-status", "/work?category=all", filtered.status_code)
    else:
        checks.inspect(filtered.text, "/work?category=all", expected_canonical=origin + "/work", expected_index=False)
        if "noindex" not in filtered.headers.get("x-robots-tag", "").lower():
            checks.error("portfolio-filter-robots-header", "/work?category=all", "Expected noindex for query variants")
        checks.counts["portfolio_filter_variants_checked"] += 1
    for path in ("/work/unknown-release-project-20261025", "/api/portfolio/unknown-release-project-20261025"):
        response = client.get(path)
        if response.status_code != 404:
            checks.error("portfolio-unknown-status", path, response.status_code)
        checks.counts["portfolio_negative_routes_checked"] += 1
    if db.case_studies.rows != before_cases:
        checks.error("portfolio-mutated-legacy-cases", "/work", "Reading portfolio routes changed existing case-study records")
    checks.counts["legacy_case_records_preserved_during_work_checks"] = len(before_cases)
    return {origin + path for path in paths}


def dynamic_checks(checks, manifest, catalog, aliases, live_urls, services):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    seo = import_backend("public_seo")
    route_policy = import_backend("gsc_route_policy")
    blog_seed = import_backend("blog_seed").BLOG_SEED
    case_seed = import_backend("case_seed").CASE_SEED
    blog_rows = {item["slug"]: {**item, "published": True} for item in blog_seed}
    case_rows = {item["slug"]: {**item, "published": True} for item in case_seed}
    fixture_counts = Counter()
    for url in live_urls:
        bits = normalized_path(url).strip("/").split("/")
        if len(bits) != 2 or bits[0] not in {"blog", "case-studies"}: continue
        target = blog_rows if bits[0] == "blog" else case_rows
        if bits[1] not in target:
            target[bits[1]] = {"slug": bits[1], "title": "Local QA route fixture: " + bits[1], "excerpt": "An in-memory fixture for local route compatibility validation only.", "body": ["This fixture is not publication content."], "published": True, "category": "QA fixture"}
            fixture_counts[bits[0]] += 1
    db = type("MemoryDB", (), {})()
    db.blog_posts = MemoryCollection(blog_rows.values())
    db.case_studies = MemoryCollection(case_rows.values())
    db.location_pages = MemoryCollection()
    fallback = fallback_functions(aliases)
    settings = {"seo": {"site_name": "Rajeev Freelancer", "canonical_domain": manifest["origin"], "robots_index": True}, "contact": {"phone": "+919711623561", "email": "hello@rajeevfreelancer.com"}, "business": {"founder_name": "Rajeev Gits"}}
    async def get_settings(): return settings
    app = FastAPI()
    portfolio = import_backend("portfolio")
    app.include_router(portfolio.build_router(), prefix="/api")
    app.include_router(seo.build_public_router(db=db, get_settings=get_settings, services=list(services.values()), city_map=catalog.CITY_MAP, fallback_content=fallback, build_dir=BUILD))
    client = TestClient(app)
    work_targets = portfolio_route_checks(checks, client, manifest["origin"], portfolio_source(checks), db)
    canonical_targets = set()
    for service in services.values():
        for slug, city in catalog.CITY_MAP.items():
            path = "/" + service["slug"] + "/" + slug
            try:
                response = client.get(path, follow_redirects=False)
                if response.status_code != 200:
                    checks.error("service-city-status", path, response.status_code); continue
                expected = manifest["origin"] + aliases.canonical_service_path(path)
                policy_doc = route_policy.apply_index_policy({"is_new_location": bool(city.get("is_new_location")), "seo_reviewed": False}, path)
                index = not policy_doc.get("seo_noindex") and not policy_doc.get("is_new_location")
                checks.inspect(response.text, path, expected_canonical=expected if index else None, expected_index=index)
                if index: canonical_targets.add(expected)
                checks.counts["service_city_routes_checked"] += 1
                checks.counts["new_market_noindex_routes_checked" if not index else "legacy_market_index_routes_checked"] += 1
            except Exception as exc:
                checks.error("service-city-exception", path, f"{type(exc).__name__}: {exc}")
        print(f"[release-check] Checked {service['slug']} across {len(catalog.CITY_MAP)} markets.", flush=True)
    for url in live_urls:
        path = normalized_path(url)
        try:
            response = client.get(path, follow_redirects=False)
            if response.status_code not in {200, 301, 308}: checks.error("live-url-compatibility", path, response.status_code)
            elif response.status_code != 200: checks.warning("live-url-redirect", path, response.headers.get("location"))
            checks.counts["observed_live_urls_probed_locally"] += 1
        except Exception as exc: checks.error("live-url-exception", path, exc)
    for path, expected in read_json(ROOT / "frontend/src/seo/live-route-meta.json", {}).items():
        response = client.get(path)
        parsed = Page(response.text)
        if response.status_code != 200 or parsed.titles != [expected["title"]] or parsed.descriptions != [expected["description"]]:
            checks.error("captured-live-route-metadata", path, {"status": response.status_code, "expected": expected, "actual_title": parsed.titles, "actual_description": parsed.descriptions})
        checks.counts["captured_live_route_metadata_snapshots_checked"] += 1
    for path, expected in (("/unknown-release-check-20261025", 404), ("/blog/unpublished-release-check", 404), ("/api/no-such-release-endpoint", 404)):
        response = client.get(path)
        if response.status_code != expected: checks.error("unknown-route-status", path, response.status_code)
        checks.counts["negative_route_checks"] += 1
    for path in ("/admin", "/sitemap.xml", "/api/sitemaps/content.xml", "/feed.xml", "/robots.txt", "/llms.txt"):
        response = client.head(path)
        if response.status_code != 200: checks.error("head-route-status", path, response.status_code)
        if path == "/admin" and "noindex" not in response.headers.get("x-robots-tag", ""): checks.error("admin-indexing", path, "Missing noindex response header")
        checks.counts["head_routes_checked"] += 1
    xml = client.get("/sitemap.xml")
    try:
        tree = ET.fromstring(xml.text)
        sitemap_urls = [node.text for node in tree.findall("{*}url/{*}loc")]
        if len(sitemap_urls) != len(set(sitemap_urls)): checks.error("root-sitemap-duplicates", "/sitemap.xml", "Duplicate URLs")
        missing_work = work_targets - set(sitemap_urls)
        if missing_work:
            checks.error("root-sitemap-portfolio-omissions", "/sitemap.xml", sorted(missing_work))
        checks.counts["portfolio_urls_checked_in_root_sitemap"] = len(work_targets)
        for url in sitemap_urls:
            if aliases.canonical_service_path(normalized_path(url)) != normalized_path(url): checks.error("root-sitemap-alias", "/sitemap.xml", url)
        missing = canonical_targets - set(sitemap_urls)
        if missing: checks.error("root-sitemap-legacy-omissions", "/sitemap.xml", sorted(missing)[:20])
        observed_canonical_urls = {
            manifest["origin"] + aliases.canonical_service_path(normalized_path(url))
            for url in live_urls
            if not route_policy.status_for_path(normalized_path(url)).get("noindex")
               and not route_policy.status_for_path(aliases.canonical_service_path(normalized_path(url))).get("noindex")
        }
        checks.counts["observed_live_urls_excluded_from_sitemap_by_noindex_policy"] = len(live_urls) - len(observed_canonical_urls)
        missing_observed = observed_canonical_urls - set(sitemap_urls)
        if missing_observed:
            checks.error("root-sitemap-observed-live-omissions", "/sitemap.xml", sorted(missing_observed))
        checks.counts["observed_live_canonical_urls_checked_in_root_sitemap"] = len(observed_canonical_urls)
        checks.counts["local_root_sitemap_urls"] = len(sitemap_urls)
    except ET.ParseError as exc: checks.error("root-sitemap-xml", "/sitemap.xml", exc)
    # Explicit new-document marker: verify both index headers and sitemap review transition.
    new_slug = next((slug for slug, city in catalog.CITY_MAP.items() if city.get("is_new_location")), None)
    if new_slug:
        service = next(iter(services.values())); city = catalog.CITY_MAP[new_slug]
        path = "/" + service["slug"] + "/" + new_slug
        doc = {"key": service["slug"] + "::" + new_slug, "canonical": path, "service": service, "location": city, "content": fallback(service, city), "is_new_location": True, "seo_reviewed": False}
        db.location_pages.rows.append(doc)
        if "noindex" not in client.get(path).headers.get("x-robots-tag", ""): checks.error("new-document-review-gate", path, "No noindex header before review")
        doc["seo_reviewed"] = True
        response = client.get(path)
        checks.inspect(response.text, path, manifest["origin"] + aliases.canonical_service_path(path), expected_index=True)
        if manifest["origin"] + aliases.canonical_service_path(path) not in client.get("/sitemap.xml").text: checks.error("reviewed-document-sitemap", path, "Approved page missing")
        checks.counts["new_document_review_transitions_checked"] += 1
    checks.counts["service_catalog_routes"] = len(services)
    checks.counts["city_catalog_markets"] = len(catalog.CITY_MAP)
    checks.counts["synthetic_editorial_route_fixtures"] = sum(fixture_counts.values())
    if fixture_counts:
        checks.warning("editorial-route-fixtures", "", {"counts": dict(fixture_counts), "scope": "Published records missing from source seeds are in-memory fixtures for route reachability only; actual live editorial copy requires the production database."})
    checks.warning("verification-boundary", "", "Dynamic route checks use actual rendering code with an in-memory published collection. They do not verify production Mongo content, public hosting behavior, Google Search Console indexing, Core Web Vitals or ranking changes.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--static-only", action="store_true")
    parser.add_argument("--report", type=Path, default=DOCS / "release-checks.json")
    args = parser.parse_args()
    checks = Checks()
    manifest = read_json(BUILD / "seo-manifest.json", {})
    if not manifest.get("pages"):
        print("[release-check] Build manifest missing. Run npm run build first.", file=sys.stderr)
        return 1
    catalog, aliases, live_urls = catalog_and_inventory()
    source_contract_checks(checks)
    _, services, _ = static_checks(checks, manifest, catalog, aliases, live_urls)
    if not args.static_only: dynamic_checks(checks, manifest, catalog, aliases, live_urls, services)
    report = {"checked_at": datetime.now(timezone.utc).isoformat(), "mode": "static-only" if args.static_only else "static-and-in-memory-public-routes", "result": "pass" if not checks.errors else "fail", "build_generated_at": manifest.get("generatedAt"), "canonical_origin": manifest.get("origin"), "counts": dict(checks.counts), "html_languages": dict(checks.language_counts), "structured_data_types": dict(checks.schema_counts), "error_count": len(checks.errors), "warning_count": len(checks.warnings), "errors": checks.errors, "warnings": checks.warnings, "limitations": ["This report does not measure Google indexing, rankings, production database contents, real-user performance or public deployment behavior."]}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[release-check] {report['result'].upper()}: {len(checks.errors)} errors, {len(checks.warnings)} warnings; checked {checks.counts.get('static_html_pages_checked', 0)} static HTML pages.")
    for error in checks.errors[:25]: print(f"  {error['code']}: {error['path']} — {error['detail']}")
    return 0 if not checks.errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
