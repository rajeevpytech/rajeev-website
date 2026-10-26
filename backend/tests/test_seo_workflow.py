"""Authenticated SEO workflow regressions using an isolated in-memory database.

These tests do not use MongoDB, external crawls, an LLM, SMTP or publishing APIs.
"""
import copy
import asyncio
from datetime import date, timedelta
import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace
import uuid

from fastapi import FastAPI, Header, HTTPException
from fastapi.testclient import TestClient
import pytest
from pymongo.errors import DuplicateKeyError

BACKEND = Path(__file__).resolve().parents[1]
TODAY = date(2026, 10, 25)
AUTH = {"Authorization": "Bearer workflow-test-admin"}
BASE = "/api/admin/seo-workflow"


def nested(row, key):
    result = row
    for part in key.split("."):
        if not isinstance(result, dict): return None
        result = result.get(part)
    return result


def matches(row, query):
    for key, value in query.items():
        if key == "$or":
            if not any(matches(row, branch) for branch in value): return False
        elif key == "$and":
            if not all(matches(row, branch) for branch in value): return False
        elif isinstance(value, dict):
            actual = nested(row, key)
            for operator, target in value.items():
                if operator == "$ne" and actual == target: return False
                if operator == "$in" and actual not in target: return False
                if operator == "$nin" and actual in target: return False
                if operator == "$exists" and (actual is not None) != target: return False
                if operator == "$gte" and (actual is None or actual < target): return False
                if operator == "$lte" and (actual is None or actual > target): return False
        elif nested(row, key) != value:
            return False
    return True


def set_nested(row, key, value):
    bits = key.split(".")
    for part in bits[:-1]: row = row.setdefault(part, {})
    row[bits[-1]] = copy.deepcopy(value)


class Cursor:
    def __init__(self, rows): self.rows = copy.deepcopy(rows)
    def sort(self, *args):
        ordering = args[0] if args and isinstance(args[0], list) else [args]
        for key, direction in reversed(ordering):
            self.rows.sort(key=lambda row: str(nested(row, key) or ""), reverse=direction < 0)
        return self
    def skip(self, count): self.rows = self.rows[count:]; return self
    def limit(self, count): self.rows = self.rows[:count]; return self
    async def to_list(self, count): return self.rows if count is None else self.rows[:count]
    def __aiter__(self): self.iterator = iter(self.rows); return self
    async def __anext__(self):
        try: return next(self.iterator)
        except StopIteration: raise StopAsyncIteration


class Collection:
    def __init__(self, db, name):
        self.db, self.name, self.rows, self.unique = db, name, [], []
    def _project(self, row, projection):
        result = copy.deepcopy(row)
        if projection and projection.get("_id") == 0: result.pop("_id", None)
        return result
    def find(self, query=None, projection=None):
        return Cursor([self._project(row, projection) for row in self.rows if matches(row, query or {})])
    async def find_one(self, query, projection=None, sort=None):
        rows = [self._project(row, projection) for row in self.rows if matches(row, query)]
        cursor = Cursor(rows)
        if sort: cursor.sort(sort)
        return cursor.rows[0] if cursor.rows else None
    async def count_documents(self, query): return sum(matches(row, query) for row in self.rows)
    async def create_index(self, key, unique=False, **kwargs):
        if unique:
            fields = [key] if isinstance(key, str) else [item[0] for item in key]
            self.unique.append(fields)
        self.db.writes.append((self.name, "create_index"))
        return str(key)
    def _check_unique(self, candidate, ignore=None):
        for row in self.rows:
            if row is ignore: continue
            if candidate.get("_id") is not None and row.get("_id") == candidate["_id"]:
                raise DuplicateKeyError("duplicate _id")
            for fields in self.unique:
                if all(nested(row, field) == nested(candidate, field) for field in fields):
                    raise DuplicateKeyError("duplicate unique workflow key")
    async def insert_one(self, document):
        row = copy.deepcopy(document)
        row.setdefault("_id", uuid.uuid4().hex)
        self._check_unique(row)
        self.rows.append(row)
        self.db.writes.append((self.name, "insert_one"))
        return SimpleNamespace(inserted_id=row["_id"])
    async def update_one(self, query, update, upsert=False):
        row = next((row for row in self.rows if matches(row, query)), None)
        inserting = row is None
        if inserting and not upsert:
            return SimpleNamespace(matched_count=0, modified_count=0, upserted_id=None)
        candidate = copy.deepcopy(row) if row is not None else {key: copy.deepcopy(value) for key, value in query.items() if not key.startswith("$") and not isinstance(value, dict)}
        if inserting:
            for key, value in update.get("$setOnInsert", {}).items(): set_nested(candidate, key, value)
        for key, value in update.get("$set", {}).items(): set_nested(candidate, key, value)
        for key, value in update.get("$inc", {}).items(): set_nested(candidate, key, (nested(candidate, key) or 0) + value)
        for key in update.get("$unset", {}): candidate.pop(key, None)
        for key, value in update.get("$addToSet", {}).items():
            existing = list(nested(candidate, key) or [])
            additions = value.get("$each", []) if isinstance(value, dict) and "$each" in value else [value]
            for item in additions:
                if item not in existing: existing.append(copy.deepcopy(item))
            set_nested(candidate, key, existing)
        for key, value in update.get("$push", {}).items():
            existing = list(nested(candidate, key) or []); existing.append(copy.deepcopy(value)); set_nested(candidate, key, existing)
        for key, value in update.get("$pull", {}).items():
            set_nested(candidate, key, [item for item in (nested(candidate, key) or []) if item != value])
        candidate.setdefault("_id", uuid.uuid4().hex)
        self._check_unique(candidate, ignore=row)
        modified = inserting or candidate != row
        if inserting: self.rows.append(candidate)
        else: row.clear(); row.update(candidate)
        self.db.writes.append((self.name, "update_one"))
        return SimpleNamespace(matched_count=0 if inserting else 1, modified_count=int(modified), upserted_id=candidate["_id"] if inserting else None)


