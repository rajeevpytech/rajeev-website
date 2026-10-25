"""Existing landing-page content is authoritative, even without AI/review flags.

Run the real server functions without importing server startup, MongoDB, an LLM,
or IndexNow. The storage fake checks exact embedded-content equality so these
tests exercise compare-and-set races rather than accepting a stale overwrite.
"""

import ast
import asyncio
import copy
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
from typing import Optional

from fastapi import HTTPException
import pytest


BACKEND = Path(__file__).resolve().parents[1]
SERVICE = {"slug": "freelance-website-developer", "name": "Freelance Website Developer",
           "short": "Website Development", "keyword": "website developer"}
LOCATION = {"loc_slug": "manchester", "city": "Manchester", "country": "United Kingdom"}
KEY = "freelance-website-developer::manchester"
PATH = "/freelance-website-developer/manchester"
CONTENT = {"title": "Saved Manchester page title", "meta_description": "The existing owner-approved Search description.",
           "h1": "Website projects in Manchester", "intro": ["Existing original page body."],
           "faqs": [{"q": "How is scope agreed?", "a": "Use the existing written requirements."}]}


def matches(row, query):
    for key, value in query.items():
        if key == "$or":
            if not any(matches(row, branch) for branch in value):
                return False
        elif isinstance(value, dict) and any(str(operator).startswith("$") for operator in value):
            if "$ne" in value and row.get(key) == value["$ne"]:
                return False
        elif row.get(key) != value:
            return False
    return True


class Collection:
    def __init__(self, rows=()):
        self.rows = copy.deepcopy(list(rows))
        self.updates = []
        self.before_update = None

    async def find_one(self, query, projection=None):
        row = next((row for row in self.rows if matches(row, query)), None)
        if row is None:
            return None
        result = copy.deepcopy(row)
        if projection:
            included = [key for key, include in projection.items() if include]
            if included:
                result = {key: value for key, value in result.items() if key in included or key == "_id"}
            else:
                for key, include in projection.items():
                    if not include:
                        result.pop(key, None)
        return result

    async def update_one(self, query, update, upsert=False):
        self.updates.append((copy.deepcopy(query), copy.deepcopy(update), upsert))
        if self.before_update:
            callback, self.before_update = self.before_update, None
            callback()
        row = next((row for row in self.rows if matches(row, query)), None)
        if row is not None:
            before = copy.deepcopy(row)
            row.update(copy.deepcopy(update.get("$set", {})))
            return SimpleNamespace(matched_count=1, modified_count=int(before != row), upserted_id=None)
        if not upsert:
            return SimpleNamespace(matched_count=0, modified_count=0, upserted_id=None)
        row = {key: copy.deepcopy(value) for key, value in query.items() if not key.startswith("$")}
        row.update(copy.deepcopy(update.get("$setOnInsert", {})))
        row.update(copy.deepcopy(update.get("$set", {})))
        row.setdefault("_id", "newly-created-test-document")
        self.rows.append(row)
        return SimpleNamespace(matched_count=0, modified_count=1, upserted_id=row["_id"])


def extract(source, names, scope):
    tree = ast.parse(source.read_text())
    functions = [node for node in tree.body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name in names]
    assert {node.name for node in functions} == set(names)
    for function in functions:
        function.decorator_list = []
    exec(compile(ast.Module(body=functions, type_ignores=[]), str(source), "exec"), scope)


def saved_page(**fields):
    return {"_id": "existing-document", "key": KEY, "canonical": PATH,
            "service": copy.deepcopy(SERVICE), "location": copy.deepcopy(LOCATION),
            "content": copy.deepcopy(CONTENT), "ai_generated": False,
            "seo_reviewed": False, "generated_at": "2024-01-10T12:00:00Z", **fields}


