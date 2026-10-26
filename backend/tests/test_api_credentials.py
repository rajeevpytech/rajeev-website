"""Fake credentials and mocked providers only; never contacts a real account."""
import asyncio
import copy
import json
import sys
from pathlib import Path
from types import SimpleNamespace

from cryptography.fernet import Fernet
from fastapi import FastAPI, Header, HTTPException
from fastapi.testclient import TestClient
import httpx
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import api_credentials as vault

TEXT_KEY = "fixture-text-provider-key-1234567890"
GOOGLE_KEY = "fixture-google-provider-key-0987654321"
ENV_KEY = "fixture-environment-emergent-key-12345"


class Collection:
    def __init__(self): self.rows, self.writes = [], 0
    async def find_one(self, query):
        return copy.deepcopy(next((row for row in self.rows if all(row.get(key) == value for key, value in query.items())), None))
    async def update_one(self, query, change, upsert=False):
        row = next((row for row in self.rows if all(row.get(key) == value for key, value in query.items())), None)
        if row is not None:
            if '$set' in change:
                row.update(copy.deepcopy(change['$set'])); self.writes += 1
            return SimpleNamespace(matched_count=1, upserted_id=None)
        if upsert:
            self.rows.append({**query, **copy.deepcopy(change.get('$setOnInsert', {}))}); self.writes += 1
            return SimpleNamespace(matched_count=0, upserted_id=query['_id'])
        return SimpleNamespace(matched_count=0, upserted_id=None)


@pytest.fixture
def env(monkeypatch):
    for name in ['API_SETTINGS_ENCRYPTION_KEY', 'JWT_SECRET', 'EMERGENT_LLM_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GEMINI_IMAGE_API_KEY', 'GOOGLE_IMAGE_API_KEY', 'AI_TEXT_PROVIDER', 'AI_IMAGE_PROVIDER', 'AI_TEXT_MODEL', 'AI_IMAGE_MODEL']:
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv('API_SETTINGS_ENCRYPTION_KEY', Fernet.generate_key().decode())
    db = SimpleNamespace(settings=Collection())
    db.settings.rows.append({'_id':'existing-site', 'key':'site', 'seo':{'title':'Existing title'}})
    async def admin(authorization: str = Header('')):
        if authorization != 'Bearer fake-admin': raise HTTPException(401, 'Not authenticated')
        return {'email':'admin@example.test'}
    app = FastAPI(); app.include_router(vault.build_router(db, admin), prefix='/api')
    return SimpleNamespace(db=db, client=TestClient(app), headers={'Authorization':'Bearer fake-admin'}, admin=admin, monkeypatch=monkeypatch)


def test_auth_and_read_have_no_writes_requests_or_secret_readback(env, monkeypatch):
    async def forbidden(*args, **kwargs): raise AssertionError('Network must not be used on read/save')
    monkeypatch.setattr(httpx.AsyncClient, 'get', forbidden)
    monkeypatch.setenv('EMERGENT_LLM_KEY', ENV_KEY)
    for method, path in [('get','/api/admin/api-settings'),('put','/api/admin/api-settings'),('post','/api/admin/api-settings/test')]:
        response = getattr(env.client, method)(path)
        assert response.status_code == 401 and ENV_KEY not in response.text
    response = env.client.get('/api/admin/api-settings', headers=env.headers)
    data = response.json()
    assert data['text']['provider'] == data['image']['provider'] == 'emergent'
    assert data['text']['model'] == 'gemini-3-flash-preview'
    assert data['image']['model'] == 'gemini-3.1-flash-image-preview'
    assert data['text']['key_configured'] and data['text']['key_source'] == 'environment'
    assert ENV_KEY not in response.text and 'api_key' not in data['text']
    assert response.headers['cache-control'] == 'no-store'
    assert env.db.settings.writes == 0