class Database:
    def __init__(self): self.collections, self.writes = {}, []
    def __getattr__(self, name):
        if name.startswith("_"): raise AttributeError(name)
        return self.collections.setdefault(name, Collection(self, name))
    def __getitem__(self, name): return getattr(self, name)


@pytest.fixture
def env(tmp_path):
    spec = importlib.util.spec_from_file_location("workflow_under_test", BACKEND / "seo_workflow.py")
    workflow = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(workflow)
    content = {
        "schema_version": 1, "plan_id": "test-seo-90-day-plan", "prepared_on": "2026-10-25", "activation_relative": True,
        "sources": [{"id": "primary-source", "title": "Search guidance", "publisher": "Official documentation", "url": "https://developers.google.com/search/docs/fundamentals/seo-starter-guide", "researched_on": "2026-10-25"}],
        "weeks": [{"week": week, "topic_id": f"planned-topic-{week}", "title": f"A practical project planning guide for week {week}", "slug": f"project-planning-guide-{week}", "search_intent": "informational", "brief": "Review real project requirements, scope and acceptance examples.", "internal_links": ["/services", "/contact"], "source_ids": ["primary-source"], "status": "planned"} for week in range(1, 14)],
        "articles": [{"id": "researched-draft-1", "topic_id": "planned-topic-1", "slug": "project-planning-guide-1", "title": "A practical project planning guide for week 1", "excerpt": "Review the scope before starting.", "content": "## A scoped first release\n\nAgree the actual requirements.", "author": "Rajeev Freelancer", "category": "Guides", "status": "draft", "source_ids": ["primary-source"], "editorial_status": "complete_draft_requires_owner_review"}],
    }
    path = tmp_path / "content.json"; path.write_text(json.dumps(content))
    db = Database()
    async def get_admin(authorization: str = Header(default="")):
        if authorization != AUTH["Authorization"]: raise HTTPException(401, "Not authenticated")
        return {"email": "admin@example.com", "name": "Test administrator"}
    app = FastAPI()
    router = workflow.build_router(db=db, get_current_admin=get_admin, content_path=path, today_fn=lambda: TODAY)
    app.include_router(router, prefix="/api")
    return SimpleNamespace(client=TestClient(app), db=db, content=content, workflow=workflow, service=router.workflow_service)


def overview(env):
    response = env.client.get(BASE, headers=AUTH)
    assert response.status_code == 200, response.text
    return response.json()


def activate(env):
    response = env.client.post(BASE + "/activate", headers=AUTH, json={"start_date": TODAY.isoformat()})
    assert response.status_code == 200, response.text
    return overview(env)


