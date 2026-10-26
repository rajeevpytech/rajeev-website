"""Blog Autopilot: server-side scheduler + generation pipeline (topic -> article -> cover -> validate -> publish)."""
import os
import re
import io
import json
import hmac
import time
import uuid
import base64
import asyncio
import hashlib
import logging
from datetime import datetime, timezone, timedelta, date
from typing import Optional, List
from zoneinfo import ZoneInfo, available_timezones

import markdown as md_lib
import nh3
from PIL import Image
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import Response, HTMLResponse
from pydantic import BaseModel
from pymongo.errors import DuplicateKeyError

logger = logging.getLogger("rajeevfreelancer.autopilot")

ctx: dict = {}  # filled by setup(): db, slug, llm_gate, put_object, get_object, ping_indexnow, get_site, services, cities

TOPIC_CLUSTERS = [
    "Freelance app development", "Android and iOS development", "React Native development", "Website development",
    "React and WordPress development", "Custom software development", "SEO consulting", "Local SEO", "Technical SEO",
    "Digital marketing", "AI consulting", "Business automation", "WhatsApp marketing and automation", "SMS marketing",
    "E-commerce development", "Service + location (Gurgaon, Delhi NCR, India, Dubai, London, Singapore, Australia, USA)",
]
DEFAULT_CATEGORIES = ["SEO", "Web Development", "App Development", "AI Automation", "Digital Marketing", "WhatsApp Marketing", "Guide"]
MAX_ATTEMPTS = 3
BACKOFF_MINUTES = [10, 30, 60]
GRACE_HOURS = int(os.environ.get("AUTOPILOT_GRACE_HOURS", "12"))
STALE_CLAIM_MINUTES = 30
INSTANCE_ID = f"{os.uname().nodename}-{os.getpid()}"
CLAIM_RE = re.compile(
    r"(guarantee[sd]?\s+(?:you\s+)?(?:a\s+|the\s+)?(?:top|first|#1|page[- ]one|rank))|(\bnumber\s*one\b)|(\bno\.?\s*1\b)|(#\s?1\b)"
    r"|(award[- ]winning)|(\bbest\s+(?:seo|app|web|developer|agency|freelancer)\w*\s+in\s+(?:india|the\s+world|gurgaon|delhi|dubai|london))"
    r"|(100%\s+guaranteed)|(ai[- ]generated)|(as an ai)|(language model)|(\bour client [A-Z][a-z]+ (?:saw|got|achieved))",
    re.I,
)
DANGEROUS_RE = re.compile(r"<\s*(script|iframe|object|embed|style|form|input|img|svg|link|meta)\b|javascript:|on\w+\s*=|data:text/html", re.I)
_rate_bucket: dict = {}


def setup(**kw):
    ctx.update(kw)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None


# ---------------- settings ----------------
DEFAULTS = {
    "enabled": True, "frequency": "daily", "publish_time": "09:00", "tz": "Asia/Kolkata", "auto_publish": True,
    "generate_cover": True, "dedupe": True, "categories": DEFAULT_CATEGORIES, "excluded_keywords": [], "custom_topics": [],
    "schedule_start_date": None, "last_success_date": None, "last_run_at": None, "last_success_at": None,
    "last_error": None, "generated_count": 0,
}


async def get_settings() -> dict:
    doc = await ctx["db"].settings.find_one({"key": "blog_autopilot"}, {"_id": 0, "key": 0}) or {}
    ap = {**DEFAULTS, **doc}
    if "frequency" not in doc and "frequency_days" in doc:  # legacy migration
        ap["frequency"] = "daily" if int(doc["frequency_days"]) <= 1 else "alternate"
    if not ap.get("schedule_start_date"):
        ap["schedule_start_date"] = datetime.now(_tz(ap["tz"])).date().isoformat()
        await save_settings({"schedule_start_date": ap["schedule_start_date"]})
    return ap


async def save_settings(patch: dict):
    await ctx["db"].settings.update_one({"key": "blog_autopilot"}, {"$set": patch}, upsert=True)


def _tz(name: str):
    try:
        return ZoneInfo(name)
    except Exception:
        return ZoneInfo("Asia/Kolkata")


def _parse_time(s: str):
    m = re.match(r"^(\d{1,2}):(\d{2})$", str(s or "09:00"))
    h, mi = (int(m.group(1)), int(m.group(2))) if m else (9, 0)
    return min(23, max(0, h)), min(59, max(0, mi))


def run_key_for(ap: dict, local_day: date) -> str:
    return f"blog-autopilot:{ap['tz'].replace('/', '-')}:{local_day.isoformat()}"


def is_due_day(ap: dict, local_day: date) -> bool:
    if ap["frequency"] == "daily":
        return True
    if ap["frequency"] == "alternate":
        try:
            start = date.fromisoformat(ap["schedule_start_date"])
        except Exception:
            return True
        return (local_day - start).days % 2 == 0
    return False


def next_run_utc(ap: dict) -> Optional[datetime]:
    if not ap.get("enabled") or ap["frequency"] == "manual":
        return None
    tz = _tz(ap["tz"])
    h, mi = _parse_time(ap["publish_time"])
    now_local = datetime.now(tz)
    for i in range(0, 4):
        day = (now_local + timedelta(days=i)).date()
        cand = datetime(day.year, day.month, day.day, h, mi, tzinfo=tz)
        if cand <= now_local and i == 0:
            continue
        if is_due_day(ap, day):
            return cand.astimezone(timezone.utc)
    return None


