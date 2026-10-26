"""Portfolio catalog with explicit, authenticated CMS overrides.

Reading projects never seeds, rewrites or deletes source catalog or case studies.
A CMS archive is retained as a tombstone, so source entries cannot reappear on a
server restart. Existing project slugs are immutable when edited.
"""
import asyncio
import copy
import json
import re
import unicodedata
import uuid
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field, field_validator, model_validator
from pymongo.errors import DuplicateKeyError

CATALOG_PATH = Path(__file__).with_name("portfolio-projects.json")
INDEX_TITLE = "Website Portfolio & Project Work | Rajeev Freelancer"
INDEX_DESCRIPTION = "Explore websites, applications, SEO and automation projects delivered by Rajeev and PyTech Digital. View live work and discuss a similar project."
INDEX_HEADING = "Work we delivered. Ideas for your next project."
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
COLLECTION = "portfolio_projects"
INDUSTRY_NAMES = ["Manufacturing", "Hotels", "Hospitality", "Education", "Schools", "Healthcare", "Hospitals", "Real Estate", "Travel & Tourism", "Restaurants", "Retail", "Ecommerce", "Beauty & Wellness", "Fitness", "Financial Services", "Fintech", "Construction", "Architecture", "Interior Design", "Automotive", "Logistics", "Agriculture", "Poultry", "Food & Beverage", "Events", "Entertainment", "Nonprofit", "Professional Services", "Technology", "SaaS", "Telecommunications", "Energy", "Industrial Safety", "Recruitment", "Training & Coaching", "Legal Services", "Media & Publishing", "Sports", "Home Services", "Government & Public Services"]
SERVICE_NAMES = ["Website Design", "Website Redesign", "SEO", "Applications", "CRM", "AI Automation", "Digital Marketing", "Google Ads", "Social Media", "Maintenance & Support"]


def slugify(value):
    return re.sub(r"[^a-z0-9]+", "-", unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode().lower()).strip("-")


def taxonomy():
    return {"industries": [{"slug": slugify(name), "name": name} for name in INDUSTRY_NAMES],
            "services": [{"slug": slugify(name), "name": name} for name in SERVICE_NAMES]}


def _url(value, *, image=False):
    value = str(value or "").strip()
    if image and value.startswith("/") and not value.startswith("//") and not any(char in value for char in ("\\", "\r", "\n", "\x00")):
        return value
    try:
        parsed = urlsplit(value)
        if parsed.scheme not in {"https", "http"} or not parsed.hostname or parsed.username or parsed.password or any(char in value for char in ("\\", "\r", "\n", "\x00")):
            return ""
        parsed.port
        return value
    except ValueError:
        return ""


def _strings(value):
    return list(dict.fromkeys(str(item).strip() for item in value if isinstance(item, str) and item.strip())) if isinstance(value, list) else []


def _category(value):
    if isinstance(value, dict):
        name, slug = str(value.get("name", "")).strip(), str(value.get("slug", "")).strip()
    else:
        value = str(value or "Technology").strip()
        options = {item["slug"]: item["name"] for item in taxonomy()["industries"]}
        slug, name = slugify(value), options.get(value, value)
    return {"slug": slug, "name": name} if name and SLUG.fullmatch(slug) else {"slug": "technology", "name": "Technology"}


def _services(value):
    options = {item["slug"]: item["name"] for item in taxonomy()["services"]}
    out, seen = [], set()
    for item in value if isinstance(value, list) else []:
        if isinstance(item, dict):
            name, slug = str(item.get("name", "")).strip(), str(item.get("slug", "")).strip()
            slug = slug if SLUG.fullmatch(slug) else slugify(name)
            name = name or options.get(slug, slug.replace("-", " ").title())
        else:
            slug = slugify(item)
            name = options.get(slug, str(item).strip())
        if name and slug and slug not in seen:
            out.append({"slug": slug, "name": name}); seen.add(slug)
    return out