def test_encrypted_save_blank_keep_explicit_clear_and_unrelated_settings_preserved(env):
    url = '/api/admin/api-settings'
    response = env.client.put(url, headers=env.headers, json={'text':{'api_key':TEXT_KEY}})
    assert response.status_code == 200 and TEXT_KEY not in response.text
    row = next(row for row in env.db.settings.rows if row['_id'] == vault.DOC_ID)
    assert TEXT_KEY not in json.dumps(row)
    cipher, _ = vault.protection()
    assert TEXT_KEY in cipher.decrypt(row['encrypted'].encode()).decode()
    assert env.db.settings.rows[0] == {'_id':'existing-site', 'key':'site', 'seo':{'title':'Existing title'}}
    assert env.client.put(url, headers=env.headers, json={'text':{'api_key':'   '}}).status_code == 200
    assert asyncio.run(vault.get_runtime_credentials(env.db))['text']['api_key'] == TEXT_KEY
    response = env.client.put(url, headers=env.headers, json={'text':{'clear_key':True}})
    assert response.status_code == 200 and not response.json()['text']['key_configured']
    assert asyncio.run(vault.get_runtime_credentials(env.db))['text']['api_key'] == ''


def test_provider_switch_never_reuses_other_key_and_clear_restores_environment(env, monkeypatch):
    monkeypatch.setenv('EMERGENT_LLM_KEY', ENV_KEY)
    monkeypatch.setenv('GOOGLE_API_KEY', GOOGLE_KEY)
    assert asyncio.run(vault.get_runtime_credentials(env.db))['text']['provider'] == 'emergent'
    env.client.put('/api/admin/api-settings', headers=env.headers, json={'text':{'api_key':TEXT_KEY}})
    changed = env.client.put('/api/admin/api-settings', headers=env.headers, json={'text':{'provider':'google'}})
    assert changed.status_code == 200
    profile = asyncio.run(vault.get_runtime_credentials(env.db))['text']
    assert profile['provider'] == 'google' and profile['api_key'] == GOOGLE_KEY and profile['key_source'] == 'environment'
    env.client.put('/api/admin/api-settings', headers=env.headers, json={'text':{'provider':'emergent'}})
    assert asyncio.run(vault.get_runtime_credentials(env.db))['text']['api_key'] == TEXT_KEY
    cleared = env.client.put('/api/admin/api-settings', headers=env.headers, json={'text':{'clear_key':True}}).json()
    assert cleared['text']['key_configured'] and cleared['text']['key_source'] == 'environment'
    assert asyncio.run(vault.get_runtime_credentials(env.db))['text']['api_key'] == ENV_KEY


def test_saving_only_key_preserves_explicit_environment_model_and_invalid_config_is_fixable(env, monkeypatch):
    monkeypatch.setenv('AI_TEXT_MODEL', 'gemini-3.8-flash')
    env.client.put('/api/admin/api-settings', headers=env.headers, json={'text':{'api_key':TEXT_KEY}})
    assert asyncio.run(vault.get_runtime_credentials(env.db))['text']['model'] == 'gemini-3.8-flash'
    monkeypatch.setenv('AI_IMAGE_PROVIDER', 'invalid-value')
    view = env.client.get('/api/admin/api-settings', headers=env.headers).json()
    assert view['storage']['available'] and view['storage']['error_code'] == 'invalid_provider'
    assert env.client.put('/api/admin/api-settings', headers=env.headers, json={'image':{'provider':'emergent'}}).status_code == 200


