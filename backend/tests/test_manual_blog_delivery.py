"""The admin-published remote article remains readable without a valid LLM key.

Fixtures follow the actual BlogManager payload and BlogInput cleanup. They do not
assert that the current production server has already deployed these routes.
"""
import ast
import asyncio
import copy
from datetime import date
import importlib.util
import json
from pathlib import Path
import re
import sys
from typing import List, Optional

from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import BaseModel

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
import autopilot
import public_seo
import seo_workflow


def test_manual_cms_article_list_full_html_and_existing_post_guard_ignore_llm_failure(monkeypatch, tmp_path):
    spec = importlib.util.spec_from_file_location('manual_blog_memory_helpers', BACKEND / 'tests/test_seo_workflow.py')
    helpers = importlib.util.module_from_spec(spec); spec.loader.exec_module(helpers)
    db = helpers.Database()
    plan = json.loads((BACKEND / 'seo_content_plan.json').read_text())
    article = next(item for item in plan['articles'] if item['topic_id'] == 'remote-website-project-scope')
    body = article['content']
    assert article['slug'] == 'scope-remote-website-project'
    assert article['title'] == 'How to Scope a Remote Website Project Before Development Starts'
    monkeypatch.setenv('EMERGENT_LLM_KEY', 'invalid-local-test-placeholder')
    async def forbidden_generation(*args, **kwargs): raise AssertionError('Reading an existing article must not invoke the LLM')
    monkeypatch.setattr(autopilot, '_llm_json', forbidden_generation)
    monkeypatch.setattr(autopilot, 'generate_article', forbidden_generation)
    source = ast.parse((BACKEND / 'server.py').read_text())
    nodes = [node for node in source.body if isinstance(node, (ast.ClassDef, ast.AsyncFunctionDef)) and node.name in {'BlogInput', 'list_blog', 'get_blog'}]
    for node in nodes:
        if isinstance(node, ast.AsyncFunctionDef): node.decorator_list = []
    scope = {'BaseModel': BaseModel, 'List': List, 'Optional': Optional, 'autopilot': autopilot, 're': re, 'HTTPException': HTTPException, 'db': db}
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(BACKEND / 'server.py'), 'exec'), scope)
    # BlogManager sends body_md plus the paragraph-array compatibility field,
    # not the planning JSON's `content` property.
    payload = scope['BlogInput'](title=article['title'], slug=article['slug'], category='Guide', excerpt=article['excerpt'],
        body_md=body, body=[part.strip() for part in re.split(r'\n\s*\n', body) if part.strip()], published=True,
        faqs=[{'q': 'What should the scope include?', 'a': 'Agree visitor journeys, responsibilities and acceptance checks.'},
              {'q': 'How should a remote project be reviewed?', 'a': 'Use an agreed preview and a clear review process.'},
              {'q': 'What should happen before launch?', 'a': 'Check access, backups and a reversible launch checklist.'}])
    post = {**payload.model_dump(), **payload.clean(), 'id': 'manual-publication-local-fixture', 'created_at': '2026-10-25', 'published_at': '2026-10-25', 'updated_at': '2026-10-25'}
    asyncio.run(db.blog_posts.insert_one(copy.deepcopy(post)))
    asyncio.run(db.settings.insert_one({'key': 'blog_autopilot', 'enabled': True, 'frequency': 'daily', 'publish_time': '09:00', 'tz': 'Asia/Kolkata', 'auto_publish': True, 'generated_count': 0, 'last_error': 'HTTP 401 invalid API key: SENSITIVE-TEST-VALUE'}))
    async def distinct(field, query=None): return sorted({row[field] for row in db.blog_posts.rows if helpers.matches(row, query or {})})
    db.blog_posts.distinct = distinct
    settings = {'seo': {'site_name': 'Rajeev Freelancer', 'canonical_domain': 'https://rajeevfreelancer.com', 'robots_index': True}, 'contact': {}, 'business': {'founder_name': 'Rajeev'}}
    async def get_settings(): return settings
    async def get_admin(): return {'email': 'local-fixture@example.com'}
    def forbidden_location_generation(*args): raise AssertionError('Blog delivery must not generate location copy')
    app = FastAPI()
    app.add_api_route('/api/blog', scope['list_blog'], methods=['GET'])
    app.add_api_route('/api/blog/{slug}', scope['get_blog'], methods=['GET'])
    # Explicitly record the admin-confirmed publication in source metadata while
    # requiring the actual database post for the queue decision.
    for row in [next(item for item in plan['weeks'] if item['topic_id'] == article['topic_id']), next(item for item in plan['articles'] if item['topic_id'] == article['topic_id'])]:
        row.update(status='published', intent_action='already_published', queue_eligible=False, new_post_eligible=False, existing_post_slug=post['slug'])
    content_path = tmp_path / 'plan.json'; content_path.write_text(json.dumps(plan))
    router = seo_workflow.build_router(db=db, get_current_admin=get_admin, content_path=content_path, today_fn=lambda: date(2026, 10, 25))
    app.include_router(router, prefix='/api')
    app.include_router(public_seo.build_public_router(db=db, get_settings=get_settings, services=[], city_map={}, fallback_content=forbidden_location_generation, build_dir=tmp_path))
    client = TestClient(app)
    writes_before_reads = list(db.writes)
    listing = client.get('/api/blog')
    assert listing.status_code == 200 and listing.json()['posts'][0]['slug'] == post['slug']
    detail = client.get('/api/blog/' + post['slug'])
    assert detail.status_code == 200 and detail.json()['post']['body_md'] == post['body_md']
    html_index = client.get('/blog')
    assert html_index.status_code == 200 and ('href="/blog/' + post['slug'] + '"') in html_index.text
    response = client.get('/blog/' + post['slug'])
    assert response.status_code == 200
    soup = BeautifulSoup(response.text, 'html.parser')
    main = soup.select_one('main')
    assert main.h1.get_text() == post['title']
    assert 'Start with three visitor journeys' in main.get_text(' ', strip=True)
    assert 'Make launch a reversible checklist' in main.get_text(' ', strip=True)
    assert len(main.get_text(' ', strip=True).split()) > 850
    assert soup.select_one('link[rel=canonical]')['href'] == 'https://rajeevfreelancer.com/blog/' + post['slug']
    assert len(main.select('h3')) >= 3
    assert post['slug'] in client.get('/sitemap.xml').text
    assert post['slug'] in client.get('/feed.xml').text
    assert db.writes == writes_before_reads
    before_post = copy.deepcopy(db.blog_posts.rows)
    before_settings = copy.deepcopy(db.settings.rows)
    status = client.get('/api/admin/seo-workflow')
    assert status.status_code == 200
    diagnostic = status.json()['autopilot']['provider_diagnostic']
    assert diagnostic['state'] == 'blocked_authentication'
    assert diagnostic['provider_request_performed'] is False
    assert 'SENSITIVE-TEST-VALUE' not in status.text
    assert client.post('/api/admin/seo-workflow/activate', json={'start_date': '2026-10-18'}).status_code == 200
    queued = client.post('/api/admin/seo-workflow/queue-topics', json={'topic_ids': [article['topic_id']]})
    assert queued.status_code == 200 and queued.json()['queued_count'] == 0
    assert queued.json()['results'][0]['result'] == 'existing_published'
    assert db.settings.rows == before_settings
    assert db.blog_posts.rows == before_post
