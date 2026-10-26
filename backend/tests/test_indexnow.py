"""Isolated IndexNow readiness tests: mock every HTTP submission and all persistence."""
import asyncio
import copy
import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace

from fastapi import FastAPI, Header, HTTPException
from fastapi.testclient import TestClient
import pytest

PATH = Path(__file__).resolve().parents[1] / "indexnow.py"
spec = importlib.util.spec_from_file_location("indexnow_test_module", PATH)
indexnow = importlib.util.module_from_spec(spec)
# dataclasses resolve their defining module through sys.modules.
import sys
sys.modules[spec.name] = indexnow
spec.loader.exec_module(indexnow)
KEY = "test-key-1234567890abcdef"
AUTH = {"Authorization": "Bearer indexnow-test-admin"}


class Cursor:
    def __init__(self, rows): self.rows = copy.deepcopy(rows)
    def sort(self, key, direction): self.rows.sort(key=lambda row: row.get(key, ""), reverse=direction < 0); return self
    def limit(self, count): self.rows = self.rows[:count]; return self
    async def to_list(self, count): return self.rows[:count]


class Collection:
    def __init__(self): self.rows, self.inserted = [], []
    def find(self, *args): return Cursor(self.rows)
    async def insert_one(self, row): self.rows.append(copy.deepcopy(row)); self.inserted.append(copy.deepcopy(row))
    async def update_one(self, query, update):
        row = next(row for row in self.rows if row["id"] == query["id"])
        row.update(copy.deepcopy(update["$set"]))


def service(*, config=None, validator=None, code=200, error=None, collection=None):
    collection = collection or Collection()
    calls = []
    async def eligible(path):
        return {"eligible": True, "status_code": 200, "canonical_url": indexnow.ORIGIN + path}
    async def send(endpoint, payload):
        calls.append((endpoint, copy.deepcopy(payload)))
        if error: raise error
        return code
    instance = indexnow.IndexNowService(db=SimpleNamespace(indexnow_submissions=collection),
        validator=validator or eligible, config=config or indexnow.IndexNowConfig(True, KEY), post=send)
    return instance, calls, collection


def client_for(instance):
    async def get_admin(authorization: str | None = Header(default=None)):
        if authorization != AUTH["Authorization"]: raise HTTPException(401, "Authentication required")
        return {"id": "test-admin"}
    app = FastAPI(); app.include_router(indexnow.build_router(service=instance, get_current_admin=get_admin))
    return TestClient(app)


def test_default_config_and_reads_never_enable_or_generate_a_key():
    config = indexnow.IndexNowConfig.from_env({})
    assert not config.enabled and not config.valid_key and not config.active and config.key_path is None
    instance, calls, rows = service(config=config)
    client = client_for(instance)
    assert client.get("/api/admin/indexnow").status_code == 401
    status = client.get("/api/admin/indexnow", headers=AUTH).json()
    assert status["enabled"] is False and status["configured"] is False
    assert status["key_file_url"] is None and status["history"] == []
    assert calls == [] and rows.rows == []
    response = client.post("/api/admin/indexnow/submit", headers=AUTH, json={"urls": ["/contact"]})
    assert response.status_code == 409
    assert response.json()["detail"]["state"] == "disabled"
    assert calls == [] and rows.rows == []


@pytest.mark.parametrize("key", ["", "short", "wrong/key-123", "bad key 123", "a" * 129, "key-abc\n123"])
def test_invalid_keys_never_expose_root_key_file_or_submit(key):
    config = indexnow.IndexNowConfig.from_env({"INDEXNOW_ENABLED": "true", "INDEXNOW_KEY": key})
    instance, calls, rows = service(config=config)
    assert not config.active and config.key_path is None
    assert client_for(instance).get("/test-key-1234567890abcdef.txt").status_code == 404
    assert asyncio.run(instance.submit(["/contact"]))["state"] == "disabled"
    assert calls == [] and rows.rows == []


