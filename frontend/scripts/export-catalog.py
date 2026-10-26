"""Build a public location catalog from the application's authoritative Python data."""
import json
import runpy
from pathlib import Path
root = Path(__file__).resolve().parents[2]
data = runpy.run_path(str(root / 'backend/data.py'))
countries = []
for slug, country in data['COUNTRIES'].items():
    cities = [{"city": loc['city'], "loc_slug": loc['loc_slug']} for loc in data['CITY_MAP'].values() if loc['country_slug'] == slug]
    countries.append({**{key: value for key, value in country.items() if key != 'cities'}, "slug": slug, "cities": cities})
target = root / 'frontend/src/seo/catalog.json'
target.write_text(json.dumps({"countries": countries, "total_cities": len(data['CITY_MAP'])}, ensure_ascii=False, indent=2) + '\n')
print(f"Catalog: {len(countries)} countries, {len(data['CITY_MAP'])} cities")

# The backend and browser must select the same evidence-backed canonical paths.
canonical_source = root / 'backend/canonical-path-map.json'
canonical_target = root / 'frontend/src/seo/canonical-path-map.json'
if not canonical_source.exists():
    raise RuntimeError('Missing backend/canonical-path-map.json; canonical evidence must be bundled with the application.')
canonical_data = json.loads(canonical_source.read_text())
if not isinstance(canonical_data.get('preferences'), dict):
    raise ValueError('Invalid canonical path preferences')
canonical_target.write_bytes(canonical_source.read_bytes())

# A small, reproducible initial portfolio for prerendering. Runtime public Work
# pages always merge this catalog with the current authenticated CMS records.
portfolio_source = root / 'backend/portfolio-projects.json'
if portfolio_source.exists():
    projects = [row for row in json.loads(portfolio_source.read_text()).get('projects', [])
                if row.get('published', True) is True and not row.get('archived')]
    projects.sort(key=lambda row: (not row.get('featured', False), row.get('display_order', 100), row['slug']))
    industries, services = {}, {}
    for row in projects:
        category = row.get('industry') or row['category']
        industries.setdefault(category['slug'], {**category, 'count': 0})['count'] += 1
        for service in row.get('services', []):
            services.setdefault(service['slug'], {**service, 'count': 0})['count'] += 1
    snapshot = {'items': projects[:12], 'categories': sorted(industries.values(), key=lambda row: row['name']),
                'industries': sorted(industries.values(), key=lambda row: row['name']),
                'services': sorted(services.values(), key=lambda row: row['name']), 'total_projects': len(projects),
                'pagination': {'page': 1, 'page_size': 12, 'total': len(projects), 'total_pages': (len(projects) + 11) // 12},
                'filters': {'category': '', 'industry': '', 'service': '', 'q': ''}}
    (root / 'frontend/src/seo/home-portfolio.json').write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n')
    print(f'Portfolio snapshot: {len(projects)} published projects')
