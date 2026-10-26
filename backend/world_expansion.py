"""Additive remote-service geography, loaded only by the new directory/routes.

The original location catalog is never mutated. Reading a candidate does not
write Mongo, call an LLM, submit a URL or approve search indexing.
"""
import copy
import json
import re
import unicodedata
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from live_service_catalog import LIVE_SERVICES, canonical_service_path
from new_market_content import build_new_market_content

CATALOG_PATH = Path(__file__).with_name("world-expansion-catalog.json")
SERVICE_MAP = {row["slug"]: dict(row) for row in LIVE_SERVICES}
SLUG = re.compile(r"^[^\W_]+(?:-[^\W_]+)*$", re.UNICODE)
REVIEW_CHECKS = ("geography_verified", "remote_delivery_confirmed", "content_reviewed", "business_claims_verified")


def _search_text(value):
    return "".join(c for c in unicodedata.normalize("NFKD", str(value)).casefold() if not unicodedata.combining(c))


@lru_cache(maxsize=1)
def catalog():
    """Build O(1) slug lookup once, without putting geography in the JS bundle."""
    from data import CITY_MAP
    raw = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    additional = {}
    for source in raw.get("locations", []):
        slug = str(source.get("loc_slug", ""))
        if not SLUG.fullmatch(slug) or slug in CITY_MAP or slug in additional:
            raise ValueError("Expansion catalog has an invalid or overlapping location slug")
        if not source.get("city") or not source.get("country") or not source.get("country_slug"):
            raise ValueError("Expansion catalog location is incomplete")
        additional[slug] = {**source, "is_world_expansion": True, "is_new_location": True, "seo_reviewed": False, "remote_only": True}
    base = {slug: dict(row) for slug, row in CITY_MAP.items()}
    combined = {**base, **additional}
    locations = tuple(sorted(combined.values(), key=lambda row: (_search_text(row["country"]), _search_text(row["city"]), row["loc_slug"])))
    summaries = {row["slug"]: row for row in raw.get("countries", [])}
    countries, by_country = {}, {}
    search = {}
    for row in locations:
        country_slug = row["country_slug"]
        by_country.setdefault(country_slug, []).append(row)
        summary = summaries.get(country_slug, {})
        countries.setdefault(country_slug, {"name": row["country"], "slug": country_slug, "code": row.get("country_code") or summary.get("code", ""), "count": 0})["count"] += 1
        search[row["loc_slug"]] = _search_text(" ".join(str(row.get(key, "")) for key in ("city", "country", "country_code", "admin1_name", "loc_slug")))
    return {"raw": raw, "additional": additional, "by_slug": combined, "locations": locations,
            "by_country": by_country, "search": search,
            "countries": sorted(countries.values(), key=lambda row: _search_text(row["name"])),
            "stats": {"base_location_count": len(base), "additional_location_count": len(additional),
                      "total_location_count": len(combined), "canonical_service_count": len(SERVICE_MAP),
                      "candidate_url_count": len(combined) * len(SERVICE_MAP), "approved_url_count": None,
                      "review_policy": "New location pages require an explicit factual and editorial review before indexing."}}


def expansion_location(slug, service_slug=None):
    if service_slug is not None and service_slug not in SERVICE_MAP:
        return None
    row = catalog()["additional"].get(slug)
    return copy.deepcopy(row) if row else None


def expansion_page_document(service, location, path=None):
    """A read-only draft. Persisting/approving requires the separate admin action."""
    location = copy.deepcopy(location)
    path = path or f"/{service['slug']}/{location['loc_slug']}"
    return {"key": f"{service['slug']}::{location['loc_slug']}", "canonical": path,
            "service": copy.deepcopy(service), "location": location,
            "content": build_new_market_content(service, location, world_expansion=True),
            "is_world_expansion": True, "new_world_expansion": True, "is_new_location": True, "seo_reviewed": False,
            "seo_noindex": True, "remote_only": True, "ai_generated": False}


async def _existing_page(db, service_slug, loc_slug):
    path = f"/{service_slug}/{loc_slug}"
    return await db.location_pages.find_one({"$or": [{"key": f"{service_slug}::{loc_slug}"}, {"canonical": path}, {"canonical": path + "/"}]}, {"_id": 0, "seo_reviewed_by": 0})


