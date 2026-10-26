"""Release verification tests with HTTP fixtures; no production calls or writes."""
import importlib.util
import json
from pathlib import Path
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("deployment_acceptance", ROOT / "scripts/verify_live_deployment.py")
check = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check)


def html(title="Home", canonical="https://example.test/", robots="index,follow", h1="Website services"):
    return f'<html><head><title>{title}</title><meta name="description" content="Description"><meta name="robots" content="{robots}"><link rel="canonical" href="{canonical}"><script src="/static/app.js"></script></head><body><h1>{h1}</h1></body></html>'


def response(body, status=200, content_type="text/html", **kwargs):
    return {"url": "https://example.test/", "final_url": "https://example.test/", "body": body, "status": status, "type": content_type, **kwargs}


def test_shell_200_does_not_pass_and_exact_release_metadata_is_required():
    row, _ = check.inspect_html(response('<html><head><title>Generic</title></head><body><div id="root"></div></body></html>'))
    assert not row["pass"]
    assert {"rendered_h1_missing_or_multiple", "description_missing_or_multiple", "canonical_missing_or_multiple"}.issubset(row["errors"])
    row, _ = check.inspect_html(response(html()), {"title": "Other", "canonical": "https://example.test/work"})
    assert "release_title_mismatch" in row["errors"] and "release_canonical_mismatch" in row["errors"]


def test_duplicate_metadata_header_noindex_and_true_404_are_checked():
    source = html().replace('</head>', '<link rel="canonical" href="https://other.test/"></head>')
    assert "canonical_missing_or_multiple" in check.inspect_html(response(source))[0]["errors"]
    assert not check.inspect_html(response(html(), x_robots="noindex"))[0]["pass"]
    assert check.inspect_html(response(html(robots="none"), status=404), noindex=True, status=404)[0]["pass"]
    assert not check.inspect_html(response(html(robots="noindex")), noindex=True, status=404)[0]["pass"]


def test_contract_missing_priority_path_fails_instead_of_silently_skipping(tmp_path):
    manifest = tmp_path / 'manifest.json'; paths = tmp_path / 'paths.json'
    manifest.write_text(json.dumps({"origin": "https://example.test", "pages": []}))
    paths.write_text(json.dumps({"paths": ["/work"]}))
    try:
        check.load_contract(manifest, paths)
    except ValueError as exc:
        assert '/work' in str(exc)
    else: raise AssertionError('Missing priority path was skipped')


def test_explicit_dynamic_contracts_keep_database_routes_and_exact_paths(tmp_path):
    manifest = tmp_path / 'manifest.json'; paths = tmp_path / 'paths.json'
    manifest.write_text(json.dumps({"origin": "https://example.test", "pages": []}))
    paths.write_text(json.dumps({"paths": ["/blog"], "dynamic": {"/blog": {"canonical_path": "/blog", "index": True, "h1_contains": "Blog"}}}))
    origin, rows = check.load_contract(manifest, paths)
    assert rows == [("/blog", {"canonical": "https://example.test/blog", "h1_contains": "Blog"}, False)]
    row, _ = check.inspect_html(response(html(canonical='https://example.test/blog', h1='Home')), rows[0][1])
    assert 'expected_page_heading_missing' in row['errors']


def test_complete_run_checks_health_files_assets_and_does_not_claim_indexing(tmp_path, monkeypatch):
    manifest = tmp_path / 'manifest.json'; paths = tmp_path / 'paths.json'
    manifest.write_text(json.dumps({"origin": "https://example.test", "pages": [{"path": "/", "title": "Home", "description": "Description", "canonical": "https://example.test/", "index": True}]}))
    paths.write_text(json.dumps({"paths": ["/"]})); requests = []
    def fake(url, timeout):
        requests.append(url); path = check.urlsplit(url).path
        if path == '/api/health': return response('{"db":true}', content_type='application/json')
        if path == '/robots.txt': return response('User-agent: *\nSitemap: https://example.test/sitemap.xml', content_type='text/plain')
        if path == '/sitemap.xml': return response('<sitemapindex><sitemap><loc>https://example.test/sitemaps/core.xml</loc></sitemap></sitemapindex>', content_type='application/xml')
        if path == '/feed.xml': return response('<rss><channel/></rss>', content_type='application/xml')
        if path == '/static/app.js': return response('console.log(1)', content_type='application/javascript')
        if path == '/admin': return response(html(robots='noindex'))
        if 'nonexistent' in path: return response(html(robots='noindex'), status=404)
        return response(html())
    monkeypatch.setattr(check, 'fetch', fake)
    report = check.run('http://127.0.0.1:9000', manifest, paths)
    assert report['pass'] and report['checks'] == 8 and report['read_only']
    assert len(requests) == 8 and 'Not proof' in report['limits']
    original = fake
    def missing_asset(url, timeout):
        return response(html()) if url.endswith('/static/app.js') else original(url, timeout)
    monkeypatch.setattr(check, 'fetch', missing_asset)
    report = check.run('http://127.0.0.1:9000', manifest, paths)
    assert not report['pass']
    assert any('build_asset_missing_or_html_fallback' in row['errors'] for row in report['results'])


def test_http_error_404_is_preserved_by_real_read_only_fetch():
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(404); self.send_header('Content-Type', 'text/html'); self.end_headers(); self.wfile.write(b'<title>Not found</title>')
        def log_message(self, *args): pass
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
    try:
        row = check.fetch(f'http://127.0.0.1:{server.server_port}/missing', timeout=2)
        assert row['status'] == 404 and 'Not found' in row['body']
    finally:
        server.shutdown(); server.server_close(); thread.join(timeout=2)