async def settings_view(ap: dict) -> dict:
    db = ctx["db"]
    nxt = next_run_utc(ap)
    tz = _tz(ap["tz"])
    last_success = await db.autopilot_runs.find_one({"status": {"$in": ["success", "draft"]}}, {"_id": 0}, sort=[("finished_at", -1)])
    last_error_run = await db.autopilot_runs.find_one({"status": {"$in": ["failed", "retrying"]}}, {"_id": 0}, sort=[("finished_at", -1)])
    queued = await db.autopilot_topics.count_documents({"status": "queued"})
    frequency_days = {"daily": 1, "alternate": 2}.get(ap["frequency"], 0)
    from ai_runtime import redact_error_fields
    from seo_workflow import provider_diagnostic, _runtime_diagnostic_profiles
    diagnostic = provider_diagnostic(ap, await _runtime_diagnostic_profiles(db))
    return {
        **redact_error_fields(ap), "frequency_days": frequency_days, "provider_diagnostic": diagnostic,
        "next_run": iso(nxt), "next_run_local": nxt.astimezone(tz).strftime("%a %d %b %Y, %H:%M") if nxt else None,
        "last_success_run": redact_error_fields(last_success), "last_error_run": redact_error_fields(last_error_run), "queued_topics": queued,
        "next_topic": (ap.get("custom_topics") or [None])[0] or "AI-selected (topic cluster strategy)",
        "instance": INSTANCE_ID, "timezones": None,
    }


