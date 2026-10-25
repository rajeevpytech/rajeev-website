#!/usr/bin/env python3
"""Build an additive, review-gated catalog from official cached GeoNames extracts.

No network request, Mongo connection, existing-catalog mutation or content publish.
Use --source-dir for the directory containing cities15000.txt and countryInfo.txt.
"""
import argparse
from collections import Counter, defaultdict
from datetime import date
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import unicodedata
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / 'backend'
ALLOWED_FEATURES = {'PPL', 'PPLA', 'PPLA2', 'PPLA3', 'PPLA4', 'PPLA5', 'PPLC', 'PPLG', 'PPLL', 'PPLX', 'STLMT'}
SOURCE_URLS = {
    'cities15000.txt': 'https://download.geonames.org/export/dump/cities15000.zip',
    'cities15000.zip': 'https://download.geonames.org/export/dump/cities15000.zip',
    'countryInfo.txt': 'https://download.geonames.org/export/dump/countryInfo.txt',
    'readme.txt': 'https://download.geonames.org/export/dump/readme.txt',
    'admin1CodesASCII.txt': 'https://download.geonames.org/export/dump/admin1CodesASCII.txt',
    'TK.zip': 'https://download.geonames.org/export/dump/TK.zip',
    'TK.txt': 'https://download.geonames.org/export/dump/TK.zip',
}


def file_sha(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''): h.update(chunk)
    return h.hexdigest()


