"""The owner can bulk-publish without inventing review checks or replacing copy."""
import copy
import importlib.util
import io
import json
from pathlib import Path
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from data import CITY_MAP, SERVICES
from live_service_catalog import with_live_services
from public_seo import build_public_router
from test_seo_edgecases import ParsedPage
from world_expansion import SERVICE_MAP, catalog

SPEC = importlib.util.spec_from_file_location("bulk_catalog_publication", Path(__file__).resolve().parents[2] / "scripts/publish_all_catalog_pages.py")
bulk = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(bulk)


def matches(doc, query):
    for key, value in query.items():
        if key == "$or":
            if not any(matches(doc, part) for part in value): return False
        elif isinstance(value, dict) and "$exists" in value:
            if (key in doc) != value["$exists"]: return False
        elif isinstance(value, dict) and "$ne" in value:
            if doc.get(key) == value["$ne"]: return False
        elif isinstance(value, dict) and "$in" in value:
            if doc.get(key) not in value["$in"]: return False
        elif doc.get(key) != value:
            return False
    return True


class Collection:
    def __init__(self, rows=()): self.rows, self.writes = copy.deepcopy(list(rows)), 0
    def find_one(self, query): return copy.deepcopy(next((row for row in self.rows if matches(row, query)), None))
    def update_one(self, query, update, upsert=False):
        row = next((row for row in self.rows if matches(row, query)), None)
        if row is not None:
            row.update(copy.deepcopy(update.get("$set", {})))
            for key in update.get("$unset", {}): row.pop(key, None)
            if "$set" in update or "$unset" in update: self.writes += 1
            return SimpleNamespace(matched_count=1, upserted_id=None)
        if upsert:
            self.rows.append(copy.deepcopy(update.get("$setOnInsert", {}))); self.writes += 1
            return SimpleNamespace(matched_count=0, upserted_id="synthetic")
        return SimpleNamespace(matched_count=0, upserted_id=None)
    def delete_one(self, query):
        for i, row in enumerate(self.rows):
            if matches(row, query):
                del self.rows[i]; self.writes += 1
                return SimpleNamespace(deleted_count=1)
        return SimpleNamespace(deleted_count=0)


def chosen(slug="howrah-india", service="freelancer-website-developer"):
    return SERVICE_MAP[service], catalog()["by_slug"][slug], f"/{service}/{slug}"


def test_dry_run_enumerates_all_40008_without_any_write():
    collection = Collection()
    report = bulk.publish(collection)
    assert report["processed"] == report["would_insert"] == 40008
    assert report["complete"] and not report["database_publication_complete"]
    assert collection.writes == 0 and not collection.rows


def test_publish_keeps_existing_copy_and_does_not_forge_editorial_review():
    service, loc, path = chosen()
    content = {"title": "Keep this exact stored title", "meta_description": "Keep this exact description", "intro": ["Existing custom copy"]}
    old = {"key": f"{service['slug']}::{loc['loc_slug']}", "canonical": path, "service": service, "location": loc,
           "content": content, "is_new_location": True, "seo_noindex": True, "review_checks": {"content_reviewed": False}, "revision": 4}
    collection, journal = Collection([old]), io.StringIO()
    report = bulk.publish(collection, apply=True, journal=journal, run_id="owner-bulk-test", rows=[chosen()])
    row = collection.rows[0]
    assert report["approved_existing"] == 1
    assert row["content"] == content and row["canonical"] == path
    assert row["seo_reviewed"] and not row["seo_noindex"]
    assert row["review_checks"] == {"content_reviewed": False}
    assert row["publication_method"] == "owner_authorized_bulk"
    assert row["editorial_review_status"] == "not_assessed_by_bulk_job"
    assert "seo_reviewed_by" not in row and row["revision"] == 5
    receipt = [json.loads(line) for line in journal.getvalue().splitlines()]
    assert bulk.rollback(collection, receipt, apply=True)["restored"] == 1
    assert collection.rows == [old]


def test_existing_eligible_record_is_not_written_and_alias_is_retained():
    service, loc, _ = chosen()
    alias = service["slug"].replace("freelancer-", "freelance-", 1)
    old = {"key": f"{alias}::{loc['loc_slug']}", "canonical": f"/{alias}/{loc['loc_slug']}", "service": service,
           "location": loc, "content": {"title": "Original", "meta_description": "Original"}, "seo_reviewed": True}
    collection = Collection([old])
    report = bulk.publish(collection, apply=True, journal=io.StringIO(), rows=[chosen()])
    assert report["already_eligible"] == report["existing_aliases_retained"] == 1
    assert collection.writes == 0 and collection.rows == [old]


