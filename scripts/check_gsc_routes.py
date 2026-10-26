#!/usr/bin/env python3
"""Probe every exact URL in authenticated GSC indexed/performance exports locally.

Uses actual HTML/router code and source catalog; published editorial records not
in the source are explicitly labelled in-memory reachability fixtures. No live
account, production database, outbound notification or publication is touched.
"""
import json
from pathlib import Path
import sys
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
sys.path.insert(0, str(ROOT / 'scripts'))
from check_release import Page, MemoryCollection, fallback_functions, import_backend
from fastapi import FastAPI
from fastapi.testclient import TestClient
import data
import live_service_catalog as aliases
import gsc_route_policy as policy
import public_seo
from blog_seed import BLOG_SEED
from case_seed import CASE_SEED

active = json.loads((ROOT / 'docs/gsc-active-url-inventory.json').read_text())
manifest = json.loads((ROOT / 'frontend/build/seo-manifest.json').read_text())
services = aliases.with_live_services(data.SERVICES)
blogs = {p['slug']: {**p, 'published': True} for p in BLOG_SEED}
cases = {p['slug']: {**p, 'published': True} for p in CASE_SEED}
fixture_count = 0
for row in active['routes']:
    bits = row['path'].strip('/').split('/')
    if len(bits) == 2 and bits[0] in {'blog', 'case-studies'}:
        target = blogs if bits[0] == 'blog' else cases
        if bits[1] not in target:
            fixture_count += 1
            target[bits[1]] = {'slug': bits[1], 'title': 'Local reachability fixture: ' + bits[1], 'excerpt': 'An in-memory fixture for local route compatibility only.', 'body': ['Not publication content or evidence of production copy.'], 'published': True, 'category': 'QA fixture'}
db = type('MemoryDB', (), {})()
db.blog_posts = MemoryCollection(blogs.values())
db.case_studies = MemoryCollection(cases.values())
db.location_pages = MemoryCollection()
settings = {'seo': {'site_name': 'Rajeev Freelancer', 'canonical_domain': manifest['origin'], 'robots_index': True}, 'contact': {'phone': '+919711623561', 'email': 'hello@rajeevfreelancer.com'}, 'business': {'founder_name': 'Rajeev Gits'}}
async def get_settings(): return settings
app = FastAPI()
app.include_router(public_seo.build_public_router(db=db, get_settings=get_settings, services=list(services.values()), city_map=data.CITY_MAP, fallback_content=fallback_functions(aliases), build_dir=ROOT / 'frontend/build'))
client = TestClient(app)
errors, redirects = [], []
counts = {'activePaths': len(active['routes']), 'indexedExportExamples': 0, 'historicalActivityOnlyPaths': 0, 'noindexReviewGates': 0, 'legacyLocalityRoutesRestored': 0, 'inMemoryEditorialFixtures': fixture_count}
targets = set()
for row in active['routes']:
    path = row['path']; status = policy.status_for_path(path)
    is_indexed = status.get('index_continuity', False)
    counts['indexedExportExamples' if row.get('indexed_example') else 'historicalActivityOnlyPaths'] += 1
    response = client.get(path, follow_redirects=False)
    if response.status_code in {301, 308}:
        target = response.headers.get('location')
        redirected = client.get(target, follow_redirects=False)
        if redirected.status_code != 200: errors.append({'path': path, 'error': 'redirect-target', 'status': redirected.status_code, 'target': target})
        redirects.append({'path': path, 'target': target, 'status': response.status_code})
        continue
    if response.status_code != 200:
        errors.append({'path': path, 'error': 'route-status', 'status': response.status_code}); continue
    parsed = Page(response.text)
    if len(parsed.titles) != 1 or not parsed.titles[0] or len(parsed.descriptions) != 1 or not parsed.descriptions[0] or parsed.h1 != 1:
        errors.append({'path': path, 'error': 'metadata-or-h1', 'titles': parsed.titles, 'descriptionCount': len(parsed.descriptions), 'h1': parsed.h1})
    noindex = any('noindex' in v for v in parsed.robots)
    bits = path.strip('/').split('/')
    location = policy.location_for_path(data.CITY_MAP, bits[1], path) if len(bits) == 2 and bits[0] in services else None
    expected_doc = policy.apply_index_policy({'is_new_location': bool(location and location.get('is_new_location')), 'seo_reviewed': False}, path)
    expected_noindex = expected_doc.get('seo_noindex', False)
    if is_indexed and noindex:
        errors.append({'path': path, 'error': 'indexed-example-deindexed'})
    if expected_noindex and not noindex:
        errors.append({'path': path, 'error': 'review-gate-removed'})
    if noindex:
        counts['noindexReviewGates'] += 1
        if parsed.canonicals: errors.append({'path': path, 'error': 'unreviewed-canonical', 'canonical': parsed.canonicals})
    else:
        expected = manifest['origin'] + aliases.canonical_service_path(path)
        if parsed.canonicals != [expected]: errors.append({'path': path, 'error': 'canonical', 'actual': parsed.canonicals, 'expected': expected})
        targets.add(expected)
    if location and location.get('is_legacy_location_alias'): counts['legacyLocalityRoutesRestored'] += 1