def _normalize(row, position=100, *, include_drafts=False):
    if not isinstance(row, dict) or row.get("archived") or (not include_drafts and row.get("published", True) is not True):
        return None
    slug = str(row.get("slug", ""))
    title, summary = str(row.get("title", "")).strip(), str(row.get("summary", "")).strip()
    if not SLUG.fullmatch(slug) or not title or (not summary and not include_drafts):
        return None
    screenshot = row.get("screenshot") if isinstance(row.get("screenshot"), dict) else {}
    image_url = _url(row.get("image_url") or screenshot.get("url") or row.get("preview_image"), image=True)
    if image_url:
        def dimension(key, default):
            value = screenshot.get(key)
            return value if type(value) is int and 1 <= value <= 20000 else default
        screenshot = {"url": image_url, "alt": str(row.get("image_alt") or screenshot.get("alt") or row.get("preview_alt") or title + " project preview"), "width": dimension("width", 1440), "height": dimension("height", 900)}
    else:
        screenshot = None
    gallery = []
    for image in row.get("gallery", []) if isinstance(row.get("gallery"), list) else []:
        if not isinstance(image, dict):
            continue
        url = _url(image.get("url"), image=True)
        if url:
            gallery.append({"url": url, "alt": str(image.get("alt") or title + " project image"), "caption": str(image.get("caption") or "")})
    raw_story = row.get("story") if isinstance(row.get("story"), dict) else {}
    story = {"overview": str(raw_story.get("overview") or summary)}
    for key in ("scope", "process", "delivery", "handover", "constraints", "evidence_notes", "delivery_approach"):
        story[key] = _strings(raw_story.get(key))
    seo = row.get("seo") if isinstance(row.get("seo"), dict) else {}
    metadata = {"title": str(seo.get("title") or row.get("meta_title") or title + " | Project Work | Rajeev Freelancer"), "description": str(seo.get("description") or row.get("meta_description") or summary)}
    order = row.get("display_order", position)
    industry = _category(row.get("industry") or row.get("category"))
    website = _url(row.get("website_url") or row.get("live_url") or row.get("url"))
    return {"id": str(row.get("id") or slug), "slug": slug, "path": "/work/" + slug, "title": title,
            "project_type": "demo" if row.get("project_type") == "demo" else "project",
            "client_name": str(row.get("client_name") or title), "industry": industry, "category": industry,
            "summary": summary, "website_url": website, "live_url": website, "source_url": _url(row.get("source_url")),
            "source_note": str(row.get("source_note") or ""), "attribution": str(row.get("attribution") or ""),
            "relationship": str(row.get("relationship") or ""), "screenshot": screenshot,
            "image_url": image_url, "image_alt": screenshot["alt"] if screenshot else "", "gallery": gallery,
            "services": _services(row.get("services")), "technology": _strings(row.get("technology") or row.get("technologies")),
            "story": story, "seo": metadata, "meta_title": metadata["title"], "meta_description": metadata["description"],
            "featured": row.get("featured") is True, "display_order": order if type(order) is int else position,
            "published": row.get("published", True) is True, "updated_at": row.get("updated_at"), "created_at": row.get("created_at")}


@lru_cache(maxsize=4)
def _read(path, modified_ns, size):
    try:
        raw = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"projects": (), "by_slug": {}, "updated_at": None}
    projects, seen = [], set()
    for position, row in enumerate(raw.get("projects", []) if isinstance(raw, dict) else []):
        item = _normalize(row, position, include_drafts=True)
        if item and item["slug"] not in seen:
            seen.add(item["slug"]); projects.append(item)
    projects.sort(key=lambda row: (not row["featured"], row["display_order"], row["slug"]))
    return {"projects": tuple(projects), "by_slug": {row["slug"]: row for row in projects}, "updated_at": raw.get("updated_at") if isinstance(raw, dict) else None}


def catalog():
    try:
        stamp = CATALOG_PATH.stat()
        return _read(str(CATALOG_PATH), stamp.st_mtime_ns, stamp.st_size)
    except OSError:
        return {"projects": (), "by_slug": {}, "updated_at": None}


