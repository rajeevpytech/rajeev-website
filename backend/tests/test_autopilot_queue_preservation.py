"""Autopilot must not erase topics added after it read its settings snapshot.

Exercise the real extracted async functions with deterministic local generation
and storage fakes. No MongoDB, LLM, network request or publication is performed.
"""
import ast
import asyncio
import copy
from datetime import datetime, timezone
from pathlib import Path
import re
from types import SimpleNamespace
import uuid


SOURCE = Path(__file__).resolve().parents[1] / "autopilot.py"
NOW = datetime(2026, 10, 25, 12, 0, tzinfo=timezone.utc)


class Collection:
    def __init__(self, rows=()): self.rows = copy.deepcopy(list(rows))

    @staticmethod
    def matches(row, query): return all(row.get(key) == value for key, value in query.items())

    async def find_one(self, query, projection=None, **kwargs):
        return copy.deepcopy(next((row for row in self.rows if self.matches(row, query)), None))

    async def insert_one(self, row):
        self.rows.append(copy.deepcopy(row))
        return SimpleNamespace(inserted_id=row.get("id"))

    async def update_one(self, query, update, **kwargs):
        row = next((row for row in self.rows if self.matches(row, query)), None)
        if row is None: return SimpleNamespace(matched_count=0, modified_count=0)
        before = copy.deepcopy(row)
        row.update(copy.deepcopy(update.get("$set", {})))
        for key, value in update.get("$pull", {}).items():
            row[key] = [item for item in row.get(key, []) if item != value]
        for key, value in update.get("$addToSet", {}).items():
            if value not in row.setdefault(key, []): row[key].append(copy.deepcopy(value))
        return SimpleNamespace(matched_count=1, modified_count=int(before != row))

    async def update_many(self, query, update):
        changed = 0
        for row in self.rows:
            if self.matches(row, query):
                row.update(copy.deepcopy(update.get("$set", {})))
                changed += 1
        return SimpleNamespace(modified_count=changed)


def extracted(name, namespace):
    tree = ast.parse(SOURCE.read_text())
    function = next(node for node in tree.body if isinstance(node, ast.AsyncFunctionDef) and node.name == name)
    exec(compile(ast.Module(body=[function], type_ignores=[]), str(SOURCE), "exec"), namespace)
    return namespace[name]


def test_rejected_topic_is_removed_without_erasing_a_concurrently_added_topic():
    rejected = "A rejected duplicate topic"
    retained = "An existing approved queue topic"
    added = "A newly queued 90-day workflow topic"
    ap_snapshot = {"custom_topics": [rejected, retained], "dedupe": True}
    settings = Collection([{"key": "blog_autopilot", "custom_topics": [rejected, retained], "enabled": False, "auto_publish": False}])
    topics = Collection()
    db = SimpleNamespace(settings=settings, autopilot_topics=topics)

    def reject_reason(candidate, _corpus, _ap):
        if candidate["topic"] == rejected:
            # Simulate an administrator/workflow append after the worker loaded ap.
            settings.rows[0]["custom_topics"].append(added)
            return "Topic duplicates an existing article"
        return None

    async def stale_settings_save(patch):
        # Retained so this regression fails if the production branch switches
        # back to replacing the entire stale custom_topics array.
        await settings.update_one({"key": "blog_autopilot"}, {"$set": patch})

    namespace = {"ctx": {"db": db}, "_reject_reason": reject_reason, "save_settings": stale_settings_save,
                 "uuid": uuid, "iso": lambda value: value.isoformat(), "now_utc": lambda: NOW}
    choose = extracted("choose_topic", namespace)
    chosen = asyncio.run(choose(ap_snapshot, [], {"run_key": "queue-rejection-regression"}))

    assert chosen["topic"] == retained
    assert settings.rows[0]["custom_topics"] == [retained, added]
    assert settings.rows[0]["enabled"] is False
    assert settings.rows[0]["auto_publish"] is False
    assert topics.rows[0]["topic"] == rejected
    assert topics.rows[0]["status"] == "rejected"
    assert ap_snapshot["custom_topics"] == [rejected, retained]


def test_successful_and_draft_runs_consume_one_topic_without_erasing_new_queue_entries():
    consumed = "The selected owner-approved article topic"
    retained = "Another existing owner-approved topic"
    added = "A concurrently queued workflow article topic"

    async def scenario(auto_publish):
        settings = Collection([{"key": "blog_autopilot", "custom_topics": [consumed, retained],
                                "enabled": True, "auto_publish": auto_publish}])
        posts = Collection()
        topics = Collection([{"topic": consumed, "status": "queued"}, {"topic": retained, "status": "queued"}])
        db = SimpleNamespace(settings=settings, blog_posts=posts, autopilot_topics=topics)
        ap_snapshot = {"custom_topics": [consumed, retained], "generate_cover": False, "auto_publish": auto_publish}
        calls = {"generated": 0, "notified": []}

        async def get_settings(): return copy.deepcopy(ap_snapshot)
        async def corpus(): return []
        async def step(*args, **kwargs): return None
        async def choose(*args): return {"topic": consumed, "primary_keyword": "project planning", "cluster": "Web development", "source": "queue"}
        async def generate(*args):
            calls["generated"] += 1
            # This append occurs during generation, after get_settings returned.
            await settings.update_one({"key": "blog_autopilot"}, {"$addToSet": {"custom_topics": added}})
            return {"title": "A scoped website project", "excerpt": "Confirm the actual project scope.",
                    "body_markdown": "## Agree the scope\n\nWrite acceptance examples before starting.",
                    "primary_keyword": "website project scope", "meta_description": "A practical guide to scoping a website project.",
                    "_base": "https://rajeevfreelancer.com"}
        async def stale_settings_save(patch):
            await settings.update_one({"key": "blog_autopilot"}, {"$set": patch})
        async def notify(paths): calls["notified"].append(paths)

        namespace = {"ctx": {"db": db, "slug": lambda value: "a-scoped-website-project", "ping_indexnow": notify},
                     "get_settings": get_settings, "_corpus": corpus, "_step": step, "choose_topic": choose,
                     "generate_article": generate, "validate_article": lambda *args: [], "sanitize_markdown": lambda value: value,
                     "save_settings": stale_settings_save, "uuid": uuid, "re": re, "asyncio": asyncio,
                     "iso": lambda value: value.isoformat(), "now_utc": lambda: NOW}
        pipeline = extracted("run_pipeline", namespace)
        result = await pipeline({"run_key": "queue-consumption-regression"})
        await asyncio.sleep(0)  # Complete only the local notification stub.

        assert calls["generated"] == 1
        assert len(posts.rows) == 1
        assert result["published"] is auto_publish
        assert posts.rows[0]["published"] is auto_publish
        assert settings.rows[0]["custom_topics"] == [retained, added]
        assert settings.rows[0]["enabled"] is True
        assert settings.rows[0]["auto_publish"] is auto_publish
        assert next(row for row in topics.rows if row["topic"] == retained)["status"] == "queued"
        assert all(row["status"] == "used" for row in topics.rows if row["topic"] == consumed)
        assert ap_snapshot["custom_topics"] == [consumed, retained]
        assert bool(calls["notified"]) is auto_publish

    asyncio.run(scenario(False))
    asyncio.run(scenario(True))
