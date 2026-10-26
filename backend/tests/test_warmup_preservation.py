"""Exercise the real warmup function without opening Mongo or sending requests."""
import ast
import asyncio
import copy
from collections import Counter
from pathlib import Path
from types import SimpleNamespace


def test_warmup_does_not_replace_reviewed_new_market_copy_or_revoke_review():
    source = Path(__file__).resolve().parents[1] / 'server.py'
    tree = ast.parse(source.read_text())
    function = next(n for n in tree.body if isinstance(n, ast.AsyncFunctionDef) and n.name == '_warm_one')
    reviewed = {'key': 'freelancer-seo-expert::new-market', 'is_new_location': True,
                'seo_reviewed': True, 'ai_generated': False,
                'content': {'title': 'Approved title', 'meta_description': 'Approved description', 'intro': ['Administrator-approved original copy.']}}
    original = copy.deepcopy(reviewed)
    calls = {'updates': 0, 'generation': 0}
    class Collection:
        async def find_one(self, query, projection=None): return copy.deepcopy(reviewed)
        async def update_one(self, *args, **kwargs): calls['updates'] += 1
    async def generate(*args, **kwargs):
        calls['generation'] += 1
        raise AssertionError('Reviewed content must not enter a generation pipeline')
    state = Counter()
    scope = {'db': SimpleNamespace(location_pages=Collection()), '_warmup': state,
             '_warmup_new_paths': [], 'generate_content': generate, 'asyncio': asyncio,
             'logger': SimpleNamespace(warning=lambda *args: None)}
    exec(compile(ast.Module(body=[function], type_ignores=[]), str(source), 'exec'), scope)
    asyncio.run(scope['_warm_one']({'slug': 'freelancer-seo-expert'}, {'loc_slug': 'new-market', 'is_new_location': True}, asyncio.Semaphore(1)))
    assert calls == {'updates': 0, 'generation': 0}
    assert reviewed == original
    assert state['skipped'] == 1
    assert state['done'] == 1
