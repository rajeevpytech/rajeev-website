"""Provider adapters resolve current private profiles without leaking credentials.

SDK and REST transports are local fakes. No provider, MongoDB, storage, or
publication request occurs in these integration regressions.
"""

import ast
import asyncio
import base64
import copy
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
from types import ModuleType, SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest


BACKEND = Path(__file__).resolve().parents[1]
RAW_IMAGE = b"local-image-response-bytes"


def load_module(path, name, monkeypatch):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    monkeypatch.setitem(sys.modules, name, module)
    spec.loader.exec_module(module)
    return module


def extract(path, names, scope):
    tree = ast.parse(path.read_text())
    nodes = [node for node in tree.body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name in names]
    assert {node.name for node in nodes} == set(names)
    for node in nodes:
        node.decorator_list = []
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(path), "exec"), scope)


@pytest.fixture
def runtime(monkeypatch):
    monkeypatch.syspath_prepend(str(BACKEND))
    env = SimpleNamespace(
        db=object(), resolved_dbs=[], sdk_calls=[], http_calls=[], client_options=[],
        sdk_text="A local SDK response", sdk_error=None, credential_error=None,
        http_status=200, profiles={
            "text": {"provider": "emergent", "api_key": "saved-text-key-A", "model": "gemini-3-flash-preview", "key_source": "admin"},
            "image": {"provider": "emergent", "api_key": "saved-image-key-A", "model": "gemini-3.1-flash-image-preview", "key_source": "admin"},
        },
    )
    credentials = ModuleType("api_credentials")

    async def current_profiles(db):
        env.resolved_dbs.append(db)
        if env.credential_error:
            raise env.credential_error
        return copy.deepcopy(env.profiles)

    credentials.get_runtime_credentials = current_profiles
    monkeypatch.setitem(sys.modules, "api_credentials", credentials)
    for package in ("emergentintegrations", "emergentintegrations.llm"):
        module = ModuleType(package)
        module.__path__ = []
        monkeypatch.setitem(sys.modules, package, module)
    chat_module = ModuleType("emergentintegrations.llm.chat")

    class UserMessage:
        def __init__(self, text):
            self.text = text

    class LlmChat:
        def __init__(self, api_key, session_id, system_message):
            self.call = {"api_key": api_key, "session": session_id, "system": system_message}

        def with_model(self, provider, model):
            self.call.update(provider=provider, model=model)
            return self

        def with_params(self, **params):
            self.call["params"] = params
            return self

        async def send_message(self, message):
            env.sdk_calls.append({**copy.deepcopy(self.call), "kind": "text", "prompt": message.text})
            if env.sdk_error:
                raise env.sdk_error
            return env.sdk_text

        async def send_message_multimodal_response(self, message):
            env.sdk_calls.append({**copy.deepcopy(self.call), "kind": "image", "prompt": message.text})
            if env.sdk_error:
                raise env.sdk_error
            return "", [{"data": base64.b64encode(RAW_IMAGE).decode()}]

    chat_module.LlmChat, chat_module.UserMessage = LlmChat, UserMessage
    monkeypatch.setitem(sys.modules, "emergentintegrations.llm.chat", chat_module)
    module = load_module(BACKEND / "ai_runtime.py", "ai_runtime", monkeypatch)

    class Response:
        @property
        def status_code(self):
            return env.http_status

        def json(self):
            if env.http_status != 200:
                return {"error": {"status": "UNAUTHENTICATED", "message": "invalid API key echoed-sensitive-provider-value"}}
            return {"candidates": [{"content": {"parts": [
                {"text": "A local Google response"},
                {"inlineData": {"mimeType": "image/png", "data": base64.b64encode(RAW_IMAGE).decode()}},
            ]}}]}

    class AsyncClient:
        def __init__(self, **options):
            env.client_options.append(options)

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def post(self, url, headers, json):
            env.http_calls.append({"url": url, "headers": copy.deepcopy(headers), "body": copy.deepcopy(json)})
            return Response()

    monkeypatch.setattr(module.httpx, "AsyncClient", AsyncClient)
    env.module = module
    return env