@pytest.fixture
def env(monkeypatch):
    collection = Collection()
    calls = Counter()
    pending = []
    background_arguments = []
    warnings = []
    generated = {**copy.deepcopy(CONTENT), "title": "Generated replacement title",
                 "meta_description": "Generated replacement description", "intro": ["New AI draft body."]}

    async def generate(*args):
        calls["generation"] += 1
        return copy.deepcopy(generated), True

    async def background(*args, **kwargs):
        calls["background"] += 1
        background_arguments.append((copy.deepcopy(args), copy.deepcopy(kwargs)))

    async def ping(paths):
        calls["indexnow"] += 1

    def schedule(coroutine):
        calls["scheduled"] += 1
        task = asyncio.create_task(coroutine)
        pending.append(task)
        return task

    def fallback(*args):
        calls["fallback"] += 1
        return copy.deepcopy(CONTENT)

    public = ModuleType("public_seo")
    extract(BACKEND / "public_seo.py", {"preserve_metadata"}, public.__dict__)
    public.location_document_valid = lambda doc, path: bool(doc and doc.get("content"))
    monkeypatch.setitem(sys.modules, "public_seo", public)
    expansion = ModuleType("world_expansion")

    def sanitize(doc):
        calls["sanitize_expansion"] += 1
        return {**doc, "expansion_sanitized": True}

    expansion.public_expansion_document = sanitize
    monkeypatch.setitem(sys.modules, "world_expansion", expansion)
    scope = {"db": SimpleNamespace(location_pages=collection), "Optional": Optional,
             "asyncio": SimpleNamespace(create_task=schedule, Semaphore=asyncio.Semaphore),
             "datetime": datetime, "timezone": timezone, "_inflight_pages": set(),
             "logger": SimpleNamespace(warning=warnings.append), "HTTPException": HTTPException,
             "generate_content": generate, "ping_indexnow": ping,
             "SERVICE_MAP": {SERVICE["slug"]: SERVICE}, "CITY_MAP": {LOCATION["loc_slug"]: LOCATION},
             "location_for_path": lambda city_map, slug, path: city_map.get(slug),
             "apply_index_policy": lambda doc, path: doc, "_page_content": fallback,
             "_fallback_content": fallback, "_warmup": Counter(), "_warmup_new_paths": []}
    extract(BACKEND / "server.py", {"_page_doc", "get_location_page", "_generate_and_cache", "_warm_one"}, scope)
    actual_background = scope["_generate_and_cache"]
    scope["_generate_and_cache"] = background

    async def settle():
        if pending:
            await asyncio.gather(*pending)

    return SimpleNamespace(scope=scope, db=collection, calls=calls, pending=pending, settle=settle,
                           background_arguments=background_arguments, background=actual_background,
                           generated=generated, warnings=warnings)


@pytest.mark.parametrize("flags", [
    {"ai_generated": False, "seo_reviewed": False},
    {"ai_generated": False, "is_new_location": True, "seo_reviewed": None},
    {"ai_generated": True, "seo_reviewed": True},
])
def test_cached_manchester_original_is_read_only_regardless_of_ai_or_review_flags(env, flags):
    original = saved_page(**flags)
    env.db.rows.append(copy.deepcopy(original))

    async def scenario():
        result = await env.scope["get_location_page"](SERVICE["slug"], LOCATION["loc_slug"])
        await env.settle()
        expected = {key: value for key, value in original.items() if key != "_id"}
        assert result == expected

    asyncio.run(scenario())
    assert env.db.rows == [original]
    assert env.db.updates == []
    assert env.calls == Counter()
    assert env.warnings == []


def test_only_expansion_documents_are_sanitized_on_cached_read_without_writing_them(env):
    original = saved_page(new_world_expansion=True)
    env.db.rows.append(copy.deepcopy(original))

    async def scenario():
        result = await env.scope["get_location_page"](SERVICE["slug"], LOCATION["loc_slug"])
        await env.settle()
        assert result["expansion_sanitized"] is True
        assert result["content"] == CONTENT

    asyncio.run(scenario())
    assert env.calls == Counter(sanitize_expansion=1)
    assert env.db.rows == [original]
    assert env.db.updates == []


@pytest.mark.parametrize("content", [CONTENT, {"intro": ["A partial but saved owner body."]}, {}])
def test_warmup_skips_every_saved_legacy_document_without_generation_or_writes(env, content):
    original = saved_page(content=copy.deepcopy(content), ai_generated=False, seo_reviewed=False)
    env.db.rows.append(copy.deepcopy(original))
    asyncio.run(env.scope["_warm_one"](SERVICE, LOCATION, asyncio.Semaphore(1)))
    assert env.db.rows == [original]
    assert env.db.updates == []
    assert env.calls == Counter()
    assert env.scope["_warmup"] == Counter(skipped=1, done=1)
    assert env.scope["_warmup_new_paths"] == []
    assert env.warnings == []


@pytest.mark.parametrize("canonical", [PATH, PATH + "/"])
def test_warmup_preserves_canonical_only_legacy_records_without_a_cache_key(env, canonical):
    original = saved_page(canonical=canonical, ai_generated=False, seo_reviewed=False)
    original.pop("key")
    env.db.rows.append(copy.deepcopy(original))
    asyncio.run(env.scope["_warm_one"](SERVICE, LOCATION, asyncio.Semaphore(1)))
    assert env.db.rows == [original]
    assert env.db.updates == []
    assert env.calls == Counter()
    assert env.scope["_warmup"] == Counter(skipped=1, done=1)
    assert env.scope["_warmup_new_paths"] == []
    assert env.warnings == []


def test_background_generation_without_first_insert_expected_content_is_a_noop(env):
    original = saved_page()
    env.db.rows.append(copy.deepcopy(original))
    asyncio.run(env.background(SERVICE, LOCATION, KEY))
    assert env.calls == Counter()
    assert env.db.updates == []
    assert env.db.rows == [original]
    assert env.scope["_inflight_pages"] == set()


