"""Restarts preserve CMS URLs, exact content, and deliberately deleted seeds.

Exercise the actual startup, seed, and public detail functions without importing
server startup or connecting to MongoDB, storage, a scheduler, or a provider.
"""

import ast
import asyncio
from collections import Counter
import copy
from datetime import datetime, timezone
import os
from pathlib import Path
import re
from types import SimpleNamespace
import uuid

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
import pytest


SOURCE = Path(__file__).resolve().parents[1] / "server.py"


def matches(row, query):
    for key, expected in query.items():
        if isinstance(expected, dict) and "$ne" in expected:
            if row.get(key) == expected["$ne"]:
                return False
        elif row.get(key) != expected:
            return False
    return True


class Cursor:
    def __init__(self, rows):
        self.rows = copy.deepcopy(rows)

    def sort(self, key, direction):
        self.rows.sort(key=lambda row: str(row.get(key) or ""), reverse=direction < 0)
        return self

    async def to_list(self, count):
        return self.rows[:count]


class ReadOnlyCollection:
    def __init__(self, database, name, rows=()):
        self.database, self.name = database, name
        self.rows = copy.deepcopy(list(rows))

    async def create_index(self, *args, **kwargs):
        self.database.index_calls.append((self.name, args, kwargs))

    async def find_one(self, query, projection=None):
        row = next((row for row in self.rows if matches(row, query)), None)
        return self.project(row, projection) if row is not None else None

    async def distinct(self, key, query=None):
        return list(dict.fromkeys(row.get(key) for row in self.rows if matches(row, query or {})))

    @staticmethod
    def project(row, projection):
        result = copy.deepcopy(row)
        for key, included in (projection or {}).items():
            if not included:
                result.pop(key, None)
        return result

    def find(self, query=None, projection=None):
        return Cursor([self.project(row, projection) for row in self.rows if matches(row, query or {})])

    def __getattr__(self, method):
        if method.startswith(("insert", "update", "delete", "replace")) or method == "bulk_write":
            async def forbidden(*args, **kwargs):
                self.database.writes.append((self.name, method, copy.deepcopy(args), copy.deepcopy(kwargs)))
                raise AssertionError("Restart must not mutate existing CMS documents or restore deleted seeds")
            return forbidden
        raise AttributeError(method)


class Database:
    def __init__(self):
        self.collections, self.writes, self.index_calls = {}, [], []

    def __getattr__(self, name):
        return self.collections.setdefault(name, ReadOnlyCollection(self, name))

    def __getitem__(self, name):
        return getattr(self, name)


def existing_document(slug, kind):
    return {"_id": kind + "-" + slug, "id": kind + "-" + slug, "slug": slug,
            "title": "Owner's exact " + kind + " title for " + slug,
            "body": ["Original body with retained punctuation — and Unicode: Düsseldorf."],
            "body_md": "## Existing scope\n\nRetain this owner's original content.",
            "seo": {"title": "Saved Search title " + slug, "description": "Saved Search description " + slug},
            "published": True, "featured": False, "ai_generated": False, "seo_reviewed": None,
            "seo_noindex": False, "order": 0, "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-03T00:00:00Z", "custom_owner_flag": "preserve"}