def test_saved_text_and_image_profiles_are_resolved_again_on_every_generation(runtime):
    async def scenario():
        assert await runtime.module.generate_text(runtime.db, "First text", "System", "first-text") == runtime.sdk_text
        assert await runtime.module.generate_image(runtime.db, "First image", "first-image") == RAW_IMAGE
        runtime.profiles["text"].update(api_key="saved-text-key-B", model="gemini-updated-text-model")
        runtime.profiles["image"].update(api_key="saved-image-key-B", model="gemini-updated-image-model")
        await runtime.module.generate_text(runtime.db, "Second text", "System", "second-text")
        assert await runtime.module.generate_image(runtime.db, "Second image", "second-image") == RAW_IMAGE

    asyncio.run(scenario())
    assert runtime.resolved_dbs == [runtime.db] * 4
    assert [call["api_key"] for call in runtime.sdk_calls] == [
        "saved-text-key-A", "saved-image-key-A", "saved-text-key-B", "saved-image-key-B",
    ]
    assert [call["model"] for call in runtime.sdk_calls][-2:] == ["gemini-updated-text-model", "gemini-updated-image-model"]
    assert runtime.http_calls == []


def test_environment_resolved_emergent_profiles_keep_text_and_cover_sdk_compatibility(runtime, monkeypatch):
    # The vault resolver owns ENV precedence. Exercise the environment-origin
    # profiles it returns through both actual runtime adapters.
    monkeypatch.setenv("EMERGENT_LLM_KEY", "local-environment-emergent-key")
    for profile in runtime.profiles.values():
        profile.update(api_key=os.environ["EMERGENT_LLM_KEY"], key_source="environment")

    async def scenario():
        await runtime.module.generate_text(runtime.db, "Text", "System", "env-text")
        assert await runtime.module.generate_image(runtime.db, "Cover", "env-image") == RAW_IMAGE

    asyncio.run(scenario())
    assert [call["kind"] for call in runtime.sdk_calls] == ["text", "image"]
    assert [call["api_key"] for call in runtime.sdk_calls] == ["local-environment-emergent-key"] * 2
    assert runtime.sdk_calls[1]["params"] == {"modalities": ["image", "text"]}
    assert runtime.http_calls == []


def test_direct_google_uses_matching_text_and_image_keys_only_at_fixed_google_host(runtime, monkeypatch):
    monkeypatch.setenv("EMERGENT_LLM_KEY", "unrelated-emergent-proxy-key")
    runtime.profiles["text"].update(provider="google", api_key="google-text-only-key")
    runtime.profiles["image"].update(provider="google", api_key="google-image-only-key")

    async def scenario():
        assert await runtime.module.generate_text(runtime.db, "Text", "System", "google-text") == "A local Google response"
        assert await runtime.module.generate_image(runtime.db, "Cover", "google-image") == RAW_IMAGE

    asyncio.run(scenario())
    assert runtime.sdk_calls == []
    assert [call["headers"]["x-goog-api-key"] for call in runtime.http_calls] == ["google-text-only-key", "google-image-only-key"]
    assert all(call["url"].startswith("https://generativelanguage.googleapis.com/v1beta/models/") for call in runtime.http_calls)
    assert all("?" not in call["url"] for call in runtime.http_calls)
    assert all(options["follow_redirects"] is False for options in runtime.client_options)
    assert runtime.http_calls[1]["body"]["generationConfig"]["responseModalities"] == ["TEXT", "IMAGE"]
    assert "unrelated-emergent-proxy-key" not in json.dumps(runtime.http_calls)
    assert "google-image-only-key" not in json.dumps(runtime.http_calls[1]["body"])
    assert "google-image-only-key" not in runtime.http_calls[1]["url"]


def test_missing_google_image_key_does_not_fall_back_to_an_emergent_key(runtime, monkeypatch):
    monkeypatch.setenv("EMERGENT_LLM_KEY", "an-emergent-key-cannot-authorize-google")
    runtime.profiles["image"].update(provider="google", api_key="")
    with pytest.raises(runtime.module.ProviderRuntimeError) as failure:
        asyncio.run(runtime.module.generate_image(runtime.db, "Cover", "missing-google-key"))
    assert failure.value.code == "credential_missing"
    assert runtime.sdk_calls == runtime.http_calls == []