def public_projects():
    return copy.deepcopy([row for row in catalog()["projects"] if row["published"] and row["summary"].strip()])


def project(slug):
    result = catalog()["by_slug"].get(slug)
    return copy.deepcopy(result) if result and result["published"] else None


def collection(db):
    try:
        return db[COLLECTION]
    except (TypeError, KeyError, AttributeError):
        return getattr(db, COLLECTION, None)


async def merged_projects(db=None, *, include_drafts=False):
    base = {row["id"]: copy.deepcopy(row) for row in catalog()["projects"]}
    store = collection(db) if db is not None else None
    if store is not None:
        overrides = await store.find({}, {"_id": 0}).to_list(10000)
        for row in overrides:
            key = row.get("id")
            if row.get("archived"):
                base.pop(key, None)
            else:
                item = _normalize(row, include_drafts=True)
                if item:
                    base[key] = item
    rows = [row for row in base.values() if include_drafts or (row["published"] and row["summary"].strip())]
    return sorted(rows, key=lambda row: (not row["featured"], row["display_order"], row["slug"]))


def summary(row):
    return {key: copy.deepcopy(value) for key, value in row.items() if key not in {"story", "seo", "meta_title", "meta_description"}}


def _search(value):
    return "".join(char for char in unicodedata.normalize("NFKD", str(value)).casefold() if not unicodedata.combining(char))


def listing(*, category="", industry="", service="", q="", page=1, page_size=12, rows=None):
    if type(page) is not int or page < 1 or type(page_size) is not int or not 1 <= page_size <= 60 or len(str(q)) > 120:
        raise HTTPException(422, "Invalid portfolio filters or pagination")
    rows = public_projects() if rows is None else rows
    categories, services = {}, {}
    for row in rows:
        key = row["industry"]["slug"]
        categories.setdefault(key, {**row["industry"], "count": 0})["count"] += 1
        for item in row["services"]:
            services.setdefault(item["slug"], {**item, "count": 0})["count"] += 1
    category, service, q = str(industry or category).strip(), str(service).strip(), str(q).strip()
    selected = [row for row in rows if (not category or row["industry"]["slug"] == category) and (not service or service in {item["slug"] for item in row["services"]})]
    terms = _search(q).split()
    if terms:
        selected = [row for row in selected if all(term in _search(" ".join((row["title"], row["summary"], row["industry"]["name"], row["client_name"], " ".join(item["name"] for item in row["services"])) )) for term in terms)]
    total = len(selected)
    total_pages = (total + page_size - 1) // page_size
    if page > max(1, total_pages):
        raise HTTPException(404, "Portfolio page not found")
    return {"items": [summary(row) for row in selected[(page-1)*page_size:page*page_size]],
            "pagination": {"page": page, "page_size": page_size, "total": total, "total_pages": total_pages},
            "categories": sorted(categories.values(), key=lambda row: row["name"]), "industries": sorted(categories.values(), key=lambda row: row["name"]), "services": sorted(services.values(), key=lambda row: row["name"]), "total_projects": len(rows),
            "filters": {"category": category, "industry": category, "service": service, "q": q}}


def detail(slug, rows=None):
    rows = public_projects() if rows is None else rows
    row = next((row for row in rows if row["slug"] == slug), None)
    if row is None:
        raise HTTPException(404, "Project not found")
    related = sorted((item for item in rows if item["slug"] != slug), key=lambda item: item["industry"]["slug"] != row["industry"]["slug"])
    return {"project": copy.deepcopy(row), "related": [summary(item) for item in related[:3]]}


class GalleryImage(BaseModel):
    url: str = Field(max_length=2000)
    alt: str = Field(default="", max_length=500)
    caption: str = Field(default="", max_length=1500)

    @field_validator("url")
    @classmethod
    def valid_url(cls, value):
        if not _url(value, image=True):
            raise ValueError("Use an uploaded image path or an http/https image URL")
        return value.strip()


