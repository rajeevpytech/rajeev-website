"""Offline release packs distinguish coverage, drafts and publication."""
import importlib.util
import json
from pathlib import Path

import pytest
from world_expansion import _valid_content, catalog
from test_world_expansion import expansion_env

SPEC = importlib.util.spec_from_file_location("prepare_expansion_release", Path(__file__).resolve().parents[2] / "scripts/prepare_expansion_release.py")
release = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(release)


def test_full_inventory_and_first_drafts_are_not_publication(tmp_path):
    snapshot = tmp_path / "snapshot.json"
    sample = "/freelancer-ai-consultant/howrah-india"
    snapshot.write_text(json.dumps({"urls": [release.ORIGIN + sample, release.ORIGIN + "/"]}))
    out = tmp_path / "pack"
    report = release.prepare(out, snapshot)
    rows = [json.loads(line) for line in (out / "all-40008-routes.jsonl").read_text().splitlines()]
    assert len(rows) == len({row["path"] for row in rows}) == 40008
    assert report["additional_combinations"] == 36240
    assert report["existing_base_combinations"] == 3768
    assert report["sitemap_snapshot_total"] == 2
    assert report["combinations_listed_in_snapshot"] == 1
    assert report["database_writes"] == report["provider_calls"] == report["publications"] == 0
    assert all(row["publication"] == row["search_indexing"] == "not_certified" for row in rows)
    pack = json.loads((out / "first-24-drafts.json").read_text())
    assert pack["format"] == "rf-service-area-drafts-v1" and len(pack["pages"]) == 24
    assert sum(row["draft_pack"] for row in rows) == 24
    for row in pack["pages"]:
        slug = row["path"].split("/")[-1]
        assert row["source_geoname_id"] == catalog()["additional"][slug]["geoname_id"]
        assert _valid_content(row["content"])
        assert "seo_reviewed" not in row and "checks" not in row
        assert "hypothetical" in json.dumps(row["content"]).lower()
        assert "source row hash" in row["source_notes"]


def test_scheduling_uses_date_specific_offsets_without_offering_hours():
    uk = release.schedule(catalog()["additional"]["coventry-uk"])
    us = release.schedule(catalog()["additional"]["denver-usa"])
    assert "15:30 GMT" in uk and "16:30 BST" in uk
    assert "08:30 MST" in us and "09:30 MDT" in us
    assert "not offered support hours" in uk


def test_bad_snapshot_cannot_be_treated_as_live_evidence(tmp_path):
    snapshot = tmp_path / "snapshot.json"
    snapshot.write_text(json.dumps(["https://another-business.example/page"]))
    with pytest.raises(ValueError, match="canonical HTTPS"):
        release.prepare(tmp_path / "pack", snapshot)


def test_prepared_drafts_render_and_only_explicit_approval_enters_xml(expansion_env):
    env = expansion_env
    drafts = release.draft_pages()
    for row in drafts:
        endpoint = "/api/admin/service-areas/page" + row["path"]
        payload = {"reviewed": False, "content": row["content"], "evidence_notes": row["source_notes"], "checks": {}}
        assert env.client.put(endpoint, headers=env.admin, json=payload).status_code == 200
        response = env.client.get(row["path"])
        assert response.status_code == 200
        assert "noindex, follow" == response.headers["x-robots-tag"]
        assert row["source_notes"] not in response.text
    xml = env.client.get("/sitemap.xml").text
    assert all(row["path"] not in xml for row in drafts)
    row = drafts[0]
    payload = {"reviewed": True, "expected_revision": 1, "content": row["content"], "checks": {name: True for name in ("geography_verified", "remote_delivery_confirmed", "content_reviewed", "business_claims_verified")}, "evidence_notes": "Isolated synthetic publication test; not a real editorial approval."}
    assert env.client.put("/api/admin/service-areas/page" + row["path"], headers=env.admin, json=payload).status_code == 200
    xml = env.client.get("/sitemap.xml").text
    assert row["path"] in xml
    assert all(item["path"] not in xml for item in drafts[1:])