def test_every_workflow_route_requires_admin_and_unauthorized_requests_do_not_write(env):
    requests = [
        ("GET", BASE, None), ("POST", BASE + "/activate", {}),
        ("PATCH", BASE + "/settings", {"notes": "Unauthorized edit"}),
        ("PATCH", BASE + "/tasks/task-id", {"status": "done"}),
        ("POST", BASE + "/tasks/task-id/evidence", {"url": "https://example.com/profile"}),
        ("PATCH", BASE + "/tasks/task-id/evidence/evidence-id", {"status": "owner_confirmed"}),
        ("POST", BASE + "/queue-topics", {}),
        ("POST", BASE + "/metrics", {"date": TODAY.isoformat(), "organic_clicks": 0}),
    ]
    for method, url, data in requests:
        response = env.client.request(method, url, json=data)
        assert response.status_code in (401, 403), (method, url, response.text)
    assert env.db.writes == []


def test_dashboard_preview_is_read_only_and_does_not_claim_real_work_done(env):
    data = overview(env)
    assert data["plan"]["status"] == "not_started"
    assert len(data["weeks"]) == 13
    assert len(data["tasks"]) == 65
    assert all(task["status"] == "pending" for task in data["tasks"])
    assert len(data["blog_topics"]) == 13
    assert data["metrics"] == []
    assert env.db.writes == []
    assert env.db.blog_posts.rows == []
    assert data["blog_drafts"]


def test_activation_is_90_days_idempotent_and_preserves_recorded_progress(env):
    first = activate(env)
    assert first["plan"]["start_date"] == TODAY.isoformat()
    assert first["plan"]["end_date"] == (TODAY + timedelta(days=89)).isoformat()
    task = first["tasks"][0]
    changed = env.client.patch(BASE + "/tasks/" + task["id"], headers=AUTH, json={"status": "in_progress", "notes": "Started the actual baseline review."})
    assert changed.status_code == 200, changed.text
    second = activate(env)
    assert len(second["tasks"]) == 65
    assert len({task["id"] for task in second["tasks"]}) == 65
    assert next(item for item in second["tasks"] if item["id"] == task["id"])["status"] == "in_progress"
    assert next(item for item in second["tasks"] if item["id"] == task["id"])["notes"] == "Started the actual baseline review."
    assert env.db.settings.rows == []  # No scheduler enablement from plan activation.


def test_queue_topics_preserves_existing_autopilot_settings_and_is_idempotent_after_consumption(env):
    activate(env)
    existing = {"key": "blog_autopilot", "enabled": False, "auto_publish": False, "frequency": "alternate", "publish_time": "14:15", "custom_topics": ["An existing owner topic"]}
    env.db.settings.rows.append(copy.deepcopy(existing))
    protected = {"id": "old-post", "slug": "original-post", "title": "Existing approved title", "seo": {"title": "Existing SEO title", "description": "Existing approved description"}, "published": True}
    env.db.blog_posts.rows.append(copy.deepcopy(protected))
    env.service.today = lambda: TODAY + timedelta(days=7)  # Both selected weekly topics are due.
    payload = {"topic_ids": ["planned-topic-1", "planned-topic-2"]}
    first = env.client.post(BASE + "/queue-topics", headers=AUTH, json=payload)
    assert first.status_code == 200, first.text
    queued = next(row for row in env.db.settings.rows if row.get("key") == "blog_autopilot")
    assert queued["custom_topics"] == ["An existing owner topic", env.content["weeks"][0]["title"], env.content["weeks"][1]["title"]]
    for field in ("enabled", "auto_publish", "frequency", "publish_time"): assert queued[field] == existing[field]
    # Simulate the existing scheduler consuming one topic; repeating a queue action
    # must not schedule that already processed plan topic again.
    queued["custom_topics"].remove(env.content["weeks"][0]["title"])
    repeat = env.client.post(BASE + "/queue-topics", headers=AUTH, json=payload)
    assert repeat.status_code == 200, repeat.text
    assert env.content["weeks"][0]["title"] not in queued["custom_topics"]
    assert queued["custom_topics"].count(env.content["weeks"][1]["title"]) == 1
    assert env.db.blog_posts.rows[0] == protected


