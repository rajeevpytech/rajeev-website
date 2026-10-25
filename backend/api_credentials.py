"""Authenticated provider settings, encrypted separately from public site data.

Only explicit saves write the vault. Neither reads nor application startup make
provider requests. Runtime callers resolve saved overrides on each operation.
"""
import asyncio
import base64
import copy
import hashlib
import hmac
import json
import os
import re
from datetime import datetime, timezone

from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Depends, HTTPException, Request, Response
import httpx

DOC_ID = "api_credentials_v1"
PROVIDERS = ("emergent", "google")
DEFAULT_MODELS = {
    "text": {"emergent": "gemini-3-flash-preview", "google": "gemini-3-flash-preview"},
    "image": {"emergent": "gemini-3.1-flash-image-preview", "google": "gemini-3.1-flash-image"},
}
TEXT_MODELS = ["gemini-3-flash-preview", "gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview", "gemini-2.5-flash"]
IMAGE_MODELS = ["gemini-3.1-flash-image", "gemini-3.1-flash-image-preview", "gemini-3-pro-image", "gemini-3-pro-image-preview", "gemini-nano-banana-2.1", "gemini-3.1-flash-lite-image", "gemini-2.5-flash-image"]
MODEL_PATTERN = re.compile(r"gemini-[a-z0-9][a-z0-9.-]{0,79}\Z")
SETUP_GUIDE = "Set a stable API_SETTINGS_ENCRYPTION_KEY (a Fernet key) on the backend server, then restart once. Keep it backed up; changing or losing it makes saved credentials unreadable. A strong, explicitly configured JWT_SECRET can be used as a compatibility fallback. Never put either server secret in frontend environment variables."


class ProviderSettingsError(Exception):
    """Safe fixed diagnostic; never contains an API key or upstream body."""
    def __init__(self, code, message, status_code=503):
        self.code, self.message, self.status_code = code, message, status_code
        super().__init__(message)


def protection():
    dedicated = os.environ.get("API_SETTINGS_ENCRYPTION_KEY", "").strip()
    if dedicated:
        try:
            return Fernet(dedicated.encode("ascii")), {"available": True, "protection_source": "dedicated", "setup_required": False, "guide": SETUP_GUIDE}
        except (ValueError, UnicodeError):
            return None, {"available": False, "protection_source": "none", "setup_required": True, "error_code": "invalid_protection_key", "guide": SETUP_GUIDE}
    secret = os.environ.get("JWT_SECRET", "")
    weak = any(word in secret.casefold() for word in ("changeme", "change-me", "replace-me", "your-secret", "jwt-secret", "development", "example"))
    if len(secret) >= 32 and len(set(secret)) >= 12 and not weak:
        derived = hmac.new(secret.encode("utf-8"), b"rajeevfreelancer/api-credentials/fernet/v1", hashlib.sha256).digest()
        return Fernet(base64.urlsafe_b64encode(derived)), {"available": True, "protection_source": "jwt_derived", "setup_required": False, "guide": SETUP_GUIDE}
    return None, {"available": False, "protection_source": "none", "setup_required": True, "error_code": "protection_key_missing", "guide": SETUP_GUIDE}


def _env_provider(target):
    # A Google key alone never changes the original Emergent runtime provider.
    return os.environ.get(f"AI_{target.upper()}_PROVIDER", "emergent").strip().lower()


def _environment_key(target, provider):
    if provider == "emergent":
        return os.environ.get("EMERGENT_LLM_KEY", "").strip()
    names = (["GEMINI_IMAGE_API_KEY", "GOOGLE_IMAGE_API_KEY"] if target == "image" else []) + ["GEMINI_API_KEY", "GOOGLE_API_KEY"]
    return next((os.environ[name].strip() for name in names if os.environ.get(name, "").strip()), "")


def _validate_model(model):
    if not isinstance(model, str) or not MODEL_PATTERN.fullmatch(model):
        raise ProviderSettingsError("invalid_model", "Select a valid Gemini model identifier.", 422)
    return model


