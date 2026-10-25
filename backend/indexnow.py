"""Validated IndexNow notifications that preserve an existing configured feature.

No startup task, automatic retry, key generation or submission occurs on reads.
New configurations default to disabled/manual; retained enabled legacy hooks remain supported.
The caller supplies the current public-page eligibility check; no website URL is
fetched over the network by this module.
"""
import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone
import os
import re
from typing import Awaitable, Callable
from urllib.parse import unquote, urlsplit
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import AliasChoices, BaseModel, ConfigDict, Field

ORIGIN = "https://rajeevfreelancer.com"
HOST = "rajeevfreelancer.com"
ENDPOINT = "https://api.indexnow.org/indexnow"
MAX_URLS = 100
KEY_PATTERN = re.compile(r"^[A-Za-z0-9-]{8,128}$")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


@dataclass(frozen=True)
class IndexNowConfig:
    enabled: bool = False
    key: str = ""
    configuration_source: str = "environment"
    automatic_notifications: bool = False

    @classmethod
    def from_env(cls, environ=None):
        env = os.environ if environ is None else environ
        return cls(enabled=str(env.get("INDEXNOW_ENABLED", "false")).lower() in {"1", "true", "yes", "on"},
                   key=str(env.get("INDEXNOW_KEY", "")),
                   configuration_source="environment" if any(k in env for k in ("INDEXNOW_ENABLED", "INDEXNOW_KEY", "INDEXNOW_AUTOMATIC_ENABLED")) else "unset",
                   automatic_notifications=str(env.get("INDEXNOW_AUTOMATIC_ENABLED", "false")).lower() in {"1", "true", "yes", "on"})

    @property
    def valid_key(self):
        return bool(KEY_PATTERN.fullmatch(self.key))

    @property
    def active(self):
        return self.enabled and self.valid_key

    @property
    def key_path(self):
        return "/" + self.key + ".txt" if self.valid_key else None


def normalize_url(value: str) -> str:
    """Accept only a canonical-host public HTTPS URL or a clean root-relative path."""
    if not isinstance(value, str) or not value or len(value) > 2048:
        raise ValueError("invalid_url")
    if any(ord(c) < 33 for c in value) or any(c in value for c in "\\<>\"'"):
        raise ValueError("invalid_url")
    if "?" in value or "#" in value:
        raise ValueError("query_or_fragment_not_allowed")
    if value.startswith("/") and not value.startswith("//"):
        value = ORIGIN + value
    try:
        parsed = urlsplit(value)
        if parsed.scheme != "https" or parsed.netloc != HOST or parsed.username or parsed.password or parsed.port:
            raise ValueError("canonical_https_host_required")
    except (ValueError, TypeError):
        raise ValueError("canonical_https_host_required") from None
    path = parsed.path or "/"
    decoded = unquote(path)
    if not path.startswith("/") or "//" in decoded or "\\" in decoded or "%" in decoded:
        raise ValueError("ambiguous_path")
    if any(ord(c) < 33 for c in decoded) or any(part in {".", ".."} for part in decoded.split("/")):
        raise ValueError("ambiguous_path")
    if decoded.casefold().split("/")[1] in {"api", "admin"}:
        raise ValueError("private_path_not_allowed")
    if path != "/" and path.endswith("/"):
        raise ValueError("canonical_path_required")
    return ORIGIN + path


async def _send(endpoint, payload):
    # Fixed endpoint, no redirects and one bounded request. Do not log payloads.
    async with httpx.AsyncClient(timeout=8, follow_redirects=False) as client:
        response = await client.post(endpoint, json=payload)
        return response.status_code