@pytest.mark.parametrize("value", [
    "https://other.example/contact", "http://rajeevfreelancer.com/contact", "https://www.rajeevfreelancer.com/contact",
    "https://rajeevfreelancer.com:443/contact", "https://name@rajeevfreelancer.com/contact", "//evil.example/path",
    "/contact?campaign=test", "/contact#form", "/admin", "/api/page/test", "/%61dmin", "/%252fadmin",
    "/a/../admin", "/a//b", "/back\\slash", "/contact/", "/bad\npath",
])
def test_unsafe_noncanonical_or_private_urls_are_rejected_before_page_lookup(value):
    async def forbidden(path): raise AssertionError("Invalid URL must not reach a page lookup")
    instance, calls, rows = service(validator=forbidden)
    result = asyncio.run(instance.submit([value]))
    assert result["state"] == "rejected" and result["submitted"] == 0
    assert calls == [] and rows.rows == []


@pytest.mark.parametrize("code", [200, 202])
def test_approved_batch_is_deduplicated_queued_and_sent_once_without_claiming_indexing(code):
    instance, calls, rows = service(code=code)
    result = asyncio.run(instance.submit(["/contact", indexnow.ORIGIN + "/contact", "/blog/published"]))
    assert result["state"] == "sent" and result["submitted"] == 2 and result["accepted"] is True
    assert result["indexed"] is False and result["validation_pending"] is (code == 202)
    assert result["status"] == code and result["attempts"] == 1
    assert rows.inserted[0]["state"] == "queued" and rows.rows[0]["state"] == "sent"
    assert len(calls) == 1
    endpoint, payload = calls[0]
    assert endpoint == "https://api.indexnow.org/indexnow"
    assert payload == {"host": "rajeevfreelancer.com", "key": KEY,
        "keyLocation": indexnow.ORIGIN + "/" + KEY + ".txt",
        "urlList": [indexnow.ORIGIN + "/contact", indexnow.ORIGIN + "/blog/published"]}
    assert KEY not in json.dumps(rows.rows) and KEY not in json.dumps(result)


@pytest.mark.parametrize("eligibility", [
    {"eligible": False, "status_code": 404, "reason": "not_found"},
    {"eligible": False, "status_code": 200, "reason": "noindex"},
    {"eligible": False, "status_code": 200, "reason": "unreviewed"},
    {"eligible": True, "status_code": 200, "canonical_url": indexnow.ORIGIN + "/different"},
    {"eligible": True, "status_code": 301, "canonical_url": indexnow.ORIGIN + "/hidden"},
])
def test_ineligible_or_noncanonical_page_rejects_whole_batch_without_partial_submission(eligibility):
    async def validate(path):
        if path == "/hidden": return eligibility
        return {"eligible": True, "status_code": 200, "canonical_url": indexnow.ORIGIN + path}
    instance, calls, rows = service(validator=validate)
    result = asyncio.run(instance.submit(["/contact", "/hidden"]))
    assert result["state"] == "rejected" and result["submitted"] == 0
    assert result["rejected"][0]["position"] == 1
    assert calls == [] and rows.rows == []


def test_batch_cap_applies_before_validation_and_publication_is_explicit():
    instance, calls, rows = service()
    result = asyncio.run(instance.submit(["/contact"] * 101))
    assert result["state"] == "rejected" and calls == [] and rows.rows == []
    assert client_for(instance).post("/api/admin/indexnow/submit", headers=AUTH, json={"urls": ["/contact"] * 101}).status_code == 422
    result = asyncio.run(instance.submit([f"/blog/approved-{n}" for n in range(100)]))
    assert result["submitted"] == 100 and len(calls) == 1


@pytest.mark.parametrize("code,reason", [(400, "invalid_payload"), (403, "ownership_verification_failed"),
    (422, "host_or_key_rejected"), (429, "rate_limited"), (500, "upstream_error")])