async def _load(db):
    row = await db.settings.find_one({"_id": DOC_ID}) or {}
    cipher, storage = protection()
    saved = {}
    if row.get("encrypted"):
        if cipher is None:
            raise ProviderSettingsError("vault_locked", "Saved credentials are locked. Restore the stable server protection key before using or editing them.")
        try:
            saved = json.loads(cipher.decrypt(row["encrypted"].encode("ascii")).decode("utf-8"))
            if not isinstance(saved, dict) or saved.get("version") != 1:
                raise ValueError()
        except (InvalidToken, ValueError, TypeError, UnicodeError):
            raise ProviderSettingsError("vault_unreadable", "Saved credentials cannot be decrypted. Restore the original server protection key; existing saved data has not been changed.") from None
    return row, saved, cipher, storage


def _runtime_profile(saved, target):
    section = saved.get(target) or {}
    provider = section.get("provider") or _env_provider(target)
    if provider not in PROVIDERS:
        raise ProviderSettingsError("invalid_provider", "Configure the text and image providers as Emergent or Google.")
    model = section.get("model") or os.environ.get(f"AI_{target.upper()}_MODEL", "").strip() or DEFAULT_MODELS[target][provider]
    _validate_model(model)
    key = (section.get("keys") or {}).get(provider) or _environment_key(target, provider)
    return {"provider": provider, "model": model, "api_key": key,
            "key_source": "saved" if (section.get("keys") or {}).get(provider) else "environment" if key else "none"}


def _runtime(saved, storage):
    return {**{target: _runtime_profile(saved, target) for target in ("text", "image")}, "storage": storage}


def _profile_view(profile, saved, target):
    provider = profile["provider"]
    return {"provider": provider, "model": profile["model"], "key_configured": bool(profile["api_key"]),
            "key_source": profile["key_source"], "saved_key_configured": bool(((saved.get(target) or {}).get("keys") or {}).get(provider)),
            "environment_key_configured": bool(_environment_key(target, provider))}


async def get_runtime_credentials(db):
    """INTERNAL ONLY: returned keys must never be serialized or logged."""
    _, saved, _, storage = await _load(db)
    return _runtime(saved, storage)


def _provider_metadata():
    return {target: {provider: {"label": "Emergent Gemini" if provider == "emergent" else "Google Gemini (direct)",
                               "models": TEXT_MODELS if target == "text" else IMAGE_MODELS,
                               "default_model": DEFAULT_MODELS[target][provider]} for provider in PROVIDERS} for target in ("text", "image")}


async def settings_view(db):
    try:
        row, saved, _, storage = await _load(db)
        runtime = _runtime(saved, storage)
    except ProviderSettingsError as exc:
        # Even a locked vault must offer a safe, actionable admin diagnostic.
        _, storage = protection()
        configuration_only = exc.code in {"invalid_provider", "invalid_model"}
        storage = {**storage, "available": bool(storage["available"] and configuration_only), "setup_required": not configuration_only,
                   "error_code": exc.code, "guide": exc.message + " " + SETUP_GUIDE}
        profiles = {}
        for target in ("text", "image"):
            profiles[target] = {"provider": "emergent", "model": DEFAULT_MODELS[target]["emergent"], "key_configured": False,
                                "key_source": "none", "saved_key_configured": False, "environment_key_configured": False}
            if configuration_only:
                try:
                    profiles[target] = _profile_view(_runtime_profile(saved, target), saved, target)
                except ProviderSettingsError:
                    pass  # Only the invalid section needs corrective defaults.
        # An unlocked vault with a bad provider/model remains editable. Keep
        # its optimistic-concurrency token so the Admin's GET → PUT can repair
        # configuration without a false revision conflict.
        return {"storage": storage, "providers": _provider_metadata(),
                "revision": row.get("revision", 0) if configuration_only else None,
                "updated_at": row.get("updated_at") if configuration_only else None,
                **profiles}
    result = {"storage": storage, "providers": _provider_metadata(), "revision": row.get("revision", 0), "updated_at": row.get("updated_at")}
    for target in ("text", "image"):
        result[target] = _profile_view(runtime[target], saved, target)
    return result