@pytest.mark.parametrize("provider", ["google", "emergent"])
@pytest.mark.parametrize("purpose", ["text", "image"])
def test_provider_authentication_errors_are_classified_without_echoing_upstream_secrets(runtime, provider, purpose):
    runtime.profiles[purpose]["provider"] = provider
    runtime.http_status = 401
    runtime.sdk_error = RuntimeError("HTTP 401 invalid API key echoed-sensitive-provider-value https://example.invalid?key=echoed-sensitive-provider-value")
    call = (runtime.module.generate_text(runtime.db, "Text", "System", "error-text") if purpose == "text"
            else runtime.module.generate_image(runtime.db, "Image", "error-image"))
    with pytest.raises(runtime.module.ProviderRuntimeError) as failure:
        asyncio.run(call)
    assert failure.value.code == "authentication"
    assert "401" in str(failure.value)
    assert "echoed-sensitive-provider-value" not in str(failure.value)
    assert "https://example.invalid" not in str(failure.value)


def test_unavailable_vault_fails_closed_without_provider_calls_or_secret_echo(runtime):
    runtime.credential_error = RuntimeError("vault error containing local-private-ciphertext")
    with pytest.raises(runtime.module.ProviderRuntimeError) as failure:
        asyncio.run(runtime.module.generate_text(runtime.db, "Text", "System", "vault-error"))
    assert failure.value.code == "storage_unavailable"
    assert "local-private-ciphertext" not in str(failure.value)
    assert runtime.sdk_calls == runtime.http_calls == []


def test_blog_json_and_cover_helpers_use_the_runtime_profile_instead_of_reading_environment(runtime, monkeypatch):
    monkeypatch.delenv("EMERGENT_LLM_KEY", raising=False)
    runtime.sdk_text = '{"topic":"A locally generated topic"}'
    scope = {"ctx": {"db": runtime.db, "llm_gate": asyncio.Semaphore(1)}, "re": re, "json": json,
             "asyncio": asyncio, "_process_and_store": lambda raw, alt, slug, full: {"raw": raw, "alt": alt, "slug": slug},
             "logger": SimpleNamespace(warning=lambda message: pytest.fail(message))}
    extract(BACKEND / "autopilot.py", {"_llm_json", "generate_cover"}, scope)

    async def scenario():
        assert await scope["_llm_json"]("Topic", "System", "blog-json") == {"topic": "A locally generated topic"}
        cover = await scope["generate_cover"]("Editorial prompt", "Accessible cover", "local-cover")
        assert cover == {"raw": RAW_IMAGE, "alt": "Accessible cover", "slug": "local-cover"}

    asyncio.run(scenario())
    assert [call["api_key"] for call in runtime.sdk_calls] == ["saved-text-key-A", "saved-image-key-A"]
    assert runtime.resolved_dbs == [runtime.db] * 2


def private_settings():
    return {
        "seo": {"site_name": "Rajeev Freelancer", "canonical_domain": "https://rajeevfreelancer.com",
                "robots_index": True, "google_verification": "public-verification-value", "api_key": "private-seo-key"},
        "contact": {"email": "hello@rajeevfreelancer.com", "password": "private-contact-password"},
        "business": {"founder_name": "Rajeev", "metadata": {"client_secret": "private-nested-client-secret"}},
        "tracking": {"ga4_id": "G-PUBLIC", "items": [{"access_token": "private-nested-token", "label": "public-label"}]},
        "social": {}, "marketing": {"offers_enabled": True},
        "notifications": {"whatsapp_api_key": "private-notification-key"},
        "api_credentials": {"ciphertext": "private-vault-ciphertext"},
    }


PRIVATE_VALUES = ["private-seo-key", "private-contact-password", "private-nested-client-secret",
                  "private-nested-token", "private-notification-key", "private-vault-ciphertext"]


def test_public_settings_view_filters_nested_secrets_and_returns_a_detached_copy(runtime):
    source = private_settings()
    original = copy.deepcopy(source)
    result = runtime.module.public_settings_view(source)
    assert not any(secret in json.dumps(result) for secret in PRIVATE_VALUES)
    assert result["seo"]["google_verification"] == "public-verification-value"
    assert result["tracking"]["ga4_id"] == "G-PUBLIC"
    assert result["tracking"]["items"] == [{"label": "public-label"}]
    result["seo"]["site_name"] = "Changed client-side copy"
    assert source == original


