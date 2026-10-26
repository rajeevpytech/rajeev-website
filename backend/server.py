from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import json
import re
import asyncio
import logging
import uuid
import requests
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, UploadFile, File
from fastapi.responses import Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, field_validator
from portfolio import GalleryImage, _url as portfolio_url

from data import SERVICES, COUNTRIES, SERVICE_MAP, CITY_MAP, TOP_CITY_SLUGS
from live_service_catalog import with_live_services, source_service_slug, LIVE_SERVICES
from gsc_route_policy import apply_index_policy, location_for_path
SERVICE_MAP = with_live_services(SERVICES)
PUBLIC_SERVICES = list(SERVICE_MAP.values())
from email_utils import notify_new_lead, send_lead_confirmation, send_lead_digest, email_status, apply_config as email_apply_config
from whatsapp_utils import send_lead_whatsapp, whatsapp_status, apply_config as whatsapp_apply_config
from blog_seed import BLOG_SEED
from case_seed import CASE_SEED
import autopilot

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("rajeevfreelancer")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
FRONTEND_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://rajeevfreelancer.com")

app = FastAPI(title="Rajeev Freelancer API")
api_router = APIRouter(prefix="/api")


# ---------------- Object storage (admin image uploads) ----------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
STORAGE_APP = "rajeevfreelancer"
_storage_key = None
_MIME_EXT = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg"}