class IndexNowService:
    def __init__(self, *, db, validator: Callable[[str], Awaitable[dict]], config=None, post=None, config_loader=None):
        self.db = db
        self.collection = db.indexnow_submissions
        self.config_loader = config_loader
        self.validator = validator
        self.config = config or IndexNowConfig.from_env()
        self.post = post or _send
        self._lock = asyncio.Lock()

    async def current_config(self):
        if self.config.configuration_source != "unset":
            return self.config
        try:
            if self.config_loader:
                stored = await self.config_loader()
            elif hasattr(self.db, "settings"):
                stored = await self.db.settings.find_one({"key": "indexnow"}, {"_id": 0})
            else:
                stored = None
        except Exception:
            return IndexNowConfig(configuration_source="unavailable")
        if not isinstance(stored, dict) or not stored.get("token"):
            return IndexNowConfig(configuration_source="unset")
        # Preserve the established feature's stored state. Read it; never generate,
        # migrate or overwrite keys/settings merely to display readiness.
        enabled = bool(stored.get("enabled", True))
        return IndexNowConfig(enabled=enabled, key=str(stored["token"]),
                              configuration_source="legacy_stored", automatic_notifications=enabled)

    async def set_enabled(self, enabled):
        config = await self.current_config()
        if config.configuration_source != "legacy_stored" or not config.valid_key or not hasattr(self.db, "settings"):
            raise HTTPException(409, detail="This configuration is controlled by server environment settings; no stored key was changed.")
        # Preserve the existing authenticated on/off control without creating or
        # resetting a token. A concurrent key change prevents this write matching.
        await self.db.settings.update_one({"key": "indexnow", "token": config.key}, {"$set": {"enabled": enabled}})
        return await self.status()

    async def key_file_response(self, path):
        if not re.fullmatch(r"/[A-Za-z0-9-]{8,128}\.txt", str(path)):
            return None
        config = await self.current_config()
        if config.valid_key and path == config.key_path:
            return Response(config.key, media_type="text/plain", headers={"Cache-Control": "public, max-age=300"})
        return None

    async def notify_existing(self, values):
        config = await self.current_config()
        if not config.active or not config.automatic_notifications:
            return {"state": "disabled", "submitted": 0, "status": None, "accepted": False, "indexed": False,
                    "reason": "automatic_notifications_not_enabled"}
        return await self.submit(values, source="automatic", _config=config)

    async def status(self):
        config = await self.current_config()
        history = await self.collection.find({}, {"_id": 0}).sort("created_at", -1).limit(15).to_list(15)
        return {"enabled": config.active, "environment_enabled": self.config.enabled,
                "configured": config.valid_key, "configuration_source": config.configuration_source,
                "automatic_notifications": config.active and config.automatic_notifications,
                "key_file_url": ORIGIN + config.key_path if config.key_path else None,
                "endpoint": ENDPOINT, "max_urls": MAX_URLS,
                "mode": "validated_automatic_and_manual" if config.active and config.automatic_notifications else "manual_submission_only",
                "accepted_is_not_indexed": True, "history": history,
                "last_ping": history[0] if history else None}

    async def submit(self, values, *, source="manual", _config=None):
        config = _config or await self.current_config()
        if not config.active:
            return {"state": "disabled", "submitted": 0, "status": None, "accepted": False, "indexed": False,
                    "reason": "not_enabled" if not config.enabled else "invalid_or_missing_key"}
        if not isinstance(values, list) or not 1 <= len(values) <= MAX_URLS:
            return {"state": "rejected", "submitted": 0, "status": None, "accepted": False, "indexed": False,
                    "reason": "provide_1_to_100_urls"}
        urls, seen, rejected = [], set(), []
        for position, value in enumerate(values):
            try:
                url = normalize_url(value)
            except ValueError as exc:
                rejected.append({"position": position, "reason": str(exc)})
                continue
            if url in seen:
                continue
            seen.add(url)
            try:
                eligibility = await self.validator(urlsplit(url).path)
            except Exception:
                eligibility = {}
            if not isinstance(eligibility, dict) or eligibility.get("eligible") is not True or eligibility.get("status_code") != 200:
                rejected.append({"position": position, "reason": "page_not_public_indexable_or_reviewed"})
            elif eligibility.get("canonical_url") != url:
                rejected.append({"position": position, "reason": "noncanonical_url"})
            else:
                urls.append(url)
        # Validate the entire administrator-requested batch before queuing anything.
        if rejected:
            return {"state": "rejected", "submitted": 0, "status": None, "accepted": False, "indexed": False,
                    "reason": "batch_contains_ineligible_urls", "rejected": rejected}
        if not urls:
            return {"state": "rejected", "submitted": 0, "status": None, "accepted": False, "indexed": False,
                    "reason": "no_eligible_urls"}
        record = {"id": uuid.uuid4().hex, "state": "queued", "created_at": now_iso(), "updated_at": now_iso(),
                  "source": "automatic" if source == "automatic" else "manual", "urls": urls,
                  "count": len(urls), "submitted": 0, "attempts": 0, "status": None,
                  "accepted": False, "indexed": False, "validation_pending": False}
        async with self._lock:
            try:
                await self.collection.insert_one(dict(record))
            except Exception:
                return {"state": "failed", "submitted": 0, "status": None, "accepted": False, "indexed": False,
                        "reason": "queue_storage_unavailable"}
            payload = {"host": HOST, "key": config.key, "keyLocation": ORIGIN + config.key_path, "urlList": urls}
            try:
                code = await self.post(ENDPOINT, payload)
                record.update(state="sent" if code in {200, 202} else "failed", status=code,
                              accepted=code in {200, 202}, submitted=len(urls), attempts=1,
                              validation_pending=code == 202)
                if code not in {200, 202}:
                    record["reason"] = {400: "invalid_payload", 403: "ownership_verification_failed",
                                        422: "host_or_key_rejected", 429: "rate_limited"}.get(code, "upstream_error")
            except Exception:
                record.update(state="failed", reason="submission_request_failed", attempts=1)
            record["updated_at"] = now_iso()
            try:
                await self.collection.update_one({"id": record["id"]}, {"$set": dict(record)})
            except Exception:
                record["persistence_warning"] = True
            record["message"] = "Notification accepted; crawling and indexing are not confirmed." if record["accepted"] else "No indexing confirmation. Review the submission status before retrying."
            return record


class SettingsInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    enabled: bool = Field(strict=True)


class SubmissionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    urls: list[str] = Field(min_length=1, max_length=MAX_URLS, validation_alias=AliasChoices("urls", "paths"))


def build_router(*, service: IndexNowService, get_current_admin):
    router = APIRouter()

    @router.get("/api/admin/indexnow")
    async def status(_admin=Depends(get_current_admin)):
        return await service.status()

    @router.put("/api/admin/indexnow")
    async def update_settings(body: SettingsInput, _admin=Depends(get_current_admin)):
        return await service.set_enabled(body.enabled)

    @router.post("/api/admin/indexnow/submit")
    async def submit(body: SubmissionInput, _admin=Depends(get_current_admin)):
        result = await service.submit(body.urls)
        if result["state"] == "disabled":
            raise HTTPException(409, detail=result)
        if result["state"] == "rejected":
            raise HTTPException(422, detail=result)
        return result

    @router.api_route("/api/indexnow-key", methods=["GET", "HEAD"], include_in_schema=False)
    async def legacy_key_file():
        config = await service.current_config()
        if not config.valid_key:
            raise HTTPException(404, detail="Not found")
        return Response(config.key, media_type="text/plain", headers={"Cache-Control": "public, max-age=300"})

    if service.config.key_path:
        async def key_file():
            return Response(service.config.key, media_type="text/plain", headers={"Cache-Control": "public, max-age=300"})
        router.add_api_route(service.config.key_path, key_file, methods=["GET", "HEAD"], include_in_schema=False)
    return router
