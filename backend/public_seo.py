"""Public HTML and crawl files. The JSON API and signed-in admin stay unchanged.

Static routes are rendered by the frontend build. Database-backed pages are
rendered for every visitor, so publishing and unpublishing take effect without
waiting for a JavaScript crawler or a frontend rebuild.
"""
import html
import json
import os
import re
from html.parser import HTMLParser
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlsplit, quote, urlencode
from xml.sax.saxutils import escape as xml_escape
from live_service_catalog import canonical_service_path
from gsc_route_policy import ROUTE_STATUS, LEGACY_REDIRECTS, apply_index_policy, location_for_path, status_for_path
from ai_discovery import robots_text
from sitemap_shards import render_sitemap_files

BUILD_DIR = Path(os.environ.get("FRONTEND_BUILD_DIR", str(Path(__file__).resolve().parents[1] / "frontend" / "build"))).resolve()
try:
    LIVE_ROUTE_META = json.loads((Path(__file__).parent / "live_route_meta.json").read_text())
except (OSError, ValueError):
    LIVE_ROUTE_META = {}
SLUG = re.compile(r"^[^\W_]+(?:-[^\W_]+)*$", re.UNICODE)


def canonical_origin(settings: dict) -> str:
    value = str(settings.get("seo", {}).get("canonical_domain") or "https://rajeevfreelancer.com").strip()
    try:
        parsed = urlsplit(value)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
            return "https://rajeevfreelancer.com"
        host = parsed.hostname.lower()
        if host in {"www.rajeevfreelancer.com", "rajeevfreelancer.com"}:
            return "https://rajeevfreelancer.com"
        port = f":{parsed.port}" if parsed.port else ""
        return f"{parsed.scheme}://{host}{port}"
    except ValueError:
        return "https://rajeevfreelancer.com"


def canonical_path(path: str) -> str:
    path = "/" + str(path).split("?", 1)[0].split("#", 1)[0].strip("/").lower()
    return re.sub(r"/+", "/", path)


def safe_json(value) -> str:
    return json.dumps(value, ensure_ascii=False, default=str).replace("<", "\\u003c").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")


def esc(value) -> str:
    return html.escape(str(value or ""), quote=True)


def preserve_metadata(content: dict, previous: dict) -> dict:
    """AI cache upgrades must not silently rewrite existing Search snippets."""
    result = dict(content)
    for key in ("title", "meta_description"):
        if key in (previous or {}):
            result[key] = previous[key]
    return result


def text_content(value) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]*>", " ", str(value or ""))).strip()


def public_asset(value, origin: str) -> str:
    value = str(value or "").strip()
    if value.startswith("/") and not value.startswith("//"):
        return origin + value
    try:
        parsed = urlsplit(value)
        return value if parsed.scheme in {"http", "https"} and parsed.netloc and not parsed.username and not parsed.password else ""
    except ValueError:
        return ""


def inline_markdown(value: str) -> str:
    # Escape first. Only add markup generated here; raw HTML never reaches the response.
    value = esc(value)
    def link(match):
        label, href = match.groups()
        decoded = html.unescape(href)
        try:
            valid = decoded.startswith("/") and not decoded.startswith("//") or urlsplit(decoded).scheme in {"http", "https"}
        except ValueError:
            valid = False
        return f'<a href="{esc(decoded)}" rel="noopener noreferrer">{label}</a>' if valid else label
    value = re.sub(r"\[([^\]]+)\]\(([^\s)]+)\)", link, value)
    value = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", value)
    value = re.sub(r"`([^`]+)`", r"<code>\1</code>", value)
    return value


def markdown_html(markdown: str) -> str:
    """Small safe semantic renderer; raw HTML, executable URLs and embeds are inert."""
    out, paragraph, listing = [], [], None
    def flush():
        if paragraph:
            out.append("<p>" + inline_markdown(" ".join(paragraph)) + "</p>")
            paragraph.clear()
    def close_list():
        nonlocal listing
        if listing:
            out.append(f"</{listing}>")
            listing = None
    code, code_lines = False, []
    for line in str(markdown or "").splitlines():
        if line.strip().startswith("```"):
            flush(); close_list()
            if code:
                out.append("<pre><code>" + esc("\n".join(code_lines)) + "</code></pre>")
                code_lines.clear()
            code = not code
            continue
        if code:
            code_lines.append(line); continue
        heading = re.match(r"^(#{1,6})\s+(.+)$", line)
        item = re.match(r"^\s*(?:([-*+])|\d+[.)])\s+(.+)$", line)
        if heading:
            flush(); close_list()
            level = max(2, len(heading[1]))  # page title is the only H1
            out.append(f"<h{level}>" + inline_markdown(heading[2]) + f"</h{level}>")
        elif item:
            flush()
            kind = "ul" if item[1] else "ol"
            if listing != kind:
                close_list(); listing = kind; out.append(f"<{kind}>")
            out.append("<li>" + inline_markdown(item[2]) + "</li>")
        elif not line.strip():
            flush(); close_list()
        else:
            close_list(); paragraph.append(line.strip())
    flush(); close_list()
    if code_lines:
        out.append("<pre><code>" + esc("\n".join(code_lines)) + "</code></pre>")
    return "\n".join(out)


def faq_html(faqs) -> str:
    faqs = [f for f in (faqs or []) if isinstance(f, dict) and f.get("q") and f.get("a")]
    if not faqs:
        return ""
    return '<section><h2>Frequently asked questions</h2>' + "".join(f'<h3>{esc(f["q"])}</h3><p>{esc(f["a"])}</p>' for f in faqs) + "</section>"


def load_manifest(build_dir: Path = BUILD_DIR) -> dict:
    try:
        data = json.loads((build_dir / "seo-manifest.json").read_text())
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def static_entries(manifest: dict) -> dict:
    """Read only paths actually emitted in a validated frontend build."""
    entries = {}
    for row in manifest.get("pages", []):
        if not isinstance(row, dict) or not isinstance(row.get("path"), str):
            continue
        path = canonical_path(row["path"])
        if row.get("index", row.get("indexable", True)) and path != "/admin":
            entries[path] = row
    return entries


@lru_cache(maxsize=8)
def _asset_tags(path: str, modified_ns: int, size: int):
    """Cache only build asset tags; page copy and database content stay live."""
    template = Path(path).read_text()
    css = "".join(re.findall(r'<link\b[^>]*href=["\'][^"\']+\.css(?:\?[^"\']*)?["\'][^>]*>', template))
    scripts = "".join(s for s in re.findall(r'<script\b[^>]*src=["\'][^"\']+["\'][^>]*>\s*</script>', template) if 'src="/static/' in s or "src='/static/" in s)
    return css, scripts