for target in targets:
    path = urlsplit(target).path
    response = client.get(path, follow_redirects=False)
    parsed = Page(response.text)
    if response.status_code != 200 or any('noindex' in v for v in parsed.robots):
        errors.append({'path': path, 'error': 'canonical-target-unavailable-or-noindex', 'status': response.status_code})
xml = ET.fromstring(client.get('/sitemap.xml').text)
sitemap = {node.text for node in xml.findall('{*}url/{*}loc')}
for row in active['routes']:
    path = row['path']; state = policy.status_for_path(path)
    expected = manifest['origin'] + aliases.canonical_service_path(path)
    if state.get('index_continuity') and expected not in sitemap:
        errors.append({'path': path, 'error': 'indexed-canonical-missing-from-sitemap', 'expected': expected})
# The rebuilt Work CMS index is explicitly reviewed in public_seo.inventory;
# the historical GSC snapshot still records its old noindex state. Verify the
# replacement's delivered HTML before permitting that one sitemap exception.
reviewed_replacements = {'/work'}
for path in reviewed_replacements:
    response = client.get(path, follow_redirects=False)
    parsed = Page(response.text)
    if response.status_code != 200 or any('noindex' in v for v in parsed.robots) or parsed.canonicals != [manifest['origin'] + path] or parsed.h1 != 1:
        errors.append({'path': path, 'error': 'reviewed-replacement-invalid'})
counts['reviewedReplacementIndexesChecked'] = len(reviewed_replacements)
for path, state in policy.ROUTE_STATUS.items():
    if state.get('noindex') and path not in reviewed_replacements and manifest['origin'] + path in sitemap:
        errors.append({'path': path, 'error': 'known-noindex-in-sitemap'})

report = {'result': 'pass' if not errors else 'fail', 'counts': counts, 'canonicalTargetsProbed': len(targets), 'rootSitemapUrls': len(sitemap), 'redirects': redirects, 'errors': errors, 'limitations': ['Indexed examples come from the capped 1,000-row GSC export; they do not enumerate all 2,333 reported indexed pages.', 'URL Inspection observations override older export/performance evidence for the specific inspected URL.', 'Historical Web/AI activity alone is not proof of current indexing and does not remove noindex review gates.', 'Editorial fixtures verify route delivery only; production titles, descriptions and body copy remain authoritative in the live Mongo database.', 'This check performs no production writes and does not guarantee indexing, rankings, AI citations or Business Profile verification.']}
output = ROOT / 'docs/gsc-route-checks.json'
output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'result': report['result'], **counts, 'canonicalTargetsProbed': len(targets), 'errors': len(errors)}))
if errors:
    print(json.dumps(errors[:15], ensure_ascii=False, indent=2))
sys.exit(bool(errors))
