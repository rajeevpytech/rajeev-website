"""Capacity and preservation checks for public sitemap serialization."""

from datetime import date, datetime, timezone
import importlib.util
from pathlib import Path
import xml.etree.ElementTree as ET

import pytest


MODULE_PATH = Path(__file__).resolve().parents[1] / "sitemap_shards.py"
SPEC = importlib.util.spec_from_file_location("sitemap_shards_under_test", MODULE_PATH)
sitemaps = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(sitemaps)
NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
ORIGIN = "https://rajeevfreelancer.com"


def urls(xml):
    root = ET.fromstring(xml)
    return [node.findtext("s:loc", namespaces=NS) for node in root.findall("s:url", NS)]


def test_small_root_preserves_exact_paths_escaping_and_deterministic_order():
    entries = {
        "/freelance-services/seo?one=1&two=2": {"lastmod": "2026-10-25T10:30:00Z"},
        "/services/seo": {},
        "/Freelance/Case-Sensitive": {},
        "/a<quoted>\"path": {},
    }
    result = sitemaps.render_sitemap_files(entries, ORIGIN)
    assert result["shards"] == {}
    assert urls(result["root_xml"]) == [ORIGIN + path for path in sorted(entries)]
    assert "&amp;two=2" in result["root_xml"]
    assert "&lt;quoted&gt;" in result["root_xml"]
    assert result == sitemaps.render_sitemap_files(dict(reversed(list(entries.items()))), ORIGIN)


def test_default_caps_and_45001_boundary_have_no_empty_or_oversized_shards():
    assert sitemaps.MAX_URLS == 45_000
    assert sitemaps.MAX_BYTES == 45_000_000
    entries = {f"/pages/{number:05d}": {} for number in range(45_000)}
    at_limit = sitemaps.render_sitemap_files(entries, ORIGIN)
    assert at_limit["shards"] == {}
    assert len(urls(at_limit["root_xml"])) == 45_000

    entries["/pages/45000"] = {}
    result = sitemaps.render_sitemap_files(entries, ORIGIN)
    assert list(result["shards"]) == ["sitemaps/content-0001.xml", "sitemaps/content-0002.xml"]
    assert [len(urls(xml)) for xml in result["shards"].values()] == [45_000, 1]
    assert all(len(xml.encode("utf-8")) <= sitemaps.MAX_BYTES for xml in result["shards"].values())
    index = ET.fromstring(result["root_xml"])
    assert index.tag == "{" + NS["s"] + "}sitemapindex"
    assert [node.findtext("s:loc", namespaces=NS) for node in index] == [
        ORIGIN + "/" + name for name in result["shards"]
    ]
    actual = [url for xml in result["shards"].values() for url in urls(xml)]
    assert actual == [ORIGIN + path for path in sorted(entries)]


def test_byte_limit_counts_full_utf8_and_escaped_output_exactly(monkeypatch):
    origin = "https://例え.test"
    entries = {"/地域/東京?x=1&y=<二>": {}, "/地域/大阪?x=2&y=<三>": {}}
    full = sitemaps.render_sitemap_files(entries, origin)["root_xml"]
    full_bytes = len(full.encode("utf-8"))
    assert len(full) < full_bytes - 1
    monkeypatch.setattr(sitemaps, "MAX_BYTES", full_bytes)
    assert sitemaps.render_sitemap_files(entries, origin)["shards"] == {}
    monkeypatch.setattr(sitemaps, "MAX_BYTES", full_bytes - 1)
    result = sitemaps.render_sitemap_files(entries, origin)
    assert len(result["shards"]) == 2
    assert all(len(xml.encode("utf-8")) <= full_bytes - 1 for xml in result["shards"].values())
    assert [url for xml in result["shards"].values() for url in urls(xml)] == [
        origin + path for path in sorted(entries)
    ]
    assert all("&amp;" in xml and "&lt;" in xml for xml in result["shards"].values())


def test_single_oversized_url_is_rejected_instead_of_emitting_invalid_shard(monkeypatch):
    entry = {"/" + "東京&" * 30: {}}
    xml = sitemaps.render_sitemap_files(entry, ORIGIN)["root_xml"]
    monkeypatch.setattr(sitemaps, "MAX_BYTES", len(xml.encode("utf-8")) - 1)
    with pytest.raises(ValueError, match="entry exceeds"):
        sitemaps.render_sitemap_files(entry, ORIGIN)


def test_distinct_prefixes_isolate_root_and_api_shard_names(monkeypatch):
    monkeypatch.setattr(sitemaps, "MAX_URLS", 1)
    entries = {"/first": {}, "/second": {}}
    public = sitemaps.render_sitemap_files(entries, ORIGIN, prefix="public")
    content = sitemaps.render_sitemap_files(entries, ORIGIN)
    assert set(public["shards"]).isdisjoint(content["shards"])
    assert list(public["shards"]) == ["sitemaps/public-0001.xml", "sitemaps/public-0002.xml"]
    assert list(content["shards"]) == ["sitemaps/content-0001.xml", "sitemaps/content-0002.xml"]
    assert list(public["shards"].values()) == list(content["shards"].values())
    for result in (public, content):
        index = ET.fromstring(result["root_xml"])
        assert [node.findtext("s:loc", namespaces=NS) for node in index] == [
            ORIGIN + "/" + name for name in result["shards"]
        ]


@pytest.mark.parametrize("prefix", ["../public", "public/content", "Public", "x?y", "x\ny", "", 123])
def test_unsafe_prefixes_are_rejected_even_for_small_inventories(prefix):
    with pytest.raises(ValueError, match="prefix"):
        sitemaps.render_sitemap_files({}, ORIGIN, prefix=prefix)


def test_empty_inventory_stays_a_valid_empty_urlset():
    result = sitemaps.render_sitemap_files({}, ORIGIN)
    assert result["shards"] == {}
    assert ET.fromstring(result["root_xml"]).tag == "{" + NS["s"] + "}urlset"
    assert urls(result["root_xml"]) == []


def test_only_valid_iso_lastmod_or_updated_at_are_exposed():
    entries = {
        "/date": {"lastmod": "2026-10-25"},
        "/datetime": {"lastmod": "2026-10-25T12:34:56.123456+05:30"},
        "/datetime-object": {"updated_at": datetime(2026, 10, 25, 12, tzinfo=timezone.utc)},
        "/date-object": {"updated_at": date(2026, 10, 25)},
        "/fallback": {"lastmod": "not a date", "updated_at": "2026-10-24T09:00:00Z"},
        "/impossible": {"lastmod": "2026-02-30"},
        "/script": {"updated_at": "<script>alert(1)</script>"},
        "/wrong-separator": {"lastmod": "2026-10-25X12:00:00"},
        "/numeric": {"lastmod": 1792886400},
    }
    root = ET.fromstring(sitemaps.render_sitemap_files(entries, ORIGIN)["root_xml"])
    stamps = {
        node.findtext("s:loc", namespaces=NS): node.findtext("s:lastmod", namespaces=NS)
        for node in root
    }
    assert stamps == {
        ORIGIN + "/date": "2026-10-25",
        ORIGIN + "/datetime": "2026-10-25T12:34:56.123456+05:30",
        ORIGIN + "/datetime-object": "2026-10-25T12:00:00+00:00",
        ORIGIN + "/date-object": "2026-10-25",
        ORIGIN + "/fallback": "2026-10-24T09:00:00Z",
        ORIGIN + "/impossible": None,
        ORIGIN + "/script": None,
        ORIGIN + "/wrong-separator": None,
        ORIGIN + "/numeric": None,
    }
