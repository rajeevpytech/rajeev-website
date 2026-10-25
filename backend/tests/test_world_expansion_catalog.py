"""Additive catalog integrity: no database, network or public-page publication."""
from collections import Counter
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
from zoneinfo import ZoneInfo

import pytest

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT/'backend'
CATALOG = json.loads((BACKEND/'world-expansion-catalog.json').read_text())
LOCATIONS = CATALOG['locations']
spec = importlib.util.spec_from_file_location('world_expansion_catalog_builder', ROOT/'scripts/build_world_expansion.py')
builder = importlib.util.module_from_spec(spec); spec.loader.exec_module(builder)


def test_capacity_counts_real_locations_and_eight_primary_services_without_claiming_indexing():
    assert CATALOG['base_location_count'] == 471
    assert CATALOG['additional_location_count'] == len(LOCATIONS) == 4530
    assert CATALOG['total_location_count'] == 5001
    assert CATALOG['canonical_service_count_for_capacity'] == 8
    assert CATALOG['available_service_location_url_capacity'] == 40008
    assert CATALOG['new_candidates_reviewed'] == CATALOG['new_candidates_indexable'] == 0
    assert all(row['is_new_location'] is True and row['is_new'] is True and row['remote_only'] is True
               and row['seo_reviewed'] is False and row['indexable'] is False
               and row['candidate_status'] == 'requires_editorial_review' for row in LOCATIONS)


def test_existing_471_records_and_63_aliases_are_exactly_preserved_and_never_reused():
    base = builder.load_base()
    aliases = json.loads((BACKEND/'gsc-location-aliases.json').read_text())['aliases']
    assert len(base) == 471 and len(aliases) == 63
    assert builder.object_sha(base) == CATALOG['base_locations_sha256']
    assert builder.object_sha(aliases) == CATALOG['protected_aliases_sha256']
    assert not ({row['loc_slug'] for row in LOCATIONS} & (set(base) | set(aliases)))
    old_geo_ids = {city['geoname_id'] for country in json.loads((BACKEND/'world_locations.json').read_text())['countries']
                   for city in country['cities'] if city.get('geoname_id')}
    assert not (old_geo_ids & {row['geoname_id'] for row in LOCATIONS})


def test_new_places_have_unique_stable_ids_safe_urls_and_real_geographic_fields():
    assert len({row['id'] for row in LOCATIONS}) == len(LOCATIONS)
    assert len({row['geoname_id'] for row in LOCATIONS}) == len(LOCATIONS)
    assert len({row['loc_slug'] for row in LOCATIONS}) == len(LOCATIONS)
    for row in LOCATIONS:
        assert row['geoname_id'] > 0 and row['id'] == f"geonames:{row['geoname_id']}"
        assert row['source_url'] == f"https://www.geonames.org/{row['geoname_id']}/"
        assert re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', row['loc_slug'])
        assert row['city'] and row['source_name'] and row['population'] > 0
        assert -90 <= row['latitude'] <= 90 and -180 <= row['longitude'] <= 180
        ZoneInfo(row['timezone'])
        assert row['feature_class'] == 'P' and row['feature_code'] in builder.ALLOWED_FEATURES
        assert row['location_type'] in {'city', 'capital', 'locality'}
        assert re.fullmatch(r'[a-f0-9]{64}', row['source_line_sha256'])
        assert not {'office', 'phone', 'rating', 'client_count', 'completed_projects'}.intersection(row)
        assert 'does not represent a local office' in row['local_context']


def test_country_coverage_and_balancing_use_the_existing_country_names_and_slugs():
    original = {row['code']: row for row in json.loads((BACKEND/'world_locations.json').read_text())['countries']}
    assert len(CATALOG['countries']) == CATALOG['total_country_territory_coverage'] == 246
    assert {row['code'] for row in CATALOG['countries']} == set(original)
    counts = Counter(row['country_code'] for row in LOCATIONS)
    assert len(counts) == CATALOG['additional_country_coverage'] == 197
    assert max(counts.values()) == CATALOG['maximum_new_places_per_country'] == 32
    assert all(row['total_location_count'] >= 1 for row in CATALOG['countries'])
    for row in LOCATIONS:
        country = original[row['country_code']]
        assert (row['country'], row['country_slug'], row['region']) == (country['name'], country['slug'], country['region'])
    assert not {'AN', 'CS', 'AQ', 'BV', 'HM', 'UM'}.intersection(counts)


def test_source_attribution_and_download_fingerprints_are_explicit():
    assert CATALOG['license_url'] == 'https://creativecommons.org/licenses/by/4.0/'
    assert 'GeoNames' in CATALOG['attribution'] and 'CC BY 4.0' in CATALOG['attribution']
    sources = {row['file']: row for row in CATALOG['sources']}
    assert {'cities15000.txt', 'cities15000.zip', 'countryInfo.txt', 'readme.txt', 'admin1CodesASCII.txt', 'TK.txt', 'TK.zip'}.issubset(sources)
    for name, row in sources.items():
        assert row['url'] == builder.SOURCE_URLS[name]
        assert re.fullmatch(r'[a-f0-9]{64}', row['sha256']) and row['bytes'] > 0
        assert row['recorded_at'] == '2026-10-25'
    assert sources['cities15000.zip']['sha256'] == '9c5e0684a0aeaa1b8a62ec08f2edcea94a425626806b8b249c1d9fc9b09168ec'