# ---------------- LLM helpers ----------------
async def _llm_json(prompt: str, system: str, session: str, expect: str = "object"):
    from ai_runtime import generate_text
    resp = await generate_text(ctx["db"], prompt, system, session, gate=ctx["llm_gate"])
    text = resp if isinstance(resp, str) else str(resp)
    text = re.sub(r"^```(json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    m = re.search(r"\[.*\]" if expect == "array" else r"\{.*\}", text, re.DOTALL)
    return json.loads(m.group(0) if m else text)


def _tokens(s: str) -> set:
    stop = {"the", "a", "an", "and", "or", "for", "to", "of", "in", "on", "with", "your", "how", "why", "what", "is", "vs", "guide", "2025", "2026", "complete"}
    return {w for w in re.findall(r"[a-z0-9]+", (s or "").lower()) if w not in stop and len(w) > 2}


def similarity(a: str, b: str) -> float:
    ta, tb = _tokens(a), _tokens(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


async def _corpus() -> list:
    return await ctx["db"].blog_posts.find({}, {"_id": 0, "title": 1, "slug": 1, "tags": 1, "excerpt": 1, "primary_keyword": 1, "cluster": 1, "created_at": 1}).sort("created_at", -1).to_list(400)


def _reject_reason(topic: dict, corpus: list, ap: dict) -> Optional[str]:
    t = str(topic.get("topic") or "")
    kw = str(topic.get("primary_keyword") or "").lower()
    if len(t) < 12:
        return "topic too short"
    for ex in ap.get("excluded_keywords") or []:
        if ex and ex.lower() in (t + " " + kw).lower():
            return f"contains excluded keyword '{ex}'"
    if not ap.get("dedupe", True):
        return None
    for p in corpus:
        if similarity(t, p.get("title", "")) >= 0.6:
            return f"too similar to existing post '{p.get('title')}'"
        if ctx["slug"](t) == p.get("slug"):
            return "slug already exists"
    recent_kw = [str(p.get("primary_keyword") or "").lower() for p in corpus[:12]]
    if kw and recent_kw.count(kw) >= 2:
        return f"primary keyword '{kw}' targeted too frequently"
    return None


async def choose_topic(ap: dict, corpus: list, run: dict) -> dict:
    db = ctx["db"]
    # 1) explicit queue (admin-provided topics or previously queued AI ideas)
    customs = [t for t in (ap.get("custom_topics") or []) if str(t).strip()]
    for t in customs:
        cand = {"topic": t, "primary_keyword": t, "cluster": "custom", "source": "queue"}
        reason = _reject_reason(cand, corpus, ap)
        if reason:
            await db.autopilot_topics.insert_one({"id": str(uuid.uuid4()), **cand, "status": "rejected", "reason": reason, "created_at": iso(now_utc()), "run_key": run["run_key"]})
            await db.settings.update_one({"key": "blog_autopilot"}, {"$pull": {"custom_topics": t}})
            continue
        return cand
    queued = await db.autopilot_topics.find_one({"status": "queued"}, {"_id": 0}, sort=[("created_at", 1)])
    if queued and not _reject_reason(queued, corpus, ap):
        return {**queued, "source": "queue"}
    # 2) AI proposal balanced across clusters
    recent_clusters = [p.get("cluster") for p in corpus[:10] if p.get("cluster")]
    underused = [c for c in TOPIC_CLUSTERS if recent_clusters.count(c) == 0][:8] or TOPIC_CLUSTERS
    existing = [p["title"] for p in corpus[:150]]
    prompt = f"""Propose 6 fresh blog topics for rajeevfreelancer.com (Rajeev: senior freelance engineer & consultant — apps, websites, SEO, digital marketing, AI automation, WhatsApp/SMS marketing; based in Gurgaon/Delhi NCR, serving India, Dubai, London, Singapore, Australia, USA).
Prefer these under-covered clusters: {json.dumps(underused)}.
Allowed categories: {json.dumps(ap.get('categories') or DEFAULT_CATEGORIES)}.
Exclude anything about: {json.dumps(ap.get('excluded_keywords') or [])}.
Each topic must have clear informational or commercial intent, be useful for SMB owners/founders, and NOT duplicate these existing titles: {json.dumps(existing)}.
Location topics must be genuinely useful (market-specific guidance), never thin doorway content. Don't repeat the same primary keyword.
Return ONLY a JSON array of 6 objects: {{"topic": "...", "primary_keyword": "...", "cluster": "one of the clusters", "intent": "informational|commercial", "category": "one of allowed categories"}}"""
    try:
        ideas = await _llm_json(prompt, "You are a senior SEO content strategist. Reply with JSON only.", f"topics-{run['run_key']}", "array")
    except Exception as e:
        from ai_runtime import safe_error_message
        logger.warning(f"topic proposal failed: {safe_error_message(e, 'text')}")
        ideas = []
    for idea in ideas:
        if not isinstance(idea, dict):
            continue
        reason = _reject_reason(idea, corpus, ap)
        rec = {"id": str(uuid.uuid4()), "topic": idea.get("topic"), "primary_keyword": idea.get("primary_keyword"), "cluster": idea.get("cluster"),
               "intent": idea.get("intent"), "category": idea.get("category"), "created_at": iso(now_utc()), "run_key": run["run_key"]}
        if reason:
            await db.autopilot_topics.insert_one({**rec, "status": "rejected", "reason": reason})
        elif "chosen" not in locals():
            chosen = {**rec, "source": "ai"}
        else:
            await db.autopilot_topics.insert_one({**rec, "status": "queued"})
    if "chosen" in locals():
        return chosen
    # 3) deterministic fallback
    for svc in ctx["services"]:
        for angle in ("a practical checklist for small businesses", "common mistakes to avoid", "how to measure real ROI"):
            cand = {"topic": f"{svc['name']}: {angle}", "primary_keyword": svc.get("keyword", svc["name"]), "cluster": svc["name"], "source": "fallback"}
            if not _reject_reason(cand, corpus, ap):
                return cand
    raise RuntimeError("No non-duplicate topic available")


# ---------------- article ----------------
def _link_inventory(corpus: list, topic: dict) -> list:
    links = [("/contact", "Contact Rajeev"), ("/about", "About Rajeev"), ("/pricing", "Pricing"), ("/case-studies", "Case studies"), ("/delhi-ncr", "Delhi NCR services")]
    links += [(f"/{s['slug']}", s["name"]) for s in ctx["services"]]
    ranked = sorted(corpus, key=lambda p: -similarity(topic.get("topic", ""), p.get("title", "")))[:5]
    links += [(f"/blog/{p['slug']}", p["title"]) for p in ranked if p.get("slug")]
    return links


async def generate_article(topic: dict, ap: dict, corpus: list, run: dict) -> dict:
    site = await ctx["get_site"]()
    base = site["seo"].get("canonical_domain", "https://www.rajeevfreelancer.com").rstrip("/")
    inventory = _link_inventory(corpus, topic)
    inv_text = "\n".join(f"- {u} ({label})" for u, label in inventory)
    prompt = f"""Write an original, practical blog article for rajeevfreelancer.com.
Topic: "{topic['topic']}". Primary keyword: "{topic.get('primary_keyword') or topic['topic']}". Cluster: {topic.get('cluster', '')}.
Audience: SMB owners, founders and marketing leads. Author: Rajeev, a senior freelance engineer & consultant (Gurgaon / Delhi NCR, works worldwide).
Allowed categories: {json.dumps(ap.get('categories') or DEFAULT_CATEGORIES)}.

Requirements:
- 1000-1600 words of genuinely useful, specific content written for real readers. Direct answer right after each important heading. Clear definitions, helpful comparisons, concise summaries of recommendations.
- body_markdown: Markdown ONLY (no HTML). Do NOT include an H1. Use "## " for H2 and "### " for H3 (at least 4 H2). Short paragraphs (max 3 sentences). Use bulleted or numbered lists where helpful. Bold key terms sparingly.
- Include 3 to 5 natural internal links using ONLY these relative URLs (markdown links, exact paths, no other links, no external links):
{inv_text}
- End with a short, helpful, non-pushy call to action inviting readers to get in touch via /contact.
- Do NOT: stuff keywords, invent testimonials/clients/case studies/statistics/prices/awards/rankings, guarantee rankings, use "best"/"#1"/"number one" claims, write filler, or mention AI/automation in the writing process.
- faqs: 3-5 specific question/answer pairs (answers 2-4 sentences) that are genuinely asked by searchers.
- cover_prompt: an art-direction prompt for an abstract/illustrative editorial 16:9 image about the topic — explicitly no text, no letters, no logos, no people, no faces.
Return ONLY minified JSON with EXACTLY these keys:
{{"title": "H1 / SEO title <= 65 chars incl. primary keyword", "seo_title": "<= 60 chars", "meta_description": "150-158 chars with keyword + benefit", "excerpt": "1-2 sentence summary <= 200 chars", "primary_keyword": "...", "secondary_keywords": ["3-6 phrases"], "category": "one allowed category", "tags": ["4-6 lowercase tags"], "body_markdown": "...", "faqs": [{{"q": "...", "a": "..."}}], "cover_prompt": "...", "cover_alt": "descriptive alt text <= 125 chars, no 'image of'"}}"""
    system = ("You are an expert SEO editor and technical writer for Rajeev Freelancer. Tone: professional, clear, friendly, practical. "
              "Accuracy matters more than hype. Return ONLY valid JSON.")
    data = await _llm_json(prompt, system, f"article-{run['run_key']}")
    for k in ("title", "meta_description", "excerpt", "primary_keyword", "body_markdown", "category"):
        if not data.get(k):
            raise ValueError(f"article missing {k}")
    data["_base"] = base
    data["_inventory"] = {u for u, _ in inventory}
    return data


def sanitize_markdown(md: str) -> str:
    md = re.sub(r"<[^>]+>", "", str(md))  # strip any raw HTML tags entirely
    return md.replace("\r\n", "\n").strip()


def markdown_to_html(md: str) -> str:
    html = md_lib.markdown(md, extensions=["extra", "sane_lists", "toc"], output_format="html")
    return nh3.clean(html, tags={"h2", "h3", "h4", "p", "ul", "ol", "li", "a", "strong", "em", "blockquote", "code", "pre", "br", "hr", "table", "thead", "tbody", "tr", "th", "td"},
                     attributes={"a": {"href", "title"}}, url_schemes={"https", "http", "mailto"}, link_rel="noopener")


def validate_article(data: dict, slug: str, corpus: list, ap: dict) -> List[str]:
    problems = []
    title = str(data["title"]).strip()
    body = sanitize_markdown(data["body_markdown"])
    if not (10 <= len(title) <= 110):
        problems.append("title length out of range")
    if any(p.get("title", "").strip().lower() == title.lower() for p in corpus):
        problems.append("title not unique")
    if any(p.get("slug") == slug for p in corpus):
        problems.append("slug not unique")
    if not str(data.get("excerpt", "")).strip():
        problems.append("excerpt missing")
    words = len(re.findall(r"\w+", body))
    if words < 700:
        problems.append(f"article too short ({words} words)")
    kw = str(data.get("primary_keyword", "")).lower()
    if kw and kw not in body.lower() and kw not in title.lower():
        problems.append("primary keyword not present")
    if len(re.findall(r"^## ", body, re.M)) < 3:
        problems.append("fewer than 3 H2 headings")
    if re.search(r"^# ", body, re.M):
        problems.append("body contains an H1")
    if DANGEROUS_RE.search(body) or DANGEROUS_RE.search(title) or DANGEROUS_RE.search(str(data.get("excerpt", ""))):
        problems.append("HTML/script injection detected")
    m = CLAIM_RE.search(body + " " + title)
    if m:
        problems.append(f"unsupported claim: '{m.group(0)}'")
    for url in re.findall(r"\]\(([^)\s]+)\)", body):
        if url.startswith(("http://", "https://")):
            if not url.startswith(data["_base"]):
                problems.append(f"external link not allowed: {url}")
        elif url.split("#")[0].rstrip("/") not in data["_inventory"] and url != "/":
            problems.append(f"internal link not a valid route: {url}")
    if not (60 <= len(str(data.get("meta_description", ""))) <= 175):
        problems.append("meta description length out of range")
    faqs = data.get("faqs") or []
    if faqs and not all(isinstance(f, dict) and f.get("q") and f.get("a") for f in faqs):
        problems.append("malformed FAQs")
    return problems


# ---------------- cover image ----------------
async def generate_cover(prompt: str, alt: str, slug: str) -> dict:
    from ai_runtime import generate_image, safe_error_message
    full = (f"{prompt}. Editorial abstract illustration, modern flat/3D style, cohesive colour palette with deep blue accents, wide 16:9 landscape composition. "
            "Strictly no text, no letters, no numbers, no words, no logos, no watermark, no people, no faces, no portraits.")
    last_err = None
    for attempt in range(2):
        try:
            raw = await generate_image(ctx["db"], full, f"cover-{slug}-{attempt}", gate=ctx["llm_gate"])
            return await asyncio.to_thread(_process_and_store, raw, alt, slug, full)
        except Exception as e:
            last_err = safe_error_message(e, 'image')
            logger.warning(f"cover generation attempt {attempt + 1} failed: {last_err}")
            await asyncio.sleep(3)
    raise RuntimeError(f"cover image failed: {last_err}")


def _process_and_store(raw: bytes, alt: str, slug: str, prompt: str) -> dict:
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    w, h = img.size
    target = 16 / 9
    if w / h > target:
        nw = int(h * target); img = img.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = int(w / target); img = img.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    variants = []
    fid = str(uuid.uuid4())
    for width, tag in ((1200, ""), (640, "-640")):
        v = img.resize((width, int(width * 9 / 16)), Image.LANCZOS)
        buf = io.BytesIO(); v.save(buf, "WEBP", quality=82, method=6)
        data = buf.getvalue()
        vid = fid if not tag else f"{fid}{tag}"
        path = f"rajeevfreelancer/blog-covers/{vid}.webp"
        res = ctx["put_object"](path, data, "image/webp")
        variants.append({"id": vid, "storage_path": res.get("path", path), "width": width, "height": int(width * 9 / 16), "bytes": len(data), "url": f"/api/uploads/{vid}"})
    # verify readable from storage before publishing
    ctx["get_object"](variants[0]["storage_path"])
    return {"id": fid, "alt": alt, "prompt": prompt, "format": "webp", "variants": variants, "url": variants[0]["url"], "srcset": ", ".join(f"{v['url']} {v['width']}w" for v in variants)}


async def _register_image(meta: dict, slug: str):
    db = ctx["db"]
    now = iso(now_utc())
    for v in meta["variants"]:
        await db.uploads.insert_one({"id": v["id"], "storage_path": v["storage_path"], "content_type": "image/webp", "original_filename": f"{slug}-{v['width']}.webp",
                                     "size": v["bytes"], "is_deleted": False, "created_at": now, "source": "autopilot"})
    await db.blog_images.insert_one({**meta, "post_slug": slug, "created_at": now})


# ---------------- pipeline ----------------
async def _step(run_key: str, name: str, **extra):
    await ctx["db"].autopilot_runs.update_one({"run_key": run_key}, {"$set": {"status": "generating", "current_step": name, "heartbeat_at": iso(now_utc())},
                                                                     "$push": {"steps": {"step": name, "at": iso(now_utc()), **extra}}})


async def run_pipeline(run: dict) -> dict:
    db = ctx["db"]
    ap = await get_settings()
    key = run["run_key"]
    corpus = await _corpus()
    await _step(key, "select_topic")
    topic = await choose_topic(ap, corpus, run)
    await _step(key, "topic_selected", topic=topic.get("topic"), keyword=topic.get("primary_keyword"))
    await _step(key, "generate_article")
    data = await generate_article(topic, ap, corpus, run)
    title = str(data["title"]).strip()
    slug = ctx["slug"](title)[:80].strip("-") or f"post-{uuid.uuid4().hex[:6]}"
    if await db.blog_posts.find_one({"slug": slug}):
        slug = f"{slug}-{uuid.uuid4().hex[:4]}"
    problems = validate_article(data, slug, corpus, ap)
    if problems:
        raise RuntimeError("validation failed: " + "; ".join(problems[:6]))
    await _step(key, "validated", words=len(re.findall(r"\w+", data["body_markdown"])))
    body_md = sanitize_markdown(data["body_markdown"])
    cover, cover_error = None, None
    if ap.get("generate_cover", True):
        await _step(key, "generate_cover")
        try:
            cover = await generate_cover(str(data.get("cover_prompt") or title), str(data.get("cover_alt") or title)[:125], slug)
            await _register_image(cover, slug)
            await _step(key, "cover_ready", url=cover["url"])
        except Exception as e:
            from ai_runtime import safe_error_message
            cover_error = safe_error_message(e, 'image')
            await _step(key, "cover_failed", error=cover_error)
    publish = bool(ap.get("auto_publish")) and (cover is not None or not ap.get("generate_cover", True))
    base = data["_base"]
    now = iso(now_utc())
    faqs = [{"q": str(f["q"]).strip(), "a": str(f["a"]).strip()} for f in (data.get("faqs") or []) if isinstance(f, dict) and f.get("q") and f.get("a")][:5]
    post = {
        "id": str(uuid.uuid4()), "title": title, "slug": slug, "category": str(data.get("category") or "Guide"),
        "excerpt": str(data["excerpt"]).strip()[:300], "cover_image": cover["url"] if cover else "", "cover_alt": cover["alt"] if cover else "",
        "cover_srcset": cover["srcset"] if cover else "", "tags": [str(t).lower().strip() for t in (data.get("tags") or [])][:6],
        "body_format": "markdown", "body_md": body_md, "body": [p.strip() for p in re.split(r"\n\s*\n", body_md) if p.strip()],
        "faqs": faqs, "primary_keyword": str(data["primary_keyword"]).strip(), "secondary_keywords": [str(k) for k in (data.get("secondary_keywords") or [])][:8],
        "cluster": topic.get("cluster"), "author": {"name": "Rajeev", "url": base},
        "seo": {"title": str(data.get("seo_title") or title)[:70], "description": str(data["meta_description"]).strip()[:170], "canonical": f"{base}/blog/{slug}",
                "og_title": title[:95], "og_description": str(data["excerpt"]).strip()[:200], "og_image": f"{base}{cover['url']}" if cover else "",
                "twitter_card": "summary_large_image", "robots": "index, follow", "image_alt": cover["alt"] if cover else ""},
        "published": publish, "featured": False, "order": 50, "ai_generated": True, "autopilot_run_key": key,
        "created_at": now, "updated_at": now, "published_at": now if publish else None,
    }
    await db.blog_posts.insert_one(dict(post))
    if publish:
        asyncio.create_task(ctx["ping_indexnow"]([f"/blog/{slug}"]))
    await db.autopilot_topics.update_many({"topic": topic.get("topic"), "status": "queued"}, {"$set": {"status": "used", "used_at": now, "run_key": key}})
    await db.autopilot_topics.insert_one({"id": str(uuid.uuid4()), **{k: topic.get(k) for k in ("topic", "primary_keyword", "cluster", "source")}, "status": "used", "used_at": now, "created_at": now, "run_key": key, "slug": slug})
    if topic.get("source") == "queue" and topic["topic"] in (ap.get("custom_topics") or []):
        await db.settings.update_one({"key": "blog_autopilot"}, {"$pull": {"custom_topics": topic["topic"]}})
    post.pop("_id", None)
    return {"post": post, "cover_error": cover_error, "published": publish}


async def execute_run(run: dict):
    db = ctx["db"]
    key = run["run_key"]
    started = now_utc()
    try:
        result = await run_pipeline(run)
        post = result["post"]
        status = "success" if result["published"] else "draft"
        finished = now_utc()
        await db.autopilot_runs.update_one({"run_key": key}, {"$set": {
            "status": status, "finished_at": iso(finished), "duration_s": round((finished - started).total_seconds(), 1),
            "post_id": post["id"], "slug": post["slug"], "title": post["title"], "url": post["seo"]["canonical"], "published": result["published"],
            "error": None if result["published"] or not result["cover_error"] else f"saved as draft — {result['cover_error']}"}})
        ap = await get_settings()
        await save_settings({"last_run_at": iso(finished), "last_success_at": iso(finished), "last_error": None if result["published"] else result["cover_error"],
                             "last_success_date": datetime.now(_tz(ap["tz"])).date().isoformat(), "generated_count": int(ap.get("generated_count", 0)) + 1})
        await audit("autopilot.run", key, {"status": status, "slug": post["slug"]})
        logger.info(f"Autopilot {status}: /blog/{post['slug']} ({key})")
    except Exception as e:
        from ai_runtime import safe_error_message
        err = safe_error_message(e)
        doc = await db.autopilot_runs.find_one({"run_key": key}, {"_id": 0, "attempts": 1, "kind": 1})
        attempts = int((doc or {}).get("attempts") or 1)
        retry = (doc or {}).get("kind") == "scheduled" and attempts < MAX_ATTEMPTS
        patch = {"finished_at": iso(now_utc()), "error": err, "status": "retrying" if retry else "failed"}
        if retry:
            patch["next_retry_at"] = iso(now_utc() + timedelta(minutes=BACKOFF_MINUTES[min(attempts - 1, len(BACKOFF_MINUTES) - 1)]))
        await db.autopilot_runs.update_one({"run_key": key}, {"$set": patch})
        await save_settings({"last_run_at": iso(now_utc()), "last_error": err})
        await audit("autopilot.run", key, {"status": patch["status"], "error": err})
        logger.error(f"Autopilot run {key} failed (attempt {attempts}): {err}")


async def audit(action: str, subject: str, details: dict, actor: str = "system:autopilot"):
    await ctx["db"].audit_log.insert_one({"id": str(uuid.uuid4()), "at": iso(now_utc()), "actor": actor, "action": action, "subject": subject, "details": details})


# ---------------- claims & scheduler ----------------
async def claim_run(run_key: str, kind: str, scheduled_for: Optional[datetime], actor: str) -> Optional[dict]:
    """Atomically claim a run. Returns run doc if this instance owns it, else None."""
    db = ctx["db"]
    now = now_utc()
    base = {"run_key": run_key, "kind": kind, "scheduled_for": iso(scheduled_for), "status": "claimed", "attempts": 1,
            "claimed_at": iso(now), "started_at": iso(now), "heartbeat_at": iso(now), "instance": INSTANCE_ID, "actor": actor, "steps": [], "error": None}
    try:
        await db.autopilot_runs.insert_one(dict(base))
        return base
    except DuplicateKeyError:
        pass
    # retry window or stale crashed claim
    stale = iso(now - timedelta(minutes=STALE_CLAIM_MINUTES))
    doc = await db.autopilot_runs.find_one_and_update(
        {"run_key": run_key, "$or": [
            {"status": "retrying", "next_retry_at": {"$lte": iso(now)}},
            {"status": {"$in": ["claimed", "generating"]}, "heartbeat_at": {"$lt": stale}},
        ]},
        {"$set": {"status": "claimed", "claimed_at": iso(now), "heartbeat_at": iso(now), "instance": INSTANCE_ID}, "$inc": {"attempts": 1}},
        projection={"_id": 0}, return_document=True)
    return doc


async def tick(source: str = "scheduler") -> dict:
    ap = await get_settings()
    if not ap.get("enabled") or ap["frequency"] == "manual":
        return {"action": "idle", "reason": "disabled or manual"}
    tz = _tz(ap["tz"])
    h, mi = _parse_time(ap["publish_time"])
    now_local = datetime.now(tz)
    today = now_local.date()
    scheduled = datetime(today.year, today.month, today.day, h, mi, tzinfo=tz)
    if now_local < scheduled:
        return {"action": "wait", "next": iso(scheduled.astimezone(timezone.utc))}
    if not is_due_day(ap, today):
        return {"action": "skip", "reason": "not a scheduled day (alternate-day)"}
    key = run_key_for(ap, today)
    existing = await ctx["db"].autopilot_runs.find_one({"run_key": key}, {"_id": 0, "status": 1})
    if now_local > scheduled + timedelta(hours=GRACE_HOURS) and not existing:
        await ctx["db"].autopilot_runs.insert_one({"run_key": key, "kind": "scheduled", "status": "skipped", "scheduled_for": iso(scheduled.astimezone(timezone.utc)),
                                                  "finished_at": iso(now_utc()), "error": f"missed window (> {GRACE_HOURS}h after schedule) — not back-filled", "instance": INSTANCE_ID, "steps": []})
        return {"action": "skipped_missed", "run_key": key}
    if existing and existing["status"] in ("success", "draft", "skipped", "failed"):
        return {"action": "done", "run_key": key, "status": existing["status"]}
    run = await claim_run(key, "scheduled", scheduled.astimezone(timezone.utc), f"system:{source}")
    if not run:
        return {"action": "not_claimed", "run_key": key}
    await execute_run(run)
    final = await ctx["db"].autopilot_runs.find_one({"run_key": key}, {"_id": 0, "status": 1, "slug": 1, "error": 1})
    return {"action": "ran", "run_key": key, **(final or {})}


async def scheduler_loop():
    await asyncio.sleep(15)
    while True:
        try:
            await tick("scheduler")
        except Exception as e:
            logger.error(f"autopilot scheduler error: {e}")
        await asyncio.sleep(60)


async def ensure_indexes():
    db = ctx["db"]
    await db.autopilot_runs.create_index("run_key", unique=True)
    await db.autopilot_runs.create_index([("started_at", -1)])
    await db.autopilot_topics.create_index("status")
    await db.blog_posts.create_index("slug")
    await db.audit_log.create_index([("at", -1)])


# ---------------- SSR / RSS ----------------
def _esc(s) -> str:
    return (str(s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;"))


def post_jsonld(post: dict, base: str, site: dict) -> list:
    seo = post.get("seo") or {}
    canonical = seo.get("canonical") or f"{base}/blog/{post['slug']}"
    img = seo.get("og_image") or (f"{base}{post['cover_image']}" if str(post.get("cover_image", "")).startswith("/") else post.get("cover_image"))
    body_text = post.get("body_md") or " ".join(post.get("body") or [])
    out = [{
        "@context": "https://schema.org", "@type": "BlogPosting", "headline": post["title"], "description": seo.get("description") or post.get("excerpt"),
        "image": img, "articleSection": post.get("category"), "keywords": ", ".join(post.get("tags") or []),
        "wordCount": len(re.findall(r"\w+", body_text)), "inLanguage": "en",
        "datePublished": post.get("published_at") or post.get("created_at"), "dateModified": post.get("updated_at"),
        "mainEntityOfPage": {"@type": "WebPage", "@id": canonical}, "url": canonical,
        "author": {"@type": "Person", "@id": f"{base}/#rajeev", "name": (post.get("author") or {}).get("name", "Rajeev"), "url": base},
        "publisher": {"@type": "Organization", "@id": f"{base}/#organization", "name": site["seo"].get("site_name", "Rajeev Freelancer"), "logo": {"@type": "ImageObject", "url": site["seo"].get("og_image", "")}},
    }, {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{base}/"},
        {"@type": "ListItem", "position": 2, "name": "Blog", "item": f"{base}/blog"},
        {"@type": "ListItem", "position": 3, "name": post["title"], "item": canonical}]}]
    if post.get("faqs"):
        out.append({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": f["q"], "acceptedAnswer": {"@type": "Answer", "text": f["a"]}} for f in post["faqs"]]})
    return out


def render_post_html(post: dict, base: str, site: dict) -> str:
    seo = post.get("seo") or {}
    canonical = seo.get("canonical") or f"{base}/blog/{post['slug']}"
    title = seo.get("title") or post["title"]
    desc = seo.get("description") or post.get("excerpt", "")
    img = seo.get("og_image") or (f"{base}{post['cover_image']}" if str(post.get("cover_image", "")).startswith("/") else post.get("cover_image", ""))
    body_html = markdown_to_html(post["body_md"]) if post.get("body_md") else "".join(f"<p>{_esc(p)}</p>" for p in (post.get("body") or []))
    faq_html = "".join(f"<section class='faq'><h3>{_esc(f['q'])}</h3><p>{_esc(f['a'])}</p></section>" for f in (post.get("faqs") or []))
    ld = "".join(f'<script type="application/ld+json">{json.dumps(b, ensure_ascii=False)}</script>' for b in post_jsonld(post, base, site))
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{_esc(title)}</title><meta name="description" content="{_esc(desc)}"><meta name="robots" content="{_esc(seo.get('robots') or 'index, follow')}">
<link rel="canonical" href="{_esc(canonical)}"><meta property="og:type" content="article"><meta property="og:title" content="{_esc(seo.get('og_title') or post['title'])}">
<meta property="og:description" content="{_esc(seo.get('og_description') or desc)}"><meta property="og:url" content="{_esc(canonical)}"><meta property="og:image" content="{_esc(img)}">
<meta property="og:site_name" content="{_esc(site['seo'].get('site_name', 'Rajeev Freelancer'))}"><meta name="twitter:card" content="{_esc(seo.get('twitter_card') or 'summary_large_image')}">
<meta name="twitter:title" content="{_esc(title)}"><meta name="twitter:description" content="{_esc(desc)}"><meta name="twitter:image" content="{_esc(img)}">
<meta property="article:published_time" content="{_esc(post.get('published_at') or post.get('created_at'))}"><meta property="article:modified_time" content="{_esc(post.get('updated_at'))}">
{ld}<style>body{{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;line-height:1.65;color:#141414}}img{{max-width:100%;border-radius:12px}}</style></head>
<body><nav><a href="{base}/">Home</a> › <a href="{base}/blog">Blog</a></nav><article><p>{_esc(post.get('category', ''))}</p><h1>{_esc(post['title'])}</h1>
<p>By <a href="{base}/about">{_esc((post.get('author') or {}).get('name', 'Rajeev'))}</a> · Published <time datetime="{_esc(post.get('published_at') or post.get('created_at'))}">{_esc(str(post.get('published_at') or post.get('created_at', ''))[:10])}</time> · Updated <time datetime="{_esc(post.get('updated_at'))}">{_esc(str(post.get('updated_at', ''))[:10])}</time></p>
<p><em>{_esc(post.get('excerpt', ''))}</em></p>{f'<img src="{_esc(img)}" alt="{_esc(seo.get("image_alt") or post.get("cover_alt") or post["title"])}" width="1200" height="675">' if img else ''}
{body_html}{f'<h2>Frequently asked questions</h2>{faq_html}' if faq_html else ''}
<p><a href="{base}/contact">Have a project in mind? Get in touch with Rajeev</a>.</p></article></body></html>"""


def render_index_html(posts: list, base: str, site: dict) -> str:
    items = "".join(f'<li><a href="{base}/blog/{_esc(p["slug"])}">{_esc(p["title"])}</a> — {_esc(p.get("excerpt", ""))}</li>' for p in posts)
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Blog & insights | {_esc(site['seo'].get('site_name', 'Rajeev Freelancer'))}</title>
<meta name="description" content="Practical articles on web & app development, SEO, digital marketing and AI automation by Rajeev."><link rel="canonical" href="{base}/blog">
<link rel="alternate" type="application/rss+xml" title="RSS" href="{base}/api/rss.xml"></head><body><h1>Blog &amp; insights</h1><ul>{items}</ul></body></html>"""


def render_rss(posts: list, base: str, site: dict) -> str:
    items = "".join(
        f"<item><title>{_esc(p['title'])}</title><link>{base}/blog/{_esc(p['slug'])}</link><guid>{base}/blog/{_esc(p['slug'])}</guid>"
        f"<description>{_esc(p.get('excerpt', ''))}</description><pubDate>{_rfc822(p.get('published_at') or p.get('created_at'))}</pubDate></item>" for p in posts)
    return (f'<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>{_esc(site["seo"].get("site_name", "Rajeev Freelancer"))} — Blog</title>'
            f'<link>{base}/blog</link><description>Web, app, SEO, marketing and AI automation insights.</description>{items}</channel></rss>')


def _rfc822(s) -> str:
    try:
        return datetime.fromisoformat(str(s)).strftime("%a, %d %b %Y %H:%M:%S +0000")
    except Exception:
        return ""


# ---------------- router ----------------
class SettingsInput(BaseModel):
    enabled: Optional[bool] = None
    frequency: Optional[str] = None
    frequency_days: Optional[int] = None
    publish_time: Optional[str] = None
    tz: Optional[str] = None
    auto_publish: Optional[bool] = None
    generate_cover: Optional[bool] = None
    dedupe: Optional[bool] = None
    categories: Optional[List[str]] = None
    excluded_keywords: Optional[List[str]] = None
    custom_topics: Optional[List[str]] = None


def _clean_list(items, cap=50):
    seen, out = set(), []
    for t in items or []:
        t = str(t).strip()
        if t and t.lower() not in seen:
            seen.add(t.lower()); out.append(t)
    return out[:cap]


def _rate_limit(bucket: str, limit: int, window_s: int):
    now = time.time()
    hits = [t for t in _rate_bucket.get(bucket, []) if now - t < window_s]
    if len(hits) >= limit:
        raise HTTPException(status_code=429, detail=f"Rate limit: max {limit} per {window_s // 60} min")
    hits.append(now)
    _rate_bucket[bucket] = hits


def build_router(get_current_admin) -> APIRouter:
    r = APIRouter()
    db = ctx["db"]

    @r.get("/admin/blog-autopilot")
    async def get_ap(admin: dict = Depends(get_current_admin)):
        return await settings_view(await get_settings())

    @r.get("/admin/blog-autopilot/timezones")
    async def tzs(admin: dict = Depends(get_current_admin)):
        return {"timezones": sorted(available_timezones())}

    @r.put("/admin/blog-autopilot")
    async def put_ap(payload: SettingsInput, admin: dict = Depends(get_current_admin)):
        cur = await get_settings()
        patch = {k: v for k, v in payload.model_dump().items() if v is not None}
        if "frequency_days" in patch and "frequency" not in patch:
            patch["frequency"] = "daily" if int(patch["frequency_days"]) <= 1 else "alternate"
        patch.pop("frequency_days", None)
        if "frequency" in patch:
            if patch["frequency"] not in ("daily", "alternate", "manual"):
                raise HTTPException(status_code=400, detail="frequency must be daily, alternate or manual")
            if patch["frequency"] != cur.get("frequency") or ("enabled" in patch and patch["enabled"] and not cur.get("enabled")):
                patch["schedule_start_date"] = datetime.now(_tz(patch.get("tz") or cur["tz"])).date().isoformat()
        if "enabled" in patch and patch["enabled"] and not cur.get("enabled"):
            patch["schedule_start_date"] = datetime.now(_tz(patch.get("tz") or cur["tz"])).date().isoformat()
        if "publish_time" in patch:
            h, mi = _parse_time(patch["publish_time"]); patch["publish_time"] = f"{h:02d}:{mi:02d}"
        if "tz" in patch and patch["tz"] not in available_timezones():
            raise HTTPException(status_code=400, detail="Unknown timezone")
        for k in ("categories", "excluded_keywords", "custom_topics"):
            if k in patch:
                patch[k] = _clean_list(patch[k])
        if patch:
            await save_settings(patch)
            await audit("autopilot.settings", "blog_autopilot", {"patch": {k: v for k, v in patch.items()}}, actor=admin["email"])
        return await settings_view(await get_settings())

    @r.post("/admin/blog-autopilot/run")
    async def run_now(admin: dict = Depends(get_current_admin)):
        _rate_limit(f"run:{admin['email']}", 3, 600)
        active = await db.autopilot_runs.find_one({"status": {"$in": ["claimed", "generating"]}, "heartbeat_at": {"$gte": iso(now_utc() - timedelta(minutes=STALE_CLAIM_MINUTES))}}, {"_id": 0, "run_key": 1})
        if active:
            raise HTTPException(status_code=409, detail="A generation is already in progress")
        key = f"blog-autopilot:manual:{now_utc().strftime('%Y%m%dT%H%M%S')}-{uuid.uuid4().hex[:4]}"
        run = await claim_run(key, "manual", None, admin["email"])
        await audit("autopilot.manual_run", key, {}, actor=admin["email"])
        asyncio.create_task(execute_run(run))
        return {"run_key": key, "status": "claimed"}

    @r.get("/admin/blog-autopilot/runs")
    async def runs(limit: int = 30, admin: dict = Depends(get_current_admin)):
        items = await db.autopilot_runs.find({}, {"_id": 0}).sort([("started_at", -1), ("finished_at", -1)]).to_list(max(1, min(limit, 200)))
        from ai_runtime import redact_error_fields
        return {"runs": redact_error_fields(items)}

    @r.get("/admin/blog-autopilot/runs/{run_key:path}")
    async def run_detail(run_key: str, admin: dict = Depends(get_current_admin)):
        doc = await db.autopilot_runs.find_one({"run_key": run_key}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Run not found")
        from ai_runtime import redact_error_fields
        return redact_error_fields(doc)

    @r.get("/admin/blog-autopilot/topics")
    async def topics(admin: dict = Depends(get_current_admin)):
        items = await db.autopilot_topics.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
        return {"topics": items}

    @r.get("/admin/blog-autopilot/audit")
    async def audit_list(admin: dict = Depends(get_current_admin)):
        from ai_runtime import redact_error_fields
        return {"entries": redact_error_fields(await db.audit_log.find({"action": {"$regex": "^autopilot"}}, {"_id": 0}).sort("at", -1).to_list(50))}

    @r.post("/internal/blog-autopilot/tick")
    async def cron_tick(request: Request):
        secret = os.environ.get("AUTOPILOT_CRON_SECRET", "")
        if not secret:
            raise HTTPException(status_code=404, detail="Not found")
        ts = request.headers.get("X-Autopilot-Timestamp", "")
        sig = request.headers.get("X-Autopilot-Signature", "")
        try:
            if abs(time.time() - int(ts)) > 300:
                raise ValueError
        except Exception:
            raise HTTPException(status_code=401, detail="Stale or missing timestamp")
        expected = hmac.new(secret.encode(), ts.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, sig):
            raise HTTPException(status_code=401, detail="Bad signature")
        _rate_limit("cron-tick", 4, 60)
        return await tick("cron")

    @r.get("/blog/{slug}/html", response_class=HTMLResponse)
    async def post_html(slug: str):
        post = await db.blog_posts.find_one({"slug": slug, "published": True}, {"_id": 0})
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        site = await ctx["get_site"]()
        return HTMLResponse(render_post_html(post, site["seo"].get("canonical_domain", "https://www.rajeevfreelancer.com").rstrip("/"), site))

    @r.get("/blog-index/html", response_class=HTMLResponse)
    async def index_html():
        posts = await db.blog_posts.find({"published": True}, {"_id": 0, "body": 0, "body_md": 0}).sort("created_at", -1).to_list(500)
        site = await ctx["get_site"]()
        return HTMLResponse(render_index_html(posts, site["seo"].get("canonical_domain", "https://www.rajeevfreelancer.com").rstrip("/"), site))

    @r.get("/rss.xml")
    async def rss():
        posts = await db.blog_posts.find({"published": True}, {"_id": 0, "body": 0, "body_md": 0}).sort("created_at", -1).to_list(50)
        site = await ctx["get_site"]()
        return Response(render_rss(posts, site["seo"].get("canonical_domain", "https://www.rajeevfreelancer.com").rstrip("/"), site), media_type="application/rss+xml")

    return r