@pytest.mark.parametrize('preexisting', [False, True])
@pytest.mark.parametrize('invalid_env,error_code', [('AI_IMAGE_PROVIDER','invalid_provider'), ('AI_IMAGE_MODEL','invalid_model')])
def test_config_recovery_get_ui_payload_put_get_preserves_real_revision(env, monkeypatch, preexisting, invalid_env, error_code):
    url = '/api/admin/api-settings'
    monkeypatch.setenv('EMERGENT_LLM_KEY', ENV_KEY)
    if preexisting:
        first = env.client.put(url, headers=env.headers, json={'text':{'api_key':TEXT_KEY}})
        assert first.status_code == 200
    baseline = env.client.get(url, headers=env.headers).json()
    monkeypatch.setenv(invalid_env, 'invalid-value')
    diagnostic = env.client.get(url, headers=env.headers).json()
    assert diagnostic['storage']['available'] and diagnostic['storage']['error_code'] == error_code
    # Exact frontend payload shape, including its revision from GET. Do not
    # bypass the real UI's optimistic concurrency check when testing recovery.
    payload = {'expected_revision':diagnostic['revision'], **{target:{'provider':diagnostic[target]['provider'], 'model':diagnostic[target]['model'], 'api_key':'', 'clear_key':False} for target in ('text','image')}}
    repaired = env.client.put(url, headers=env.headers, json=payload)
    assert repaired.status_code == 200
    assert diagnostic['revision'] == baseline['revision'] == (1 if preexisting else 0)
    assert diagnostic['updated_at'] == baseline['updated_at']
    final = env.client.get(url, headers=env.headers).json()
    assert final['revision'] == baseline['revision'] + 1
    assert final['storage']['available'] and 'error_code' not in final['storage']
    assert final['image']['provider'] == 'emergent'
    assert final['image']['model'] == vault.DEFAULT_MODELS['image']['emergent']
    runtime = asyncio.run(vault.get_runtime_credentials(env.db))
    assert runtime['image']['provider'] == 'emergent' and runtime['image']['api_key'] == ENV_KEY
    assert runtime['text']['api_key'] == (TEXT_KEY if preexisting else ENV_KEY)
    assert env.db.settings.rows[0] == {'_id':'existing-site', 'key':'site', 'seo':{'title':'Existing title'}}


@pytest.mark.parametrize('valid_target', ['text','image'])
@pytest.mark.parametrize('invalid_setting', ['PROVIDER','MODEL'])
def test_repairing_one_section_preserves_other_google_profile_and_saved_key(env, monkeypatch, valid_target, invalid_setting):
    url = '/api/admin/api-settings'
    invalid_target = 'image' if valid_target == 'text' else 'text'
    model = 'gemini-3.8-flash' if valid_target == 'text' else 'gemini-3-pro-image'
    monkeypatch.setenv('EMERGENT_LLM_KEY', ENV_KEY)
    saved = env.client.put(url, headers=env.headers, json={valid_target:{'provider':'google', 'model':model, 'api_key':GOOGLE_KEY}})
    assert saved.status_code == 200
    baseline = env.client.get(url, headers=env.headers).json()
    monkeypatch.setenv(f'AI_{invalid_target.upper()}_{invalid_setting}', 'invalid-value')
    diagnostic = env.client.get(url, headers=env.headers).json()
    assert diagnostic['storage']['available']
    assert diagnostic['revision'] == baseline['revision']
    assert diagnostic['updated_at'] == baseline['updated_at']
    assert diagnostic[valid_target] == baseline[valid_target]
    assert diagnostic[valid_target]['provider'] == 'google'
    assert diagnostic[valid_target]['model'] == model
    assert diagnostic[valid_target]['saved_key_configured'] and diagnostic[valid_target]['key_source'] == 'saved'
    assert GOOGLE_KEY not in json.dumps(diagnostic)
    payload = {'expected_revision':diagnostic['revision'], **{target:{'provider':diagnostic[target]['provider'], 'model':diagnostic[target]['model'], 'api_key':'', 'clear_key':False} for target in ('text','image')}}
    repaired = env.client.put(url, headers=env.headers, json=payload)
    assert repaired.status_code == 200
    final = env.client.get(url, headers=env.headers).json()
    assert final[valid_target] == baseline[valid_target]
    assert final['revision'] == baseline['revision'] + 1 and 'error_code' not in final['storage']
    runtime = asyncio.run(vault.get_runtime_credentials(env.db))
    assert runtime[valid_target]['provider'] == 'google' and runtime[valid_target]['model'] == model
    assert runtime[valid_target]['api_key'] == GOOGLE_KEY
    assert runtime[invalid_target]['provider'] == 'emergent' and runtime[invalid_target]['api_key'] == ENV_KEY