def test_upstream_rejection_is_recorded_as_failed_without_retry(code, reason):
    instance, calls, rows = service(code=code)
    result = asyncio.run(instance.submit(["/contact"]))
    assert result["state"] == "failed" and result["accepted"] is False and result["indexed"] is False
    assert result["reason"] == reason and len(calls) == 1
    assert rows.rows[0]["state"] == "failed" and rows.rows[0]["status"] == code


def test_exception_details_and_key_are_never_persisted_or_returned():
    instance, calls, rows = service(error=RuntimeError("fake request secret " + KEY))
    result = asyncio.run(instance.submit(["/contact"]))
    assert result["state"] == "failed" and result["reason"] == "submission_request_failed"
    assert KEY not in json.dumps(result) and KEY not in json.dumps(rows.rows)
    assert len(calls) == 1


def test_storage_failure_prevents_submission_and_key_route_is_exact_and_public():
    class Broken(Collection):
        async def insert_one(self, row): raise RuntimeError("database unavailable")
    instance, calls, _ = service(collection=Broken())
    assert asyncio.run(instance.submit(["/contact"]))["reason"] == "queue_storage_unavailable"
    assert calls == []
    instance, calls, rows = service()
    client = client_for(instance)
    response = client.get("/" + KEY + ".txt")
    assert response.status_code == 200 and response.text == KEY
    assert response.headers["content-type"].startswith("text/plain")
    assert client.head("/" + KEY + ".txt").status_code == 200
    assert client.get("/different-key-123.txt").status_code == 404
    assert client.post("/api/admin/indexnow/submit", json={"paths": ["/contact"]}).status_code == 401
    submitted = client.post("/api/admin/indexnow/submit", headers=AUTH, json={"paths": ["/contact"]})
    assert submitted.status_code == 200 and submitted.json()["accepted"] is True
    history = client.get("/api/admin/indexnow", headers=AUTH).json()
    assert history["history"][0]["state"] == "sent" and history["history"][0]["indexed"] is False
    assert history["key_file_url"] == indexnow.ORIGIN + "/" + KEY + ".txt"


def test_default_http_adapter_has_fixed_endpoint_timeout_and_does_not_follow_redirects(monkeypatch):
    calls = []
    class MockClient:
        def __init__(self, **kwargs): calls.append(kwargs)
        async def __aenter__(self): return self
        async def __aexit__(self, *args): return False
        async def post(self, endpoint, json):
            calls.append((endpoint, json)); return SimpleNamespace(status_code=202)
    monkeypatch.setattr(indexnow.httpx, "AsyncClient", MockClient)
    assert asyncio.run(indexnow._send(indexnow.ENDPOINT, {"urlList": []})) == 202
    assert calls == [{"timeout": 8, "follow_redirects": False}, ("https://api.indexnow.org/indexnow", {"urlList": []})]


def legacy_service(stored, *, environ=None):
    rows = Collection(); sends = []; reads = []
    class Settings:
        async def find_one(self, query, projection=None):
            reads.append(copy.deepcopy(query)); return copy.deepcopy(stored)
        async def update_one(self, query, update):
            assert stored is not None and query == {"key": "indexnow", "token": stored["token"]}
            assert set(update["$set"]) == {"enabled"}
            stored.update(update["$set"])
    async def validate(path): return {"eligible": True, "status_code": 200, "canonical_url": indexnow.ORIGIN + path}
    async def post(endpoint, payload): sends.append(copy.deepcopy(payload)); return 200
    instance = indexnow.IndexNowService(db=SimpleNamespace(indexnow_submissions=rows, settings=Settings()),
        validator=validate, config=indexnow.IndexNowConfig.from_env(environ or {}), post=post)
    return instance, sends, reads, rows


