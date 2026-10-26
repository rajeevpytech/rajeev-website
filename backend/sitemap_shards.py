"""Render bounded sitemap files from an already canonical public URL inventory.

This module deliberately has no knowledge of service aliases, databases, or
routes. The caller owns which paths should appear in the inventory.
"""

from datetime import date, datetime
import re
from xml.sax.saxutils import escape


MAX_URLS = 45_000
MAX_BYTES = 45_000_000

_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>'
_NAMESPACE = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
_URLSET_START = _DECLARATION + "<urlset " + _NAMESPACE + ">"
_URLSET_END = "</urlset>"
_INDEX_START = _DECLARATION + "<sitemapindex " + _NAMESPACE + ">"
_INDEX_END = "</sitemapindex>"
_URLSET_OVERHEAD = len((_URLSET_START + _URLSET_END).encode("utf-8"))
_ISO_DATE = re.compile(
    r"\d{4}-\d{2}-\d{2}"
    r"(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?"
)
_SAFE_PREFIX = re.compile(r"[a-z][a-z0-9-]*")


def _lastmod(row: dict) -> str:
    """Keep an ISO date/datetime, preferring lastmod over updated_at."""
    for key in ("lastmod", "updated_at"):
        value = row.get(key)
        if isinstance(value, (datetime, date)):
            value = value.isoformat()
        if not isinstance(value, str) or not _ISO_DATE.fullmatch(value):
            continue
        try:
            datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            continue
        return value
    return ""


def render_sitemap_files(entries: dict, origin: str, prefix: str = "content") -> dict:
    """Return a plain root sitemap or a root index plus bounded URL shards.

    Limits apply to the complete UTF-8 XML file, including escaped text and the
    XML wrapper. A single URL that cannot fit fails instead of producing an
    oversized file. Input paths are sorted but otherwise preserved exactly.
    """
    if not isinstance(prefix, str) or not _SAFE_PREFIX.fullmatch(prefix):
        raise ValueError("Sitemap prefix must contain only lowercase letters, digits, and hyphens, starting with a letter")
    if MAX_URLS < 1 or MAX_BYTES < _URLSET_OVERHEAD:
        raise ValueError("Sitemap limits must accommodate at least an empty URL set")

    files = []
    rows = []
    byte_count = _URLSET_OVERHEAD

    for path, row in sorted(entries.items()):
        stamp = _lastmod(row)
        lastmod = "<lastmod>" + escape(stamp) + "</lastmod>" if stamp else ""
        xml_row = "<url><loc>" + escape(origin + path) + "</loc>" + lastmod + "</url>"
        row_bytes = len(xml_row.encode("utf-8"))
        if _URLSET_OVERHEAD + row_bytes > MAX_BYTES:
            raise ValueError("A sitemap URL entry exceeds the UTF-8 byte limit")
        if rows and (len(rows) >= MAX_URLS or byte_count + row_bytes > MAX_BYTES):
            files.append(_URLSET_START + "".join(rows) + _URLSET_END)
            rows = []
            byte_count = _URLSET_OVERHEAD
        rows.append(xml_row)
        byte_count += row_bytes

    if rows or not files:
        files.append(_URLSET_START + "".join(rows) + _URLSET_END)
    if len(files) == 1:
        return {"root_xml": files[0], "shards": {}}

    shards = {
        f"sitemaps/{prefix}-{number:04d}.xml": xml
        for number, xml in enumerate(files, start=1)
    }
    index_rows = [
        "<sitemap><loc>" + escape(origin.rstrip("/") + "/" + name) + "</loc></sitemap>"
        for name in shards
    ]
    return {"root_xml": _INDEX_START + "".join(index_rows) + _INDEX_END, "shards": shards}