def html_document(*, settings: dict, path: str, title: str, description: str, body: str,
                  data: dict | None = None, schema: list | None = None,
                  index: bool = True, article: bool = False, heading: str | None = None, page_image: str | None = None, canonical_override: str | None = None, build_dir: Path = BUILD_DIR) -> str:
    from ai_runtime import public_settings_view
    settings = public_settings_view(settings)
    base = canonical_origin(settings)
    known_meta = LIVE_ROUTE_META.get(path, {})
    title = known_meta.get("title", title)
    description = known_meta.get("description", description)
    seo, contact, business = settings.get("seo", {}), settings.get("contact", {}), settings.get("business", {})
    name = seo.get("site_name", "Rajeev Freelancer")
    robots = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" if index and seo.get("robots_index", True) else "noindex, follow"
    url = base + (canonical_override or canonical_service_path(path))
    canonical_tag = f'<link data-rh="true" rel="canonical" href="{esc(url)}">' if robots.startswith("index,") or canonical_override else ""
    image = public_asset(page_image or seo.get("og_image"), base)
    css, scripts = "", ""
    try:
        template_path = build_dir / "index.html"
        stamp = template_path.stat()
        css, scripts = _asset_tags(str(template_path), stamp.st_mtime_ns, stamp.st_size)
    except OSError:
        pass
    crumbs = '<nav aria-label="Breadcrumb"><a href="/">Home</a> / ' + esc(title) + '</nav>'
    entity = {"@type": "Organization", "@id": base + "/#organization", "name": name, "url": base + "/", "telephone": contact.get("phone", ""), "email": contact.get("email", "")}
    socials = settings.get("social") if isinstance(settings.get("social"), dict) else {}
    same_as = [public_asset(v, base) for v in [*socials.values(), business.get("google_profile_url")]]
    if any(same_as): entity["sameAs"] = [v for v in same_as if v]
    person = {"@type": "Person", "@id": base + "/#rajeev", "name": business.get("founder_name") or "Rajeev Kumar", "url": base + "/about", "worksFor": {"@id": base + "/#organization"}}
    nodes = [entity, person, {"@type": "WebSite", "@id": base + "/#website", "name": name, "url": base + "/", "publisher": {"@id": base + "/#organization"}}, {"@type": "WebPage", "@id": url + "#webpage", "url": url, "name": title, "description": description, "isPartOf": {"@id": base + "/#website"}}, {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": base + "/"}, {"@type": "ListItem", "position": 2, "name": title, "item": url}]}] + (schema or [])
    public_settings = {k: v for k, v in settings.items() if k in {"seo", "contact", "social", "business", "tracking", "marketing"}}
    bootstrap = {"path": path, "settings": public_settings, "data": data or {}}
    document = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)}</title><meta name="description" content="{esc(description)}"><meta name="robots" content="{robots}">{canonical_tag}<link rel="alternate" type="application/rss+xml" title="{esc(name)} insights" href="/feed.xml"><meta property="og:type" content="{'article' if article else 'website'}"><meta property="og:site_name" content="{esc(name)}"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(description)}"><meta property="og:url" content="{esc(url)}">{f'<meta property="og:image" content="{esc(image)}">' if image else ''}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{esc(title)}"><meta name="twitter:description" content="{esc(description)}">{f'<meta name="twitter:image" content="{esc(image)}">' if image else ''}{f'<meta name="google-site-verification" content="{esc(seo.get("google_verification"))}">' if seo.get("google_verification") else ''}{f'<meta name="twitter:site" content="{esc(seo.get("twitter_handle"))}">' if seo.get("twitter_handle") else ''}<meta property="og:locale" content="{esc(seo.get("default_locale") or "en")}">{css}<style>.seo-document{{max-width:900px;margin:auto;padding:32px 24px;font:17px/1.7 system-ui;color:#181818}}.seo-document h1{{font-size:clamp(2rem,6vw,3.5rem);line-height:1.12;margin:28px 0}}.seo-document h2{{font-size:1.6rem;margin:36px 0 12px}}.seo-document h3{{font-size:1.15rem;margin:24px 0 10px}}.seo-document p{{margin:16px 0}}.seo-document a{{color:#0055ff;text-decoration:underline}}.seo-document nav{{display:flex;gap:16px;flex-wrap:wrap}}.seo-document ul,.seo-document ol{{padding-left:24px;list-style:revert}}.seo-document img{{max-width:100%;height:auto}}.seo-document pre{{overflow:auto;background:#f5f5f5;padding:16px}}.seo-document footer{{border-top:1px solid #ddd;padding-top:24px;margin-top:40px}}</style><script type="application/ld+json">{safe_json({"@context":"https://schema.org","@graph":nodes})}</script><script>window.__RF_BOOTSTRAP__={safe_json(bootstrap)}</script>{scripts}</head><body><div id="root"><div class="seo-document"><header><a href="/">{esc(name)}</a><nav aria-label="Main"><a href="/services">Services</a><a href="/locations">Locations</a><a href="/about">About</a><a href="/blog">Insights</a><a href="/contact">Contact</a></nav></header><main id="main">{crumbs}<h1>{esc(heading or title)}</h1>{body}</main><footer><p>{esc(name)} · {esc(business.get('address', ''))}</p><p><a href="tel:{esc(contact.get('phone'))}">{esc(contact.get('phone'))}</a> · <a href="mailto:{esc(contact.get('email'))}">{esc(contact.get('email'))}</a></p></footer></div></div></body></html>'''

    # Helmet owns these nodes after the interactive app mounts. Without this
    # marker, manually rendered tags would remain beside a second CSR set.
    head, tail = document.split('</head>', 1)
    head = head.replace('<title>', '<title data-rh="true">')
    head = re.sub(r'<meta (name|property)="([^"]+)"', lambda match: match.group(0) if match[1] == 'name' and match[2] == 'viewport' else '<meta data-rh="true" ' + match[1] + '="' + match[2] + '"', head)
    head = head.replace('<script type="application/ld+json">', '<script data-rh="true" type="application/ld+json">')
    return head + '</head>' + tail


def post_html(post: dict, settings: dict, *, related=None, build_dir: Path = BUILD_DIR) -> str:
    path = "/blog/" + post["slug"]
    base, seo = canonical_origin(settings), post.get("seo") or {}
    title = str(seo.get("title") or post.get("title") or "Insight") + " | " + settings.get("seo", {}).get("site_name", "Rajeev Freelancer")
    desc = str(seo.get("description") or post.get("excerpt") or "")
    date = post.get("published_at") or post.get("created_at")
    author = settings.get("business", {}).get("founder_name") or "Rajeev Kumar"
    body = f'<p>By <a href="/about">{esc(author)}</a>' + (f' · <time datetime="{esc(date)}">{esc(str(date)[:10])}</time>' if date else '') + '</p>'
    body += f'<p>{esc(post.get("excerpt"))}</p>'
    image = public_asset(post.get("cover_image"), base)
    if image:
        body += f'<img src="{esc(image)}" alt="{esc(post.get("cover_alt") or post.get("title"))}" width="1200" height="675" decoding="async">'
    body += markdown_html(post["body_md"]) if post.get("body_md") else "".join(f'<p>{esc(p)}</p>' for p in post.get("body", []))
    body += faq_html(post.get("faqs"))
    nodes = [{"@type": "BlogPosting", "@id": base + path + "#article", "url": base + path, "headline": post.get("title"), "description": desc, "mainEntityOfPage": {"@id": base + path + "#webpage"}, "author": {"@id": base + "/#rajeev"}, "publisher": {"@id": base + "/#organization"}, **({"datePublished": date} if date else {}), **({"dateModified": post["updated_at"]} if post.get("updated_at") else {}), **({"image": image} if image else {})}]
    if post.get("faqs"):
        nodes.append({"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": f["q"], "acceptedAnswer": {"@type": "Answer", "text": f["a"]}} for f in post["faqs"] if f.get("q") and f.get("a")]})
    return html_document(settings=settings, path=path, title=title, heading=post.get("title"), description=desc, body=body, data={"blogPost": {"post": post, "related": related or []}}, schema=nodes, index="noindex" not in str(seo.get("robots", "")), article=True, page_image=seo.get("og_image") or image, build_dir=build_dir)