async def save_settings(db, payload):
    if set(payload) - {"text", "image", "expected_revision"} or not any(target in payload for target in ("text", "image")):
        raise ProviderSettingsError("invalid_settings", "Provide text or image provider settings only.", 422)
    row, saved, cipher, storage = await _load(db)
    if cipher is None:
        raise ProviderSettingsError("protection_key_missing", "Secure API storage is not configured. " + SETUP_GUIDE)
    revision = row.get("revision", 0)
    if "expected_revision" in payload and (type(payload["expected_revision"]) is not int or payload["expected_revision"] != revision):
        raise ProviderSettingsError("settings_changed", "Settings changed. Reload before saving again.", 409)
    updated = copy.deepcopy(saved) or {"version": 1}
    for target in ("text", "image"):
        if target not in payload:
            continue
        patch = payload[target]
        if not isinstance(patch, dict) or set(patch) - {"provider", "model", "api_key", "clear_key"}:
            raise ProviderSettingsError("invalid_settings", "Use only provider, model, api_key and clear_key fields.", 422)
        current = updated.get(target) or {}
        old_provider = current.get("provider") or _env_provider(target)
        provider = patch.get("provider", old_provider)
        if provider not in PROVIDERS:
            raise ProviderSettingsError("invalid_provider", "Select Emergent or Google.", 422)
        model = patch.get("model")
        if model is None:
            model = (current.get("model") or os.environ.get(f"AI_{target.upper()}_MODEL", "").strip()) if provider == old_provider else None
        model = model or DEFAULT_MODELS[target][provider]
        _validate_model(model)
        allowed = TEXT_MODELS if target == "text" else IMAGE_MODELS
        if model not in allowed:
            raise ProviderSettingsError("invalid_model", "Select one of the supported models shown in API Settings.", 422)
        if "api_key" in patch and not isinstance(patch["api_key"], str) or "clear_key" in patch and type(patch["clear_key"]) is not bool:
            raise ProviderSettingsError("invalid_key", "Use a password field for the API key and an explicit clear switch.", 422)
        key = patch.get("api_key", "").strip()
        clear = patch.get("clear_key", False)
        if clear and key:
            raise ProviderSettingsError("invalid_key", "Save a new key or clear the saved key, rather than doing both.", 422)
        if key and (not 20 <= len(key) <= 512 or any(ord(char) < 33 or ord(char) > 126 for char in key)):
            raise ProviderSettingsError("invalid_key", "Enter a valid provider key without spaces or control characters.", 422)
        keys = dict(current.get("keys") or {})
        if clear:
            keys.pop(provider, None)
        elif key:
            keys[provider] = key
        updated[target] = {"provider": provider, "model": model, "keys": keys}
    encrypted = cipher.encrypt(json.dumps(updated, separators=(",", ":")).encode("utf-8")).decode("ascii")
    document = {"key": "api_credentials", "revision": revision + 1, "encrypted": encrypted, "updated_at": datetime.now(timezone.utc).isoformat()}
    try:
        if row:
            outcome = await db.settings.update_one({"_id": DOC_ID, "revision": revision}, {"$set": document})
            changed = bool(outcome.matched_count)
        else:
            outcome = await db.settings.update_one({"_id": DOC_ID}, {"$setOnInsert": document}, upsert=True)
            changed = bool(outcome.upserted_id)
    except Exception:
        raise ProviderSettingsError("settings_not_saved", "Settings could not be saved. Reload before trying again.", 409) from None
    if not changed:
        raise ProviderSettingsError("settings_changed", "Settings changed. Reload before saving again.", 409)
    return await settings_view(db)


def safe_provider_error(exc):
    """Classify status only. Never inspect/echo an upstream exception string."""
    status = getattr(getattr(exc, "response", None), "status_code", None) or getattr(exc, "status_code", None)
    if status in {400, 401, 403}:
        return {"ok": False, "code": "provider_auth_or_access", "message": "The provider rejected this credential or model access. Check the selected provider, key, API permissions and billing in that provider's console."}
    if status == 404:
        return {"ok": False, "code": "model_unavailable", "message": "This model is unavailable for the selected provider or account. Choose another supported model."}
    if status == 429:
        return {"ok": False, "code": "provider_quota", "message": "The provider reported a quota or rate limit. Check account quota and billing, then try again."}
    return {"ok": False, "code": "provider_unavailable", "message": "The provider check could not complete. Check the provider service and server connection, then try again."}


def _fixed_probe_message(code):
    messages = {
        "key_missing": "Save a key for the selected provider, or configure its backend environment variable.",
        "model_access_ok": "Google accepted the credential and model lookup. Generation was not run; quota, model capability and image output still need a real generation check.",
        "readiness_only": "An Emergent image key is configured. No provider request or image generation was run. Generate a cover explicitly to validate image access and quota.",
        "text_generation_ok": "The selected Emergent text model completed a minimal request.",
    }
    for status in (401, 404, 429, 500):
        error = Exception()
        error.status_code = status
        result = safe_provider_error(error)
        messages[result["code"]] = result["message"]
    return messages[code]