@pytest.mark.parametrize("changed", [
    {"content": {**CONTENT, "intro": ["An intervening owner edit."]}},
    {"ai_generated": True},
    {"seo_reviewed": True},
])
def test_background_precheck_never_generates_for_an_already_changed_or_reviewed_page(env, changed):
    original = saved_page(**copy.deepcopy(changed))
    env.db.rows.append(copy.deepcopy(original))
    asyncio.run(env.background(SERVICE, LOCATION, KEY, expected_content=copy.deepcopy(CONTENT)))
    assert env.calls == Counter()
    assert env.db.updates == []
    assert env.db.rows == [original]
    assert env.scope["_inflight_pages"] == set()


@pytest.mark.parametrize("owner_change", [
    {"content": {**CONTENT, "title": "Owner saved title during generation", "intro": ["Owner's latest body."]}},
    {"seo_reviewed": True},
    {"ai_generated": True},
])
def test_background_compare_and_set_preserves_changes_made_during_generation(env, owner_change):
    env.db.rows.append(saved_page())
    winner = {}

    async def generate(*args):
        env.calls["generation"] += 1
        env.db.rows[0].update(copy.deepcopy(owner_change))
        winner.update(copy.deepcopy(env.db.rows[0]))
        return copy.deepcopy(env.generated), True

    env.scope["generate_content"] = generate
    asyncio.run(env.background(SERVICE, LOCATION, KEY, expected_content=copy.deepcopy(CONTENT)))
    assert env.calls == Counter(generation=1)
    assert env.db.rows == [winner]
    assert len(env.db.updates) == 1  # The atomic predicate loses to the owner's save.
    assert env.scope["_inflight_pages"] == set()
    assert env.warnings == []


def test_background_can_finish_its_own_unchanged_first_insert_while_preserving_metadata(env):
    env.db.rows.append(saved_page())
    asyncio.run(env.background(SERVICE, LOCATION, KEY, expected_content=copy.deepcopy(CONTENT)))
    result = env.db.rows[0]
    assert result["content"]["intro"] == env.generated["intro"]
    assert result["content"]["title"] == CONTENT["title"]
    assert result["content"]["meta_description"] == CONTENT["meta_description"]
    assert result["ai_generated"] is True
    assert result["seo_reviewed"] is False
    assert env.calls == Counter(generation=1)
    assert env.warnings == []


def test_first_insert_get_schedules_one_generation_with_its_exact_fallback(env):
    async def scenario():
        result = await env.scope["get_location_page"](SERVICE["slug"], LOCATION["loc_slug"])
        await env.settle()
        assert result["content"] == CONTENT

    asyncio.run(scenario())
    assert env.calls == Counter(fallback=1, scheduled=2, background=1, indexnow=1)
    assert env.background_arguments[0][1]["expected_content"] == CONTENT
    assert len(env.db.rows) == 1
    assert env.db.rows[0]["content"] == CONTENT
    assert set(env.db.updates[0][1]) == {"$setOnInsert"}


@pytest.mark.parametrize("legacy_canonical", [None, PATH, PATH + "/"])
def test_concurrent_get_creator_wins_without_generation_indexnow_or_body_overwrite(env, legacy_canonical):
    winner = saved_page(seo_reviewed=True, content={**CONTENT, "intro": ["Saved by the concurrent owner."]})
    if legacy_canonical is not None:
        winner.pop("key")
        winner["canonical"] = legacy_canonical
    env.db.before_update = lambda: env.db.rows.append(copy.deepcopy(winner))

    async def scenario():
        result = await env.scope["get_location_page"](SERVICE["slug"], LOCATION["loc_slug"])
        await env.settle()
        assert result == {key: value for key, value in winner.items() if key != "_id"}

    asyncio.run(scenario())
    assert env.db.rows == [winner]
    assert env.calls == Counter(fallback=1)
    assert set(env.db.updates[0][1]) == {"$setOnInsert"}


@pytest.mark.parametrize("legacy_canonical", [None, PATH, PATH + "/"])
def test_warmup_concurrent_creator_is_preserved_and_not_counted_as_generated(env, legacy_canonical):
    winner = saved_page(seo_reviewed=True, content={**CONTENT, "intro": ["Concurrent final copy."]})
    if legacy_canonical is not None:
        winner.pop("key")
        winner["canonical"] = legacy_canonical

    async def generate(*args):
        env.calls["generation"] += 1
        env.db.rows.append(copy.deepcopy(winner))
        return copy.deepcopy(env.generated), True

    env.scope["generate_content"] = generate
    asyncio.run(env.scope["_warm_one"](SERVICE, LOCATION, asyncio.Semaphore(1)))
    assert env.db.rows == [winner]
    assert env.scope["_warmup"] == Counter(skipped=1, done=1)
    assert env.scope["_warmup_new_paths"] == []
    assert env.calls == Counter(generation=1, fallback=1)
    assert len(env.db.updates) == 1
    assert set(env.db.updates[0][1]) == {"$setOnInsert"}
    assert env.warnings == []