def source_directory():
    source = Path(os.environ.get('GEONAMES_SOURCE_DIR', ROOT.parent.parent/'geonames-source'))
    if not (source/'cities15000.txt').is_file():
        pytest.skip('Set GEONAMES_SOURCE_DIR to the retained official snapshot for raw-row/reproducibility verification')
    return source


def test_each_selected_row_matches_the_official_cached_source_id_coordinates_and_hash():
    source = source_directory()
    wanted = {row['geoname_id']: row for row in LOCATIONS}
    found = set()
    for name in ('cities15000.txt', 'cities15000.zip', 'countryInfo.txt', 'readme.txt', 'admin1CodesASCII.txt', 'TK.txt', 'TK.zip'):
        expected = next(row for row in CATALOG['sources'] if row['file'] == name)
        assert builder.file_sha(source/name) == expected['sha256']
    for source_path in (source/'cities15000.txt', source/'TK.txt'):
        with source_path.open('rb') as handle:
            for raw in handle:
                columns = raw.decode().rstrip('\r\n').split('\t')
                gid = int(columns[0])
                if gid not in wanted: continue
                row = wanted[gid]; found.add(gid)
                assert row['source_file'] == source_path.name
                assert row['source_line_sha256'] == hashlib.sha256(raw.rstrip(b'\r\n')).hexdigest()
                assert (row['source_name'], row['city']) == (columns[1], columns[2] or columns[1])
                assert (row['latitude'], row['longitude'], row['population']) == (float(columns[4]), float(columns[5]), int(columns[14]))
                assert (row['country_code'], row['feature_code'], row['timezone']) == (columns[8], columns[7], columns[17])
                assert (row['admin1_code'], row['admin2_code'], row['source_modified_at']) == (columns[10], columns[11], columns[18])
    assert found == set(wanted)
    names = builder.load_admin_names(source)
    for row in LOCATIONS:
        if row.get('admin1_name'):
            admin = names[f"{row['country_code']}.{row['admin1_code']}"]
            assert (row['admin1_name'], row['admin1_geoname_id']) == (admin['name'], admin['geoname_id'])


def test_rebuild_from_the_same_snapshot_is_reproducible_and_does_not_change_protected_files():
    source = source_directory()
    protected = [BACKEND/'data.py', BACKEND/'world_locations.json', BACKEND/'gsc-location-aliases.json', ROOT/'frontend/src/seo/catalog.json']
    before = {str(path): builder.file_sha(path) for path in protected}
    rebuilt = builder.build_catalog(source, target_total=5001, recorded_at='2026-10-25')
    assert rebuilt == CATALOG
    assert {str(path): builder.file_sha(path) for path in protected} == before


def test_expansion_data_is_not_imported_into_the_frontend_main_bundle():
    for source in (ROOT/'frontend/src').rglob('*'):
        if source.suffix not in {'.js', '.jsx', '.ts', '.tsx'}: continue
        text = source.read_text()
        assert not re.search(r'(?:import|require)[^\n]*world-expansion-catalog\.json', text)


def test_all_verified_mode_selects_the_entire_supplied_finite_source_without_promoting_routes(tmp_path):
    source = source_directory()
    # A small genuine subset exercises all-mode semantics without shipping a 30k-place catalog.
    requested = {row['geoname_id'] for row in LOCATIONS if row['source_file'] == 'TK.txt'}
    requested.update(row['geoname_id'] for row in LOCATIONS[:2])
    for name in ('cities15000.txt', 'TK.txt'):
        rows = []
        for raw in (source/name).read_bytes().splitlines(keepends=True):
            if int(raw.split(b'\t', 1)[0]) in requested: rows.append(raw)
        (tmp_path/name).write_bytes(b''.join(rows))
    (tmp_path/'countryInfo.txt').write_bytes((source/'countryInfo.txt').read_bytes())
    rebuilt = builder.build_catalog(tmp_path, target_total=None, recorded_at='2026-10-25')
    assert rebuilt['selection_mode'] == 'all_verified_source_places'
    assert {row['geoname_id'] for row in rebuilt['locations']} == requested
    assert rebuilt['total_location_count'] == 471 + len(requested)
    assert rebuilt['available_service_location_url_capacity'] == 8 * rebuilt['total_location_count']
    assert rebuilt['new_candidates_indexable'] == 0
    assert rebuilt['base_locations_sha256'] == CATALOG['base_locations_sha256']


@pytest.mark.parametrize('relative', ['backend/data.py', 'backend/world_locations.json', 'backend/gsc-location-aliases.json', 'frontend/src/seo/catalog.json'])
def test_builder_cli_refuses_protected_existing_catalog_outputs(monkeypatch, relative):
    import sys
    target = ROOT/relative
    before = target.read_bytes()
    monkeypatch.setattr(sys, 'argv', ['build_world_expansion.py', '--output', str(target)])
    with pytest.raises(ValueError, match='must not replace an existing catalog'):
        builder.main()
    assert target.read_bytes() == before