def test_missing_weak_or_invalid_protection_never_persists_plaintext(env, monkeypatch):
    monkeypatch.delenv('API_SETTINGS_ENCRYPTION_KEY')
    for secret in ['', 'secret', 'x'*64]:
        monkeypatch.setenv('JWT_SECRET', secret)
        view = env.client.get('/api/admin/api-settings', headers=env.headers).json()
        assert not view['storage']['available'] and view['storage']['setup_required']
        saved = env.client.put('/api/admin/api-settings', headers=env.headers, json={'text':{'api_key':TEXT_KEY}})
        assert saved.status_code == 503 and TEXT_KEY not in saved.text
    monkeypatch.setenv('JWT_SECRET', 'A7f936bcD2e1058Fa30B6d94cC9128e5-strong')
    cipher1, info1 = vault.protection(); cipher2, info2 = vault.protection()
    assert info1['protection_source'] == 'jwt_derived' and cipher2.decrypt(cipher1.encrypt(b'fixture')) == b'fixture'
    monkeypatch.setenv('API_SETTINGS_ENCRYPTION_KEY', 'invalid-protection-key')
    assert not vault.protection()[1]['available']  # Do not hide a bad dedicated key with JWT fallback.
    assert env.db.settings.writes == 0


def test_wrong_protection_key_locks_existing_ciphertext_without_replacing_it(env, monkeypatch):
    env.client.put('/api/admin/api-settings', headers=env.headers, json={'text':{'api_key':TEXT_KEY}})
    before = copy.deepcopy(env.db.settings.rows)
    monkeypatch.setenv('API_SETTINGS_ENCRYPTION_KEY', Fernet.generate_key().decode())
    response = env.client.get('/api/admin/api-settings', headers=env.headers)
    assert response.json()['storage']['error_code'] == 'vault_unreadable'
    assert response.json()['revision'] is None and response.json()['updated_at'] is None
    assert TEXT_KEY not in response.text
    assert env.client.put('/api/admin/api-settings', headers=env.headers, json={'text':{'api_key':GOOGLE_KEY}}).status_code == 503
    assert env.db.settings.rows == before


@pytest.mark.parametrize('patch', [{'provider':'https://evil.test'}, {'model':'../../private'}, {'model':'gemini-unknown'}, {'api_key':TEXT_KEY+'\nHeader: bad'}, {'api_key':123}, {'api_key':TEXT_KEY,'clear_key':True}, {'clear_key':'yes'}, {'url':'http://169.254.169.254'}])
def test_invalid_values_have_fixed_validation_without_input_echo(env, patch):
    response = env.client.put('/api/admin/api-settings', headers=env.headers, json={'text':patch})
    assert response.status_code == 422
    assert TEXT_KEY not in response.text and '169.254' not in response.text and 'evil.test' not in response.text
    assert env.db.settings.writes == 0


def test_malformed_body_never_echoes_input_and_revision_prevents_lost_update(env):
    bad = env.client.put('/api/admin/api-settings', headers={**env.headers,'Content-Type':'application/json'}, content=json.dumps(TEXT_KEY))
    assert bad.status_code == 422 and TEXT_KEY not in bad.text
    env.client.put('/api/admin/api-settings', headers=env.headers, json={'text':{'api_key':TEXT_KEY},'expected_revision':0})
    conflict = env.client.put('/api/admin/api-settings', headers=env.headers, json={'text':{'clear_key':True},'expected_revision':0})
    assert conflict.status_code == 409
    assert asyncio.run(vault.get_runtime_credentials(env.db))['text']['api_key'] == TEXT_KEY


