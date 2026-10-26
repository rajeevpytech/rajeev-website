"""Compatibility catalog from the live public /api/services response (2026-10-25).

Keep the uploaded SERVICES records intact, and accept the live freelancer-*
paths without redirecting or renaming their indexed city pages.
"""
import json
from pathlib import Path

try:
    _CANONICAL_POLICY = json.loads(Path(__file__).with_name("canonical-path-map.json").read_text(encoding="utf-8"))
    EXACT_CANONICAL_PATHS = _CANONICAL_POLICY.get("preferences", {})
    BLOCKED_FALLBACK_TARGETS = frozenset(_CANONICAL_POLICY.get("blockedFallbackTargets", []))
    ELIGIBLE_DEFAULT_LOCATION_SLUGS = frozenset(_CANONICAL_POLICY.get("eligibleDefaultLocationSlugs", []))
except (OSError, ValueError):
    EXACT_CANONICAL_PATHS = {}
    BLOCKED_FALLBACK_TARGETS = frozenset()
    ELIGIBLE_DEFAULT_LOCATION_SLUGS = frozenset()

LIVE_SERVICES = json.loads(Path(__file__).with_name("live_services.json").read_text(encoding="utf-8"))["services"]


def with_live_services(primary):
    catalog = {s["slug"]: dict(s) for s in primary}
    for service in LIVE_SERVICES:
        catalog.setdefault(service["slug"], dict(service))
    return catalog


def source_service_slug(slug):
    return slug.replace("freelancer-", "freelance-", 1) if slug.startswith("freelancer-") else slug


PREFERRED_SERVICE_SLUGS = {
    source_service_slug(service["slug"]): service["slug"]
    for service in LIVE_SERVICES
    if service["slug"].startswith("freelancer-")
}


def canonical_service_path(path):
    """Retain source URLs as working aliases; consolidate signals on live paths."""
    from urllib.parse import unquote
    key = "/" + unquote(str(path)).strip("/") if str(path).strip("/") else "/"
    if key in EXACT_CANONICAL_PATHS:
        return EXACT_CANONICAL_PATHS[key]
    first, separator, rest = key.lstrip("/").partition("/")
    preferred = PREFERRED_SERVICE_SLUGS.get(first)
    if not preferred:
        return path
    # Unseen/new/legacy-locality counterparts may be missing or review-gated.
    # Preserve an existing source document rather than consolidating it into
    # such a fallback; exact indexed evidence above is the only exception.
    if separator and ("/" in rest or rest not in ELIGIBLE_DEFAULT_LOCATION_SLUGS):
        return key
    target = "/" + preferred + ("/" + rest if separator else "")
    target = EXACT_CANONICAL_PATHS.get(target, target)
    return key if target in BLOCKED_FALLBACK_TARGETS else target
