#!/usr/bin/env python3
"""Read-only HTTP QA of every new geography/service combination, without Mongo.

Requests go through the actual FastAPI public router and final frontend asset
shell using an ASGI transport. No production content, accounts or notifications
are read or written. This checks technical output, not search-provider inclusion.
"""
import argparse
import asyncio
import json
from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
sys.path.insert(0, str(ROOT / 'scripts'))

import httpx
from fastapi import FastAPI
from check_release import Page, MemoryCollection, fallback_functions
from data import CITY_MAP, SERVICES
import live_service_catalog as aliases
from public_seo import build_public_router
from world_expansion import catalog, SERVICE_MAP


async def check(args):
    start = time.perf_counter()
    source = catalog()
    services = aliases.with_live_services(SERVICES)
    db = type('ReadOnlyDB', (), {})()
    db.location_pages = MemoryCollection()
    db.blog_posts = MemoryCollection()
    db.case_studies = MemoryCollection()
    settings = {'seo': {'site_name': 'Rajeev Freelancer', 'robots_index': True}, 'business': {}, 'contact': {'phone': '+919711623561', 'email': 'hello@rajeevfreelancer.com'}}
    async def get_settings(): return settings
    app = FastAPI()
    app.include_router(build_public_router(db=db, get_settings=get_settings, services=list(services.values()), city_map=CITY_MAP, fallback_content=fallback_functions(aliases), build_dir=ROOT / 'frontend/build'))
    paths = [(f'/{service}/{slug}', location) for slug, location in source['additional'].items() for service in SERVICE_MAP]
    counts = {'totalRealPlaces': len(source['by_slug']), 'baseLocationsUnchanged': len(CITY_MAP), 'newRealPlaces': len(source['additional']),
              'canonicalServices': len(SERVICE_MAP), 'candidateUrlsEnumerated': len(source['by_slug']) * len(SERVICE_MAP),
              'newHttpPathsExpected': len(paths), 'newHttpPathsTested': 0, 'noindexResponses': 0, 'countriesTested': set(),
              'databaseWrites': 0, 'llmCalls': 0, 'productionDatabaseConnections': 0}
    errors, error_count = [], 0
    iterator = iter(paths)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='https://rajeevfreelancer.com') as client:
        async def worker():
            nonlocal error_count
            for path, location in iterator:
                if args.max_paths and counts['newHttpPathsTested'] >= args.max_paths:
                    return
                try:
                    response = await client.get(path, follow_redirects=False)
                    parsed = Page(response.text)
                    problems = []
                    if response.status_code != 200: problems.append('HTTP ' + str(response.status_code))
                    if not response.headers.get('content-type', '').startswith('text/html'): problems.append('not HTML')
                    if parsed.h1 != 1 or len(parsed.titles) != 1 or not parsed.titles[0] or len(parsed.descriptions) != 1 or not parsed.descriptions[0]: problems.append('H1/title/description')
                    if len(parsed.robots) != 1 or 'noindex' not in parsed.robots[0] or response.headers.get('x-robots-tag') != 'noindex, follow': problems.append('review gate missing')
                    else: counts['noindexResponses'] += 1
                    if parsed.canonicals: problems.append('unreviewed canonical emitted')
                    if location['source_url'] not in response.text or 'delivered remotely from India' not in response.text or 'Project process' not in response.text or 'Frequently asked questions' not in response.text: problems.append('incomplete source/remote/service HTML')
                    if aliases.canonical_service_path(path) != path: problems.append('canonical preference drift')
                    if 'new_world_expansion' not in response.text: problems.append('bootstrap marker missing')
                    if problems:
                        error_count += 1
                        if len(errors) < 100: errors.append({'path': path, 'errors': problems})
                except Exception as exc:
                    error_count += 1
                    if len(errors) < 100: errors.append({'path': path, 'errors': [type(exc).__name__ + ': ' + str(exc)]})
                counts['newHttpPathsTested'] += 1
                counts['countriesTested'].add(location['country_slug'])
                if counts['newHttpPathsTested'] % 4000 == 0:
                    print(f"Checked {counts['newHttpPathsTested']}/{len(paths)} new HTTP pages; errors={error_count}", flush=True)
                await asyncio.sleep(0)
        await asyncio.gather(*(worker() for _ in range(args.concurrency)))
        sitemap = await client.get('/sitemap.xml')
        if any(path in sitemap.text for path, _ in paths):
            error_count += 1; errors.append({'path': '/sitemap.xml', 'errors': ['Unreviewed expansion URL included']})
    counts['countriesTested'] = len(counts['countriesTested'])
    complete = counts['newHttpPathsTested'] == len(paths)
    report = {'ok': error_count == 0, 'completeNewHttpCoverage': complete,
              'scope': 'Every NEW location × 8 preferred services through the actual local FastAPI router; original/base HTTP routes are checked separately by check_release.py. In-memory empty database; actual frontend build asset shell; no live publication or provider verification.',
              'counts': counts, 'errorCount': error_count, 'errors': errors, 'seconds': round(time.perf_counter() - start, 2)}
    target = Path(args.report)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({key: report[key] for key in ('ok', 'completeNewHttpCoverage', 'counts', 'errorCount', 'seconds')}, indent=2))
    return 0 if report['ok'] and (complete or args.max_paths) else 1


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--concurrency', type=int, default=8, choices=range(1, 17))
    parser.add_argument('--max-paths', type=int, default=0, help='Optional smoke limit, explicitly recorded as incomplete')
    parser.add_argument('--report', default=str(ROOT / 'docs/world-expansion-route-checks.json'))
    sys.exit(asyncio.run(check(parser.parse_args())))