def case_html(item: dict, settings: dict, *, build_dir: Path = BUILD_DIR) -> str:
    path = "/case-studies/" + item["slug"]
    body = f'<p>{esc(item.get("excerpt"))}</p><h2>The challenge</h2><p>{esc(item.get("challenge"))}</p><h2>The approach</h2>'
    body += "".join(f'<h3>{esc(a.get("h"))}</h3><p>{esc(a.get("t"))}</p>' for a in item.get("approach", []))
    body += '<h2>The numbers</h2><ul>' + "".join(f'<li>{esc(r.get("value"))} {esc(r.get("label"))}</li>' for r in item.get("results", [])) + '</ul>'
    if item.get("quote"):
        quote = item["quote"]
        body += f'<blockquote><p>{esc(quote.get("text"))}</p><cite>{esc(quote.get("name"))} {esc(quote.get("role"))}</cite></blockquote>'
    body += '<p>' + esc(' · '.join(str(item[k]) for k in ('industry', 'region', 'duration', 'year') if item.get(k))) + '</p>'
    base = canonical_origin(settings)
    live_url = public_asset(item.get("website_url"), base)
    if live_url:
        body += '<p><a href="' + esc(live_url) + '" target="_blank" rel="noopener noreferrer">Visit live project</a></p>'
    gallery = []
    for image in item.get("gallery", []):
        if not isinstance(image, dict):
            continue
        url = public_asset(image.get("url"), base)
        if url:
            gallery.append('<figure><img src="' + esc(url) + '" alt="' + esc(image.get("alt") or item.get("title") or "Project image") + '" width="1440" height="900" loading="lazy" decoding="async">' + ('<figcaption>' + esc(image['caption']) + '</figcaption>' if image.get('caption') else '') + '</figure>')
    if gallery:
        body += '<section><h2>Project gallery</h2>' + ''.join(gallery) + '</section>'
    if live_url or gallery:
        body += '<p><a href="/contact">Discuss a similar project</a>.</p>'
    case_schema = {"@type": "Article", "@id": base + path + "#article", "headline": item.get("title"), "description": item.get("excerpt"), "url": base + path, "mainEntityOfPage": {"@id": base + path + "#webpage"}, "author": {"@id": base + "/#rajeev"}, "publisher": {"@id": base + "/#organization"}, "articleSection": item.get("tag"), "about": item.get("industry")}
    case_image = public_asset(item.get("og") or item.get("cover"), base)
    if case_image: case_schema["image"] = case_image
    if item.get("created_at"): case_schema["datePublished"] = item["created_at"]
    if item.get("updated_at"): case_schema["dateModified"] = item["updated_at"]
    return html_document(settings=settings, path=path, title=item.get("title", "Case study") + " — Case Study | " + settings.get("seo", {}).get("site_name", "Rajeev Freelancer"), heading=item.get("title"), description=str(item.get("excerpt") or ""), body=body, data={"caseStudy": item}, schema=[case_schema], article=True, page_image=item.get("og") or item.get("cover"), build_dir=build_dir)




def replace_home_region(document: str, marker: str, content: str) -> str:
    """Replace one deliberately marked region without parsing/rebuilding the page.

    Offsets preserve the rest of the static homepage byte-for-byte, including
    its metadata, existing copy and resource tags. Nested divs are counted.
    """
    class Region(HTMLParser):
        def __init__(self):
            super().__init__(convert_charrefs=False)
            self.lines = [0]
            self.lines.extend(match.end() for match in re.finditer("\n", document))
            self.depth, self.start, self.end = 0, None, None
        def position(self):
            line, column = self.getpos()
            return self.lines[line - 1] + column
        def handle_starttag(self, tag, attrs):
            if tag != "div" or self.end is not None:
                return
            if self.depth:
                self.depth += 1
            elif dict(attrs).get(marker) == "true":
                self.start = self.position() + len(self.get_starttag_text())
                self.depth = 1
        def handle_endtag(self, tag):
            if tag == "div" and self.depth:
                self.depth -= 1
                if not self.depth:
                    self.end = self.position()
    region = Region()
    region.feed(document)
    if region.start is None or region.end is None:
        return document
    return document[:region.start] + content + document[region.end:]


def live_home_html(document: str, payload: dict, settings: dict) -> str:
    """Refresh only homepage project proof from the current published CMS rows."""
    # Older builds have no opted-in portfolio regions. Leave those templates
    # intact during a staged backend-first update; never append CMS bootstrap
    # or alter hydration for an unrelated existing homepage.
    if not all(marker in document for marker in ('data-rf-home-featured', 'data-rf-home-projects', 'data-rf-home-industries')):
        return document
    base = canonical_origin(settings)
    rows = payload.get("items", [])[:6]
    def card(item):
        path = "/work/" + item['slug']
        image = public_asset(item.get('image_url'), base)
        preview = '<img src="' + esc(image) + '" alt="' + esc(item.get('image_alt') or item['title'] + ' project preview') + '" width="1440" height="900" loading="lazy" decoding="async" class="aspect-[16/10] w-full object-cover object-top">' if image else '<div class="aspect-[16/10] bg-slate-100"></div>'
        live = public_asset(item.get('website_url'), base)
        labels = ' · '.join(service['name'] for service in item.get('services', []))
        return '<article class="overflow-hidden rounded-[22px] border border-ink/10 bg-white"><a href="' + esc(path) + '" aria-label="Explore ' + esc(item['title']) + '">' + preview + '</a><div class="p-6"><p class="text-xs font-semibold text-brand">' + esc(item['industry']['name']) + '</p><h3 class="mt-3 font-heading text-2xl font-bold"><a href="' + esc(path) + '">' + esc(item['title']) + '</a></h3><p class="mt-3 text-sm leading-relaxed text-ink/60">' + esc(item['summary']) + '</p>' + ('<p class="mt-4 text-xs text-brand">' + esc(labels) + '</p>' if labels else '') + '<div class="mt-6 flex flex-wrap gap-4 text-sm font-semibold"><a href="' + esc(path) + '">Project details ↗</a>' + ('<a href="' + esc(live) + '" target="_blank" rel="noopener noreferrer">Open live project ↗</a>' if live else '') + '</div></div></article>'
    cards = '<div class="mt-9 grid gap-x-7 gap-y-10 md:grid-cols-2 lg:grid-cols-3">' + ''.join(card(item) for item in rows) + '</div>' if rows else '<div class="mt-9 rounded-2xl border border-ink/10 bg-white p-8"><p>Explore our project work and discuss what you need.</p><a href="/work">Open the portfolio ↗</a></div>'
    featured = card(rows[0]) if rows else '<div class="rounded-2xl border border-ink/10 bg-white p-8"><h2 class="font-heading text-2xl font-bold">Let’s build your next project.</h2><p class="mt-4"><a href="/contact">Discuss your website, app or automation project ↗</a></p></div>'
    chips = '<div class="mt-7 flex flex-wrap gap-2" aria-label="Browse work by industry">' + ''.join('<a class="rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-medium text-ink/65" href="/work?industry=' + esc(quote(item['slug'])) + '">' + esc(item['name']) + '<span class="ml-2 text-ink/35">' + esc(item['count']) + '</span></a>' for item in payload.get('industries', payload.get('categories', []))) + '</div>'
    document = replace_home_region(document, 'data-rf-home-featured', featured)
    document = replace_home_region(document, 'data-rf-home-projects', cards)
    document = replace_home_region(document, 'data-rf-home-industries', chips)
    bootstrap = re.compile(r'(<script[^>]*>\s*window\.__RF_BOOTSTRAP__\s*=\s*)(.*?)(</script>)', re.S)
    match = bootstrap.search(document)
    old_images = set()
    current = {}
    if match:
        try:
            current = json.loads(match[2].rstrip('; \t\r\n'))
            old_images = {item.get('image_url') or (item.get('screenshot') or {}).get('url') for item in current.get('data', {}).get('homePortfolio', {}).get('items', [])}
        except (ValueError, TypeError, AttributeError):
            current = {}
    from ai_runtime import public_settings_view
    public_settings = public_settings_view(settings)
    public_settings = {key: value for key, value in public_settings.items() if key in {'seo', 'contact', 'social', 'business', 'tracking', 'marketing'}}
    current.update(path='/', settings=public_settings)
    current.pop('renderedBy', None)  # Changed live regions mount without stale hydration.
    current.setdefault('data', {})['homePortfolio'] = payload
    script = '<script>window.__RF_BOOTSTRAP__=' + safe_json(current) + '</script>'
    document = bootstrap.sub(lambda _: script, document, count=1) if match else document.replace('</body>', script + '</body>', 1)
    # React can hoist the original hero image preload into the head. Remove
    # those stale proof references too; unrelated resources stay untouched.
    def preload(tag_match):
        tag = tag_match[0]
        if re.search(r'\bas=["\']image["\']', tag) and re.search(r'\brel=["\']preload["\']', tag):
            href = re.search(r'\bhref=["\']([^"\']+)', tag)
            if href and html.unescape(href[1]) in old_images:
                return ''
        return tag
    return re.sub(r'<link\b[^>]*>', preload, document)


