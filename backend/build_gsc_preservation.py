"""Build read-only route policy from the task's authenticated GSC exports.

No network calls, account mutations or production writes. Historical performance
never overrides an explicit noindex observation or proves current indexing.
"""
import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs'
BACKEND = ROOT / 'backend'

def norm(value):
    value = unquote(urlsplit(value).path) if '://' in str(value) else unquote(str(value))
    return '/' + value.strip('/').lower() if value.strip('/') else '/'

def load(name):
    return json.loads((DOCS / name).read_text())

active = load('gsc-active-url-inventory.json')
inspections = load('gsc-url-inspections.json').get('urls', {})
proposal = load('gsc-canonical-preferences.json')
routes = {}
metrics = {}
for row in active['routes']:
    path = norm(row['path'])
    metrics[path] = row
    routes[path] = {'indexed_example': bool(row.get('indexed_example')), 'historical_activity': bool(row.get('web_impressions') or row.get('ai_impressions') or row.get('web_clicks')), 'sources': []}

for file in sorted((DOCS / 'gsc-exports').glob('*/Table.csv')):
    for row in csv.DictReader(file.open(encoding='utf-8-sig')):
        raw = row.get('URL', '')
        parsed = urlsplit(raw)
        path = norm(raw)
        state = routes.setdefault(path, {'indexed_example': False, 'historical_activity': False, 'sources': []})
        category = file.parent.name
        # A noindex report for an HTTP/WWW alias cannot deindex the canonical
        # HTTPS/non-WWW page after host consolidation.
        if parsed.scheme == 'https' and parsed.netloc == 'rajeevfreelancer.com':
            state['sources'].append(category)
            if category == 'indexed': state['indexed_example'] = True
            if category == 'noindex': state['noindex'] = True

for path, row in routes.items():
    inspection = inspections.get(path)
    if inspection:
        row['inspection'] = {'is_on_google': inspection.get('is_on_google'), 'indexing_allowed': inspection.get('indexing_allowed'), 'observed_at': '2026-10-25'}
        if inspection.get('indexing_allowed') is False:
            row['noindex'] = True
        elif inspection.get('is_on_google') is True:
            row['noindex'] = False
        row['sources'].append('url-inspection')
    row['sources'] = sorted(set(row['sources']))
    row['noindex'] = bool(row.get('noindex'))
    row['index_continuity'] = not row['noindex'] and ((inspection or {}).get('is_on_google') is True or (row['indexed_example'] and (inspection or {}).get('is_on_google') is not False))

preferences, decisions = {}, []
for pair in proposal['pairs']:
    paths = [norm(p) for p in pair['equivalent_paths']]
    eligible = [p for p in paths if routes.get(p, {}).get('index_continuity')]
    if not eligible:
        continue
    def score(path):
        status, counts = routes.get(path, {}), metrics.get(path, {})
        return ((status.get('inspection') or {}).get('is_on_google') is True,
                counts.get('web_clicks', 0), counts.get('web_impressions', 0),
                counts.get('ai_impressions', 0), path.startswith('/freelance-'))
    preferred = max(eligible, key=score)
    # Every chosen target is an observed indexed route; an unreviewed historic
    # landing page can never receive canonical signals from a current page.
    for path in paths: preferences[path] = preferred
    decisions.append({'preferred': preferred, 'equivalents': paths, 'basis': 'current URL inspection' if (routes[preferred].get('inspection') or {}).get('is_on_google') is True else 'indexed export example; performance used only between indexed variants'})
preferences['/index.php'] = '/'

stamp = datetime.now(timezone.utc).isoformat()
canonical = {'version': 1, 'generatedAt': stamp, 'policy': 'Exact indexed export examples or current URL Inspection override service-spelling defaults. Current URL Inspection takes precedence. Historical traffic alone never chooses an unreviewed canonical target. Unobserved hubs and base-existing catalog pairs use the current live service prefix; new, legacy-locality and unknown location paths retain their source unless exact indexed evidence applies.', 'preferences': dict(sorted(preferences.items())), 'counts': {'indexedExamples': sum(r['indexed_example'] for r in routes.values()), 'canonicalPairs': len(decisions), 'pathOverrides': len(preferences)}, 'sourceFiles': ['docs/gsc-active-url-inventory.json', 'docs/gsc-url-inspections.json', 'docs/gsc-exports/indexed/Table.csv', 'docs/gsc-exports/noindex/Table.csv']}
noindex_targets = {path for path, row in routes.items() if row.get('noindex')}
# A complete legacy source document can exist in production while its renamed
# counterpart is absent. Its locality fallback is deliberately review-gated, so
# do not point the existing source canonical at that empty counterpart. Exact
# indexed preferences still take precedence in both runtime helpers.
legacy_alias_file = BACKEND / 'gsc-location-aliases.json'
legacy_aliases = json.loads(legacy_alias_file.read_text()).get('aliases', {}) if legacy_alias_file.is_file() else {}
live_services = json.loads((BACKEND / 'live_services.json').read_text())['services']
legacy_fallback_targets = {'/' + service['slug'] + '/' + slug for service in live_services if service['slug'].startswith('freelancer-') for slug in legacy_aliases}
canonical['blockedFallbackTargets'] = sorted(noindex_targets | legacy_fallback_targets)
canonical['blockedFallbackSources'] = {'explicitGscNoindexPaths': len(noindex_targets), 'legacyLocalityCounterpartFallbacks': len(legacy_fallback_targets)}
from data import CITY_MAP
canonical['eligibleDefaultLocationSlugs'] = sorted(slug for slug, location in CITY_MAP.items() if not location.get('is_new_location'))
(BACKEND / 'canonical-path-map.json').write_text(json.dumps(canonical, ensure_ascii=False, indent=2) + '\n')
(ROOT / 'frontend/src/seo/canonical-path-map.json').write_text((BACKEND / 'canonical-path-map.json').read_text())
policy = {'version': 1, 'generatedAt': stamp, 'policy': 'noindex observations remain gated until explicit content review; indexed examples protect exact existing routes; historical activity alone does not promote new pages.', 'routes': dict(sorted(routes.items()))}
(BACKEND / 'gsc-route-status.json').write_text(json.dumps(policy, ensure_ascii=False, indent=2) + '\n')
(DOCS / 'gsc-applied-canonical-decisions.json').write_text(json.dumps({'generatedAt': stamp, 'decisions': decisions, 'unobserved_policy': canonical['policy']}, ensure_ascii=False, indent=2) + '\n')
findings = load('gsc-legacy-route-findings.json')
redirects = {'/index.php': '/'}
for row in findings['freelance_services_routes']:
    if row.get('proposal', {}).get('status') == 301:
        redirects[norm(row['path'])] = norm(row['proposal']['equivalent_source_route'])
(BACKEND / 'legacy-redirects.json').write_text(json.dumps({'version': 1, 'redirects': redirects}, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'routePolicies': len(routes), **canonical['counts'], 'knownRedirects': len(redirects), 'knownNoindex': sum(r['noindex'] for r in routes.values())}))
