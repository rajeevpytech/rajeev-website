"""CMS workflows use fake storage and auth; no real accounts or provider calls."""
import ast
import asyncio
import copy
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from types import SimpleNamespace
import uuid
from typing import List, Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field, field_validator, ValidationError
import pytest
from pymongo.errors import DuplicateKeyError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import portfolio


def matches(row, query):
    return all(row.get(key) == value for key, value in query.items())


class Cursor:
    def __init__(self, rows): self.rows = copy.deepcopy(rows)
    async def to_list(self, count): return self.rows[:count]


class Collection:
    def __init__(self): self.rows, self.writes, self.indexes = [], 0, []
    def find(self, query=None, projection=None):
        return Cursor([self.project(row, projection) for row in self.rows if matches(row, query or {})])
    @staticmethod
    def project(row, projection):
        return {key: copy.deepcopy(value) for key, value in row.items() if (projection or {}).get(key) != 0}
    async def find_one(self, query, projection=None):
        row = next((row for row in self.rows if matches(row, query)), None)
        return self.project(row, projection) if row is not None else None
    async def replace_one(self, query, replacement, upsert=False):
        existing = next((row for row in self.rows if matches(row, query)), None)
        if any(row['slug'] == replacement['slug'] and row['id'] != replacement['id'] for row in self.rows):
            raise DuplicateKeyError('duplicate slug')
        if existing is not None:
            existing.clear(); existing.update(copy.deepcopy(replacement))
        elif upsert:
            self.rows.append(copy.deepcopy(replacement))
        self.writes += 1
        return SimpleNamespace(matched_count=int(existing is not None))
    async def update_one(self, query, change):
        row = next((row for row in self.rows if matches(row, query)), None)
        if row is not None:
            row.update(copy.deepcopy(change.get('$set', {}))); self.writes += 1
        return SimpleNamespace(matched_count=int(row is not None))
    async def insert_one(self, row): self.rows.append(copy.deepcopy(row)); self.writes += 1
    async def create_index(self, field, **kwargs): self.indexes.append((field, kwargs))


class Database:
    def __init__(self): self.collections = {}
    def __getitem__(self, name): return self.collections.setdefault(name, Collection())
    def __getattr__(self, name): return self[name]


@pytest.fixture
def env(tmp_path, monkeypatch):
    source = {'projects':[{'id':'source-hotel','slug':'source-hotel','title':'Hotel project','summary':'We redesigned a hotel booking website.', 'category':{'slug':'hotels','name':'Hotels'}, 'services':[{'slug':'website-redesign','name':'Website Redesign'}], 'image_url':'/hotel.webp','website_url':'https://hotel.example.test','published':True}]}
    path = tmp_path / 'portfolio.json'; path.write_text(json.dumps(source))
    monkeypatch.setattr(portfolio, 'CATALOG_PATH', path)
    db, pings = Database(), []
    async def admin(authorization: str = Header('')):
        if authorization != 'Bearer test-admin': raise HTTPException(401,'Not authenticated')
        return {'email':'owner@example.test'}
    async def ping(paths): pings.extend(paths)
    app = FastAPI(); app.include_router(portfolio.build_router(db, admin, ping), prefix='/api')
    with TestClient(app) as client:
        yield SimpleNamespace(db=db, client=client, headers={'Authorization':'Bearer test-admin'}, pings=pings, source=source, path=path)


def payload(**changes):
    return {'title':'Factory application','client_name':'Factory Ltd','industry':'manufacturing','services':['applications','crm','seo'], 'summary':'We delivered an inventory application and CRM.', 'website_url':'https://factory.example.test', 'image_url':'/api/media/preview.webp', 'image_alt':'Factory application preview','gallery':[{'url':'/api/media/dashboard.webp','alt':'Dashboard','caption':'Inventory workflow'}], 'story':{'overview':'We built the application.','scope':['Inventory','CRM'],'process':['Discovery','Build','Handover'],'delivery':['Web app'],'handover':['Admin access']}, **changes}


def create(env, **changes):
    result = env.client.post('/api/admin/portfolio', json=payload(**changes), headers=env.headers)
    assert result.status_code == 200, result.text
    return result.json()


def test_auth_guards_writes_and_reads_and_taxonomy_is_usable(env):
    for method, path, body in [('get','/api/admin/portfolio',None),('post','/api/admin/portfolio',payload()),('put','/api/admin/portfolio/source-hotel',payload()),('delete','/api/admin/portfolio/source-hotel',None),('patch','/api/admin/portfolio/source-hotel/publish',{'published':False})]:
        kwargs = {'json':body} if body is not None else {}
        assert getattr(env.client,method)(path,**kwargs).status_code == 401
    assert env.db['portfolio_projects'].writes == 0
    options = env.client.get('/api/portfolio/taxonomy').json()
    assert len(options['industries']) >= 35
    assert {'manufacturing','hotels','hospitality','education','schools','healthcare'}.issubset({row['slug'] for row in options['industries']})
    assert {'website-design','website-redesign','applications','seo','crm','ai-automation','google-ads','digital-marketing','social-media'}.issubset({row['slug'] for row in options['services']})
    assert [field for field,_ in env.db['portfolio_projects'].indexes] == ['id','slug']