def work_html(payload: dict, settings: dict, *, build_dir: Path = BUILD_DIR) -> str:
    """Render only the current published project; CMS overrides stay live."""
    row = payload["project"]
    path, base = "/work/" + row["slug"], canonical_origin(settings)
    body = '<p><a href="/work">All project work</a></p><p>' + esc(row.get("summary")) + '</p>'
    industry = row.get("industry") or row.get("category") or {}
    services = [str(item.get("name", "")) for item in row.get("services", []) if isinstance(item, dict)]
    body += '<p>' + esc(industry.get("name", "")) + (' · ' + esc(' · '.join(services)) if services else '') + '</p>'
    image = public_asset(row.get("image_url"), base)
    if image:
        body += '<img src="' + esc(image) + '" alt="' + esc(row.get("image_alt") or row["title"] + " project preview") + '" width="1440" height="900" decoding="async" style="aspect-ratio:16/10;object-fit:cover;object-position:top">'
    website = public_asset(row.get("website_url"), base)
    if website:
        body += '<p><a href="' + esc(website) + '" target="_blank" rel="noopener noreferrer">Visit live project</a></p>'
    story = row.get("story") or {}
    overview = story.get("overview")
    if overview and overview != row.get("summary"):
        body += '<h2>The project</h2><p>' + esc(overview) + '</p>'
    for key, label in (("scope", "What we delivered"), ("process", "How we approached the work"), ("delivery", "Project delivery"), ("handover", "Handover and support")):
        items = story.get(key) or []
        if items:
            body += '<section><h2>' + label + '</h2><ul>' + ''.join('<li>' + esc(item) + '</li>' for item in items) + '</ul></section>'
    if row.get("technology"):
        body += '<h2>Tools and technology</h2><p>' + esc(' · '.join(row['technology'])) + '</p>'
    gallery = []
    for item in row.get("gallery", []):
        url = public_asset(item.get("url"), base)
        if url:
            gallery.append('<figure><img src="' + esc(url) + '" alt="' + esc(item.get("alt") or row["title"] + " project image") + '" width="1440" height="900" loading="lazy" decoding="async">' + ('<figcaption>' + esc(item['caption']) + '</figcaption>' if item.get('caption') else '') + '</figure>')
    if gallery:
        body += '<section><h2>A closer look</h2>' + ''.join(gallery) + '</section>'
    related = payload.get("related") or []
    if related:
        body += '<h2>More project work</h2><ul>' + ''.join('<li><a href="/work/' + esc(item['slug']) + '">' + esc(item.get('title')) + '</a></li>' for item in related) + '</ul>'
    body += '<h2>Planning something similar?</h2><p><a href="/contact">Discuss your project</a> or <a href="/project-brief">prepare a project brief</a>.</p>'
    whatsapp = re.sub(r"[^0-9]", "", str(settings.get("contact", {}).get("whatsapp") or settings.get("contact", {}).get("phone") or ""))
    if whatsapp:
        body += '<p><a href="https://wa.me/' + whatsapp + '?text=' + esc(quote('Hi Rajeev, I would like to discuss a project similar to ' + row['title'])) + '" target="_blank" rel="noopener noreferrer">Connect on WhatsApp</a></p>'
    metadata = row.get("seo") or {}
    nodes = [{"@type": "CreativeWork", "@id": base + path + "#project", "name": row["title"], "description": row.get("summary"), "url": base + path, "creator": {"@id": base + "/#organization"}, "mainEntityOfPage": {"@id": base + path + "#webpage"}, **({"image": image} if image else {}), **({"dateModified": row["updated_at"]} if row.get("updated_at") else {})}]
    return html_document(settings=settings, path=path, title=metadata.get("title") or row['title'] + " | Project Work | Rajeev Freelancer", heading=row["title"], description=metadata.get("description") or row.get("summary", ""), body=body, data={"portfolioProject": payload}, schema=nodes, page_image=image, build_dir=build_dir)


def location_document_valid(doc: dict | None, path: str) -> bool:
    if not isinstance(doc, dict):
        return False
    parts = canonical_path(path).strip("/").split("/")
    if len(parts) != 2 or not all(SLUG.fullmatch(p) for p in parts) or parts[0] in {"api", "admin", "services", "locations", "blog", "case-studies", "work"}:
        return False
    content, service, location = doc.get("content"), doc.get("service"), doc.get("location")
    return (isinstance(content, dict) and bool(content.get("title")) and bool(content.get("meta_description"))
            and isinstance(service, dict) and bool(service.get("name")) and isinstance(location, dict))