@pytest.fixture
def env(monkeypatch):
    monkeypatch.setenv("ADMIN_EMAIL", "Owner@Example.com")
    monkeypatch.setenv("ADMIN_PASSWORD", "local-known-test-password")
    db, calls, scheduled = Database(), Counter(), []
    db.users.rows = [{"email": "owner@example.com", "password_hash": "matching-local-hash", "role": "admin"}]
    db.blog_posts.rows = [existing_document(slug, "blog") for slug in ("über-uns", "website-project-scope", "existing_guide")]
    db.case_studies.rows = [existing_document(slug, "case") for slug in ("düsseldorf-projekt", "website-redesign", "case_study")]
    # Real seed functions receive both existing seeds and deliberately missing
    # seeds. Reintroducing startup seeding would resurrect deleted content and
    # therefore hit the fake database's forbidden insert_many immediately.
    blog_seed = copy.deepcopy(db.blog_posts.rows) + [{"slug": "deleted-blog-seed", "title": "A deleted original seed", "body": ["Do not restore automatically."]}]
    case_seed = copy.deepcopy(db.case_studies.rows) + [{"slug": "deleted-case-seed", "title": "A deleted case seed", "body": ["Do not restore automatically."]}]

    async def daily_scheduler():
        raise AssertionError("The test must not execute a background scheduler")

    async def autopilot_scheduler():
        raise AssertionError("The test must not execute a background scheduler")

    def schedule(coroutine):
        scheduled.append(coroutine.cr_code.co_name)
        coroutine.close()
        return SimpleNamespace()

    async def ensure_indexes():
        calls["autopilot_indexes"] += 1

    async def notification_config():
        calls["notification_config"] += 1

    def init_storage():
        calls["fake_storage_init"] += 1
        return "local-storage-placeholder"

    async def to_thread(function, *args, **kwargs):
        assert function is init_storage
        calls["local_to_thread"] += 1
        return function(*args, **kwargs)

    def matching_password(password, stored_hash):
        assert password == "local-known-test-password"
        assert stored_hash == "matching-local-hash"
        return True

    def forbidden_hash(password):
        raise AssertionError("A matching existing administrator must not be rewritten")

    async def forbidden_reslug():
        calls["obsolete_reslug"] += 1
        raise AssertionError("Restart must not run the obsolete public URL migration")

    scope = {"db": db, "os": os, "datetime": datetime, "timezone": timezone, "uuid": uuid, "re": re,
             "HTTPException": HTTPException, "BLOG_SEED": blog_seed, "CASE_SEED": case_seed,
             "verify_password": matching_password, "hash_password": forbidden_hash,
             "asyncio": SimpleNamespace(create_task=schedule, to_thread=to_thread),
             "_daily_digest_scheduler": daily_scheduler,
             "autopilot": SimpleNamespace(ensure_indexes=ensure_indexes, scheduler_loop=autopilot_scheduler),
             "_apply_notification_config": notification_config, "init_storage": init_storage,
             "_reslug_content": forbidden_reslug,
             "logger": SimpleNamespace(info=lambda message: None, warning=lambda message: pytest.fail(message))}
    names = {"startup", "_seed_blog", "_seed_case_studies", "get_blog", "get_case_study", "_slug"}
    tree = ast.parse(SOURCE.read_text())
    nodes = [node for node in tree.body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name in names]
    assert {node.name for node in nodes} == names
    for node in nodes:
        node.decorator_list = []
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(SOURCE), "exec"), scope)
    return SimpleNamespace(scope=scope, db=db, calls=calls, scheduled=scheduled)


def test_two_actual_restarts_preserve_existing_urls_copy_flags_and_deleted_seed_decisions(env):
    before = {name: copy.deepcopy(collection.rows) for name, collection in env.db.collections.items()}
    # This is the real normalization difference that the obsolete startup
    # migration would apply. Unicode itself is already supported by _slug.
    assert env.scope["_slug"]("existing_guide") == "existing-guide"
    assert env.scope["_slug"]("case_study") == "case-study"
    assert env.scope["_slug"]("über-uns") == "über-uns"

    async def scenario():
        for _ in range(2):
            await env.scope["startup"]()
            for name, rows in before.items():
                assert env.db.collections[name].rows == rows
            assert env.db.writes == []
            assert await env.db.blog_posts.find_one({"slug": "deleted-blog-seed"}) is None
            assert await env.db.case_studies.find_one({"slug": "deleted-case-seed"}) is None

    asyncio.run(scenario())
    assert env.calls == Counter(autopilot_indexes=2, notification_config=2, fake_storage_init=2, local_to_thread=2)
    assert env.scheduled == ["daily_scheduler", "autopilot_scheduler"] * 2
    assert len(env.db.index_calls) == 6


def test_actual_detail_apis_keep_exact_unicode_ascii_and_underscore_urls_after_restart(env):
    asyncio.run(env.scope["startup"]())
    app = FastAPI()
    app.add_api_route("/api/blog/{slug}", env.scope["get_blog"], methods=["GET"])
    app.add_api_route("/api/case-studies/{slug}", env.scope["get_case_study"], methods=["GET"])
    client = TestClient(app)
    for collection_name, path, field in (("blog_posts", "/api/blog/", "post"), ("case_studies", "/api/case-studies/", "item")):
        for original in env.db.collections[collection_name].rows:
            response = client.get(path + original["slug"])
            assert response.status_code == 200
            assert response.json()[field] == {key: value for key, value in original.items() if key != "_id"}
    for path in ("/api/blog/existing-guide", "/api/case-studies/case-study", "/api/blog/deleted-blog-seed", "/api/case-studies/deleted-case-seed"):
        assert client.get(path).status_code == 404
    assert env.db.writes == []