async def probe_provider(profile, target):
    if not profile.get("api_key"):
        return {"ok": False, "code": "key_missing", "message": "Save a key for the selected provider, or configure its backend environment variable.", "generation_tested": False, "connection_tested": False}
    try:
        if profile["provider"] == "google":
            async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
                response = await client.get("https://generativelanguage.googleapis.com/v1beta/models/" + profile["model"], headers={"x-goog-api-key": profile["api_key"]})
                response.raise_for_status()
                metadata = response.json()
                if not isinstance(metadata, dict) or not metadata.get("name"):
                    raise ValueError()
            return {"ok": True, "code": "model_access_ok", "message": "Google accepted the credential and model lookup. Generation was not run; quota, model capability and image output still need a real generation check.", "generation_tested": False, "connection_tested": True}
        if target == "image":
            return {"ok": True, "code": "readiness_only", "message": "An Emergent image key is configured. No provider request or image generation was run. Generate a cover explicitly to validate image access and quota.", "generation_tested": False, "connection_tested": False}
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(api_key=profile["api_key"], session_id="api-settings-check", system_message="Reply briefly.").with_model("gemini", profile["model"])
        await asyncio.wait_for(chat.send_message(UserMessage(text="Reply with OK only.")), timeout=20)
        return {"ok": True, "code": "text_generation_ok", "message": "The selected Emergent text model completed a minimal request.", "generation_tested": True, "connection_tested": True}
    except Exception as exc:
        return {**safe_provider_error(exc), "generation_tested": False, "connection_tested": False}


async def _payload(request):
    try:
        body = await request.body()
        if len(body) > 16384:
            raise ValueError()
        value = json.loads(body)
        if not isinstance(value, dict):
            raise ValueError()
        return value
    except (ValueError, TypeError, UnicodeError):
        # Framework validation errors can echo raw inputs; keep keys out of all
        # our validation responses, including malformed request bodies.
        raise HTTPException(422, "Provide a valid API settings object.") from None


def build_router(db, get_current_admin, tester=None):
    router = APIRouter(prefix="/admin/api-settings")
    test_provider = tester or probe_provider

    @router.get("")
    async def view(response: Response, admin: dict = Depends(get_current_admin)):
        response.headers["Cache-Control"] = "no-store"
        return await settings_view(db)

    @router.put("")
    async def update(request: Request, response: Response, admin: dict = Depends(get_current_admin)):
        response.headers["Cache-Control"] = "no-store"
        try:
            return await save_settings(db, await _payload(request))
        except ProviderSettingsError as exc:
            raise HTTPException(exc.status_code, {"code": exc.code, "message": exc.message}) from None

    @router.post("/test")
    async def test(request: Request, response: Response, admin: dict = Depends(get_current_admin)):
        response.headers["Cache-Control"] = "no-store"
        payload = await _payload(request)
        if set(payload) != {"target"} or payload.get("target") not in {"text", "image"}:
            raise HTTPException(422, "Choose a text or image test of the saved settings.")
        target = payload["target"]
        try:
            runtime = await get_runtime_credentials(db)
            result = await test_provider(runtime[target], target)
        except ProviderSettingsError as exc:
            return {"ok": False, "code": exc.code, "message": exc.message, "target": target, "generation_tested": False, "connection_tested": False}
        except Exception as exc:
            result = {**safe_provider_error(exc), "generation_tested": False, "connection_tested": False}
        # Even an injected SDK adapter cannot return a response body or key.
        allowed_codes = {"key_missing", "model_access_ok", "readiness_only", "text_generation_ok", "provider_auth_or_access", "model_unavailable", "provider_quota", "provider_unavailable"}
        if result.get("code") not in allowed_codes:
            result = {**safe_provider_error(Exception()), "generation_tested": False, "connection_tested": False}
        safe_result = {"ok": bool(result.get("ok")), "code": result["code"], "message": _fixed_probe_message(result["code"]),
                       "generation_tested": bool(result.get("generation_tested")), "connection_tested": bool(result.get("connection_tested"))}
        return {**safe_result, "target": target, "provider": runtime[target]["provider"], "model": runtime[target]["model"]}

    return router