def test_rollback_will_not_delete_subsequent_authored_content():
    collection, journal = Collection(), io.StringIO()
    bulk.publish(collection, apply=True, journal=journal, run_id="owner-bulk-test", rows=[chosen()])
    row = collection.rows[0]
    assert "appointment enquiries" in row["content"]["h1"]
    row["content"]["title"] = "Later authorised editorial change"
    receipt = [json.loads(line) for line in journal.getvalue().splitlines()]
    assert bulk.rollback(collection, receipt, apply=True)["skipped_changed_or_absent"] == 1
    assert len(collection.rows) == 1


def test_insert_only_race_and_incomplete_existing_content_are_preserved():
    service, loc, path = chosen()
    incomplete = {"key": f"{service['slug']}::{loc['loc_slug']}", "canonical": path, "content": {}}
    collection = Collection([incomplete])
    report = bulk.publish(collection, apply=True, journal=io.StringIO(), rows=[chosen()])
    assert report["conflicts"][0]["reason"] == "incomplete_existing_record_preserved"
    assert collection.writes == 0
    class Racing(Collection):
        def update_one(self, query, update, upsert=False):
            if upsert and not self.rows:
                self.rows.append({**incomplete, "content": {"title": "Concurrent author owns this path"}})
            return super().update_one(query, update, upsert)
    race = Racing()
    result = bulk.publish(race, apply=True, journal=io.StringIO(), rows=[chosen()])
    assert result["conflicts"][0]["reason"] == "concurrent_record_preserved"
    assert race.rows[0]["content"]["title"] == "Concurrent author owns this path"


def test_concurrent_authored_edit_is_not_approved_from_a_stale_read():
    service, loc, path = chosen()
    old = {"key": f"{service['slug']}::{loc['loc_slug']}", "canonical": path, "service": service, "location": loc,
           "content": {"title": "Before edit", "meta_description": "Keep"}, "seo_noindex": True}
    class Racing(Collection):
        def update_one(self, query, update, upsert=False):
            self.rows[0]["content"]["title"] = "Concurrent author's new title"
            return super().update_one(query, update, upsert)
    collection = Racing([old])
    report = bulk.publish(collection, apply=True, journal=io.StringIO(), rows=[chosen()])
    assert report["conflicts"][0]["reason"] == "concurrent_edit_preserved"
    assert collection.rows[0]["seo_noindex"] is True
    assert "publication_batch_id" not in collection.rows[0]


def test_database_failure_stops_early_and_does_not_expose_credentials():
    class OperationFailure(Exception): pass
    class Unavailable(Collection):
        def find_one(self, query): raise OperationFailure("mongodb://private-user:private-password@host/")
    report = bulk.publish(Unavailable(), apply=True, journal=io.StringIO(), rows=[chosen(), chosen("coventry-uk")])
    assert report["processed"] == 1 and report["stopped_early"]
    assert report["errors"][0]["error_type"] == "OperationFailure"
    assert "private-password" not in json.dumps(report)


def test_absent_base_record_gets_exact_existing_fallback_and_can_be_rolled_back():
    row = chosen("delhi-india")
    collection, journal = Collection(), io.StringIO()
    bulk.publish(collection, apply=True, journal=journal, rows=[row])
    assert collection.rows[0]["content"] == bulk.existing_fallback()(row[0], row[1])
    receipts = [json.loads(line) for line in journal.getvalue().splitlines()]
    assert bulk.rollback(collection, receipts, apply=False)["would_restore"] == 1
    assert len(collection.rows) == 1
    assert bulk.rollback(collection, receipts, apply=True)["restored"] == 1
    assert not collection.rows


def test_published_document_renders_indexable_and_enters_actual_sitemap(tmp_path):
    collection = Collection()
    bulk.publish(collection, apply=True, journal=io.StringIO(), rows=[chosen()])
    class Cursor:
        def __init__(self, rows): self.rows = rows
        async def to_list(self, length): return copy.deepcopy(self.rows[:length])
    class AsyncCollection:
        def find(self, query, projection=None): return Cursor([row for row in collection.rows if matches(row, query)])
        async def find_one(self, query, projection=None): return collection.find_one(query)
    class Empty:
        def find(self, query, projection=None): return Cursor([])
        async def find_one(self, query, projection=None): return None
    db = SimpleNamespace(location_pages=AsyncCollection(), blog_posts=Empty(), case_studies=Empty(), portfolio_projects=Empty())
    async def settings(): return {"seo": {"robots_index": True}, "business": {}, "contact": {}}
    app = FastAPI()
    app.include_router(build_public_router(db=db, get_settings=settings, services=list(with_live_services(SERVICES).values()), city_map=CITY_MAP, fallback_content=bulk.existing_fallback(), build_dir=tmp_path))
    client = TestClient(app)
    path = chosen()[2]
    response = client.get(path)
    assert response.status_code == 200 and response.headers.get("x-robots-tag") != "noindex, follow"
    assert ParsedPage(response.text).meta["robots"][0].startswith("index, follow")
    assert "https://rajeevfreelancer.com" + path in client.get("/sitemap.xml").text