def test_create_draft_publish_updates_public_filters_and_gallery(env):
    before = env.path.read_bytes()
    project = create(env)
    assert project['slug'] == 'factory-application' and project['published'] is False
    assert env.client.get('/api/portfolio/factory-application').status_code == 404
    assert env.client.get('/api/portfolio').json()['total_projects'] == 1
    admin = env.client.get('/api/admin/portfolio',headers=env.headers)
    assert admin.headers['cache-control'] == 'no-store'
    assert len(admin.json()['items']) == 2
    published = env.client.patch(f"/api/admin/portfolio/{project['id']}/publish",json={'published':True},headers=env.headers)
    assert published.status_code == 200 and published.json()['published']
    row = env.client.get('/api/portfolio/factory-application').json()['project']
    assert row['industry'] == {'slug':'manufacturing','name':'Manufacturing'}
    assert row['services'][0] == {'slug':'applications','name':'Applications'}
    assert row['gallery'][0]['caption'] == 'Inventory workflow'
    assert row['image_url'] == '/api/media/preview.webp'
    filtered = env.client.get('/api/portfolio?industry=manufacturing&service=crm&q=Factory').json()
    assert filtered['pagination']['total'] == 1
    assert {'slug':'crm','name':'CRM','count':1} in filtered['services']
    assert env.client.get('/api/portfolio?industry=hotels&service=crm').json()['items'] == []
    assert env.path.read_bytes() == before
    assert env.pings == ['/work/factory-application']


def test_edit_source_uses_override_stable_url_and_delete_tombstone_survives_new_router(env):
    before = env.path.read_bytes()
    changed = env.client.put('/api/admin/portfolio/source-hotel',headers=env.headers,json=payload(title='Updated hotel project',slug='source-hotel',industry='hotels',published=True))
    assert changed.status_code == 200
    assert changed.json()['id'] == changed.json()['slug'] == 'source-hotel'
    assert env.client.get('/api/portfolio/source-hotel').json()['project']['title'] == 'Updated hotel project'
    rejected = env.client.put('/api/admin/portfolio/source-hotel',headers=env.headers,json=payload(slug='new-url'))
    assert rejected.status_code == 409
    assert env.client.delete('/api/admin/portfolio/source-hotel',headers=env.headers).status_code == 200
    assert env.client.get('/api/portfolio/source-hotel').status_code == 404
    app = FastAPI(); app.include_router(portfolio.build_router(env.db),prefix='/api')
    with TestClient(app) as restarted:
        assert restarted.get('/api/portfolio').json()['items'] == []
    assert env.path.read_bytes() == before
    assert create_archived(env).status_code == 409


def create_archived(env):
    return env.client.post('/api/admin/portfolio',headers=env.headers,json=payload(slug='source-hotel'))


def test_draft_override_hides_source_and_publish_restores_same_content(env):
    saved = env.client.put('/api/admin/portfolio/source-hotel',headers=env.headers,json=payload(slug='source-hotel',industry='hotels',published=False))
    assert saved.status_code == 200
    assert env.client.get('/api/portfolio/source-hotel').status_code == 404
    published = env.client.patch('/api/admin/portfolio/source-hotel/publish',headers=env.headers,json={'published':True})
    assert published.status_code == 200
    assert published.json()['story']['scope'] == ['Inventory','CRM']
    assert env.client.get('/api/portfolio/source-hotel').json()['project']['image_url'] == '/api/media/preview.webp'


@pytest.mark.parametrize('change',[{'title':' '},{'published':True,'summary':' '},{'slug':'../bad'},{'website_url':'javascript:alert(1)'},{'image_url':'//evil.test/image'},{'industry':{'slug':[]}},{'services':[{'slug':[]}]},{'gallery':[{'url':'data:image/svg+xml,bad'}]},{'story':{'scope':'bad'}}])
def test_bad_inputs_are_validation_errors_without_writes(env,change):
    response = env.client.post('/api/admin/portfolio',headers=env.headers,json=payload(**change))
    assert response.status_code == 422, response.text
    assert env.db['portfolio_projects'].writes == 0