async def _original_collision(db, service_slug, loc_slug):
    aliases = {service_slug}
    if service_slug.startswith("freelancer-"):
        aliases.add(service_slug.replace("freelancer-", "freelance-", 1))
    clauses = []
    for alias in aliases:
        clauses += [{"key": f"{alias}::{loc_slug}"}, {"canonical": f"/{alias}/{loc_slug}"}, {"canonical": f"/{alias}/{loc_slug}/"}]
    return await db.location_pages.find_one({"$or": clauses, "new_world_expansion": {"$ne": True}}, {"_id": 0, "seo_reviewed_by": 0})


def public_expansion_document(doc):
    if not doc.get("new_world_expansion"):
        return doc
    return {key: value for key, value in doc.items() if key not in {"_id", "seo_reviewed_by", "review_checks", "review_evidence_notes"}}


def _valid_content(content):
    if not isinstance(content, dict):
        return False
    for key in ("title", "meta_description", "h1", "service_details", "local_context", "whatsapp_section"):
        if not isinstance(content.get(key), str) or not content[key].strip():
            return False
    if not isinstance(content.get("intro"), list) or not content["intro"] or not all(isinstance(value, str) and value.strip() for value in content["intro"]):
        return False
    for key, fields in (("why_choose", ("title", "text")), ("process", ("title", "text")), ("faqs", ("q", "a"))):
        if not isinstance(content.get(key), list) or not all(isinstance(row, dict) and all(isinstance(row.get(field), str) and row[field].strip() for field in fields) for row in content[key]):
            return False
    return True


async def directory_data(db, *, country="", q="", service="", page=1, page_size=24):
    """Bounded public response. No database writes or unbounded frontend payloads."""
    data = catalog()
    country, q = str(country).strip().lower(), str(q).strip()
    service = service or next(iter(SERVICE_MAP))
    if service not in SERVICE_MAP:
        raise HTTPException(404, "Service not found")
    if country and country not in data["by_country"]:
        raise HTTPException(404, "Country not found")
    if not isinstance(page, int) or page < 1 or not isinstance(page_size, int) or not 1 <= page_size <= 100 or len(q) > 120:
        raise HTTPException(422, "Invalid pagination or search")
    selected = data["by_country"].get(country, ()) if country else data["locations"]
    terms = _search_text(q).split()
    if terms:
        selected = [row for row in selected if all(term in data["search"][row["loc_slug"]] for term in terms)]
    total = len(selected)
    pages = (total + page_size - 1) // page_size
    if page > max(1, pages):
        raise HTTPException(404, "Directory page not found")
    selected = selected[(page - 1) * page_size:page * page_size]
    paths = [canonical_service_path(f"/{service}/{row['loc_slug']}") for row in selected]
    keys = [path.strip("/").replace("/", "::", 1) for path in paths]
    # A single bounded batch; only selected rows need service-specific status.
    cursor = db.location_pages.find({"$or": [{"canonical": {"$in": paths}}, {"key": {"$in": keys}}]}, {"_id": 0, "seo_reviewed_by": 0})
    stored = await cursor.to_list(100)
    existing = {}
    for row in stored:
        key = row.get("canonical") or "/" + str(row.get("key", "")).replace("::", "/", 1)
        existing[key.rstrip("/")] = row
    items = []
    from gsc_route_policy import apply_index_policy
    for location, path in zip(selected, paths):
        doc = existing.get(path)
        flags = apply_index_policy(doc or {"is_new_location": bool(location.get("is_new_location")), "seo_reviewed": False}, path)
        items.append({**{key: location.get(key) for key in ("city", "country", "country_slug", "country_code", "loc_slug", "admin1_name", "timezone")},
                      "service_slug": service, "service_name": SERVICE_MAP[service]["name"], "path": path,
                      "remote_only": True, "is_new_location": bool(flags.get("is_new_location")),
                      "seo_reviewed": flags.get("seo_reviewed") is True, "seo_noindex": bool(flags.get("seo_noindex"))})
    return {"items": items, "pagination": {"page": page, "page_size": page_size, "total": total, "total_pages": pages},
            "filters": {"country": country, "q": q, "service": service},
            "countries": data["countries"], "services": [{"name": row["name"], "slug": slug} for slug, row in SERVICE_MAP.items()],
            "catalog": dict(data["stats"])}