class ProjectInput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    slug: str | None = Field(default=None, max_length=200)
    client_name: str = Field(default="", max_length=200)
    industry: Any = "technology"
    services: list[Any] = Field(default_factory=list, max_length=30)
    summary: str = Field(default="", max_length=2000)
    website_url: str = Field(default="", max_length=2000)
    image_url: str = Field(default="", max_length=2000)
    image_alt: str = Field(default="", max_length=500)
    gallery: list[GalleryImage] = Field(default_factory=list, max_length=30)
    technology: list[str] = Field(default_factory=list, max_length=40)
    story: dict = Field(default_factory=dict)
    featured: bool = False
    display_order: int = Field(default=100, ge=-10000, le=1000000)
    published: bool = False

    @field_validator("title")
    @classmethod
    def nonblank(cls, value):
        if not value.strip():
            raise ValueError("This field cannot be blank")
        return value.strip()

    @model_validator(mode="after")
    def publish_ready(self):
        self.summary = self.summary.strip()
        if self.published and not self.summary:
            raise ValueError("Add a project summary before publishing")
        return self

    @field_validator("website_url", "image_url")
    @classmethod
    def valid_url(cls, value, info):
        if value.strip() and not _url(value, image=info.field_name == "image_url"):
            raise ValueError("Use a valid http/https URL" if info.field_name == "website_url" else "Use an uploaded image path or http/https image URL")
        return value.strip()

    @field_validator("slug")
    @classmethod
    def valid_slug(cls, value):
        value = (value or "").strip()
        if value and not SLUG.fullmatch(value):
            raise ValueError("Use lowercase letters, numbers and single hyphens for the URL")
        return value or None

    @field_validator("industry")
    @classmethod
    def valid_industry(cls, value):
        slug = value.get("slug") if isinstance(value, dict) else value
        if not isinstance(slug, str) or slug not in {item["slug"] for item in taxonomy()["industries"]}:
            raise ValueError("Select an industry from the available options")
        return slug

    @field_validator("services")
    @classmethod
    def valid_services(cls, values):
        slugs = [value.get("slug") if isinstance(value, dict) else value for value in values]
        if any(not isinstance(value, str) or value not in {item["slug"] for item in taxonomy()["services"]} for value in slugs):
            raise ValueError("Select services from the available options")
        return list(dict.fromkeys(slugs))

    @field_validator("story")
    @classmethod
    def valid_story(cls, value):
        if len(json.dumps(value)) > 60000:
            raise ValueError("Project story is too long")
        if any(key in value and not isinstance(value[key], list) for key in ("scope", "process", "delivery", "handover", "constraints", "evidence_notes", "delivery_approach")):
            raise ValueError("Story steps must be lists of text")
        return value


class PublishInput(BaseModel):
    published: bool