def test_real_public_settings_route_and_ssr_bootstrap_exclude_private_credentials(runtime, monkeypatch, tmp_path):
    settings = private_settings()

    async def get_settings():
        return settings

    scope = {"_get_site_settings": get_settings}
    extract(BACKEND / "server.py", {"public_site_settings"}, scope)
    app = FastAPI()
    app.add_api_route("/api/settings", scope["public_site_settings"])
    response = TestClient(app).get("/api/settings")
    assert response.status_code == 200
    public_seo = load_module(BACKEND / "public_seo.py", "provider_test_public_seo", monkeypatch)
    document = public_seo.html_document(settings=settings, path="/provider-test", title="Local public page",
        description="A local page privacy fixture.", body="<p>Existing public content remains readable.</p>", build_dir=tmp_path)
    assert not any(secret in response.text or secret in document for secret in PRIVATE_VALUES)
    bootstrap = re.search(r"window\.__RF_BOOTSTRAP__=(.*?)</script>", document, re.S)
    assert bootstrap is not None
    data = json.loads(bootstrap.group(1))
    assert data["settings"] == response.json()
    assert data["settings"]["seo"]["google_verification"] == "public-verification-value"


def test_latest_auth_failure_dominates_stale_success_and_key_presence_is_unverified(runtime, monkeypatch):
    workflow = load_module(BACKEND / "seo_workflow.py", "provider_test_workflow", monkeypatch)
    settings = {"enabled": True, "generated_count": 12, "last_success_at": "2026-10-20T09:00:00Z",
                "last_run_at": "2026-10-25T09:00:00Z", "last_error": "HTTP 401 invalid API key private-upstream-error-value"}
    failed = workflow.provider_diagnostic(settings, profiles=runtime.profiles)
    assert failed["state"] == "blocked_authentication"
    assert failed["provider_request_performed"] is False
    assert "private-upstream-error-value" not in json.dumps(failed)
    assert not any(profile["api_key"] in json.dumps(failed) for profile in runtime.profiles.values())
    settings.update(last_error=None, last_success_at=None, generated_count=0)
    present = workflow.provider_diagnostic(settings, profiles=runtime.profiles)
    assert present["state"] == "not_verified"
    assert present["credential_present"] is True
    assert present["provider_request_performed"] is False


def test_historical_nested_errors_are_redacted_without_mutating_copy_or_ordinary_fields(runtime):
    raw_error = "HTTP 401 invalid API key private-history-key https://upstream.invalid?key=private-history-key"
    history = {
        "title": "An existing published article title", "custom_topics": ["An owner-approved queued topic"],
        "generated_count": 0, "last_error": raw_error, "cover_error": raw_error,
        "steps": [{"name": "draft", "error": raw_error, "api_key": "private-step-api-key"},
                  {"name": "cover", "upstream": {"error": raw_error, "authorization": "private-auth-header"}, "duration_s": 0}],
        "credentials": {"text": "private-historical-profile"},
        "empty_outcomes": {"error": None, "last_error": 0, "cover_error": ""},
    }
    original = copy.deepcopy(history)
    result = runtime.module.redact_error_fields(history)
    assert history == original
    assert result["title"] == original["title"]
    assert result["custom_topics"] == original["custom_topics"]
    assert result["generated_count"] == result["steps"][1]["duration_s"] == 0
    assert result["empty_outcomes"] == {"error": None, "last_error": 0, "cover_error": ""}
    errors = [result["last_error"], result["cover_error"], result["steps"][0]["error"], result["steps"][1]["upstream"]["error"]]
    assert all("401" in message and "Admin" in message for message in errors)
    assert result["cover_error"].startswith("Cover image generation")
    assert "api_key" not in result["steps"][0]
    assert "authorization" not in result["steps"][1]["upstream"]
    assert "credentials" not in result
    assert not any(value in json.dumps(result) for value in [
        "private-history-key", "https://upstream.invalid", "private-step-api-key", "private-auth-header", "private-historical-profile",
    ])


def test_stale_auth_error_with_a_newer_success_is_unverified_instead_of_a_latest_failure(runtime, monkeypatch):
    workflow = load_module(BACKEND / "seo_workflow.py", "provider_test_workflow_newer_success", monkeypatch)
    settings = {"enabled": True, "generated_count": 0, "last_error": "HTTP 401 invalid API key private-stale-error",
                "last_run_at": "2026-10-25T14:00:00+05:30", "last_success_at": "2026-10-25T09:00:00Z"}
    original = copy.deepcopy(settings)
    result = workflow.provider_diagnostic(settings, profiles=runtime.profiles)
    assert settings == original
    assert result["state"] == "not_verified"
    assert result["failure_is_latest"] is False
    assert result["latest_failure"] is None
    assert result["credential_present"] is True
    assert result["provider_request_performed"] is False
    assert result["generated_count"] == 0
    assert "private-stale-error" not in json.dumps(result)
