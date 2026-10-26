#!/usr/bin/env python3
"""Read-only, per-page AI-search HTML audit. No submissions or publishing.

Default: actual local static files + public router rendering with source data.
--base-url: fetch the deployed public site and its sitemap instead. The report
never equates technical checks, crawler access or schema with AI inclusion.
"""
import argparse
import ast
from collections import Counter
from datetime import datetime, timezone
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
sys.path.insert(0, str(ROOT / 'scripts'))
from ai_discovery import POLICY, SEARCH_AGENTS, crawler_allowed
from check_release import Page, MemoryCollection, fallback_functions
import data
import live_service_catalog as aliases
import public_seo
from gsc_route_policy import ROUTE_STATUS, apply_index_policy, location_for_path
from blog_seed import BLOG_SEED
from case_seed import CASE_SEED


def normalize(value):
    path = unquote(urlsplit(str(value)).path)
    return '/' + path.strip('/') if path.strip('/') else '/'


def clean(value):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]*>', ' ', str(value)))).strip().casefold()


class VisibleText(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.text, self.stack, self.in_body = [], [], False
        self.feed(source)
    def handle_starttag(self, tag, attrs):
        if tag == 'body': self.in_body = True
        if tag in {'script', 'style', 'noscript'}: self.stack.append(tag)
    def handle_endtag(self, tag):
        if tag == 'body': self.in_body = False
        if self.stack and self.stack[-1] == tag: self.stack.pop()
    def handle_data(self, text):
        if self.in_body and not self.stack: self.text.append(text)


def objects(value):
    if isinstance(value, dict):
        yield value
        for child in value.values(): yield from objects(child)
    elif isinstance(value, list):
        for child in value: yield from objects(child)


def inspect_html(source, path, settings, robots, response_status=200, response_headers=None):
    parsed = Page(source)
    body = VisibleText(source)
    visible = clean(' '.join(body.text))
    headers = response_headers or {}
    noindex = any('noindex' in value.casefold() for value in parsed.robots) or 'noindex' in headers.get('x-robots-tag', '').casefold()
    errors, review = [], []
    if response_status != 200: errors.append('HTTP status is not 200')
    if parsed.h1 != 1: errors.append('Expected one H1')
    if len(parsed.titles) != 1 or not parsed.titles[0]: errors.append('Expected one nonempty title')
    if len(parsed.descriptions) != 1 or not parsed.descriptions[0]: errors.append('Expected one nonempty description')
    if not noindex and len(parsed.canonicals) != 1: errors.append('Expected one canonical on an indexable page')
    if len(parsed.canonicals) > 1: errors.append('Multiple canonical links')
    if len(visible.split()) < 25: errors.append('Insufficient server HTML text')
    declared_access = {agent: crawler_allowed(robots, agent, path) for agent in SEARCH_AGENTS}
    if not all(declared_access.values()): errors.append('A named AI search crawler is disallowed')
    nodes = []
    for raw in parsed.jsonld:
        try: nodes.extend(objects(json.loads(raw)))
        except ValueError: errors.append('Invalid JSON-LD')
    kinds = {typ for node in nodes for typ in (node.get('@type') if isinstance(node.get('@type'), list) else [node.get('@type')]) if typ}
    if not noindex and not kinds: errors.append('Missing structured data')
    business, contact = settings.get('business', {}), settings.get('contact', {})
    if not business.get('reviews_verified') and kinds.intersection({'Review', 'AggregateRating'}): errors.append('Unverified review/rating schema')
    if not business.get('customer_facing_office_verified') and kinds.intersection({'LocalBusiness', 'ProfessionalService'}): errors.append('Unverified customer-facing local-office schema')
    entity_visible = clean(settings.get('seo', {}).get('site_name', 'Rajeev Freelancer')) in visible
    if not entity_visible: review.append('Business identity is not present in visible HTML text')
    phone = re.sub(r'\D', '', contact.get('phone', ''))
    phone_visible = bool(phone and phone in re.sub(r'\D', '', visible))
    email_visible = bool(contact.get('email') and contact['email'].casefold() in visible)
    if not phone_visible or not email_visible: review.append('Check visible phone/email consistency with the saved business contact')
    service_visible = True; remote_visible = True
    parts = path.strip('/').split('/')
    service_map = aliases.with_live_services(data.SERVICES)
    location = location_for_path(data.CITY_MAP, parts[1], path) if len(parts) == 2 and parts[0] in service_map else None
    if location:
        service_visible = clean(service_map[parts[0]]['name']) in visible and clean(location['city']) in visible
        remote_visible = 'remote' in visible or 'remotely' in visible
        if not service_visible: review.append('Check that the service and exact market are explained in visible text')
        if not remote_visible: review.append('Clarify remote delivery and avoid implying an additional local office')
    faqs = [node for node in nodes if node.get('@type') == 'Question' and isinstance(node.get('acceptedAnswer'), dict)]
    faq_matches = sum(clean(node.get('name', '')) in visible and clean(node['acceptedAnswer'].get('text', '')) in visible for node in faqs)
    if faqs and faq_matches != len(faqs): review.append('Some FAQ schema answers are not present in server HTML; check expandable content parity')
    if re.search(r'\bex[-– ](?:iog|accenture|google)\b', visible, re.I): review.append('Employer/experience claims need retained evidence')
    if re.search(r'(?:\b(?:traffic|sales|leads|conversion|revenue)\b[^.!?]{0,45}(?:\d+%|doubled|tripled))|(?:\b\d+%[^.!?]{0,35}\b(?:traffic|sales|leads|conversion|revenue)\b)', visible): review.append('Quantified outcomes need client permission and retained evidence')
    if any(node.get('alumniOf') for node in nodes): review.append('Education/employer structured-data claims need human evidence review')
    if noindex: disposition = 'intentional-noindex-or-review-gate'
    elif parsed.canonicals and normalize(parsed.canonicals[0]) != path: disposition = 'canonical-alias'
    else: disposition = 'indexable-canonical'
    return {'path': path, 'httpStatus': response_status, 'disposition': disposition, 'title': parsed.titles[0] if parsed.titles else '', 'canonical': parsed.canonicals[0] if parsed.canonicals else None, 'h1Count': parsed.h1, 'serverTextWords': len(visible.split()), 'declaredSearchCrawlerAccess': declared_access, 'entityVisible': entity_visible, 'phoneVisible': phone_visible, 'emailVisible': email_visible, 'serviceAndMarketVisible': service_visible, 'remoteDeliveryExplained': remote_visible, 'faqQuestionsInSchema': len(faqs), 'faqQuestionsWithAnswerInHtml': faq_matches, 'structuredDataTypes': sorted(kinds), 'technicalErrors': list(dict.fromkeys(errors)), 'editorialEvidenceReview': list(dict.fromkeys(review))}


def source_settings():
    tree = ast.parse((ROOT / 'backend/server.py').read_text())
    node = next(n for n in tree.body if isinstance(n, ast.Assign) and any(isinstance(target, ast.Name) and target.id == 'DEFAULT_SITE' for target in n.targets))
    return ast.literal_eval(node.value)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', help='Optional deployed HTTP(S) origin for a read-only public crawl')
    parser.add_argument('--max-pages', type=int, help='Optional bounded smoke check; report clearly records incomplete coverage')
    parser.add_argument('--report', type=Path, default=ROOT / 'docs/ai-discovery-audit.json')
    args = parser.parse_args()
    manifest = json.loads((ROOT / 'frontend/build/seo-manifest.json').read_text())
    settings = source_settings(); fixture_paths = set()
    services = aliases.with_live_services(data.SERVICES)
    paths = {row['path'] for row in manifest['pages'] if row['path'] not in {'/admin', '/404'}}
    paths.update('/' + service['slug'] + '/' + slug for service in services.values() for slug in data.CITY_MAP)
    for path in ROUTE_STATUS:
        parts = path.strip('/').split('/')
        if len(parts) == 2 and (parts[0] in {'blog', 'case-studies'} or parts[0] in services and location_for_path(data.CITY_MAP, parts[1], path)):
            paths.add(path)
    warnings = []
    if args.base_url:
        parsed_origin = urlsplit(args.base_url)
        if parsed_origin.scheme not in {'http', 'https'} or not parsed_origin.netloc or parsed_origin.path.strip('/'):
            parser.error('--base-url must be an HTTP(S) origin without a path')
        origin = args.base_url.rstrip('/')
        def fetch(path):
            try:
                with urlopen(Request(origin + path, headers={'User-Agent': 'RajeevWebsiteReadOnlySEOAudit/1.0'}), timeout=15) as response:
                    return response.status, dict(response.headers.items()), response.read().decode('utf-8', errors='replace')
            except HTTPError as error: return error.code, dict(error.headers.items()), error.read().decode('utf-8', errors='replace')
            except URLError as error: return 0, {}, str(error)
        status, _, robots = fetch('/robots.txt')
        if status != 200: warnings.append('Live robots.txt could not be retrieved')
        status, _, text = fetch('/api/settings')
        if status == 200:
            try: settings.update(json.loads(text))
            except ValueError: warnings.append('Live public settings were not valid JSON')
        status, _, text = fetch('/sitemap.xml')
        try:
            tree = ET.fromstring(text)
            maps = [node.text for node in tree.findall('{*}sitemap/{*}loc')]
            for url in maps:
                if urlsplit(url).netloc == parsed_origin.netloc:
                    _, _, child = fetch(urlsplit(url).path)
                    paths.update(normalize(node.text) for node in ET.fromstring(child).findall('{*}url/{*}loc'))
            paths.update(normalize(node.text) for node in tree.findall('{*}url/{*}loc'))
        except ET.ParseError: warnings.append('Live sitemap could not be parsed; source route inventory is still checked')
        mode = 'deployed-public-read-only'
    else:
        from fastapi import FastAPI
        from fastapi.testclient import TestClient
        blogs = {row['slug']: {**row, 'published': True} for row in BLOG_SEED}
        cases = {row['slug']: {**row, 'published': True} for row in CASE_SEED}
        for path in paths:
            bits = path.strip('/').split('/')
            if len(bits) == 2 and bits[0] in {'blog', 'case-studies'}:
                target = blogs if bits[0] == 'blog' else cases
                if bits[1] not in target:
                    fixture_paths.add(path)
                    target[bits[1]] = {'slug': bits[1], 'title': 'Local reachability fixture: ' + bits[1], 'excerpt': 'An in-memory route fixture. Production editorial text is not verified by this record.', 'body': ['This local fixture is not publication content.'], 'published': True, 'category': 'QA fixture'}
        db = type('MemoryDB', (), {})()
        db.blog_posts = MemoryCollection(blogs.values()); db.case_studies = MemoryCollection(cases.values()); db.location_pages = MemoryCollection()
        async def get_settings(): return settings
        app = FastAPI(); app.include_router(public_seo.build_public_router(db=db, get_settings=get_settings, services=list(services.values()), city_map=data.CITY_MAP, fallback_content=fallback_functions(aliases), build_dir=ROOT / 'frontend/build'))
        client = TestClient(app)
        def fetch(path):
            response = client.get(path, follow_redirects=False)
            return response.status_code, dict(response.headers), response.text
        _, _, robots = fetch('/robots.txt')
        mode = 'local-source-and-in-memory-public-router'
        warnings.append('Local editorial fixtures validate rendering only; production database text and approvals remain authoritative')
    selected = sorted(paths)
    if args.max_pages:
        selected = selected[:args.max_pages]
        warnings.append('Coverage was explicitly bounded with --max-pages; this is not an every-page result')
    rows = []
    for path in selected:
        status, headers, text = fetch(path)
        row = inspect_html(text, path, settings, robots, status, {key.lower(): value for key, value in headers.items()})
        row['contentScope'] = 'reachability-fixture-only' if path in fixture_paths else ('live-public-response' if args.base_url else 'actual-static-html-or-source-public-renderer')
        rows.append(row)
    by_path = {row['path']: row for row in rows}
    for row in rows:
        if row['disposition'] == 'intentional-noindex-or-review-gate' or not row['canonical']:
            continue
        target = by_path.get(normalize(row['canonical']))
        if target and (target['httpStatus'] != 200 or target['disposition'] == 'intentional-noindex-or-review-gate'):
            row['technicalErrors'].append('Canonical target is unavailable or noindex within the checked inventory')
    robot_checks = []
    for agent in [*POLICY['searchAgents'], *POLICY['userDirectedAgents']]:
        for path in ['/admin', '/api/admin/seo-workflow', '/api/auth/me', '/api/leads', '/private/report', '/internal/task']:
            if crawler_allowed(robots, agent, path): robot_checks.append({'agent': agent, 'path': path, 'problem': 'Private path allowed in declared robots preference'})
    for agent in POLICY['trainingAgentsBlocked']:
        if crawler_allowed(robots, agent, '/'): robot_checks.append({'agent': agent, 'path': '/', 'problem': 'Named training crawler is not blocked'})
    counts = Counter(row['disposition'] for row in rows)
    report = {'generatedAt': datetime.now(timezone.utc).isoformat(), 'mode': mode, 'coverage': {'inventoryPaths': len(paths), 'checkedPaths': len(rows), 'completeForAvailableInventory': len(rows) == len(paths), 'localEditorialFixtures': len(fixture_paths)}, 'technicalResult': 'pass' if not robot_checks and not any(row['technicalErrors'] for row in rows) else 'needs-fixes', 'technicalErrorPages': sum(bool(row['technicalErrors']) for row in rows), 'editorialEvidenceReviewPages': sum(bool(row['editorialEvidenceReview']) for row in rows), 'dispositions': dict(counts), 'robotsPolicyErrors': robot_checks, 'warnings': warnings, 'limitations': ['This is an HTML/declaration audit, not proof of factual accuracy, provider ingestion, citations, recommendations or rankings.', 'Visible text means text present in HTML outside script/style/noscript; this audit does not measure computed browser visibility or Core Web Vitals.', 'Local source inventory cannot enumerate production-only Mongo documents; use --base-url after deployment to merge the live sitemap.', 'Indexed GSC examples are capped; historical impressions do not prove current indexing.', 'Named user-directed fetchers may not obey robots.txt; private data still requires authorization.'], 'pages': rows}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({key: value for key, value in report.items() if key in {'mode', 'coverage', 'technicalResult', 'technicalErrorPages', 'editorialEvidenceReviewPages', 'dispositions'}}))
    return bool(robot_checks or any(row['technicalErrors'] for row in rows))

if __name__ == '__main__': sys.exit(main())