def test_explicit_google_probe_fixed_host_header_only_and_no_generation(env, monkeypatch):
    called = []
    def handler(request):
        called.append(request)
        return httpx.Response(200, json={'name':'models/gemini-3.1-flash-image'})
    real_client = httpx.AsyncClient
    monkeypatch.setattr(httpx, 'AsyncClient', lambda **kwargs: real_client(**kwargs, transport=httpx.MockTransport(handler), trust_env=False))
    env.client.put('/api/admin/api-settings', headers=env.headers, json={'image':{'provider':'google','api_key':GOOGLE_KEY}})
    assert not called
    response = env.client.post('/api/admin/api-settings/test', headers=env.headers, json={'target':'image'})
    result = response.json()
    assert result['ok'] and result['connection_tested'] and not result['generation_tested']
    assert len(called) == 1 and str(called[0].url) == 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image'
    assert GOOGLE_KEY not in str(called[0].url) and called[0].headers['x-goog-api-key'] == GOOGLE_KEY
    assert GOOGLE_KEY not in response.text


def test_upstream_credential_echo_is_not_returned_or_logged(env, monkeypatch, caplog):
    def handler(request):
        response = httpx.Response(401, json={'error':{'message':'invalid key '+GOOGLE_KEY}}, request=request)
        raise httpx.HTTPStatusError('echo '+GOOGLE_KEY, request=request, response=response)
    real_client = httpx.AsyncClient
    monkeypatch.setattr(httpx, 'AsyncClient', lambda **kwargs: real_client(**kwargs, transport=httpx.MockTransport(handler), trust_env=False))
    env.client.put('/api/admin/api-settings', headers=env.headers, json={'text':{'provider':'google','api_key':GOOGLE_KEY}})
    response = env.client.post('/api/admin/api-settings/test', headers=env.headers, json={'target':'text'})
    assert response.status_code == 200 and response.json()['code'] == 'provider_auth_or_access'
    assert GOOGLE_KEY not in response.text and GOOGLE_KEY not in caplog.text


def test_emergent_image_check_is_honest_readiness_without_a_provider_call(env):
    env.client.put('/api/admin/api-settings', headers=env.headers, json={'image':{'api_key':TEXT_KEY}})
    result = env.client.post('/api/admin/api-settings/test', headers=env.headers, json={'target':'image'}).json()
    assert result['code'] == 'readiness_only' and not result['connection_tested'] and not result['generation_tested']


def test_test_adapter_cannot_echo_arbitrary_secret_message_or_fields(env):
    async def unsafe_adapter(profile, target):
        return {'ok':TEXT_KEY, 'code':'provider_unavailable', 'message':'echo '+TEXT_KEY, 'extra':TEXT_KEY}
    app = FastAPI(); app.include_router(vault.build_router(env.db, env.admin, tester=unsafe_adapter), prefix='/api')
    result = TestClient(app).post('/api/admin/api-settings/test', headers=env.headers, json={'target':'text'})
    assert result.status_code == 200 and TEXT_KEY not in result.text and 'extra' not in result.json()


def test_public_html_bootstrap_drops_nested_accidental_credentials(tmp_path):
    from public_seo import html_document
    settings = {'seo': {'site_name':'Rajeev Freelancer', 'api_key':TEXT_KEY}, 'contact': {'email':'hello@example.test', 'api_token':GOOGLE_KEY}, 'api_credentials': {'text':TEXT_KEY}, 'notifications': {'webhook_secret':GOOGLE_KEY}}
    result = html_document(settings=settings, path='/new-page', title='A public title', description='A public description', body='<p>Public copy.</p>', build_dir=tmp_path)
    assert TEXT_KEY not in result and GOOGLE_KEY not in result