def location_html(doc: dict, settings: dict, *, build_dir: Path = BUILD_DIR) -> str:
    if doc.get("new_world_expansion"):
        from world_expansion import public_expansion_document
        doc = public_expansion_document(doc)
    doc = {k: v for k, v in doc.items() if k not in {"_id", "seo_reviewed_by"}}
    content, service, location = doc.get("content", {}), doc.get("service", {}), doc.get("location", {})
    path = canonical_path(doc.get("canonical") or ("/" + service["slug"] + "/" + location["loc_slug"]))
    body = "".join(f'<p>{esc(p)}</p>' for p in content.get("intro", []))
    body += "".join(f'<h3>{esc(p.get("title"))}</h3><p>{esc(p.get("text"))}</p>' for p in content.get("why_choose", []))
    body += '<h2>What the service covers</h2><p>' + esc(content.get("service_details")) + '</p><h2>Project process</h2>'
    body += "".join(f'<h3>{esc(p.get("title"))}</h3><p>{esc(p.get("text"))}</p>' for p in content.get("process", []))
    body += f'<h2>Local context</h2><p>{esc(content.get("local_context"))}</p><h2>Communication</h2><p>{esc(content.get("whatsapp_section"))}</p>'
    if doc.get("is_new_location"):
        if location.get("local_context"):
            body += '<h2>Location and delivery planning</h2><p>' + esc(location["local_context"]) + '</p>'
        body += '<ul>' + ''.join('<li>' + esc(note) + '</li>' for note in location.get("planning_notes", [])) + '</ul>'
        source = public_asset(location.get("source_url"), canonical_origin(settings))
        if source:
            body += '<p>Location reference: <a href="' + esc(source) + '">geographic source</a>.</p>'
    body += faq_html(content.get("faqs"))
    nodes = [{"@type": "Service", "name": service.get("name"), "serviceType": service.get("name"), "provider": {"@id": canonical_origin(settings) + "/#organization"}, "areaServed": {"@type": "Place" if location.get("location_type") == "locality" else "City", "name": location.get("city")}, "url": canonical_origin(settings) + canonical_service_path(path)}]
    faqs = [f for f in content.get("faqs", []) if isinstance(f, dict) and f.get("q") and f.get("a")]
    if faqs:
        nodes.append({"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": f["q"], "acceptedAnswer": {"@type": "Answer", "text": f["a"]}} for f in faqs]})
    # The initial server HTML must offer the same useful onward journeys as
    # the interactive city page. Keep saved editorial copy and URLs intact;
    # link only to established hubs, never to an unapproved sibling city.
    service_slug = path.strip("/").split("/", 1)[0]
    links = []
    if SLUG.fullmatch(service_slug):
        service_path = canonical_service_path("/" + service_slug)
        links.append((service_path, str(service.get("name") or "Service") + " overview"))
    country_slug = location.get("country_slug")
    if isinstance(country_slug, str) and SLUG.fullmatch(country_slug):
        links.append(("/locations/" + country_slug, str(location.get("country") or "Country") + " service areas"))
    links.extend([("/work", "Project examples"), ("/contact", "Discuss your project")])
    body += '<section aria-label="Continue planning your project"><h2>Explore this service</h2><nav aria-label="Service and project links">' + ''.join('<a href="' + esc(href) + '">' + esc(label) + '</a>' for href, label in links) + '</nav></section>'
    return html_document(settings=settings, path=path, title=content.get("title") or service["name"], heading=content.get("h1") or service["name"], description=str(content.get("meta_description") or ""), body=body, data={"locationPage": doc}, schema=nodes, index=not doc.get("seo_noindex") and (not doc.get("is_new_location") or doc.get("seo_reviewed") is True), build_dir=build_dir)


def sitemap_xml(entries: dict, origin: str) -> str:
    rows = []
    preferred_entries = {}
    for path, row in entries.items():
        preferred = canonical_service_path(path)
        # A preferred entry wins if both alias and current route were supplied.
        if preferred not in preferred_entries or preferred == path:
            preferred_entries[preferred] = row
    for path, row in sorted(preferred_entries.items()):
        updated = str(row.get("lastmod") or row.get("updated_at") or "")
        try:
            datetime.fromisoformat(updated.replace("Z", "+00:00"))
            valid_date = True
        except (ValueError, TypeError):
            valid_date = False
        stamp = f"<lastmod>{xml_escape(updated)}</lastmod>" if valid_date else ""
        rows.append(f"<url><loc>{xml_escape(origin + path)}</loc>{stamp}</url>")
    return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + "".join(rows) + '</urlset>'


