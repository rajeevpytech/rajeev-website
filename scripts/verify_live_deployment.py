#!/usr/bin/env python3
"""Read-only HTTP acceptance against a built release. Standard library only.

Never submits forms, authenticates, changes settings or requests indexing.
Run after building, first against the local API and then the public HTTPS origin.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
MAX_BYTES = 4 * 1024 * 1024


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.titles, self.h1s, self.canonicals, self.robots, self.descriptions, self.assets = [], [], [], [], [], []
        self.active, self.buffer = None, []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in {"title", "h1"}:
            self.active, self.buffer = tag, []
        if tag == "link":
            rel = a.get("rel", "").lower().split()
            if "canonical" in rel: self.canonicals.append(a.get("href", ""))
            if "stylesheet" in rel: self.assets.append(a.get("href", ""))
        if tag == "script" and a.get("src"): self.assets.append(a["src"])
        if tag == "meta":
            name = a.get("name", "").lower()
            if name == "robots": self.robots.append(a.get("content", ""))
            if name == "description": self.descriptions.append(a.get("content", ""))

    def handle_startendtag(self, tag, attrs): self.handle_starttag(tag, attrs)

    def handle_data(self, data):
        if self.active: self.buffer.append(data)

    def handle_endtag(self, tag):
        if tag == self.active:
            value = " ".join("".join(self.buffer).split())
            (self.titles if tag == "title" else self.h1s).append(value)
            self.active, self.buffer = None, []


def fetch(url, timeout=15):
    request = Request(url, headers={"User-Agent": "RajeevReleaseCheck/1.0", "Accept": "text/html,application/json,application/xml,text/plain"})
    try:
        response = urlopen(request, timeout=timeout)
    except HTTPError as exc:
        response = exc
    except (URLError, TimeoutError, OSError, ValueError) as exc:
        return {"url": url, "status": 0, "error": str(exc), "body": "", "type": ""}
    try:
        with response:
            body = response.read(MAX_BYTES + 1)
            return {"url": url, "final_url": response.geturl(), "status": response.status,
                    "type": response.headers.get("Content-Type", "").lower(),
                    "x_robots": response.headers.get("X-Robots-Tag", ""),
                    "oversized": len(body) > MAX_BYTES, "body": body[:MAX_BYTES].decode("utf-8", errors="replace")}
    except (TimeoutError, OSError) as exc:
        return {"url": url, "status": 0, "error": str(exc), "body": "", "type": ""}


def inspect_html(response, expected=None, noindex=False, status=200):
    expected = expected or {}
    errors = []
    if response.get("error"): errors.append("request_failed")
    if response["status"] != status: errors.append(f"http_{response['status']}_expected_{status}")
    if "text/html" not in response["type"]: errors.append("html_content_type_missing")
    if response.get("oversized"): errors.append("response_over_size_limit")
    page = Page(response["body"])
    if len(page.titles) != 1 or not page.titles[0]: errors.append("nonempty_unique_title_missing")
    if not noindex:
        if len(page.h1s) != 1 or not page.h1s[0]: errors.append("rendered_h1_missing_or_multiple")
        if len(page.descriptions) != 1 or not page.descriptions[0]: errors.append("description_missing_or_multiple")
        if len(page.canonicals) != 1: errors.append("canonical_missing_or_multiple")
    robot_text = ",".join(page.robots + [response.get("x_robots", "")]).lower()
    has_noindex = bool(re.search(r"(?:^|[\s,;:])(?:noindex|none)(?:$|[\s,;])", robot_text))
    if noindex != has_noindex: errors.append("unexpected_indexability")
    for key, values in [("title", page.titles), ("description", page.descriptions), ("canonical", page.canonicals)]:
        wanted = expected.get(key)
        if wanted is not None and values != [wanted]: errors.append(f"release_{key}_mismatch")
    if expected.get("h1_contains") and not any(expected["h1_contains"].casefold() in h1.casefold() for h1 in page.h1s):
        errors.append("expected_page_heading_missing")
    return {"path": urlsplit(response["url"]).path, "status": response["status"],
            "final_url": response.get("final_url"), "pass": not errors, "errors": errors,
            "canonical": page.canonicals, "h1_count": len(page.h1s)}, page


def load_contract(manifest_path, paths_path):
    manifest = json.loads(Path(manifest_path).read_text())
    origin = manifest["origin"].rstrip("/")
    entries = {entry["path"]: entry for entry in manifest["pages"]}
    definitions = json.loads(Path(paths_path).read_text())
    paths, dynamic = definitions["paths"], definitions.get("dynamic", {})
    missing = [path for path in paths if path not in entries and path not in dynamic]
    if missing: raise ValueError("Priority URLs absent from this build manifest: " + ", ".join(missing))
    contracts = []
    for path in paths:
        if path in entries:
            row = entries[path]
            expected = {"title": row["title"], "description": row["description"], "canonical": row["canonical"]}
        else:
            row = dynamic[path]
            target = row["canonical_path"]
            if not target.startswith("/") or target.startswith("//"): raise ValueError("Invalid dynamic canonical path")
            expected = {"canonical": origin + target, "h1_contains": row.get("h1_contains")}
        contracts.append((path, expected, not row["index"]))
    return origin, contracts


def run(base, manifest_path, paths_path, timeout=15):
    canonical_origin, contracts = load_contract(manifest_path, paths_path)
    results, homepage_assets = [], []
    def check(contract):
        path, expected, noindex = contract
        response = fetch(base + path, timeout)
        result, page = inspect_html(response, expected, noindex=noindex)
        return result, page.assets if path == "/" else []
    with ThreadPoolExecutor(max_workers=4) as pool:
        for result, assets in pool.map(check, contracts):
            results.append(result); homepage_assets.extend(assets)
    for path, status in [("/admin", 200), ("/rf-release-check-nonexistent-7e830d", 404)]:
        result, _ = inspect_html(fetch(base + path, timeout), noindex=True, status=status)
        results.append(result)
    health = fetch(base + "/api/health", timeout)
    try: healthy = health["status"] == 200 and json.loads(health["body"]).get("db") is True
    except (ValueError, AttributeError): healthy = False
    results.append({"path": "/api/health", "pass": healthy, "errors": [] if healthy else ["database_health_not_confirmed"]})
    for path in ["/robots.txt", "/sitemap.xml", "/feed.xml"]:
        response, errors = fetch(base + path, timeout), []
        if response["status"] != 200: errors.append("crawl_file_http_error")
        if path.endswith(".xml"):
            if "xml" not in response["type"]: errors.append("xml_content_type_missing")
            try:
                root = ET.fromstring(response["body"])
                name = root.tag.rsplit("}", 1)[-1]
                if name not in ({"sitemapindex", "urlset"} if path == "/sitemap.xml" else {"rss", "feed"}): errors.append("wrong_xml_root")
                if path == "/sitemap.xml":
                    locations = [node.text for node in root.iter() if node.tag.rsplit("}", 1)[-1] == "loc"]
                    if not locations or any(not value or urlsplit(value).netloc != urlsplit(canonical_origin).netloc for value in locations): errors.append("sitemap_host_or_locations_invalid")
            except ET.ParseError: errors.append("invalid_xml")
        elif "text/plain" not in response["type"] or "User-agent:" not in response["body"] or f"Sitemap: {canonical_origin}/sitemap.xml" not in response["body"]:
            errors.append("robots_type_or_sitemap_invalid")
        results.append({"path": path, "pass": not errors, "errors": errors})
    # Check emitted local bundles as well as HTML; do not fetch third-party hosts.
    local_assets = list(dict.fromkeys(asset for asset in homepage_assets if asset.startswith("/static/")))
    if not local_assets: results.append({"path": "/static/", "pass": False, "errors": ["no_local_build_assets_in_homepage"]})
    for asset in local_assets[:4]:
        response = fetch(urljoin(base + "/", asset), timeout)
        valid = response["status"] == 200 and "text/html" not in response["type"] and bool(response["body"])
        results.append({"path": asset, "pass": valid, "errors": [] if valid else ["build_asset_missing_or_html_fallback"]})
    return {"checked_at": datetime.now(timezone.utc).isoformat(), "base_url": base, "canonical_origin": canonical_origin,
            "read_only": True, "pass": all(row["pass"] for row in results), "checks": len(results),
            "failed": sum(not row["pass"] for row in results), "results": results,
            "limits": "HTTP acceptance only. Not proof of Google indexing, ranking, provider generation, lead delivery or real browser performance."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--manifest", default=str(ROOT / "frontend/build/seo-manifest.json"))
    parser.add_argument("--paths", default=str(ROOT / "deploy/priority-url-checks.json"))
    parser.add_argument("--timeout", type=float, default=15)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    parsed = urlsplit(args.base_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in {"", "/"}:
        parser.error("Use an HTTP(S) origin without credentials, path, query or fragment")
    if args.timeout <= 0: parser.error("Timeout must be positive")
    try: report = run(args.base_url.rstrip("/"), args.manifest, args.paths, args.timeout)
    except (OSError, ValueError, KeyError) as exc: parser.error(str(exc) + "; build this release first")
    output = json.dumps(report, indent=2, ensure_ascii=False)
    if args.output: args.output.parent.mkdir(parents=True, exist_ok=True); args.output.write_text(output + "\n")
    print(output)
    return 0 if report["pass"] else 1


if __name__ == "__main__": raise SystemExit(main())