def object_sha(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def ascii_text(value):
    return unicodedata.normalize('NFKD', str(value)).encode('ascii', 'ignore').decode('ascii')


def name_key(value):
    return re.sub(r'[^a-z0-9]+', '', ascii_text(value).lower())


def slugify(value):
    return re.sub(r'[^a-z0-9]+', '-', ascii_text(value).lower().replace('&', ' and ')).strip('-')


def load_base():
    spec = importlib.util.spec_from_file_location('world_expansion_existing_base', BACKEND / 'data.py')
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module.CITY_MAP


def load_admin_names(source_dir):
    path = source_dir / 'admin1CodesASCII.txt'
    if not path.exists(): return {}
    result = {}
    for line in path.read_text().splitlines():
        columns = line.split('\t')
        if len(columns) >= 4:
            result[columns[0]] = {'name': columns[1], 'ascii_name': columns[2], 'geoname_id': int(columns[3])}
    return result


def build_catalog(source_dir, target_total=5001, recorded_at='2026-10-25'):
    source_dir = Path(source_dir)
    for name in ('cities15000.txt', 'countryInfo.txt', 'TK.txt'):
        if not (source_dir / name).is_file(): raise ValueError(f'Missing required official source: {name}')
    date.fromisoformat(recorded_at)
    base = load_base()
    if len(base) != 471: raise ValueError('Review the unchanged 471-place preservation baseline before rebuilding')
    aliases = json.loads((BACKEND / 'gsc-location-aliases.json').read_text())['aliases']
    world = json.loads((BACKEND / 'world_locations.json').read_text())
    countries = {country['code']: country for country in world['countries']}
    country_by_slug = {country['slug']: country for country in countries.values()}
    raw_country_codes = {line.split('\t')[0] for line in (source_dir/'countryInfo.txt').read_text().splitlines() if line and not line.startswith('#')}
    if not set(countries).issubset(raw_country_codes): raise ValueError('Existing country codes must exist in the official country source')
    # No old record or alias is copied back, renamed or overwritten by the builder.
    protected_slugs = set(base) | set(aliases)
    protected_names = defaultdict(set)
    for record in [*base.values(), *aliases.values()]:
        country = country_by_slug.get(record['country_slug'])
        if country: protected_names[country['code']].add(name_key(record['city']))
    protected_ids = {city['geoname_id'] for country in countries.values() for city in country['cities'] if city.get('geoname_id')}
    admin_names = load_admin_names(source_dir)
    exclusions = Counter(); pools = defaultdict(list); unique_source_places = set()
    for source_path in (source_dir/'cities15000.txt', source_dir/'TK.txt'):
        with source_path.open('rb') as source:
            for raw in source:
                columns = raw.decode('utf-8').rstrip('\r\n').split('\t')
                if len(columns) != 19: exclusions['invalid_field_count'] += 1; continue
                code = columns[8]
                if code not in countries: exclusions['country_outside_existing_scope'] += 1; continue
                if columns[6] != 'P' or columns[7] not in ALLOWED_FEATURES:
                    exclusions['noncurrent_or_unspecific_feature'] += 1; continue
                gid, population = int(columns[0]), int(columns[14] or 0)
                if gid in protected_ids: exclusions['existing_geoname_id'] += 1; continue
                aliases_in_source = [columns[1], columns[2], *columns[3].split(',')]
                if any(name_key(name) in protected_names[code] for name in aliases_in_source if name_key(name)):
                    exclusions['existing_place_name_or_alias'] += 1; continue
                if population <= 0: exclusions['no_positive_populated_place_value'] += 1; continue
                try: ZoneInfo(columns[17])
                except (ZoneInfoNotFoundError, ValueError): exclusions['missing_or_invalid_timezone'] += 1; continue
                duplicate_key = (code, columns[10], columns[11], name_key(columns[2] or columns[1]))
                if duplicate_key in unique_source_places: exclusions['duplicate_name_and_admin_codes'] += 1; continue
                unique_source_places.add(duplicate_key)
                pools[code].append({'geoname_id': gid, 'city': columns[2] or columns[1], 'source_name': columns[1],
                    'latitude': float(columns[4]), 'longitude': float(columns[5]), 'feature_code': columns[7],
                    'admin1_code': columns[10], 'admin2_code': columns[11], 'population': population,
                    'timezone': columns[17], 'source_modified_at': columns[18],
                    'source_file': source_path.name, 'source_line_sha256': hashlib.sha256(raw.rstrip(b'\r\n')).hexdigest()})
    for rows in pools.values(): rows.sort(key=lambda row: (-row['population'], row['geoname_id']))
    all_verified = target_total is None
    needed = sum(len(rows) for rows in pools.values()) if all_verified else target_total - len(base)
    if needed <= 0 or sum(len(rows) for rows in pools.values()) < needed:
        raise ValueError('Target must add real records and fit the available distinct source pool')
    # Equal-turn country selection prevents a few large countries dominating the new catalog.
    selected = []; used = set(); offsets = Counter(); slug_collisions = 0
    while len(selected) < needed:
        progressed = False
        for code in sorted(pools):
            if len(selected) >= needed: break
            if offsets[code] >= len(pools[code]): continue
            progressed = True
            candidate = pools[code][offsets[code]]; offsets[code] += 1
            country = countries[code]
            stem = slugify(candidate['city']) or f"place-{candidate['geoname_id']}"
            normal = f"{stem}-{country['slug']}"
            # An old URL is never reused, even when a homonymous new source place differs geographically.
            if normal in protected_slugs:
                exclusions['protected_existing_or_legacy_slug'] += 1
                continue
            loc_slug = normal
            if loc_slug in used:
                slug_collisions += 1
                # A source ID disambiguates real homonyms without inventing a state or parent city.
                loc_slug = f"{stem}-{slugify(candidate['admin1_code']) or 'region'}-{candidate['geoname_id']}-{country['slug']}"
            if loc_slug in protected_slugs or loc_slug in used:
                exclusions['unresolvable_slug_collision'] += 1; continue
            admin = admin_names.get(f"{code}.{candidate['admin1_code']}")
            kind = 'capital' if candidate['feature_code'] == 'PPLC' else 'locality' if candidate['feature_code'] == 'PPLX' or candidate['population'] < 15000 else 'city'
            record = {**candidate, 'id': f"geonames:{candidate['geoname_id']}", 'loc_slug': loc_slug,
                'country': country['name'], 'country_slug': country['slug'], 'country_code': code,
                'region': country['region'], 'location_type': kind, 'feature_class': 'P',
                'source_url': f"https://www.geonames.org/{candidate['geoname_id']}/",
                'currency_code': country['currency_code'], 'languages': country.get('language_names', []),
                'is_new_location': True, 'is_expansion_candidate': True, 'is_new': True, 'seo_reviewed': False,
                'indexable': False, 'remote_only': True, 'candidate_status': 'requires_editorial_review'}
            if admin:
                record.update(admin1_name=admin['name'], admin1_geoname_id=admin['geoname_id'])
            location_label = f"{record['city']}, {admin['name']}, {country['name']}" if admin and name_key(admin["name"]) != name_key(record["city"]) else f"{record['city']}, {country['name']}"
            record['local_context'] = f"GeoNames lists {location_label} as a populated place (source feature {candidate['feature_code']}). The source time zone is {candidate['timezone']}. This geographic reference does not represent a local office, project history or service-boundary map."
            record['planning_notes'] = [
                f"Confirm the client's intended audience and actual service area in {location_label}; a place-name URL does not establish local delivery capacity.",
                f"Arrange remote reviews using {candidate['timezone']} and Asia/Kolkata for the actual meeting date, checking seasonal clock changes.",
                f"Confirm content language, billing currency and provider access with the client; the country catalog lists {country['currency_code']} as geographic context, not payment-provider eligibility.",
            ]
            selected.append(record)
            used.add(loc_slug)
        if not progressed:
            if all_verified: break
            raise ValueError('Distinct candidate pools were exhausted before the target')
    selected.sort(key=lambda row: (row['country_code'], row['city'].casefold(), row['geoname_id']))
    country_counts = Counter(row['country_code'] for row in selected)
    base_country_counts = Counter(country_by_slug[row['country_slug']]['code'] for row in base.values())
    country_summary = [{'code': code, 'name': row['name'], 'slug': row['slug'], 'region': row['region'],
        'base_location_count': base_country_counts[code], 'additional_location_count': country_counts[code],
        'total_location_count': base_country_counts[code] + country_counts[code]} for code, row in sorted(countries.items())]
    source_files = [{'file': name, 'url': SOURCE_URLS[name], 'sha256': file_sha(source_dir/name),
                     'bytes': (source_dir/name).stat().st_size, 'recorded_at': recorded_at}
                    for name in SOURCE_URLS if (source_dir/name).is_file()]
    return {'version': 1, 'generated_at': recorded_at,
        'purpose': 'Additive, review-gated remote-service location candidates; URL availability is not publication, indexing or ranking.',
        'license': 'Creative Commons Attribution 4.0 (CC BY 4.0)', 'license_url': 'https://creativecommons.org/licenses/by/4.0/',
        'attribution': 'Geographical data: GeoNames (https://www.geonames.org/), CC BY 4.0; derived selection, supplied as-is.',
        'sources': source_files, 'source_row_hash_format': 'SHA-256 of original UTF-8 GeoNames row without CR/LF',
        'selection_policy': 'Use cities15000 plus the official Tokelau country extract for populated settlements absent from cities15000. Keep the 471-place base and 63 legacy aliases untouched; exclude their source IDs/name aliases/URL collisions. Select the most populated remaining real places in equal country turns. Disambiguate selected homonyms with source admin code and GeoNames ID.',
        'selection_mode': 'all_verified_source_places' if all_verified else 'balanced_target',
        'base_location_count': len(base), 'base_locations_sha256': object_sha(base),
        'protected_legacy_alias_count': len(aliases), 'protected_aliases_sha256': object_sha(aliases),
        'additional_location_count': len(selected), 'total_location_count': len(base)+len(selected),
        'canonical_service_count_for_capacity': 8, 'available_service_location_url_capacity': (len(base)+len(selected))*8,
        'new_candidates_reviewed': 0, 'new_candidates_indexable': 0,
        'source_candidate_pool_count': sum(len(rows) for rows in pools.values()),
        'additional_country_coverage': len(country_counts), 'total_country_territory_coverage': sum(row['total_location_count'] > 0 for row in country_summary),
        'country_territory_directory_count': len(countries),
        'maximum_new_places_per_country': max(country_counts.values()), 'disambiguated_slug_count': slug_collisions,
        'exclusions': dict(sorted(exclusions.items())), 'countries': country_summary, 'locations': selected}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, default=Path(os.environ.get('GEONAMES_SOURCE_DIR', str(ROOT.parent.parent/'geonames-source'))))
    scope = parser.add_mutually_exclusive_group()
    scope.add_argument('--target-total', type=int, default=5001)
    scope.add_argument('--all-verified-cities', action='store_true', help='Select every eligible distinct populated-place record in the supplied finite source extracts; new routes remain review-gated.')
    parser.add_argument('--recorded-at', default='2026-10-25')
    parser.add_argument('--output', type=Path, default=BACKEND/'world-expansion-catalog.json')
    args = parser.parse_args()
    output = args.output.resolve()
    if output in {(BACKEND/'data.py').resolve(), (BACKEND/'world_locations.json').resolve(), (BACKEND/'gsc-location-aliases.json').resolve(), (ROOT/'frontend/src/seo/catalog.json').resolve()}:
        raise ValueError('The output must not replace an existing catalog')
    if output.exists() and output != (BACKEND/'world-expansion-catalog.json').resolve():
        raise ValueError('Choose a new output file; existing unrelated files are protected')
    catalog = build_catalog(args.source_dir, None if args.all_verified_cities else args.target_total, args.recorded_at)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(catalog, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({k: catalog[k] for k in ('base_location_count','additional_location_count','total_location_count','available_service_location_url_capacity','additional_country_coverage','maximum_new_places_per_country','new_candidates_indexable')}))


if __name__ == '__main__': main()