def build_public_router(*, db, get_settings, services, city_map, fallback_content, build_dir: Path = BUILD_DIR):
    from fastapi import APIRouter, HTTPException, Request
    from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse, Response
    router = APIRouter()
    service_map = {s["slug"]: s for s in services}
    headers = {"Cache-Control": "public, max-age=60, must-revalidate"}

    @router.api_route("/BingSiteAuth.xml", methods=["GET", "HEAD"], include_in_schema=False)
    async def bing_site_verification():
        # Bing's public ownership proof is case-sensitive and must never fall
        # through to the SPA or generic lowercase URL normalization.
        public_file = Path(__file__).resolve().parents[1] / "frontend" / "public" / "BingSiteAuth.xml"
        proof = public_file if public_file.is_file() else build_dir / "BingSiteAuth.xml"
        if not proof.is_file():
            raise HTTPException(status_code=404, detail="Verification file unavailable")
        return Response(proof.read_bytes(), media_type="application/xml", headers={"Cache-Control": "public, max-age=300"})

    async def inventory(settings):
        manifest = load_manifest(build_dir)
        entries = static_entries(manifest)
        # These public indexes are rendered from live collections rather than
        # emitted by the static build, but remain canonical sitemap entries even
        # when their collections are temporarily empty.
        entries.setdefault("/blog", {})
        entries.setdefault("/case-studies", {})
        entries.setdefault("/service-areas", {})
        # Work is a live CMS index. Clear any build-time Work snapshot before
        # adding current rows so an unpublished or archived project cannot leak
        # through a stale frontend manifest.
        for old_path in list(entries):
            if old_path.startswith("/work/"):
                entries.pop(old_path, None)
        entries["/work"] = {"seo_reviewed": True}
        from portfolio import merged_projects
        for row in await merged_projects(db):
            entries["/work/" + row["slug"]] = row
        # Previously shipped service/city combinations remain discoverable without
        # requiring an AI warmup or a database cache write.
        for service in services:
            for slug, loc in city_map.items():
                if not loc.get("is_new_location"):
                    entries.setdefault("/" + service["slug"] + "/" + slug, {})
        # A capped indexed sample can still prove continuity for an exact
        # historical locality route absent from the old uploaded catalog.
        for path, policy in ROUTE_STATUS.items():
            parts = path.strip("/").split("/")
            if policy.get("index_continuity") and len(parts) == 2 and parts[0] in service_map and location_for_path(city_map, parts[1], path):
                entries.setdefault(path, {})
        for coll, prefix in ((db.blog_posts, "/blog/"), (db.case_studies, "/case-studies/")):
            for row in await coll.find({"published": True}, {"_id": 0}).to_list(None):
                if SLUG.fullmatch(str(row.get("slug", ""))) and "noindex" not in str((row.get("seo") or {}).get("robots", "")):
                    entries[prefix + row["slug"]] = row
        # The live Mongo catalog can be newer than an uploaded source ZIP. Keep
        # complete legacy canonical paths even when their city is absent here.
        for row in await db.location_pages.find({}, {"_id": 0}).to_list(None):
            raw_path = row.get("canonical") or ("/" + str((row.get("service") or {}).get("slug", "")) + "/" + str((row.get("location") or {}).get("loc_slug", "")))
            path = canonical_path(raw_path)
            if location_document_valid(row, path):
                policy_doc = apply_index_policy(row, path)
                if not policy_doc.get("seo_noindex") and (not policy_doc.get("is_new_location") or policy_doc.get("seo_reviewed") is True):
                    entries[path] = row
                else:
                    entries.pop(path, None)
        # A static manifest may be built before a new location is reviewed.
        for path in list(static_entries(manifest)):
            bits = path.strip("/").split("/")
            if len(bits) == 2 and bits[0] in service_map and city_map.get(bits[1], {}).get("is_new_location"):
                doc = await db.location_pages.find_one({"$or": [{"canonical": path}, {"key": f"{bits[0]}::{bits[1]}"}]}, {"_id": 0})
                if not location_document_valid(doc, path) or doc.get("is_new_location") and doc.get("seo_reviewed") is not True:
                    entries.pop(path, None)
        preferred_entries = {}
        for path, row in entries.items():
            if status_for_path(path).get("noindex") and row.get("seo_reviewed") is not True:
                continue
            preferred = canonical_service_path(path)
            if status_for_path(preferred).get("noindex") and row.get("seo_reviewed") is not True:
                continue
            if preferred not in preferred_entries or preferred == path:
                preferred_entries[preferred] = row
        return preferred_entries

    @router.api_route("/sitemap.xml", methods=["GET", "HEAD"], include_in_schema=False)
    async def public_sitemap():
        settings = await get_settings()
        entries = await inventory(settings)
        indexing = settings.get("seo", {}).get("robots_index", True)
        files = render_sitemap_files(entries if indexing else {}, canonical_origin(settings), prefix="public")
        return Response(files["root_xml"], media_type="application/xml", headers={**headers, **({"X-Robots-Tag": "noindex, follow"} if not indexing else {})})

    @router.api_route("/api/sitemaps/content.xml", methods=["GET", "HEAD"], include_in_schema=False)
    async def content_sitemap():
        settings = await get_settings()
        entries = await inventory(settings)
        static = static_entries(load_manifest(build_dir))
        dynamic = {path: row for path, row in entries.items() if path not in static}
        indexing = settings.get("seo", {}).get("robots_index", True)
        files = render_sitemap_files(dynamic if indexing else {}, canonical_origin(settings), prefix="content")
        return Response(files["root_xml"], media_type="application/xml", headers={**headers, **({"X-Robots-Tag": "noindex, follow"} if not indexing else {})})

    @router.api_route("/sitemaps/{shard_name}", methods=["GET", "HEAD"], include_in_schema=False)
    async def sitemap_shard(shard_name: str):
        if not re.fullmatch(r"(?:public|content)-\d{4,}\.xml", shard_name):
            raise HTTPException(404, "Sitemap not found")
        settings = await get_settings()
        if not settings.get("seo", {}).get("robots_index", True):
            raise HTTPException(404, "Sitemap not found")
        entries = await inventory(settings)
        prefix = shard_name.split("-", 1)[0]
        if prefix == "content":
            static = static_entries(load_manifest(build_dir))
            entries = {path: row for path, row in entries.items() if path not in static}
        files = render_sitemap_files(entries, canonical_origin(settings), prefix=prefix)
        content = files["shards"].get("sitemaps/" + shard_name)
        if content is None:
            raise HTTPException(404, "Sitemap not found")
        return Response(content, media_type="application/xml", headers=headers)

    @router.api_route("/robots.txt", methods=["GET", "HEAD"], include_in_schema=False)
    async def robots():
        settings = await get_settings()
        content = robots_text(canonical_origin(settings), settings.get("seo", {}).get("robots_index", True))
        return Response(content, media_type="text/plain", headers=headers)

    @router.api_route("/llms.txt", methods=["GET", "HEAD"], include_in_schema=False)
    async def llms():
        settings = await get_settings()
        name = settings.get("seo", {}).get("site_name", "Rajeev Freelancer")
        base = canonical_origin(settings)
        contact = settings.get("contact", {})
        if not settings.get("seo", {}).get("robots_index", True):
            return Response(f"# {name}\n\nPublic page discovery is disabled in the site's indexing settings.\n", media_type="text/plain", headers={**headers, "X-Robots-Tag": "noindex, follow"})
        lines = [f"# {name}", "", "> Freelance website, app, software, SEO, marketing and AI automation services. Project suitability and scope are confirmed before work starts.", "", "## Contact", f"- Phone: {contact.get('phone', '')}", f"- Email: {contact.get('email', '')}", "", "## Public information"]
        for label, path in [("About", "/about"), ("Services", "/services"), ("Contact", "/contact"), ("Insights", "/blog"), ("Locations", "/locations")]:
            lines.append(f"- [{label}]({base}{path})")
        guides = {}
        for service in services:
            path = canonical_service_path('/' + service['slug'])
            if not status_for_path(path).get('noindex'):
                guides[path] = service
        lines += ["", "## Service guides"] + [f"- [{service['name']}]({base}{path})" for path, service in guides.items()]
        lines += ["", "## Discovery", f"- [Canonical public URLs]({base}/sitemap.xml)", f"- [Published insights feed]({base}/feed.xml)"]
        lines += ["", "This file is an optional navigation aid. It does not certify expertise, client results, Google Business verification or AI visibility.", ""]
        return Response("\n".join(lines), media_type="text/plain", headers=headers)

    @router.api_route("/feed.xml", methods=["GET", "HEAD"], include_in_schema=False)
    async def feed():
        settings = await get_settings(); base = canonical_origin(settings)
        posts = await db.blog_posts.find({"published": True}, {"_id": 0}).sort("created_at", -1).to_list(100) if settings.get("seo", {}).get("robots_index", True) else []
        items = []
        for post in posts:
            if not SLUG.fullmatch(str(post.get("slug", ""))) or "noindex" in str((post.get("seo") or {}).get("robots", "")) or status_for_path('/blog/' + str(post.get('slug', ''))).get('noindex'):
                continue
            url = base + "/blog/" + post["slug"]
            items.append(f"<item><title>{xml_escape(str(post.get('title', 'Insight')))}</title><link>{xml_escape(url)}</link><guid isPermaLink=\"true\">{xml_escape(url)}</guid><description>{xml_escape(str(post.get('excerpt', '')))}</description></item>")
        xml = '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>' + xml_escape(settings.get("seo", {}).get("site_name", "Rajeev Freelancer")) + '</title><link>' + xml_escape(base) + '</link><description>Website, software and marketing insights</description>' + ''.join(items) + '</channel></rss>'
        return Response(xml, media_type="application/rss+xml", headers={**headers, **({"X-Robots-Tag": "noindex, follow"} if not settings.get("seo", {}).get("robots_index", True) else {})})

    async def missing(settings, path):
        return HTMLResponse(html_document(settings=settings, path=path, title="Page not found | Rajeev Freelancer", heading="Nothing here.", description="The page you're looking for doesn't exist.", body='<p>The requested page could not be found.</p><p><a href="/services">Explore services</a> or <a href="/contact">contact Rajeev</a>.</p>', index=False, build_dir=build_dir), status_code=404, headers={"X-Robots-Tag": "noindex, follow"})

    @router.api_route("/{requested_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
    async def public_page(request: Request, requested_path: str):
        if requested_path.startswith("api/") or requested_path == "api":
            raise HTTPException(status_code=404, detail="API route not found")
        asset = (build_dir / requested_path).resolve()
        if asset.is_relative_to(build_dir) and asset.is_file() and asset.suffix.lower() in {".js", ".css", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".json", ".woff", ".woff2"}:
            return FileResponse(asset)
        settings = await get_settings()
        path = canonical_path(request.url.path)
        if request.url.path != path and not re.search(r"\.[a-z0-9]{1,8}$", path):
            return RedirectResponse(path + ("?" + request.url.query if request.url.query else ""), status_code=308)
        parts = path.strip("/").split("/")
        legacy_services = {"seo": "freelance-seo-expert", "search-engine-optimization": "freelance-seo-expert", "meta-ads": "freelance-digital-marketing-consultant", "google-ads": "freelance-digital-marketing-consultant", "ppc": "freelance-digital-marketing-consultant", "digital-marketing": "freelance-digital-marketing-consultant", "marketing": "freelance-digital-marketing-consultant", "web-development": "freelance-website-developer", "website": "freelance-website-developer", "web-design": "freelance-website-developer", "wordpress": "freelance-website-developer", "app-development": "freelance-app-developer", "mobile-app": "freelance-app-developer", "app": "freelance-app-developer", "software": "freelance-software-developer", "software-development": "freelance-software-developer", "ai": "freelance-ai-consultant", "ai-automation": "freelance-ai-consultant", "artificial-intelligence": "freelance-ai-consultant", "whatsapp": "whatsapp-marketing-freelancer", "whatsapp-marketing": "whatsapp-marketing-freelancer", "sms": "sms-marketing-freelancer", "sms-marketing": "sms-marketing-freelancer"}
        if path in LEGACY_REDIRECTS:
            return RedirectResponse(canonical_service_path(LEGACY_REDIRECTS[path]), status_code=301)
        if path in {"/home", "/home/index.php", "/clients"}:
            return RedirectResponse("/", status_code=301)
        if len(parts) == 2 and parts[0] == "services":
            legacy_services.update({"software-engineering": "freelance-software-developer", "ecommerce-websites": "freelance-website-developer", "ios-apps": "freelance-app-developer", "android-apps": "freelance-app-developer"})
            if parts[1] in legacy_services:
                return RedirectResponse(canonical_service_path("/" + legacy_services[parts[1]]), status_code=301)
        response_headers = dict(headers)
        if path == "/" and (build_dir / "index.html").is_file():
            from portfolio import merged_projects, listing
            document = (build_dir / "index.html").read_text(encoding="utf-8")
            payload = listing(page=1, page_size=6, rows=await merged_projects(db))
            response_headers["Cache-Control"] = "no-store"
            if settings.get("seo", {}).get("robots_index") is False:
                response_headers["X-Robots-Tag"] = "noindex, follow"
            return HTMLResponse(live_home_html(document, payload, settings), headers=response_headers)
        if path == "/work" or len(parts) == 2 and parts[0] == "work":
            from portfolio import INDEX_TITLE, INDEX_DESCRIPTION, INDEX_HEADING, merged_projects, listing, detail
            rows = await merged_projects(db)
            response_headers["Cache-Control"] = "public, max-age=0, must-revalidate"
            if path != "/work":
                try:
                    payload = detail(parts[1], rows=rows)
                except HTTPException as error:
                    if error.status_code == 404:
                        return await missing(settings, path)
                    raise
                if settings.get("seo", {}).get("robots_index") is False:
                    response_headers["X-Robots-Tag"] = "noindex, follow"
                return HTMLResponse(work_html(payload, settings, build_dir=build_dir), headers=response_headers)
            try:
                page = int(request.query_params.get("page", "1"))
                page_size = int(request.query_params.get("page_size", "12"))
            except (TypeError, ValueError):
                raise HTTPException(422, "Invalid portfolio pagination")
            payload = listing(category=request.query_params.get("category", ""), industry=request.query_params.get("industry", ""), service=request.query_params.get("service", ""), q=request.query_params.get("q", ""), page=page, page_size=page_size, rows=rows)
            filters, pagination = payload["filters"], payload["pagination"]
            def options(items, selected, all_label):
                return '<option value="">' + all_label + '</option>' + ''.join('<option value="' + esc(item['slug']) + '"' + (' selected' if item['slug'] == selected else '') + '>' + esc(item['name']) + '</option>' for item in items)
            body = '<p>Explore the websites, applications, SEO and automation projects we delivered for businesses across industries. Open a project to see the work, images and live links.</p>'
            body += '<form method="get" action="/work"><label>Search projects <input name="q" value="' + esc(filters['q']) + '" maxlength="120"></label><label>Industry <select name="industry">' + options(payload['industries'], filters['industry'], 'All industries') + '</select></label><label>Service <select name="service">' + options(payload['services'], filters['service'], 'All services') + '</select></label><button type="submit">Find projects</button></form>'
            body += '<p>' + esc(pagination['total']) + ' matching projects</p><section aria-label="Projects">'
            for item in payload['items']:
                body += '<article><a href="/work/' + esc(item['slug']) + '">'
                image = public_asset(item.get('image_url'), canonical_origin(settings))
                if image:
                    body += '<img src="' + esc(image) + '" alt="' + esc(item.get('image_alt') or item['title'] + ' project preview') + '" width="1440" height="900" loading="lazy" decoding="async" style="aspect-ratio:16/10;object-fit:cover;object-position:top">'
                body += '<h2>' + esc(item['title']) + '</h2></a><p>' + esc(item['summary']) + '</p><p>' + esc(item['industry']['name']) + '</p></article>'
            body += '</section>'
            if not payload['items']:
                body += '<p>No matching projects. Try another industry or service.</p><p><a href="/work">View all projects</a></p>'
            links = []
            for label, number in [('Previous page', page - 1), ('Next page', page + 1)]:
                if 1 <= number <= pagination['total_pages']:
                    query = urlencode({**filters, 'page': number, 'page_size': page_size})
                    links.append('<a href="/work?' + esc(query) + '">' + label + '</a>')
            body += '<nav aria-label="Project pagination">' + ''.join(links) + '</nav><h2>Ready to build your next project?</h2><p><a href="/contact">Discuss your project</a> or <a href="/project-brief">prepare a project brief</a>.</p>'
            filtered = bool(request.url.query)
            if filtered or settings.get('seo', {}).get('robots_index') is False:
                response_headers['X-Robots-Tag'] = 'noindex, follow'
            schema = [{'@type': 'ItemList', 'itemListElement': [{'@type': 'ListItem', 'position': (page - 1) * page_size + i + 1, 'name': item['title'], 'url': canonical_origin(settings) + '/work/' + item['slug']} for i, item in enumerate(payload['items'])]}]
            return HTMLResponse(html_document(settings=settings, path=path, title=INDEX_TITLE, heading=INDEX_HEADING, description=INDEX_DESCRIPTION, body=body, data={'portfolio': payload}, schema=schema, index=not filtered, canonical_override='/work', build_dir=build_dir), headers=response_headers)
        if path.startswith("/work/"):
            return await missing(settings, path)
        if path == "/service-areas":
            from world_expansion import directory_data
            try:
                page = int(request.query_params.get("page", "1"))
                page_size = int(request.query_params.get("page_size", request.query_params.get("limit", "24")))
            except (TypeError, ValueError):
                raise HTTPException(422, "Invalid pagination")
            payload = await directory_data(db, country=request.query_params.get("country", ""), q=request.query_params.get("q", ""), service=request.query_params.get("service", ""), page=page, page_size=page_size)
            filters, pagination = payload["filters"], payload["pagination"]
            options = '<option value="">All countries and territories</option>' + ''.join('<option value="' + esc(row['slug']) + '"' + (' selected' if row['slug'] == filters['country'] else '') + '>' + esc(row['name']) + '</option>' for row in payload['countries'])
            service_options = ''.join('<option value="' + esc(row['slug']) + '"' + (' selected' if row['slug'] == filters['service'] else '') + '>' + esc(row['name']) + '</option>' for row in payload['services'])
            body = '<p>Explore project locations for remote website, software, app, SEO, marketing and automation services from India. Share your audience, requirements and time zone so the delivery plan can be agreed before work starts.</p><p>This geographic directory describes remote service coverage. A location listing does not represent a local office or completed local projects.</p>'
            body += '<form method="get" action="/service-areas"><label>Search places <input name="q" value="' + esc(filters['q']) + '" maxlength="120"></label><label>Country or territory <select name="country">' + options + '</select></label><label>Service <select name="service">' + service_options + '</select></label><button type="submit">Find service areas</button></form>'
            body += '<h2>Locations</h2><ul>' + ''.join('<li><a href="' + esc(row['path']) + '">' + esc(row['service_name']) + ' for ' + esc(row['city']) + ', ' + esc(row['country']) + '</a><p>Remote project delivery from India' + ('. Review scheduling: ' + esc(row['timezone']) if row.get('timezone') else '') + '.</p></li>' for row in payload['items']) + '</ul>'
            if not payload['items']:
                body += '<p>No matching places. Try a different city name or country.</p>'
            links = []
            for label, number in [('Previous page', page - 1), ('Next page', page + 1)]:
                if 1 <= number <= pagination['total_pages']:
                    query = urlencode({**filters, 'page': number, 'page_size': page_size})
                    links.append('<a href="/service-areas?' + esc(query) + '">' + label + '</a>')
            body += '<nav aria-label="Directory pagination">' + ''.join(links) + '</nav>'
            body += '<h2>Planning a remote project</h2><p>Confirm scope, language, account access, meeting times, payment arrangements and handover responsibilities in a written proposal. Country-specific platform availability and legal requirements need to be checked for the actual project.</p><p><a href="/contact">Discuss a project with Rajeev</a>.</p><p>Geographical data: <a href="https://www.geonames.org/">GeoNames</a>, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>, with the existing service-location catalog.</p>'
            filtered = bool(request.url.query)
            if filtered or settings.get('seo', {}).get('robots_index') is False:
                response_headers['X-Robots-Tag'] = 'noindex, follow'
            schema = [{'@type': 'ItemList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': row['city'] + ', ' + row['country'], 'url': canonical_origin(settings) + row['path']} for i, row in enumerate(payload['items'])]}]
            return HTMLResponse(html_document(settings=settings, path=path, title="Worldwide Remote Service Areas | Rajeev Freelancer", heading="Remote services for businesses worldwide", description="Browse locations for remote website, app, software, SEO, marketing and AI projects with Rajeev in India. Discuss scope, delivery and meeting times.", body=body, data={'serviceAreas': payload}, schema=schema, index=not filtered, canonical_override='/service-areas', build_dir=build_dir), headers=response_headers)
        if path in {"/blog", "/case-studies"}:
            is_blog = path == "/blog"; coll = db.blog_posts if is_blog else db.case_studies
            posts = await coll.find({"published": True}, {"_id": 0}).sort("created_at", -1).to_list(50000)
            title = "Insights, Case Studies & Articles | Rajeev Freelancer" if is_blog else "Case Studies — Real Results with Numbers | Rajeev Freelancer"
            description = "Practical articles and case studies on SEO, GEO, AI automation, web development and growth — written by Rajeev, a senior freelance consultant." if is_blog else "See how Rajeev delivered 3× organic traffic, 80% faster support and +52% conversion. Real freelance web, SEO, AI and automation case studies with the numbers."
            heading = "Notes on SEO, AI & growth." if is_blog else "Results, not adjectives."
            body = '<p>Browse published ' + ('articles and practical guides.' if is_blog else 'project case studies.') + '</p><ul>'
            body += ''.join(f'<li><a href="{path}/{esc(p["slug"])}">{esc(p.get("title"))}</a><p>{esc(p.get("excerpt"))}</p></li>' for p in posts if SLUG.fullmatch(str(p.get("slug", "")))) + '</ul>'
            data = {"blogIndex": {"posts": posts, "categories": sorted(set(p.get("category", "Article") for p in posts))}} if is_blog else {"cases": {"items": posts, "categories": sorted(set(p.get("category", "Web") for p in posts))}}
            return HTMLResponse(html_document(settings=settings, path=path, title=title, heading=heading, description=description, body=body, data=data, build_dir=build_dir), headers=response_headers)
        if len(parts) == 2 and parts[0] in {"blog", "case-studies"}:
            coll = db.blog_posts if parts[0] == "blog" else db.case_studies
            doc = await coll.find_one({"slug": parts[1], "published": True}, {"_id": 0})
            if not doc:
                return await missing(settings, path)
            rendered = post_html(doc, settings, build_dir=build_dir) if parts[0] == "blog" else case_html(doc, settings, build_dir=build_dir)
            if "noindex" in str((doc.get("seo") or {}).get("robots", "")):
                response_headers["X-Robots-Tag"] = "noindex, follow"
            return HTMLResponse(rendered, headers=response_headers)
        requested_location = location_for_path(city_map, parts[1], path) if len(parts) == 2 and parts[0] in service_map else None
        if len(parts) == 2 and parts[0] in service_map and requested_location:
            doc = await db.location_pages.find_one({"$or": [{"key": f"{parts[0]}::{parts[1]}"}, {"canonical": path}, {"canonical": path + "/"}]}, {"_id": 0})
            if not doc:
                service, loc = service_map[parts[0]], requested_location
                doc = {"service": service, "location": loc, "content": fallback_content(service, loc), "canonical": path, "seo_reviewed": False, "is_new_location": loc.get("is_new_location") is True}
            doc["canonical"] = path
            doc = apply_index_policy(doc, path)
            doc["is_new_location"] = doc.get("is_new_location") is True
            doc["seo_reviewed"] = doc.get("seo_reviewed") is True
            if doc.get("seo_noindex") or doc["is_new_location"] and not doc["seo_reviewed"]:
                response_headers["X-Robots-Tag"] = "noindex, follow"
            return HTMLResponse(location_html(doc, settings, build_dir=build_dir), headers=response_headers)
        if len(parts) == 2 and all(SLUG.fullmatch(p) for p in parts) and parts[0] not in {"api", "admin", "services", "locations", "blog", "case-studies", "work"}:
            legacy = await db.location_pages.find_one({"$or": [{"canonical": path}, {"canonical": path + "/"}, {"key": f"{parts[0]}::{parts[1]}"}]}, {"_id": 0})
            if location_document_valid(legacy, path):
                legacy["canonical"] = path
                legacy = apply_index_policy(legacy, path)
                if legacy.get("seo_noindex") or legacy.get("is_new_location") and legacy.get("seo_reviewed") is not True:
                    response_headers["X-Robots-Tag"] = "noindex, follow"
                return HTMLResponse(location_html(legacy, settings, build_dir=build_dir), headers=response_headers)
            # This separate catalog is consulted only after the original
            # catalogs and an exact existing Mongo document have had priority.
            if parts[0] in service_map:
                from world_expansion import expansion_location, expansion_page_document
                location = expansion_location(parts[1], parts[0])
                if location:
                    draft = expansion_page_document(service_map[parts[0]], location, path)
                    response_headers['X-Robots-Tag'] = 'noindex, follow'
                    return HTMLResponse(location_html(draft, settings, build_dir=build_dir), headers=response_headers)
        # Directory index files only, never a blanket SPA fallback for unknown URLs.
        candidate = (build_dir / path.lstrip("/") / "index.html").resolve()
        if path == "/": candidate = build_dir / "index.html"
        if candidate.is_relative_to(build_dir) and candidate.is_file():
            if path == "/admin": response_headers["X-Robots-Tag"] = "noindex, nofollow"
            elif settings.get("seo", {}).get("robots_index") is False: response_headers["X-Robots-Tag"] = "noindex, follow"
            return FileResponse(candidate, headers=response_headers)
        asset = (build_dir / requested_path).resolve()
        # Original portfolio demos are real self-contained HTML tools. Serve
        # only this dedicated public directory; keep arbitrary HTML paths and
        # unpublished Work details subject to the normal route policy.
        if asset.is_relative_to(build_dir / "demos") and asset.is_file() and asset.suffix.lower() == ".html":
            return FileResponse(asset, media_type="text/html", headers={"X-Robots-Tag": "noindex, follow", "Cache-Control": "public, max-age=0, must-revalidate"})
        if asset.is_relative_to(build_dir) and asset.is_file() and asset.suffix.lower() in {".js", ".css", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".json", ".txt", ".xml", ".woff", ".woff2"}:
            return FileResponse(asset)
        if path == "/" and not (build_dir / "index.html").is_file():
            return HTMLResponse(html_document(settings=settings, path=path, title="Website build unavailable", description="The website is temporarily unavailable.", body="<p>Please try again shortly.</p>", index=False, build_dir=build_dir), status_code=503, headers={"Retry-After": "300", "X-Robots-Tag": "noindex"})
        return await missing(settings, path)

    return router