def init_storage(force: bool = False):
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": os.environ.get("EMERGENT_LLM_KEY")}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": init_storage(), "Content-Type": content_type},
                        data=data, timeout=120)
    if resp.status_code == 404:
        resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                            headers={"X-Storage-Key": init_storage(force=True), "Content-Type": content_type},
                            data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": init_storage()}, timeout=60)
    if resp.status_code == 404:
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": init_storage(force=True)}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------------- Auth helpers ----------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(email: str) -> str:
    payload = {
        "sub": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_admin(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:] if auth_header.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"email": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return {"email": user["email"], "name": user.get("name", "Admin")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------------- Models ----------------
class LoginInput(BaseModel):
    email: EmailStr
    password: str


class LeadCreate(BaseModel):
    name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    service: Optional[str] = ""
    budget: Optional[str] = ""
    message: Optional[str] = ""
    source_path: Optional[str] = ""
    location: Optional[str] = ""


class Lead(LeadCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "new"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ---------------- Public catalog endpoints ----------------
@api_router.get("/")
async def root():
    return {"message": "Rajeev Freelancer API", "services": len(SERVICES), "locations": len(CITY_MAP)}


@api_router.get("/health")
async def health():
    try:
        await db.command("ping")
        db_ok = True
    except Exception:
        db_ok = False
    return {"status": "ok" if db_ok else "degraded", "db": db_ok,
            "time": datetime.now(timezone.utc).isoformat()}


@api_router.get("/services")
async def get_services():
    return {"services": LIVE_SERVICES}


@api_router.get("/locations")
async def get_locations():
    countries = []
    for slug, c in COUNTRIES.items():
        countries.append({
            **{key: value for key, value in c.items() if key != "cities"},
            "slug": slug,
            "name": c["name"],
            "region": c["region"],
            "cities": [{"city": city, "loc_slug": f"{_slug(city)}-{slug}"} for city in c["cities"]],
        })
    return {"countries": countries, "total_cities": len(CITY_MAP)}


@api_router.get("/service/{service_slug}")
async def get_service_hub(service_slug: str):
    service = SERVICE_MAP.get(service_slug)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    featured = []
    for loc_slug, loc in list(CITY_MAP.items())[:60]:
        featured.append({**loc})
    countries = []
    for slug, c in COUNTRIES.items():
        countries.append({
            **{key: value for key, value in c.items() if key != "cities"},
            "slug": slug,
            "name": c["name"],
            "region": c["region"],
            "cities": [{"city": city, "loc_slug": f"{_slug(city)}-{slug}"} for city in c["cities"]],
        })
    return {"service": service, "countries": countries}


def _slug(text: str) -> str:
    text = text.lower().replace("&", " and ")
    text = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


# ---------------- AI content generation for location pages ----------------
def _fallback_content(service: dict, loc: dict) -> dict:
    if loc.get("is_new_location"):
        from new_market_content import build_new_market_content
        return build_new_market_content(service, loc)
    city, country = loc["city"], loc["country"]
    kw = service["keyword"]
    return {
        "title": f"Best {service['name']} in {city} for Your Business | Rajeev Freelancer",
        "meta_description": f"Looking for the best {kw} in {city}, {country}? Rajeev helps you get more traffic, leads and sales. Book a free consultation today."[:158],
        "h1": f"Best {service['name']} in {city} for Growing Businesses",
        "intro": [
            f"Businesses in {city} face fierce competition and rising customer expectations. Generic agencies bill big retainers yet hand your account to junior staff. As a senior {kw} with 12+ years of hands-on experience, Rajeev works with you directly to turn {service['short'].lower()} into measurable growth.",
            f"Whether you are a startup founder, an SMB owner or a marketing lead in {country}, you get twelve years of judgement in the room, on every call and in every deliverable. No relays, no fluff.",
        ],
        "why_choose": [
            {"title": "12+ years, senior only", "text": f"Ex-IOG, Accenture and Google experience applied directly to your {city} project."},
            {"title": "Custom strategy", "text": f"No cookie-cutter playbooks. Everything is tailored to {city}'s market and your goals."},
            {"title": "AI-powered execution", "text": "Automation, agents and workflows that compress weeks of work into days."},
            {"title": "WhatsApp-fast comms", "text": f"Reports, updates and alerts on WhatsApp, tuned to {country}'s time zone."},
            {"title": "Measurable outcomes", "text": "We track revenue, leads and rankings, not vanity metrics."},
        ],
        "service_details": f"Delivered remotely for {city} with full attention to your local market, {service['name']} covers discovery, strategy, build, launch and optimisation. Rajeev adapts to the industries that matter in {country} and collaborates across time zones so momentum never stalls.",
        "process": [
            {"step": "01", "title": "Discovery call", "text": f"A free consultation to understand your {city} business, goals and constraints."},
            {"step": "02", "title": "Audit & strategy", "text": "A deep audit followed by a clear, prioritised roadmap."},
            {"step": "03", "title": "Implementation", "text": "Hands-on build and execution with AI automation where it saves time."},
            {"step": "04", "title": "Reporting", "text": "Transparent reporting shared over WhatsApp and email."},
            {"step": "05", "title": "Optimisation", "text": "Continuous iteration based on real data and results."},
        ],
        "whatsapp_section": f"Communication is on WhatsApp for speed. You get quick answers, progress updates, screen recordings and automated alerts, all aligned to {country}'s business hours, so you are never left waiting on a ticket queue.",
        "local_context": f"{city} hosts a diverse economy, from startups and retail to services and enterprise. Rajeev tailors {service['short'].lower()} to the buying behaviour, languages and channels that convert best in {country}.",
        "faqs": [
            {"q": f"Who is the best {kw} in {city}?", "a": f"Rajeev is a senior freelance specialist serving {city} clients with 12+ years of experience and a senior-only, hands-on approach."},
            {"q": f"How much does a {kw} charge in {city}?", "a": f"Pricing depends on scope. Most {city} engagements start with a free consultation and a fixed-scope proposal so there are no surprises."},
            {"q": "How do we communicate across time zones?", "a": f"Primarily over WhatsApp and scheduled calls aligned to {country}'s hours, with async updates in between."},
            {"q": "How soon will I see results?", "a": "It varies by service, but you will see a clear roadmap in week one and early wins within the first month."},
            {"q": "Do you work remotely?", "a": f"Yes. Rajeev works remotely with {city} clients worldwide and has served 27+ countries."},
            {"q": "How do we get started?", "a": "Book a free consultation or message on WhatsApp and you will get a response, usually within the hour."},
        ],
    }


def _page_content(service: dict, loc: dict) -> dict:
    if loc.get("is_new_location"):
        from new_market_content import build_new_market_content
        scoped_service = {**service, "slug": source_service_slug(service["slug"])}
        return build_new_market_content(scoped_service, loc)
    return _fallback_content(service, loc)


CONTENT_SYSTEM = (
    "You are an expert SEO copywriter writing for Rajeev Freelancer, a senior freelance engineer & "
    "AI/digital-marketing consultant with 12+ years of experience (ex-IOG, Accenture, Google). "
    "Tone: professional, confident, friendly, results-focused. Write for SMB owners, founders and marketing leads. "
    "Return ONLY valid minified JSON, no markdown, no commentary."
)

# The LLM provider allows only 1 concurrent request on the base plan (429 CONCURRENCY_REQUEST_LIMIT).
# LLM_CONCURRENCY is env-configurable so upgrading the plan instantly unlocks parallel generation.
_llm_gate = asyncio.Semaphore(max(1, int(os.environ.get("LLM_CONCURRENCY", "1"))))
# Keys currently being AI-generated in the background (avoids duplicate work on concurrent visits).
_inflight_pages: set = set()


async def generate_content(service: dict, loc: dict) -> tuple[dict, bool]:
    """Return (content, ai_used). ai_used=False means the deterministic fallback was used."""
    city, country, kw = loc["city"], loc["country"], service["keyword"]
    prompt = f"""Write unique, helpful, non-generic landing page content for the service "{service['name']}" targeted at businesses in {city}, {country}.
Do NOT just swap the city name; adapt to {city}'s real industries, business culture and buyer behaviour.
Return JSON with EXACTLY these keys:
{{
 "title": "SEO title <=60 chars, include 'best', '{kw}', '{city}' and 'Rajeev Freelancer' naturally",
 "meta_description": "150-158 chars, include primary keyword, {city}, 'freelancer' and a benefit + CTA",
 "h1": "H1 with service + {city} + 'freelancer' or 'consultant'",
 "intro": ["paragraph 1 (pain point)", "paragraph 2 (why a freelancer like Rajeev beats agencies)"],
 "why_choose": [{{"title":"...","text":"..."}} x5 reasons],
 "service_details": "one rich paragraph tailored to {city}",
 "process": [{{"step":"01","title":"...","text":"..."}} x5 steps],
 "whatsapp_section": "one paragraph on WhatsApp-based communication and automation for this market",
 "local_context": "one paragraph on {city}/{country} industries and how the service fits",
 "faqs": [{{"q":"...","a":"..."}} x10 location-specific FAQs matching real search queries]
}}
Keep it 800-1000 words total. Natural keyword use, no stuffing."""
    try:
        from ai_runtime import generate_text
        resp = await generate_text(db, prompt, CONTENT_SYSTEM, f"{service['slug']}-{loc['loc_slug']}", gate=_llm_gate)
        text = resp if isinstance(resp, str) else str(resp)
        text = re.sub(r"^```(json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
        m = re.search(r"\{.*\}", text, re.DOTALL)
        data = json.loads(m.group(0) if m else text)
        # basic validation
        for key in ("title", "meta_description", "h1", "intro", "why_choose", "process", "faqs"):
            if key not in data:
                raise ValueError(f"missing {key}")
        return data, True
    except Exception as e:
        from ai_runtime import safe_error_message
        logger.warning(f"AI generation failed for {service['slug']}/{loc['loc_slug']}: {safe_error_message(e, 'text')}; using fallback")
        return _fallback_content(service, loc), False


async def _generate_and_cache(service: dict, loc: dict, cache_key: str, expected_content: Optional[dict] = None):
    """Finish one newly inserted page only; existing cached pages are read-only.

    The caller must have won the first-insert race. The exact fallback is also
    checked atomically after generation so an administrator's intervening save
    or review always wins.
    """
    if expected_content is None or loc.get("is_new_location") or cache_key in _inflight_pages:
        return
    _inflight_pages.add(cache_key)
    try:
        current = await db.location_pages.find_one({"key": cache_key}, {"content": 1, "ai_generated": 1, "seo_reviewed": 1})
        if not current or current.get("content") != expected_content or current.get("ai_generated") or current.get("seo_reviewed") is True:
            return
        content, ai_used = await generate_content(service, loc)
        if ai_used:
            from public_seo import preserve_metadata
            content = preserve_metadata(content, expected_content)
            await db.location_pages.update_one(
                {"key": cache_key, "content": expected_content, "ai_generated": False, "seo_reviewed": {"$ne": True}},
                {"$set": {"content": content, "ai_generated": True,
                          "generated_at": datetime.now(timezone.utc).isoformat()}},
            )
    except Exception as e:
        logger.warning(f"background generate failed {cache_key}: {e}")
    finally:
        _inflight_pages.discard(cache_key)


def _page_doc(service: dict, loc: dict, cache_key: str, content: dict, ai_used: bool) -> dict:
    return {
        "key": cache_key,
        "service": {"slug": service["slug"], "name": service["name"], "short": service["short"], "keyword": service["keyword"]},
        "location": loc,
        "content": content,
        "ai_generated": ai_used,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "canonical": f"/{service['slug']}/{loc['loc_slug']}",
        **({"is_new_location": True, "seo_reviewed": False} if loc.get("is_new_location") else {}),
    }


@api_router.get("/page/{service_slug}/{loc_slug}")
async def get_location_page(service_slug: str, loc_slug: str):
    service = SERVICE_MAP.get(service_slug)
    requested_path = f"/{service_slug}/{loc_slug}"
    loc = location_for_path(CITY_MAP, loc_slug, requested_path)
    cache_key = f"{service_slug}::{loc_slug}"
    cached = await db.location_pages.find_one({"$or": [{"key": cache_key}, {"canonical": f"/{service_slug}/{loc_slug}"}, {"canonical": f"/{service_slug}/{loc_slug}/"}]}, {"_id": 0, "seo_reviewed_by": 0})
    if not service or not loc:
        from public_seo import location_document_valid
        if location_document_valid(cached, f"/{service_slug}/{loc_slug}"):
            if cached.get("new_world_expansion"):
                from world_expansion import public_expansion_document
                cached = public_expansion_document(cached)
            return apply_index_policy(cached, requested_path)
        if service and not loc and not cached:
            from world_expansion import expansion_location, expansion_page_document
            expanded = expansion_location(loc_slug, service_slug)
            if expanded:
                return expansion_page_document(service, expanded, requested_path)
        raise HTTPException(status_code=404, detail="Page not found")
    if cached:
        # Existing copy remains authoritative, including legacy fallback and
        # unreviewed pages. A public read must never schedule a rewrite.
        if cached.get("new_world_expansion"):
            from world_expansion import public_expansion_document
            cached = public_expansion_document(cached)
        return apply_index_policy(cached, requested_path)

    # First-ever visit: no one should wait ~15-20s for the LLM. Store & serve the
    # deterministic fallback immediately, then generate the AI version in the background
    # so the next visitor gets the upgraded page.
    fallback = _page_content(service, loc)
    doc = _page_doc(service, loc, cache_key, fallback, False)
    insertion_query = {"$or": [{"key": cache_key}, {"canonical": requested_path}, {"canonical": requested_path + "/"}]}
    inserted = await db.location_pages.update_one(insertion_query, {"$setOnInsert": doc}, upsert=True)
    if inserted.upserted_id is None:
        # Another request or administrator created it while the fallback was
        # being prepared. Return that saved document without scheduling work.
        saved = await db.location_pages.find_one(insertion_query, {"_id": 0, "seo_reviewed_by": 0})
        if saved:
            if saved.get("new_world_expansion"):
                from world_expansion import public_expansion_document
                saved = public_expansion_document(saved)
            return apply_index_policy(saved, requested_path)
    elif not loc.get("is_new_location"):
        asyncio.create_task(_generate_and_cache(service, loc, cache_key, expected_content=fallback))
        asyncio.create_task(ping_indexnow([f"/{service_slug}/{loc_slug}"]))
    doc.pop("_id", None)
    return apply_index_policy(doc, requested_path)


# ---------------- Leads ----------------
async def notify_whatsapp_lead(lead: dict):
    """POST the lead to the owner's own WhatsApp webhook (configured in Admin > Site Settings).
    Generic + non-blocking so it works with most WhatsApp gateways. Never raises."""
    try:
        site = await _get_site_settings()
        n = (site or {}).get("notifications", {}) or {}
        url = (n.get("whatsapp_webhook_url") or "").strip()
        if not n.get("whatsapp_enabled") or not url:
            return
        number = n.get("whatsapp_number", "")
        text = (
            "🔔 New lead — Rajeev Freelancer\n"
            f"Name: {lead.get('name','')}\n"
            f"Phone: {lead.get('phone','')}\n"
            f"Email: {lead.get('email','')}\n"
            f"Service: {lead.get('service','')}\n"
            f"Budget: {lead.get('budget','')}\n"
            f"Location: {lead.get('geo_location') or lead.get('location','')}\n"
            f"Page: {lead.get('source_path','')}\n"
            f"Message: {lead.get('message','')}"
        )
        # Send several common field aliases so it plugs into most gateways without code changes.
        payload = {"to": number, "number": number, "phone": number, "text": text, "message": text,
                   "lead": {k: v for k, v in lead.items() if k != "_id"}}
        headers = {"Content-Type": "application/json"}
        api_key = (n.get("whatsapp_api_key") or "").strip()
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
            headers["X-API-Key"] = api_key

        def _post():
            try:
                r = requests.post(url, json=payload, headers=headers, timeout=8)
                logger.info(f"WhatsApp webhook -> {r.status_code}")
            except Exception as e:
                logger.warning(f"WhatsApp webhook failed: {e}")

        await asyncio.to_thread(_post)
    except Exception as e:
        logger.warning(f"notify_whatsapp_lead failed: {e}")


@api_router.post("/leads")
async def create_lead(payload: LeadCreate, request: Request):
    lead = Lead(**payload.model_dump())
    # Capture the inquirer's exact location (server-side, from IP) for the admin + email.
    try:
        xff = request.headers.get("x-forwarded-for", "")
        ip = xff.split(",")[0].strip() if xff else (request.client.host if request.client else "")

        def _lookup(client_ip: str):
            private = (not client_ip) or client_ip.startswith(("127.", "10.", "192.168.", "172.", "::1"))
            url = "https://ipapi.co/json/" if private else f"https://ipapi.co/{client_ip}/json/"
            try:
                r = requests.get(url, timeout=4, headers={"User-Agent": "rajeevfreelancer/1.0"})
                d = r.json()
                parts = [d.get("city"), d.get("region"), d.get("country_name")]
                return {"geo_location": ", ".join([p for p in parts if p]), "geo_country": d.get("country_name"),
                        "geo_city": d.get("city"), "geo_ip": client_ip,
                        "geo_lat": d.get("latitude"), "geo_lon": d.get("longitude")}
            except Exception:
                return {}

        geo = await asyncio.to_thread(_lookup, ip)
    except Exception:
        geo = {}
    doc = {**lead.model_dump(), **geo}
    await db.leads.insert_one(doc)
    logger.info(f"New lead: {lead.email} ({lead.service}) from {geo.get('geo_location') or lead.source_path}")
    asyncio.create_task(_dispatch_lead_notifications(doc))
    asyncio.create_task(send_lead_confirmation(doc))
    asyncio.create_task(notify_whatsapp_lead(doc))
    return {"ok": True, "id": lead.id}


async def _dispatch_lead_notifications(doc: dict):
    """Owner email + WhatsApp (Meta Cloud API). Records delivery status on the lead. Never raises."""
    try:
        email_res, wa_res = await asyncio.gather(notify_new_lead(doc), send_lead_whatsapp(doc))
        await db.leads.update_one({"id": doc["id"]}, {"$set": {
            "notify": {"email": email_res, "whatsapp": wa_res, "at": datetime.now(timezone.utc).isoformat()}}})
    except Exception as e:
        logger.warning(f"lead notification dispatch failed: {e}")


@api_router.get("/admin/notifications/status")
async def admin_notifications_status(admin: dict = Depends(get_current_admin)):
    last = await db.leads.find_one({"notify": {"$exists": True}}, {"_id": 0, "id": 1, "name": 1, "created_at": 1, "notify": 1},
                                   sort=[("created_at", -1)])
    return {"email": email_status(), "whatsapp": whatsapp_status(), "last_lead_notify": last}


NOTIF_SECRET_FIELDS = {"email": ("smtp_password",), "whatsapp": ("access_token",)}


def _mask(v: str) -> str:
    v = str(v or "")
    return ("•" * 8 + v[-3:]) if len(v) > 3 else ("•" * 8 if v else "")


async def _load_notification_config() -> dict:
    doc = await db.settings.find_one({"key": "notifications_config"}, {"_id": 0, "key": 0}) or {}
    return {"email": doc.get("email") or {}, "whatsapp": doc.get("whatsapp") or {}}


async def _apply_notification_config():
    cfg = await _load_notification_config()
    email_apply_config(cfg["email"])
    whatsapp_apply_config(cfg["whatsapp"])


def _masked_config(cfg: dict) -> dict:
    out = {}
    for group, secrets in NOTIF_SECRET_FIELDS.items():
        g = dict(cfg.get(group) or {})
        for s in secrets:
            g[f"{s}_set"] = bool(g.get(s))
            g[s] = _mask(g.get(s, ""))
        out[group] = g
    return out


class NotificationConfigInput(BaseModel):
    email: Optional[dict] = None
    whatsapp: Optional[dict] = None


_EMAIL_KEYS = {"provider", "smtp_user", "smtp_password", "from_name", "owner_emails"}
_WA_KEYS = {"api_version", "phone_number_id", "access_token", "recipients", "template_name", "template_language"}


@api_router.get("/admin/notifications/config")
async def admin_notifications_config(admin: dict = Depends(get_current_admin)):
    return _masked_config(await _load_notification_config())


@api_router.put("/admin/notifications/config")
async def admin_update_notifications_config(payload: NotificationConfigInput, admin: dict = Depends(get_current_admin)):
    cur = await _load_notification_config()
    for group, allowed in (("email", _EMAIL_KEYS), ("whatsapp", _WA_KEYS)):
        incoming = getattr(payload, group)
        if not incoming:
            continue
        g = dict(cur[group])
        for k, v in incoming.items():
            if k not in allowed:
                continue
            if k in NOTIF_SECRET_FIELDS[group]:
                v = str(v or "").strip()
                if not v or "•" in v:
                    continue  # blank / masked => keep existing secret
            if k in ("owner_emails", "recipients"):
                if isinstance(v, str):
                    v = re.split(r"[,\n]", v)
                v = [str(x).strip() for x in (v or []) if str(x).strip()][:10]
            g[k] = v
        cur[group] = g
    await db.settings.update_one({"key": "notifications_config"}, {"$set": {"email": cur["email"], "whatsapp": cur["whatsapp"],
                                 "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": admin["email"]}}, upsert=True)
    await _apply_notification_config()
    return {**_masked_config(cur), "status": {"email": email_status(), "whatsapp": whatsapp_status()}}


@api_router.post("/admin/notifications/test")
async def admin_notifications_test(admin: dict = Depends(get_current_admin)):
    now = datetime.now(timezone.utc).isoformat()
    sample = {"id": f"test-{uuid.uuid4().hex[:6]}", "name": "Test enquiry (admin)", "email": admin["email"],
              "phone": "+91 00000 00000", "service": "Notification test", "budget": "—", "message":
              f"This is a test sent from the admin dashboard at {now}. If you received this, lead alerts are working.",
              "source_path": "/admin", "geo_location": "Admin dashboard", "created_at": now}
    email_res, wa_res = await asyncio.gather(notify_new_lead(sample), send_lead_whatsapp(sample))
    return {"email": email_res, "whatsapp": wa_res, "at": now}


@api_router.get("/leads")
async def list_leads(admin: dict = Depends(get_current_admin), limit: int = 100, skip: int = 0):
    limit = max(1, min(limit, 200))
    skip = max(0, skip)
    leads = await db.leads.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.leads.count_documents({})
    return {"leads": leads, "total": total, "limit": limit, "skip": skip}


@api_router.patch("/leads/{lead_id}")
async def update_lead(lead_id: str, body: dict, admin: dict = Depends(get_current_admin)):
    status = body.get("status")
    if status not in ("new", "contacted", "won", "lost"):
        raise HTTPException(status_code=400, detail="Invalid status")
    await db.leads.update_one({"id": lead_id}, {"$set": {"status": status}})
    return {"ok": True}


@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, admin: dict = Depends(get_current_admin)):
    res = await db.leads.delete_one({"id": lead_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"ok": True}


@api_router.get("/admin/stats")
async def admin_stats(admin: dict = Depends(get_current_admin)):
    total = await db.leads.count_documents({})
    new = await db.leads.count_documents({"status": "new"})
    won = await db.leads.count_documents({"status": "won"})
    pages = await db.location_pages.count_documents({})
    return {"total_leads": total, "new_leads": new, "won_leads": won, "generated_pages": pages,
            "total_services": len(SERVICES), "total_locations": len(CITY_MAP)}


@api_router.get("/admin/leads/geo")
async def leads_geo(admin: dict = Depends(get_current_admin)):
    leads = await db.leads.find(
        {"geo_lat": {"$ne": None}},
        {"_id": 0, "name": 1, "service": 1, "geo_city": 1, "geo_country": 1, "geo_lat": 1, "geo_lon": 1, "created_at": 1},
    ).sort("created_at", -1).to_list(1000)
    points = [l for l in leads if l.get("geo_lat") is not None and l.get("geo_lon") is not None]
    counts = {}
    async for l in db.leads.aggregate([
        {"$match": {"geo_country": {"$ne": None}}},
        {"$group": {"_id": "$geo_country", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]):
        counts[l["_id"]] = l["count"]
    return {"points": points, "countries": [{"country": k, "count": v} for k, v in counts.items()]}


# ---------------- Pre-generate (warm AI cache for top cities) ----------------
_warmup = {"running": False, "total": 0, "done": 0, "generated": 0, "skipped": 0,
           "failed": 0, "started_at": None, "finished_at": None}
_warmup_new_paths: list = []


async def _warm_one(service: dict, loc: dict, sem: asyncio.Semaphore):
    cache_key = f"{service['slug']}::{loc['loc_slug']}"
    try:
        existing = await db.location_pages.find_one({"$or": [{"key": cache_key}, {"canonical": f"/{service['slug']}/{loc['loc_slug']}"}, {"canonical": f"/{service['slug']}/{loc['loc_slug']}/"}]}, {"ai_generated": 1, "seo_reviewed": 1, "content": 1, "service": 1, "location": 1, "canonical": 1, "is_new_location": 1})
        if existing:
            # Every saved page is read-only, even if it was created by an older
            # fallback or lacks AI/review flags. Warmup only fills missing keys.
            _warmup["skipped"] += 1
            return
        if loc.get("is_new_location"):
            content, ai_used = _page_content(service, loc), False
        else:
            async with sem:
                content, ai_used = await generate_content(service, loc)
        if not loc.get("is_new_location"):
            from public_seo import preserve_metadata
            content = preserve_metadata(content, (existing or {}).get("content") or _fallback_content(service, loc))
        doc = {
            "key": cache_key,
            "service": {"slug": service["slug"], "name": service["name"], "short": service["short"], "keyword": service["keyword"]},
            "location": loc,
            "content": content,
            "ai_generated": ai_used,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "canonical": f"/{service['slug']}/{loc['loc_slug']}",
            **({"is_new_location": True, "seo_reviewed": False} if loc.get("is_new_location") else {}),
        }
        inserted = await db.location_pages.update_one({"$or": [{"key": cache_key}, {"canonical": doc["canonical"]}, {"canonical": doc["canonical"] + "/"}]}, {"$setOnInsert": doc}, upsert=True)
        if inserted.upserted_id is None:
            # A concurrent creator's content and flags remain untouched.
            _warmup["skipped"] += 1
            return
        _warmup["generated"] += 1
        if not loc.get("is_new_location") or (existing and existing.get("seo_reviewed")):
            _warmup_new_paths.append(f"/{service['slug']}/{loc['loc_slug']}")
    except Exception as e:
        logger.warning(f"warmup failed {cache_key}: {e}")
        _warmup["failed"] += 1
    finally:
        _warmup["done"] += 1


async def _run_warmup(loc_slugs: List[str], service_slugs: List[str], concurrency: int):
    _warmup_new_paths.clear()
    sem = asyncio.Semaphore(max(1, concurrency))
    tasks = []
    for s_slug in service_slugs:
        service = SERVICE_MAP.get(s_slug)
        if not service:
            continue
        for l_slug in loc_slugs:
            loc = CITY_MAP.get(l_slug)
            if loc:
                tasks.append(_warm_one(service, loc, sem))
    _warmup.update(running=True, total=len(tasks), done=0, generated=0, skipped=0,
                   failed=0, started_at=datetime.now(timezone.utc).isoformat(), finished_at=None)
    await asyncio.gather(*tasks)
    _warmup.update(running=False, finished_at=datetime.now(timezone.utc).isoformat())
    logger.info(f"warmup complete: {_warmup['generated']} generated, {_warmup['skipped']} skipped, {_warmup['failed']} failed")
    if _warmup_new_paths:
        asyncio.create_task(ping_indexnow(list(_warmup_new_paths)))


class WarmupInput(BaseModel):
    cities: Optional[List[str]] = None
    services: Optional[List[str]] = None
    concurrency: Optional[int] = 3
    all: Optional[bool] = False


@api_router.post("/admin/pregenerate")
async def pregenerate(payload: WarmupInput, admin: dict = Depends(get_current_admin)):
    if _warmup["running"]:
        raise HTTPException(status_code=409, detail="A warm-up is already running")
    if payload.all:
        loc_slugs = list(CITY_MAP.keys())
    else:
        loc_slugs = payload.cities or TOP_CITY_SLUGS
    service_slugs = payload.services or [s["slug"] for s in SERVICES]
    loc_slugs = [s for s in loc_slugs if s in CITY_MAP]
    if not loc_slugs:
        raise HTTPException(status_code=400, detail="No valid cities to warm")
    total = len(loc_slugs) * len([s for s in service_slugs if s in SERVICE_MAP])
    asyncio.create_task(_run_warmup(loc_slugs, service_slugs, payload.concurrency or 3))
    return {"started": True, "total": total, "cities": len(loc_slugs), "services": len(service_slugs)}


@api_router.get("/admin/pregenerate/status")
async def pregenerate_status(admin: dict = Depends(get_current_admin)):
    return _warmup


# ---------------- Daily lead digest ----------------
from zoneinfo import ZoneInfo, available_timezones

DEFAULT_DIGEST = {"hour": int(os.environ.get("DIGEST_HOUR_UTC", "7")), "tz": "UTC", "enabled": True}


async def _get_digest_settings() -> dict:
    doc = await db.settings.find_one({"key": "digest"}, {"_id": 0})
    if not doc:
        doc = {"key": "digest", **DEFAULT_DIGEST}
        await db.settings.update_one({"key": "digest"}, {"$setOnInsert": doc}, upsert=True)
    return {"hour": int(doc.get("hour", 7)), "tz": doc.get("tz", "UTC"), "enabled": bool(doc.get("enabled", True))}


async def _collect_and_send_digest(hours: int = 24) -> int:
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    since_iso = since.isoformat()
    leads = await db.leads.find(
        {"created_at": {"$gte": since_iso}}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    label = f"Last {hours}h · since {since.strftime('%d %b %Y %H:%M UTC')}"
    return await send_lead_digest(leads, label)


@api_router.post("/admin/digest/send")
async def send_digest_now(admin: dict = Depends(get_current_admin), hours: int = 24):
    hours = max(1, min(hours, 720))
    count = await _collect_and_send_digest(hours)
    return {"sent": True, "leads_in_period": count, "hours": hours}


@api_router.get("/admin/digest/settings")
async def get_digest_settings(admin: dict = Depends(get_current_admin)):
    settings = await _get_digest_settings()
    # A short, friendly list of common zones for the picker (client may still send any valid IANA tz).
    common = ["UTC", "Asia/Kolkata", "Asia/Dubai", "Europe/London", "Europe/Berlin",
              "America/New_York", "America/Los_Angeles", "Australia/Sydney", "Asia/Singapore"]
    return {**settings, "common_timezones": common}


# ---------------- Site settings (SEO / contact / social / business) ----------------
DEFAULT_SITE = {
    "seo": {
        "site_name": "Rajeev Freelancer",
        "default_title": "Rajeev Freelancer — Senior Freelance Engineer & AI/Digital Marketing Consultant",
        "default_description": "Hire Rajeev — a senior freelance engineer & AI/digital marketing consultant with 12+ years' experience. Web development, software, SEO, AI automation & WhatsApp marketing. Available worldwide.",
        "og_image": "https://customer-assets-gfyr7b9c.emergentagent.net/job_rajeev-seo-hub/artifacts/whqtfhxo_image.png",
        "canonical_domain": "https://rajeevfreelancer.com",
        "twitter_handle": "@rajeevfreelancer",
        "robots_index": True,
        "google_verification": "",
        "default_locale": "en",
        "locales": ["en", "hi", "ar"],
    },
    "contact": {
        "name": "Rajeev Freelancer",
        "email": "hello@rajeevfreelancer.com",
        "phone": "+919711623561",
        "whatsapp": "919711623561",
        "whatsapp_display": "+91 97116 23561",
    },
    "social": {"linkedin": "", "twitter": "", "github": "", "instagram": "", "youtube": "", "facebook": ""},
    "business": {
        "logo": "https://customer-assets-gfyr7b9c.emergentagent.net/job_rajeev-seo-hub/artifacts/whqtfhxo_image.png",
        "rating": "4.9",
        "reviews_verified": False,
        "google_profile_url": "https://share.google/ddhGdf8R7JkjaWji3",
        "customer_facing_office_verified": False,
        "reviews_count": "96",
        "founding_year": "2013",
        "founder_name": "Rajeev Gits",
        "address": "Gurgaon, Haryana, India",
        "google_maps_url": "https://www.google.com/maps/place/Gurgaon,+Haryana",
        "map_embed_url": "https://www.google.com/maps?q=Gurgaon,Haryana,India&output=embed",
    },
    "tracking": {"ga4_id": "", "ads_id": "", "ads_conversion_label": ""},
    "notifications": {
        "whatsapp_enabled": False,
        "whatsapp_number": "+919711623561",
        "whatsapp_webhook_url": "",
        "whatsapp_api_key": "",
    },
    "marketing": {
        "offers_enabled": True,
        "popup_enabled": True,
        "offers_end_date": "",
    },
}


def _deep_merge(base: dict, override: dict) -> dict:
    out = {k: (v.copy() if isinstance(v, dict) else v) for k, v in base.items()}
    for k, v in (override or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = v
    return out


async def _get_site_settings() -> dict:
    doc = await db.settings.find_one({"key": "site"}, {"_id": 0, "key": 0})
    merged = _deep_merge(DEFAULT_SITE, doc or {})
    from public_seo import canonical_origin
    merged["seo"]["canonical_domain"] = canonical_origin(merged)
    return merged


@api_router.get("/settings")
async def public_site_settings():
    """Public: consumed by the frontend for SEO tags, structured data and contact info."""
    settings = await _get_site_settings()
    from ai_runtime import public_settings_view
    return public_settings_view(settings)


@api_router.get("/admin/settings/site")
async def admin_get_site_settings(admin: dict = Depends(get_current_admin)):
    return await _get_site_settings()


@api_router.put("/admin/settings/site")
async def admin_update_site_settings(payload: dict, admin: dict = Depends(get_current_admin)):
    allowed = {"seo", "contact", "social", "business", "tracking", "notifications", "marketing"}
    update = {k: v for k, v in (payload or {}).items() if k in allowed and isinstance(v, dict)}
    if not update:
        raise HTTPException(status_code=400, detail="No valid settings provided")
    current = await db.settings.find_one({"key": "site"}, {"_id": 0, "key": 0}) or {}
    merged = _deep_merge(current, update)
    await db.settings.update_one({"key": "site"}, {"$set": {"key": "site", **merged}}, upsert=True)
    return await _get_site_settings()


# ---------------- IndexNow (explicit manual notifications only) ----------------
from html.parser import HTMLParser as _HTMLParser
from indexnow import IndexNowConfig, IndexNowService, build_router as build_indexnow_router


class _IndexNowHead(_HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.canonicals, self.robots = [], []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "link" and "canonical" in attrs.get("rel", "").split():
            self.canonicals.append(attrs.get("href", ""))
        if tag == "meta" and attrs.get("name", "").lower() == "robots":
            self.robots.append(attrs.get("content", ""))


async def _validate_indexnow_path(path: str) -> dict:
    """Inspect the actual public HTML inside this app; never fetch a remote URL."""
    import httpx
    from public_seo import canonical_origin
    origin = canonical_origin(await _get_site_settings())
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url=origin) as local:
        response = await local.get(path, follow_redirects=False)
    result = {"eligible": False, "canonical_url": None, "status_code": response.status_code}
    if response.status_code != 200:
        return {**result, "reason": "The public route must return HTTP200 directly."}
    if "text/html" not in response.headers.get("content-type", ""):
        return {**result, "reason": "Only public HTML pages can be submitted."}
    head = _IndexNowHead(response.text)
    if "noindex" in response.headers.get("x-robots-tag", "").lower() or any("noindex" in value.lower() for value in head.robots):
        return {**result, "reason": "This page is noindex or still requires content review."}
    expected = origin + path
    if head.canonicals != [expected]:
        return {**result, "reason": "Submit the approved canonical URL directly."}
    return {"eligible": True, "canonical_url": expected, "reason": "Canonical public HTML is eligible for a manual notification.", "status_code": 200}


async def _legacy_indexnow_config():
    # Preserve the stored feature configuration without generating or changing a
    # key. The historical enabled flag is not proof of a human opt-in.
    return await db.settings.find_one({"key": "indexnow"}, {"_id": 0, "token": 1, "enabled": 1})


indexnow_service = IndexNowService(db=db, validator=_validate_indexnow_path,
    config=IndexNowConfig.from_env(), config_loader=_legacy_indexnow_config)


@app.middleware("http")
async def _indexnow_key_middleware(request: Request, call_next):
    # Resolve only the exact configured root key proof. Other .txt routes,
    # robots.txt, llms.txt and normal public pages keep their usual handlers.
    path = request.url.path
    if request.method in {"GET", "HEAD"} and re.fullmatch(r"/[A-Za-z0-9-]{8,128}\.txt", path):
        proof = await indexnow_service.key_file_response(path)
        if proof is not None:
            return proof
    return await call_next(request)


async def ping_indexnow(paths: List[str]) -> int:
    # Existing publication hooks retain an already-enabled configuration. New
    # installations stay disabled, and every target still passes HTML review.
    from live_service_catalog import canonical_service_path
    approved_targets = list(dict.fromkeys(canonical_service_path(path) for path in paths if isinstance(path, str) and path.startswith("/")))
    result = await indexnow_service.notify_existing(approved_targets)
    return int(result.get("status") or 0)


# ---------------- Blog / Insights ----------------
class BlogInput(BaseModel):
    title: str
    slug: Optional[str] = None
    category: str = "Article"
    excerpt: Optional[str] = ""
    cover_image: Optional[str] = ""
    tags: Optional[List[str]] = None
    body: Optional[List[str]] = None
    body_md: Optional[str] = None
    faqs: Optional[List[dict]] = None
    cover_alt: Optional[str] = None
    seo: Optional[dict] = None
    published: bool = True
    featured: bool = False
    order: int = 100

    def clean(self) -> dict:
        d = self.model_dump(exclude_none=True)
        if "body_md" in d:
            d["body_md"] = autopilot.sanitize_markdown(d["body_md"])
            if autopilot.DANGEROUS_RE.search(d["body_md"]):
                raise HTTPException(status_code=400, detail="Body contains unsafe HTML/script content")
            d["body_format"] = "markdown"
            if not d.get("body"):
                d["body"] = [p.strip() for p in re.split(r"\n\s*\n", d["body_md"]) if p.strip()]
        if "faqs" in d:
            d["faqs"] = [{"q": str(f.get("q", "")).strip(), "a": str(f.get("a", "")).strip()} for f in d["faqs"] if isinstance(f, dict) and f.get("q") and f.get("a")][:8]
        for k in ("title", "excerpt", "cover_alt"):
            if k in d and autopilot.DANGEROUS_RE.search(str(d[k])):
                raise HTTPException(status_code=400, detail=f"{k} contains unsafe content")
        return d


async def _seed_blog():
    existing = set(await db.blog_posts.distinct("slug"))
    now = datetime.now(timezone.utc).isoformat()
    new = [{**p, "published": True, "featured": p.get("category") == "Case Study",
            "order": i + 1, "created_at": now, "updated_at": now, "id": str(uuid.uuid4())}
           for i, p in enumerate(BLOG_SEED) if p["slug"] not in existing]
    if new:
        await db.blog_posts.insert_many(new)
        logger.info(f"Seeded {len(new)} new blog post(s)")


@api_router.get("/blog")
async def list_blog(category: Optional[str] = None, featured: Optional[bool] = None):
    q = {"published": True}
    if category:
        q["category"] = category
    if featured is not None:
        q["featured"] = featured
    posts = await db.blog_posts.find(q, {"_id": 0, "body": 0}).sort([("featured", -1), ("order", 1), ("created_at", -1)]).to_list(200)
    cats = await db.blog_posts.distinct("category", {"published": True})
    return {"posts": posts, "categories": cats}


@api_router.get("/blog/{slug}")
async def get_blog(slug: str):
    post = await db.blog_posts.find_one({"slug": slug, "published": True}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    related = await db.blog_posts.find({"published": True, "slug": {"$ne": slug}}, {"_id": 0, "body": 0}).sort("created_at", -1).to_list(3)
    return {"post": post, "related": related}


@api_router.get("/admin/blog")
async def admin_list_blog(admin: dict = Depends(get_current_admin)):
    posts = await db.blog_posts.find({}, {"_id": 0}).sort([("order", 1), ("created_at", -1)]).to_list(500)
    return {"posts": posts}


@api_router.post("/admin/blog")
async def admin_create_blog(payload: BlogInput, admin: dict = Depends(get_current_admin)):
    slug = (payload.slug or _slug(payload.title)).strip("-")
    if await db.blog_posts.find_one({"slug": slug}):
        raise HTTPException(status_code=409, detail="A post with this slug already exists")
    now = datetime.now(timezone.utc).isoformat()
    doc = {**payload.model_dump(), **payload.clean(), "slug": slug, "tags": payload.tags or [], "body": payload.body or [],
           "id": str(uuid.uuid4()), "created_at": now, "updated_at": now, "published_at": now if payload.published else None}
    if doc.get("body_md") and not doc["body"]:
        doc["body"] = [p.strip() for p in re.split(r"\n\s*\n", doc["body_md"]) if p.strip()]
    await db.blog_posts.insert_one(doc)
    if doc.get("published"):
        asyncio.create_task(ping_indexnow([f"/blog/{slug}"]))
    doc.pop("_id", None)
    return doc


class ReorderInput(BaseModel):
    ids: List[str]


@api_router.put("/admin/blog/reorder")
async def admin_reorder_blog(payload: ReorderInput, admin: dict = Depends(get_current_admin)):
    for i, pid in enumerate(payload.ids):
        await db.blog_posts.update_one({"id": pid}, {"$set": {"order": i + 1}})
    return {"ok": True, "count": len(payload.ids)}


@api_router.put("/admin/blog/{post_id}")
async def admin_update_blog(post_id: str, payload: BlogInput, admin: dict = Depends(get_current_admin)):
    update = payload.clean()
    if update.get("body_md"):
        update["body"] = [p.strip() for p in re.split(r"\n\s*\n", update["body_md"]) if p.strip()]
    if payload.slug:
        update["slug"] = payload.slug.strip("-")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.blog_posts.update_one({"id": post_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    post = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    if post and post.get("published"):
        asyncio.create_task(ping_indexnow([f"/blog/{post['slug']}"]))
    return post


class BulkPublishInput(BaseModel):
    ids: List[str] = Field(default_factory=list)
    published: bool = True


@api_router.post("/admin/blog/bulk-publish")
async def admin_bulk_publish(body: BulkPublishInput, admin: dict = Depends(get_current_admin)):
    ids = [str(i).strip() for i in body.ids if str(i).strip()]
    published = body.published
    if not ids:
        raise HTTPException(status_code=400, detail="No posts selected")
    res = await db.blog_posts.update_many(
        {"id": {"$in": ids}},
        {"$set": {"published": published, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if published:
        slugs = [d["slug"] async for d in db.blog_posts.find({"id": {"$in": ids}}, {"slug": 1})]
        if slugs:
            asyncio.create_task(ping_indexnow([f"/blog/{s}" for s in slugs]))
    return {"ok": True, "updated": res.modified_count}


@api_router.patch("/admin/blog/{post_id}/publish")
async def admin_set_blog_published(post_id: str, body: dict, admin: dict = Depends(get_current_admin)):
    published = bool(body.get("published", True))
    res = await db.blog_posts.update_one(
        {"id": post_id},
        {"$set": {"published": published, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    post = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    if published:
        asyncio.create_task(ping_indexnow([f"/blog/{post['slug']}"]))
    return post


@api_router.delete("/admin/blog/{post_id}")
async def admin_delete_blog(post_id: str, admin: dict = Depends(get_current_admin)):
    res = await db.blog_posts.delete_one({"id": post_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"ok": True}


# ---------------- Case Studies ----------------
class CaseStudyInput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    slug: Optional[str] = None
    client_name: str = ""
    website_url: str = ""
    gallery: List[GalleryImage] = Field(default_factory=list, max_length=30)
    category: str = "Web"
    tag: str = ""
    metric: str = ""
    metricLabel: str = ""
    industry: str = ""
    region: str = ""
    duration: str = ""
    year: str = ""
    cover: Optional[str] = ""
    og: Optional[str] = ""
    excerpt: Optional[str] = ""
    challenge: Optional[str] = ""
    approach: Optional[List[dict]] = None
    results: Optional[List[dict]] = None
    services: Optional[List[str]] = None
    stack: Optional[List[str]] = None
    chart: Optional[dict] = None
    quote: Optional[dict] = None
    published: bool = True
    order: int = 100

    @field_validator("website_url")
    @classmethod
    def valid_website(cls, value):
        if value.strip() and not portfolio_url(value):
            raise ValueError("Use a valid http/https website URL")
        return value.strip()

    @field_validator("cover", "og")
    @classmethod
    def valid_image(cls, value):
        if value and value.strip() and not portfolio_url(value, image=True):
            raise ValueError("Use an uploaded image path or http/https image URL")
        return value.strip() if value else value


async def _seed_case_studies():
    existing = set(await db.case_studies.distinct("slug"))
    now = datetime.now(timezone.utc).isoformat()
    new = [{**cs, "published": True, "created_at": now, "updated_at": now, "id": str(uuid.uuid4())}
           for cs in CASE_SEED if cs["slug"] not in existing]
    if new:
        await db.case_studies.insert_many(new)
        logger.info(f"Seeded {len(new)} new case study(ies)")


@api_router.get("/case-studies")
async def list_case_studies(category: Optional[str] = None):
    q = {"published": True}
    if category and category != "All":
        q["category"] = category
    items = await db.case_studies.find(q, {"_id": 0}).sort([("order", 1), ("created_at", 1)]).to_list(200)
    cats = await db.case_studies.distinct("category", {"published": True})
    return {"items": items, "categories": cats}


@api_router.get("/case-studies/{slug}")
async def get_case_study(slug: str):
    item = await db.case_studies.find_one({"slug": slug, "published": True}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Case study not found")
    return {"item": item}


@api_router.get("/admin/case-studies")
async def admin_list_case_studies(admin: dict = Depends(get_current_admin)):
    items = await db.case_studies.find({}, {"_id": 0}).sort([("order", 1), ("created_at", 1)]).to_list(500)
    return {"items": items}


@api_router.post("/admin/case-studies")
async def admin_create_case_study(payload: CaseStudyInput, admin: dict = Depends(get_current_admin)):
    slug = (payload.slug or _slug(payload.title)).strip("-")
    if not slug or any(char in slug for char in ("/", "\\", "?", "#", "\r", "\n")):
        raise HTTPException(status_code=422, detail="A valid case study URL is required")
    if await db.case_studies.find_one({"slug": slug}):
        raise HTTPException(status_code=409, detail="A case study with this slug already exists")
    now = datetime.now(timezone.utc).isoformat()
    doc = {**payload.model_dump(), "slug": slug, "approach": payload.approach or [], "results": payload.results or [],
           "services": payload.services or [], "stack": payload.stack or [], "chart": payload.chart or None,
           "quote": payload.quote or None, "id": str(uuid.uuid4()), "created_at": now, "updated_at": now}
    await db.case_studies.insert_one(doc)
    if doc.get("published"):
        asyncio.create_task(ping_indexnow([f"/case-studies/{slug}"]))
    doc.pop("_id", None)
    return doc


@api_router.put("/admin/case-studies/reorder")
async def admin_reorder_case_studies(payload: ReorderInput, admin: dict = Depends(get_current_admin)):
    for i, cid in enumerate(payload.ids):
        await db.case_studies.update_one({"id": cid}, {"$set": {"order": i + 1}})
    return {"ok": True, "count": len(payload.ids)}


@api_router.put("/admin/case-studies/{cs_id}")
async def admin_update_case_study(cs_id: str, payload: CaseStudyInput, admin: dict = Depends(get_current_admin)):
    existing = await db.case_studies.find_one({"id": cs_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Case study not found")
    if payload.slug and payload.slug != existing["slug"]:
        raise HTTPException(status_code=409, detail="Existing case study URLs are preserved. Keep the original slug.")
    # Fields not submitted by an older admin interface remain unchanged.
    update = payload.model_dump(exclude_unset=True)
    update["slug"] = existing["slug"]
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.case_studies.update_one({"id": cs_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Case study not found")
    item = await db.case_studies.find_one({"id": cs_id}, {"_id": 0})
    if item and item.get("published"):
        asyncio.create_task(ping_indexnow([f"/case-studies/{item['slug']}"]))
    return item


@api_router.delete("/admin/case-studies/{cs_id}")
async def admin_delete_case_study(cs_id: str, admin: dict = Depends(get_current_admin)):
    res = await db.case_studies.delete_one({"id": cs_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Case study not found")
    return {"ok": True}


# ---------------- Admin image uploads (object storage) ----------------
@api_router.post("/admin/upload")
async def admin_upload(file: UploadFile = File(...), admin: dict = Depends(get_current_admin)):
    ct = (file.content_type or "").lower()
    if not ct.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 8MB")
    ext = _MIME_EXT.get(ct, "bin")
    fid = str(uuid.uuid4())
    path = f"{STORAGE_APP}/uploads/{fid}.{ext}"
    try:
        result = await asyncio.to_thread(put_object, path, data, ct)
    except Exception as e:
        logger.error(f"upload failed: {e}")
        raise HTTPException(status_code=502, detail="Upload failed, please try again")
    await db.uploads.insert_one({
        "id": fid, "storage_path": result.get("path", path), "content_type": ct,
        "original_filename": file.filename, "size": len(data), "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"id": fid, "url": f"/api/uploads/{fid}"}


@api_router.get("/uploads/{file_id}")
async def serve_upload(file_id: str):
    rec = await db.uploads.find_one({"id": file_id, "is_deleted": False})
    if not rec:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        data, ct = await asyncio.to_thread(get_object, rec["storage_path"])
    except Exception:
        raise HTTPException(status_code=404, detail="File not available")
    return Response(content=data, media_type=rec.get("content_type", ct),
                    headers={"Cache-Control": "public, max-age=31536000, immutable"})


class DigestSettings(BaseModel):
    hour: int
    tz: str
    enabled: bool = True


@api_router.put("/admin/digest/settings")
async def update_digest_settings(payload: DigestSettings, admin: dict = Depends(get_current_admin)):
    if not (0 <= payload.hour <= 23):
        raise HTTPException(status_code=400, detail="hour must be between 0 and 23")
    if payload.tz not in available_timezones():
        raise HTTPException(status_code=400, detail=f"Unknown timezone: {payload.tz}")
    await db.settings.update_one(
        {"key": "digest"},
        {"$set": {"key": "digest", "hour": payload.hour, "tz": payload.tz, "enabled": payload.enabled}},
        upsert=True,
    )
    return {"ok": True, "hour": payload.hour, "tz": payload.tz, "enabled": payload.enabled}


async def _daily_digest_scheduler():
    """Send the owner a lead digest once per day at the configured hour + timezone."""
    while True:
        s = await _get_digest_settings()
        if not s["enabled"]:
            await asyncio.sleep(3600)  # re-check hourly while disabled
            continue
        try:
            tz = ZoneInfo(s["tz"])
        except Exception:
            tz = ZoneInfo("UTC")
        now = datetime.now(tz)
        nxt = now.replace(hour=s["hour"], minute=0, second=0, microsecond=0)
        if nxt <= now:
            nxt += timedelta(days=1)
        sleep_s = (nxt - now).total_seconds()
        # Wake at most hourly so settings changes take effect without a restart.
        await asyncio.sleep(min(sleep_s, 3600))
        if sleep_s > 3600:
            continue
        try:
            count = await _collect_and_send_digest(24)
            logger.info(f"Daily digest sent ({count} leads) at {s['hour']}:00 {s['tz']}")
        except Exception as e:
            logger.error(f"Daily digest failed: {e}")
        await asyncio.sleep(90)  # avoid double-send within the same minute



# ---------------- Auth ----------------
@api_router.post("/auth/login")
async def login(payload: LoginInput):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(email)
    return {"token": token, "user": {"email": email, "name": user.get("name", "Admin")}}


@api_router.get("/auth/me")
async def me(admin: dict = Depends(get_current_admin)):
    return admin


# ---------------- Sitemap ----------------
@api_router.api_route("/sitemap.xml", methods=["GET", "HEAD"])
async def sitemap():
    from fastapi.responses import RedirectResponse
    return RedirectResponse("/sitemap.xml", status_code=301)


@api_router.put("/admin/seo-review/{service_slug}/{loc_slug}")
async def review_location_page(service_slug: str, loc_slug: str, payload: dict,
                               admin: dict = Depends(get_current_admin)):
    """Approve new market copy only after the administrator has checked its accuracy."""
    if service_slug not in SERVICE_MAP or not location_for_path(CITY_MAP, loc_slug, f"/{service_slug}/{loc_slug}"):
        raise HTTPException(status_code=404, detail="Page not found")
    if not isinstance(payload.get("reviewed"), bool):
        raise HTTPException(status_code=400, detail="reviewed must be true or false")
    key = f"{service_slug}::{loc_slug}"
    doc = await db.location_pages.find_one({"key": key}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Generate and review the page content before approving it")
    updated = datetime.now(timezone.utc).isoformat()
    await db.location_pages.update_one({"key": key}, {"$set": {
        "seo_reviewed": payload["reviewed"], "seo_reviewed_at": updated,
        "seo_reviewed_by": admin["email"],
    }})
    if payload["reviewed"]:
        asyncio.create_task(ping_indexnow([f"/{service_slug}/{loc_slug}"]))
    return {"path": f"/{service_slug}/{loc_slug}", "reviewed": payload["reviewed"],
            "reviewed_at": updated}


import time

_rates_cache = {"data": None, "ts": 0}


@api_router.get("/rates")
async def rates():
    now = time.time()
    if _rates_cache["data"] and now - _rates_cache["ts"] < 12 * 3600:
        return _rates_cache["data"]

    def fetch():
        try:
            r = requests.get("https://open.er-api.com/v6/latest/USD", timeout=5)
            d = r.json()
            return {"base": "USD", "rates": d.get("rates", {}), "updated": d.get("time_last_update_utc")}
        except Exception as e:
            logger.warning(f"rates fetch failed: {e}")
            return None

    data = await asyncio.to_thread(fetch)
    if data:
        _rates_cache.update(data=data, ts=now)
    return data or {"base": "USD", "rates": {}, "updated": None}


@api_router.get("/geo")
async def geo(request: Request):
    xff = request.headers.get("x-forwarded-for", "")
    ip = xff.split(",")[0].strip() if xff else (request.client.host if request.client else "")

    def fetch(client_ip: str):
        private = (not client_ip) or client_ip.startswith(("127.", "10.", "192.168.", "172.", "::1"))
        url = "https://ipapi.co/json/" if private else f"https://ipapi.co/{client_ip}/json/"
        try:
            r = requests.get(url, timeout=4, headers={"User-Agent": "rajeevfreelancer/1.0"})
            d = r.json()
            return {
                "country_code": d.get("country_code"),
                "country_name": d.get("country_name"),
                "currency": d.get("currency"),
                "city": d.get("city"),
            }
        except Exception as e:
            logger.warning(f"geo lookup failed: {e}")
            return {"country_code": None, "country_name": None, "currency": None, "city": None}

    return await asyncio.to_thread(fetch, ip)


# --- Blog Autopilot: auto-draft SEO posts on a schedule -------------------------
@api_router.post("/admin/blog-autopilot/suggest")
async def suggest_blog_topics(admin: dict = Depends(get_current_admin)):
    existing = await db.blog_posts.distinct("title")
    services = ", ".join(s["name"] for s in SERVICES)
    prompt = f"""Suggest 8 fresh, high-search-intent SEO blog topic ideas for "Rajeev Freelancer", whose services are: {services}.
Audience: small/medium business owners, founders and marketing leads. Prefer specific, current (2026) angles with a clear primary keyword.
Do NOT repeat any of these existing titles: {json.dumps(existing[:60])}.
Return ONLY a JSON array of exactly 8 short topic strings, each <= 70 characters, no numbering, no markdown."""
    try:
        from ai_runtime import generate_text
        resp = await generate_text(db, prompt, "You are an SEO content strategist. Reply with a JSON array of concise blog topic ideas only.", f"topics-{uuid.uuid4().hex[:8]}", gate=_llm_gate)
        text = resp if isinstance(resp, str) else str(resp)
        text = re.sub(r"^```(json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
        m = re.search(r"\[.*\]", text, re.DOTALL)
        arr = json.loads(m.group(0) if m else text)
        ideas = [str(x).strip().strip('"').strip() for x in arr if str(x).strip()][:8]
        if not ideas:
            raise ValueError("empty")
        return {"suggestions": ideas}
    except Exception as e:
        from ai_runtime import safe_error_message
        message = safe_error_message(e, 'text')
        logger.warning(f"Topic suggestion failed: {message}")
        raise HTTPException(status_code=502, detail=message)


autopilot.setup(db=db, slug=_slug, llm_gate=_llm_gate, put_object=put_object, get_object=get_object,
                ping_indexnow=ping_indexnow, get_site=_get_site_settings, services=SERVICES, cities=CITY_MAP)
api_router.include_router(autopilot.build_router(get_current_admin))
from api_credentials import build_router as build_api_credentials_router
api_router.include_router(build_api_credentials_router(db=db, get_current_admin=get_current_admin))
from seo_workflow import build_router as build_seo_workflow_router
api_router.include_router(build_seo_workflow_router(db=db, get_current_admin=get_current_admin))
from world_expansion import build_router as build_world_expansion_router
api_router.include_router(build_world_expansion_router(db=db, get_current_admin=get_current_admin))
from portfolio import build_router as build_portfolio_router
api_router.include_router(build_portfolio_router(db=db, get_current_admin=get_current_admin, ping_indexnow=ping_indexnow))
app.include_router(api_router)
app.include_router(build_indexnow_router(service=indexnow_service, get_current_admin=get_current_admin))

# Must be registered after the JSON API. Unknown public URLs return a real HTML
# 404; existing directory/index.html files are served before any app fallback.
from public_seo import build_public_router
app.include_router(build_public_router(db=db, get_settings=_get_site_settings,
    services=PUBLIC_SERVICES, city_map=CITY_MAP, fallback_content=_page_content))

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.leads.create_index("created_at")
    await db.location_pages.create_index("key", unique=True)
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Rajeev",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded admin {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Updated admin password")
    asyncio.create_task(_daily_digest_scheduler())
    await autopilot.ensure_indexes()
    asyncio.create_task(autopilot.scheduler_loop())
    await _apply_notification_config()
    # Restarts never seed, restore or rename public content. Existing blog and
    # case-study documents, including their exact URLs and deletions, are owned
    # by the CMS. Source seed helpers are reserved for deliberate setup work.
    try:
        await asyncio.to_thread(init_storage)
        logger.info("Object storage initialized")
    except Exception as e:
        logger.warning(f"Storage init failed (uploads disabled until fixed): {e}")


@app.on_event("shutdown")
async def shutdown():
    client.close()