def test_unconfigured_autopilot_is_not_enabled_when_topics_are_added(env):
    activate(env)
    response = env.client.post(BASE + "/queue-topics", headers=AUTH, json={"topic_ids": ["planned-topic-1"]})
    assert response.status_code == 200, response.text
    configured = next(row for row in env.db.settings.rows if row.get("key") == "blog_autopilot")
    assert configured["enabled"] is False
    assert configured["auto_publish"] is False


def test_article_status_comes_from_actual_post_and_autopilot_topic_history(env):
    activate(env)
    topic = env.content["weeks"][0]
    env.db.blog_posts.rows.append({"id": "generated-post", "slug": "a-final-generated-title", "title": "A different approved article title", "published": False})
    env.db.autopilot_topics.rows.append({"topic": topic["title"], "status": "used", "slug": "a-final-generated-title"})
    draft = next(row for row in overview(env)["blog_topics"] if row["id"] == topic["topic_id"])
    assert draft["status"] == "draft"
    env.db.blog_posts.rows[-1]["published"] = True
    published = next(row for row in overview(env)["blog_topics"] if row["id"] == topic["topic_id"])
    assert published["status"] == "published"


def test_offpage_done_requires_real_url_evidence_and_manual_review_stays_honest(env):
    task = next(task for task in activate(env)["tasks"] if task["kind"] == "offpage")
    path = BASE + "/tasks/" + task["id"]
    invalid = env.client.patch(path, headers=AUTH, json={"status": "done"})
    assert invalid.status_code in (400, 422)
    response = env.client.patch(path, headers=AUTH, json={"status": "done", "notes": "Owner recorded a relevant public profile.", "evidence_urls": ["https://example.com/business-profile"]})
    assert response.status_code == 200, response.text
    saved = next(row for row in overview(env)["tasks"] if row["id"] == task["id"])
    assert saved["status"] == "done"
    evidence = saved["evidence"][0]
    assert evidence["status"] == "recorded"
    assert evidence["external_check_performed"] is False
    reviewed = env.client.patch(path + "/evidence/" + evidence["id"], headers=AUTH, json={"status": "owner_confirmed", "note": "Administrator manually checked the public page."})
    assert reviewed.status_code == 200, reviewed.text
    saved = next(row for row in overview(env)["tasks"] if row["id"] == task["id"])
    assert saved["evidence"][0]["status"] == "owner_confirmed"
    assert saved["evidence"][0]["external_check_performed"] is False


def test_metrics_keep_zero_values_and_repeated_date_update_preserves_other_values(env):
    activate(env)
    first = env.client.post(BASE + "/metrics", headers=AUTH, json={"date": TODAY.isoformat(), "organic_clicks": 0, "impressions": 0, "source_url": "https://search.google.com/search-console/performance"})
    assert first.status_code == 200, first.text
    second = env.client.post(BASE + "/metrics", headers=AUTH, json={"date": TODAY.isoformat(), "indexed_pages": 2333})
    assert second.status_code == 200, second.text
    rows = overview(env)["metrics"]
    assert len(rows) == 1
    assert rows[0]["organic_clicks"] == 0
    assert rows[0]["impressions"] == 0
    assert rows[0]["indexed_pages"] == 2333
    bad = env.client.post(BASE + "/metrics", headers=AUTH, json={"date": TODAY.isoformat(), "organic_clicks": -1})
    assert bad.status_code in (400, 422)
    assert len(overview(env)["metrics"]) == 1


def test_topic_queue_requires_active_plan_and_pausing_does_not_reset_tasks(env):
    assert env.client.post(BASE + "/queue-topics", headers=AUTH, json={}).status_code == 409
    before = activate(env)
    task = before["tasks"][0]
    env.client.patch(BASE + "/tasks/" + task["id"], headers=AUTH, json={"status": "in_progress"})
    paused = env.client.patch(BASE + "/settings", headers=AUTH, json={"status": "paused"})
    assert paused.status_code == 200, paused.text
    assert env.client.post(BASE + "/queue-topics", headers=AUTH, json={}).status_code == 409
    env.client.patch(BASE + "/settings", headers=AUTH, json={"status": "active"})
    assert next(row for row in overview(env)["tasks"] if row["id"] == task["id"])["status"] == "in_progress"