async def expansion_status(db):
    from public_seo import location_document_valid
    data = catalog()
    reviewed, drafts = set(), set()
    # Include all rows, rather than silently truncating a future >50k catalog.
    rows = await db.location_pages.find({"new_world_expansion": True}, {"_id": 0, "seo_reviewed_by": 0}).to_list(None)
    for row in rows:
        path = str(row.get("canonical", ""))
        parts = path.strip("/").split("/")
        if len(parts) != 2 or parts[0] not in SERVICE_MAP or parts[1] not in data["additional"] or not location_document_valid(row, path):
            continue
        (reviewed if row.get("seo_reviewed") is True and not row.get("seo_noindex") else drafts).add(path)
    return {**data["stats"], "additional_candidate_url_count": len(data["additional"]) * len(SERVICE_MAP),
            "approved_url_count": len(reviewed), "saved_draft_url_count": len(drafts),
            "unsaved_candidate_url_count": len(data["additional"]) * len(SERVICE_MAP) - len(reviewed | drafts),
            "source_generated_at": data["raw"].get("generated_at"), "sources": data["raw"].get("sources", []),
            "attribution": data["raw"].get("attribution"), "startup_seeding": False}


def build_router(db, get_current_admin):
    router = APIRouter()

    @router.api_route("/service-areas", methods=["GET", "HEAD"])
    async def service_areas(country: str = "", q: str = Query("", max_length=120), service: str = "",
                            page: int = Query(1, ge=1), page_size: int = Query(24, ge=1, le=100),
                            limit: int | None = Query(None, ge=1, le=100)):
        return await directory_data(db, country=country, q=q, service=service, page=page, page_size=limit or page_size)

    @router.get("/admin/service-areas/status")
    async def status(admin: dict = Depends(get_current_admin)):
        return await expansion_status(db)

    @router.get("/admin/service-areas/page/{service_slug}/{loc_slug}")
    async def preview(service_slug: str, loc_slug: str, admin: dict = Depends(get_current_admin)):
        location = expansion_location(loc_slug, service_slug)
        if not location:
            raise HTTPException(404, "Expansion page not found")
        original = await _original_collision(db, service_slug, loc_slug)
        existing = original or await _existing_page(db, service_slug, loc_slug)
        return {"page": existing or expansion_page_document(SERVICE_MAP[service_slug], location), "pre_existing_record": bool(original),
                "required_checks": list(REVIEW_CHECKS), "expected_revision": (existing or {}).get("revision", 0)}

    @router.put("/admin/service-areas/page/{service_slug}/{loc_slug}")
    async def review(service_slug: str, loc_slug: str, payload: dict, admin: dict = Depends(get_current_admin)):
        location = expansion_location(loc_slug, service_slug)
        if not location:
            raise HTTPException(404, "Expansion page not found")
        original = await _original_collision(db, service_slug, loc_slug)
        if original:
            raise HTTPException(409, "An existing page takes priority; use its existing editorial workflow")
        existing = await _existing_page(db, service_slug, loc_slug)
        revision = (existing or {}).get("revision", 0)
        if existing and payload.get("expected_revision") != revision:
            raise HTTPException(409, "Page changed during review; reload before saving")
        if not isinstance(payload.get("reviewed"), bool):
            raise HTTPException(422, "reviewed must be true or false")
        content = payload.get("content")
        if not _valid_content(content):
            raise HTTPException(422, "Provide the complete reviewed page content")
        if payload["reviewed"] and (not all((payload.get("checks") or {}).get(key) is True for key in REVIEW_CHECKS) or len(str(payload.get("evidence_notes", "")).strip()) < 20):
            raise HTTPException(422, "Approval requires factual review checks and evidence notes")
        doc = expansion_page_document(SERVICE_MAP[service_slug], location)
        doc.update({"content": content, "seo_reviewed": payload["reviewed"], "seo_noindex": not payload["reviewed"], "revision": revision + 1,
                    "seo_reviewed_at": datetime.now(timezone.utc).isoformat(), "seo_reviewed_by": admin.get("email", "admin"),
                    "review_checks": {key: (payload.get("checks") or {}).get(key) is True for key in REVIEW_CHECKS},
                    "review_evidence_notes": str(payload.get("evidence_notes", "")).strip()})
        # Optimistic guard also prevents overwriting a pre-existing record that
        # appeared between preview and save. The database's key index is unique.
        if existing:
            result = await db.location_pages.update_one({"key": doc["key"], "new_world_expansion": True, "revision": revision}, {"$set": doc})
            if not getattr(result, "matched_count", 0):
                raise HTTPException(409, "Page changed during review; reload before saving")
        else:
            result = await db.location_pages.update_one({"key": doc["key"]}, {"$setOnInsert": doc}, upsert=True)
            if not getattr(result, "upserted_id", None):
                raise HTTPException(409, "Page changed during review; reload before saving")
        return {"path": doc["canonical"], "reviewed": doc["seo_reviewed"], "saved": True}

    return router