def test_duplicate_missing_and_search_pagination(env):
    create(env,slug='duplicate',published=True)
    assert env.client.post('/api/admin/portfolio',headers=env.headers,json=payload(slug='duplicate')).status_code == 409
    assert env.client.get('/api/admin/portfolio/missing',headers=env.headers).status_code == 404
    assert env.client.patch('/api/admin/portfolio/missing/publish',headers=env.headers,json={'published':True}).status_code == 404
    assert env.client.get('/api/portfolio?page=2&page_size=1').json()['pagination']['total'] == 2
    assert env.client.get('/api/portfolio?page=3&page_size=1').status_code == 404
    assert env.client.get('/api/portfolio?q=does-not-exist').json()['pagination']['total'] == 0
    assert env.client.get('/api/portfolio?page_size=61').status_code == 422
    assert env.client.get('/api/portfolio?q='+'x'*121).status_code == 422


def test_case_study_backend_keeps_slug_and_does_not_clear_unsubmitted_fields(env):
    source = Path(__file__).resolve().parents[1] / 'server.py'
    tree = ast.parse(source.read_text())
    selected = [node for node in tree.body if isinstance(node,(ast.ClassDef,ast.AsyncFunctionDef)) and node.name in {'CaseStudyInput','admin_create_case_study','admin_update_case_study'}]
    for node in selected:
        if isinstance(node,ast.AsyncFunctionDef): node.decorator_list=[]
    async def admin(): return {'email':'owner@example.test'}
    async def ping(paths): pass
    scope = {'BaseModel':BaseModel,'Field':Field,'field_validator':field_validator,'GalleryImage':portfolio.GalleryImage,'portfolio_url':portfolio._url,'Optional':Optional,'List':List,'dict':dict,'Depends':Depends,'get_current_admin':admin,'HTTPException':HTTPException,'db':env.db,'datetime':datetime,'timezone':timezone,'uuid':uuid,'asyncio':asyncio,'ping_indexnow':ping,'_slug':portfolio.slugify}
    exec(compile(ast.Module(body=selected,type_ignores=[]),str(source),'exec'),scope)
    existing = {'id':'case-original','slug':'case_original','title':'Original','published':False,'website_url':'https://keep.example.test','gallery':[{'url':'/keep.webp'}],'custom':'preserve','chart':{'label':'Existing chart'}}
    env.db.case_studies.rows.append(copy.deepcopy(existing))
    async def exercise():
        edited = await scope['admin_update_case_study']('case-original',scope['CaseStudyInput'](title='We redesigned this site'),{})
        assert edited['slug'] == 'case_original'
        cleared = await scope['admin_update_case_study']('case-original',scope['CaseStudyInput'](title='We redesigned this site',chart=None),{})
        assert cleared['chart'] is None
        assert edited['gallery'] == existing['gallery'] and edited['website_url'] == existing['website_url'] and edited['custom'] == 'preserve'
        with pytest.raises(HTTPException) as error:
            await scope['admin_update_case_study']('case-original',scope['CaseStudyInput'](title='Changed',slug='new-url'),{})
        assert error.value.status_code == 409
        created = await scope['admin_create_case_study'](scope['CaseStudyInput'](title='We built a school CRM',industry='Education',services=['crm','applications'],website_url='https://school.example.test',gallery=[{'url':'/school.webp'}],published=False),{})
        assert created['gallery'][0]['url'] == '/school.webp' and created['website_url'] == 'https://school.example.test'
        assert created['slug'] == 'we-built-a-school-crm'
    asyncio.run(exercise())
    for invalid in [{'website_url':'javascript:alert(1)'},{'gallery':[{'url':'data:evil'}]},{'cover':'//unsafe.test/photo.png'}]:
        with pytest.raises(ValidationError):
            scope['CaseStudyInput'](title='New case',**invalid)


def test_partial_draft_can_be_saved_and_publish_requires_summary(env):
    response = env.client.post('/api/admin/portfolio',headers=env.headers,json={'title':'Partial draft','industry':'education','services':['crm']})
    assert response.status_code == 200
    row = response.json()
    assert row['summary'] == '' and row['published'] is False
    assert env.client.get('/api/admin/portfolio',headers=env.headers).json()['items'][1]['slug'] == row['slug']
    assert env.client.get('/api/portfolio/'+row['slug']).status_code == 404
    rejected = env.client.patch('/api/admin/portfolio/'+row['id']+'/publish',headers=env.headers,json={'published':True})
    assert rejected.status_code == 422
    published = env.client.put('/api/admin/portfolio/'+row['id'],headers=env.headers,json=payload(title='Partial draft',industry='education',summary='We built a school CRM.',published=True))
    assert published.status_code == 200
    assert env.client.get('/api/portfolio/'+row['slug']).status_code == 200