@pytest.mark.parametrize("different_dates", [False, True])
def test_concurrent_activation_has_one_authoritative_start_and_65_unique_tasks(env, monkeypatch, different_dates):
    # Force asynchronous storage boundaries so both requests can observe an empty
    # plan before either upsert commits. Atomic setOnInsert then chooses one date.
    original_find = Collection.find_one
    original_update = Collection.update_one
    async def yielding_find(self, *args, **kwargs):
        await asyncio.sleep(0)
        return await original_find(self, *args, **kwargs)
    async def yielding_update(self, *args, **kwargs):
        await asyncio.sleep(0)
        return await original_update(self, *args, **kwargs)
    monkeypatch.setattr(Collection, "find_one", yielding_find)
    monkeypatch.setattr(Collection, "update_one", yielding_update)
    second_day = TODAY + timedelta(days=7) if different_dates else TODAY
    async def run():
        return await asyncio.gather(
            env.service.activate(env.workflow.ActivateInput(start_date=TODAY), {"email": "first@example.com"}),
            env.service.activate(env.workflow.ActivateInput(start_date=second_day), {"email": "second@example.com"}),
            return_exceptions=True,
        )
    results = asyncio.run(run())
    failures = [result for result in results if isinstance(result, Exception)]
    if different_dates:
        assert len(failures) == 1
        assert isinstance(failures[0], HTTPException) and failures[0].status_code == 409
    else:
        assert failures == []
    plans = env.db.seo_workflow_plans.rows
    tasks = env.db.seo_workflow_tasks.rows
    assert len(plans) == 1
    assert len(tasks) == len({task["id"] for task in tasks}) == 65
    committed = date.fromisoformat(plans[0]["start_date"])
    assert plans[0]["end_date"] == (committed + timedelta(days=89)).isoformat()
    for task in tasks:
        assert task["due_date"] == (committed + timedelta(days=min(task["week"] * 7 - 1, 89))).isoformat()


def test_invalid_evidence_urls_and_negative_metrics_do_not_create_false_records(env):
    task = activate(env)["tasks"][0]
    for invalid in ["javascript:alert(1)", "http://127.0.0.1/private", "https://user:password@example.com/profile"]:
        response = env.client.post(BASE + "/tasks/" + task["id"] + "/evidence", headers=AUTH, json={"url": invalid})
        assert response.status_code in (400, 422)
    assert next(row for row in overview(env)["tasks"] if row["id"] == task["id"])["evidence"] == []


def test_existing_article_is_not_overwritten_or_queued_again(env):
    activate(env)
    topic = env.content["weeks"][0]
    existing = {"id": "existing-curated", "title": topic["title"], "slug": topic["slug"], "published": False, "seo": {"title": "Saved SEO title", "description": "Owner approved description"}, "body_md": "Existing owner text."}
    env.db.blog_posts.rows.append(copy.deepcopy(existing))
    response = env.client.post(BASE + "/queue-topics", headers=AUTH, json={"topic_ids": [topic["topic_id"]]})
    assert response.status_code == 200, response.text
    assert env.db.blog_posts.rows == [existing]
    assert not env.db.settings.rows or all(topic["title"] not in row.get("custom_topics", []) for row in env.db.settings.rows)


def test_future_week_topics_are_not_queued_or_misrepresented_as_due(env):
    activate(env)
    response = env.client.post(BASE + "/queue-topics", headers=AUTH, json={"topic_ids": ["planned-topic-2"]})
    assert response.status_code == 409
    assert env.db.settings.rows == []
    assert env.db.seo_workflow_topic_ledger.rows == []


def test_future_start_plan_has_no_due_topics_and_does_not_change_autopilot(env):
    response = env.client.post(BASE + "/activate", headers=AUTH, json={"start_date": (TODAY + timedelta(days=7)).isoformat()})
    assert response.status_code == 200, response.text
    assert overview(env)["summary"]["current_week"] == 0
    queued = env.client.post(BASE + "/queue-topics", headers=AUTH, json={"topic_ids": ["planned-topic-1"]})
    assert queued.status_code == 409
    assert env.db.settings.rows == []
    assert env.db.seo_workflow_topic_ledger.rows == []


def test_plan_cannot_claim_completed_while_work_is_pending(env):
    activate(env)
    response = env.client.patch(BASE + "/settings", headers=AUTH, json={"status": "completed"})
    assert response.status_code == 409
    assert overview(env)["plan"]["status"] == "active"