def build_router(db=None, get_current_admin=None, ping_indexnow=None):
    router = APIRouter()

    @router.api_route("/portfolio", methods=["GET", "HEAD"])
    async def index(response: Response, category: str = "", industry: str = "", service: str = "", q: str = Query("", max_length=120), page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=60)):
        response.headers["Cache-Control"] = "no-store"
        return listing(category=category, industry=industry, service=service, q=q, page=page, page_size=page_size, rows=await merged_projects(db))

    @router.get("/portfolio/taxonomy")
    async def options():
        return taxonomy()

    @router.api_route("/portfolio/{slug}", methods=["GET", "HEAD"])
    async def item(slug: str, response: Response):
        response.headers["Cache-Control"] = "no-store"
        return detail(slug, await merged_projects(db))

    if db is None or get_current_admin is None:
        return router

    # This application still uses FastAPI startup handlers. APIRouter lifespan
    # contexts are not propagated by its pinned FastAPI version.
    @router.on_event("startup")
    async def ensure_indexes():
        await db[COLLECTION].create_index("id", unique=True)
        await db[COLLECTION].create_index("slug", unique=True)

    async def find_admin(project_id):
        rows = await merged_projects(db, include_drafts=True)
        row = next((row for row in rows if row["id"] == project_id), None)
        if row is None:
            raise HTTPException(404, "Project not found")
        return row

    async def save(payload, *, current=None):
        rows = await merged_projects(db, include_drafts=True)
        slug = current["slug"] if current else (payload.slug or slugify(payload.title))
        if not slug:
            raise HTTPException(422, "A project URL is required")
        if current and payload.slug and payload.slug != current["slug"]:
            raise HTTPException(409, "Existing project URLs are preserved. Keep the original slug.")
        if any(row["slug"] == slug and (current is None or row["id"] != current["id"]) for row in rows):
            raise HTTPException(409, "A project with this URL already exists")
        # Archived URLs remain reserved so deletion never silently reuses an old URL.
        archived = await db[COLLECTION].find_one({"slug": slug, "archived": True}, {"_id": 0})
        if archived:
            raise HTTPException(409, "This URL belongs to an archived project; choose another URL")
        now = datetime.now(timezone.utc).isoformat()
        doc = {**(current or {}), **payload.model_dump(), "slug": slug, "id": current["id"] if current else str(uuid.uuid4()), "archived": False,
               "created_at": current.get("created_at") or now if current else now, "updated_at": now}
        # Clean inherited screenshot: uploaded CMS image explicitly controls the cover.
        doc.pop("screenshot", None)
        try:
            await db[COLLECTION].replace_one({"id": doc["id"]}, doc, upsert=True)
        except DuplicateKeyError:
            raise HTTPException(409, "A project with this URL already exists")
        if doc["published"] and ping_indexnow:
            asyncio.create_task(ping_indexnow(["/work/" + slug]))
        return _normalize(doc, include_drafts=True)

    @router.get("/admin/portfolio")
    async def admin_index(response: Response, admin: dict = Depends(get_current_admin)):
        response.headers["Cache-Control"] = "no-store"
        return {"items": await merged_projects(db, include_drafts=True)}

    @router.get("/admin/portfolio/taxonomy")
    async def admin_options(admin: dict = Depends(get_current_admin)):
        return taxonomy()

    @router.post("/admin/portfolio")
    async def create(payload: ProjectInput, admin: dict = Depends(get_current_admin)):
        return await save(payload)

    @router.get("/admin/portfolio/{project_id}")
    async def admin_item(project_id: str, response: Response, admin: dict = Depends(get_current_admin)):
        response.headers["Cache-Control"] = "no-store"
        return await find_admin(project_id)

    @router.put("/admin/portfolio/{project_id}")
    async def update(project_id: str, payload: ProjectInput, admin: dict = Depends(get_current_admin)):
        return await save(payload, current=await find_admin(project_id))

    @router.patch("/admin/portfolio/{project_id}/publish")
    async def publish(project_id: str, payload: PublishInput, admin: dict = Depends(get_current_admin)):
        current = await find_admin(project_id)
        if payload.published and not current["summary"].strip():
            raise HTTPException(422, "Add a project summary before publishing")
        # Preserve every other value rather than rebuild from model defaults.
        doc = {**current, "published": payload.published, "archived": False, "updated_at": datetime.now(timezone.utc).isoformat()}
        await db[COLLECTION].replace_one({"id": project_id}, doc, upsert=True)
        if payload.published and ping_indexnow:
            asyncio.create_task(ping_indexnow(["/work/" + current["slug"]]))
        return _normalize(doc, include_drafts=True)

    @router.delete("/admin/portfolio/{project_id}")
    async def archive(project_id: str, admin: dict = Depends(get_current_admin)):
        current = await find_admin(project_id)
        await db[COLLECTION].replace_one({"id": project_id}, {**current, "archived": True, "published": False, "updated_at": datetime.now(timezone.utc).isoformat()}, upsert=True)
        return {"ok": True}

    return router