def test_retained_legacy_configuration_is_read_without_reset_or_auto_submission():
    stored = {"key": "indexnow", "token": KEY, "enabled": True}
    original = copy.deepcopy(stored)
    instance, sends, reads, rows = legacy_service(stored)
    status = asyncio.run(instance.status())
    assert status["configuration_source"] == "legacy_stored"
    assert status["enabled"] is True and status["automatic_notifications"] is True
    assert stored == original and sends == [] and rows.rows == []
    assert status["key_file_url"] == indexnow.ORIGIN + "/" + KEY + ".txt"
    assert asyncio.run(instance.key_file_response("/" + KEY + ".txt")).body.decode() == KEY
    assert asyncio.run(instance.key_file_response("/robots.txt")) is None
    assert client_for(instance).get("/api/indexnow-key").text == KEY
    result = asyncio.run(instance.notify_existing(["/contact"]))
    assert result["state"] == "sent" and result["source"] == "automatic"
    assert sends[0]["key"] == KEY and sends[0]["keyLocation"] == status["key_file_url"]
    assert stored == original


def test_legacy_disabled_state_is_preserved_and_existing_authenticated_toggle_only_changes_enabled():
    stored = {"key": "indexnow", "token": KEY, "enabled": False}
    instance, sends, reads, rows = legacy_service(stored)
    assert asyncio.run(instance.notify_existing(["/contact"]))["state"] == "disabled"
    assert sends == [] and rows.rows == [] and stored["enabled"] is False
    client = client_for(instance)
    assert client.put("/api/admin/indexnow", json={"enabled": True}).status_code == 401
    response = client.put("/api/admin/indexnow", headers=AUTH, json={"enabled": True})
    assert response.status_code == 200 and response.json()["enabled"] is True
    assert stored == {"key": "indexnow", "token": KEY, "enabled": True}
    assert sends == []  # Changing readiness never itself submits a URL.


def test_environment_override_never_reads_or_mutates_retained_database_configuration():
    stored = {"key": "indexnow", "token": KEY, "enabled": True}
    instance, sends, reads, rows = legacy_service(stored, environ={"INDEXNOW_ENABLED": "false"})
    status = asyncio.run(instance.status())
    assert status["configuration_source"] == "environment" and status["enabled"] is False
    assert reads == [] and sends == [] and stored["enabled"] is True
    assert client_for(instance).put("/api/admin/indexnow", headers=AUTH, json={"enabled": True}).status_code == 409
    assert stored == {"key": "indexnow", "token": KEY, "enabled": True}


def test_missing_legacy_configuration_never_creates_token_or_enables_notifications():
    instance, sends, reads, rows = legacy_service(None)
    status = asyncio.run(instance.status())
    assert status["configuration_source"] == "unset" and status["enabled"] is False
    assert asyncio.run(instance.notify_existing(["/contact"]))["state"] == "disabled"
    assert client_for(instance).get("/api/indexnow-key").status_code == 404
    assert sends == [] and rows.rows == []


def test_new_environment_configuration_requires_explicit_automatic_mode():
    instance, sends, rows = service(config=indexnow.IndexNowConfig.from_env({"INDEXNOW_ENABLED": "true", "INDEXNOW_KEY": KEY}))
    assert asyncio.run(instance.notify_existing(["/contact"]))["reason"] == "automatic_notifications_not_enabled"
    assert sends == []
    instance, sends, rows = service(config=indexnow.IndexNowConfig.from_env({"INDEXNOW_ENABLED": "true", "INDEXNOW_KEY": KEY, "INDEXNOW_AUTOMATIC_ENABLED": "true"}))
    assert asyncio.run(instance.notify_existing(["/contact"]))["accepted"] is True
    assert len(sends) == 1


def test_configuration_loader_outage_fails_closed_without_key_or_network():
    async def failed(): raise RuntimeError("database unavailable")
    instance, sends, rows = service(config=indexnow.IndexNowConfig.from_env({}))
    instance.config_loader = failed
    assert asyncio.run(instance.current_config()).configuration_source == "unavailable"
    assert asyncio.run(instance.submit(["/contact"]))["state"] == "disabled"
    assert sends == [] and rows.rows == []