def test_new_researched_drafts_are_loaded_without_creating_or_overwriting_posts(env):
    assert len(overview(env)["blog_drafts"]) == 1
    updated = copy.deepcopy(env.content)
    updated["articles"].append({**updated["articles"][0], "id": "researched-draft-2", "topic_id": "planned-topic-2", "slug": "project-planning-guide-2", "title": updated["weeks"][1]["title"]})
    env.service.content_path.write_text(json.dumps(updated))
    assert len(overview(env)["blog_drafts"]) == 2
    assert env.db.writes == []
    assert env.db.blog_posts.rows == []


def test_refresh_only_plan_markers_never_queue_a_new_post_or_rewrite_existing_copy(env):
    activate(env)
    protected = {"id": "refresh-target", "slug": "existing-refresh-target", "title": "Owner approved existing article", "published": True,
                 "seo": {"title": "Approved search title", "description": "Saved original search description"}, "body_md": "Existing article body remains intact."}
    env.db.blog_posts.rows.append(copy.deepcopy(protected))
    # Each variant is an independent plan-file decision with the same active,
    # due topic. Both weekly briefs and researched article records are supported.
    markers = [
        ("weeks", "intent_action", "refresh_candidate"),
        ("weeks", "status", "refresh_existing"),
        ("weeks", "queue_eligible", False),
        ("articles", "intent_action", "refresh_existing"),
        ("articles", "status", "refresh_candidate"),
        ("articles", "new_post_eligible", False),
    ]
    for section, field, value in markers:
        content = copy.deepcopy(env.content)
        content[section][0][field] = value
        content[section][0]["existing_target_slugs"] = [protected["slug"]]
        env.service.content_path.write_text(json.dumps(content))
        env.db.seo_workflow_topic_ledger.rows.clear()
        response = env.client.post(BASE + "/queue-topics", headers=AUTH, json={"topic_ids": ["planned-topic-1"]})
        assert response.status_code == 200, (section, field, response.text)
        result = response.json()["results"][0]
        assert result["result"] == "review_existing", (section, field, result)
        assert result.get("reason", "review_existing") == "review_existing"
        assert result["existing_target_slugs"] == [protected["slug"]]
        assert response.json()["queued_count"] == 0
        assert env.db.settings.rows == []
        assert env.db.blog_posts.rows == [protected]
        topic = next(row for row in overview(env)["blog_topics"] if row["id"] == "planned-topic-1")
        assert topic["status"] != "queued"


def test_published_seed_article_blocks_queue_even_after_a_stale_dashboard_snapshot(env, monkeypatch):
    activate(env)
    content = copy.deepcopy(env.content)
    content["articles"][0].update(slug="owner-published-seed-article", title="A separate researched draft title")
    env.service.content_path.write_text(json.dumps(content))
    existing_ap = {"key": "blog_autopilot", "enabled": True, "auto_publish": False, "frequency": "alternate",
                   "custom_topics": ["Another existing owner topic"], "publish_time": "16:30"}
    env.db.settings.rows.append(copy.deepcopy(existing_ap))
    protected = {"id": "manually-published-seed", "slug": "owner-published-seed-article", "title": "Owner-approved final article title", "published": True,
                 "seo": {"title": "Saved manual SEO title", "description": "Saved approved article description"}, "body_md": "The manually published article is authoritative."}
    original_overview = env.service.overview
    published = False
    async def dashboard_snapshot_then_owner_publishes():
        nonlocal published
        snapshot = await original_overview()
        if not published:
            assert next(row for row in snapshot["blog_topics"] if row["id"] == "planned-topic-1")["status"] == "planned"
            env.db.blog_posts.rows.append(copy.deepcopy(protected))
            published = True
        return snapshot
    monkeypatch.setattr(env.service, "overview", dashboard_snapshot_then_owner_publishes)

    response = env.client.post(BASE + "/queue-topics", headers=AUTH, json={"topic_ids": ["planned-topic-1"]})
    assert response.status_code == 200, response.text
    result = response.json()["results"][0]
    assert result["result"] == "existing_published"
    assert response.json()["queued_count"] == 0
    assert env.db.settings.rows == [existing_ap]
    assert env.db.blog_posts.rows == [protected]
