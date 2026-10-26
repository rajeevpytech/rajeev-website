"""Exercise the server's local HTML validator without Mongo or outbound HTTP."""
import ast
import asyncio
from pathlib import Path
import sys

from fastapi import FastAPI
from fastapi.responses import HTMLResponse

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))


def server_nodes(names, scope):
    tree = ast.parse((BACKEND / 'server.py').read_text())
    nodes = [node for node in tree.body if isinstance(node, (ast.ClassDef, ast.AsyncFunctionDef)) and node.name in names]
    for node in nodes:
        if isinstance(node, ast.AsyncFunctionDef): node.decorator_list = []
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(BACKEND / 'server.py'), 'exec'), scope)
    return scope


def test_internal_indexnow_validator_checks_real_html_without_outbound_fetch():
    from html.parser import HTMLParser
    app = FastAPI()
    origin = 'https://rajeevfreelancer.com'
    def page(path, robots='index, follow'):
        return f'<html><head><meta name="robots" content="{robots}"><link rel="canonical" href="{origin}{path}"></head><body><h1>Page</h1></body></html>'
    @app.get('/')
    async def home(): return HTMLResponse(page('/'))
    @app.get('/unreviewed')
    async def unreviewed(): return HTMLResponse(page('/unreviewed', 'noindex, follow'))
    @app.get('/header-private')
    async def header_private(): return HTMLResponse(page('/header-private'), headers={'X-Robots-Tag': 'noindex'})
    @app.get('/alias')
    async def alias(): return HTMLResponse(page('/target'))
    @app.get('/api/data')
    async def data(): return {'not': 'HTML'}
    async def get_settings(): return {'seo': {'canonical_domain': origin}}
    scope = server_nodes({'_IndexNowHead', '_validate_indexnow_path'}, {'_HTMLParser': HTMLParser, 'app': app, '_get_site_settings': get_settings})
    async def run():
        validate = scope['_validate_indexnow_path']
        assert (await validate('/'))['eligible'] is True
        for path in ('/unreviewed', '/header-private', '/alias', '/api/data', '/missing'):
            assert (await validate(path))['eligible'] is False
    asyncio.run(run())


def test_exact_key_middleware_keeps_robots_llms_and_other_public_routes():
    import re
    from types import SimpleNamespace
    from starlette.requests import Request
    from starlette.responses import PlainTextResponse
    calls = []
    key = 'retained-example-key-123'
    class Service:
        async def key_file_response(self, path):
            calls.append(path)
            return PlainTextResponse(key) if path == '/' + key + '.txt' else None
    scope = server_nodes({'_indexnow_key_middleware'}, {'re': re, 'indexnow_service': Service(), 'Request': Request})
    passed = []
    async def next_handler(request):
        passed.append(request.url.path)
        return PlainTextResponse('original-handler')
    async def run():
        middleware = scope['_indexnow_key_middleware']
        for method in ('GET', 'HEAD'):
            request = Request({'type': 'http', 'method': method, 'path': '/' + key + '.txt', 'headers': [], 'query_string': b'', 'scheme': 'https', 'server': ('rajeevfreelancer.com', 443)})
            response = await middleware(request, next_handler)
            assert response.body.decode() == key
        for path in ('/robots.txt', '/llms.txt', '/another-key-123.txt', '/contact', '/BingSiteAuth.xml'):
            request = Request({'type': 'http', 'method': 'GET', 'path': path, 'headers': [], 'query_string': b'', 'scheme': 'https', 'server': ('rajeevfreelancer.com', 443)})
            response = await middleware(request, next_handler)
            assert response.body.decode() == 'original-handler'
        assert '/robots.txt' not in calls and '/llms.txt' not in calls
        assert passed == ['/robots.txt', '/llms.txt', '/another-key-123.txt', '/contact', '/BingSiteAuth.xml']
    asyncio.run(run())


def test_legacy_publication_wrapper_uses_guarded_service_without_new_configuration():
    import typing
    observed = []
    class Service:
        async def notify_existing(self, values):
            observed.append(values)
            return {'state': 'disabled', 'status': None, 'submitted': 0}
    scope = server_nodes({'ping_indexnow'}, {'indexnow_service': Service(), 'List': typing.List})
    assert asyncio.run(scope['ping_indexnow'](['/contact', '/contact'])) == 0
    assert observed == [['/contact']]
