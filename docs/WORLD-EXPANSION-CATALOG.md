# Additive worldwide location catalog

Snapshot: 25 October 2026.

The shipped expansion contains **4,530 additional source-backed places**. Combined with the **471 unchanged existing places**, it provides **5,001 places × 8 primary services = 40,008 potential service/location URLs**. This is a capacity and coverage count. It does not mean 40,008 URLs are indexed, approved, published to a sitemap or ranking.

The catalog covers places in **246 existing countries and territories**, with additional places selected in 197 of them. “Countries and territories” includes dependencies; it is not a count of sovereign states. This is finite geographic coverage, not every village, address, neighbourhood or place in the world.

## Preservation boundary

`backend/world-expansion-catalog.json` contains **new records only**. It does not replace `data.py`, the existing frontend catalog, the 471-place base or the 63 observed legacy URL aliases. Existing slugs are reserved and skipped. Existing geographic source IDs and matching names/alternate names are excluded from the new selection. SHA-256 fingerprints record the unchanged base and alias values.

The builder has no MongoDB connection, performs no database upsert and never publishes a page. Consumers must resolve a complete existing exact database page first and preserve its content, title, description, canonical and index state. Only an absent page can use the new candidate fallback. An existing page outside a capped Search Console example export is still an existing page.

New candidate records are explicitly marked `is_new_location: true`, `seo_reviewed: false`, `indexable: false` and `remote_only: true`. They must retain the public review gate. Geography inclusion does not prove local offices, client projects, reviews, service capacity, payment-provider availability or rankings. Do not add the unreviewed catalog to a giant public sitemap or submit it wholesale to an indexing service.

## Data and selection

The main source is the official GeoNames `cities15000` extract. Candidates must be populated-place records with a supported current feature classification, a positive source population value and a valid IANA time zone. Abandoned, historical, destroyed or unspecified place-group classifications are excluded.

A separate official Tokelau country extract supplies three real populated settlements because the larger-place extract contains none for Tokelau. This adds new settlement records; it does not invent a capital or change the existing empty country-directory record. Small settlements and populated-place sections are labelled as localities rather than represented as major cities.

Selection takes the most populated remaining places in equal turns across countries with available candidates. The shipped selection adds at most 32 places per country, rather than concentrating the expansion in a few large countries. Population is a GeoNames source field, not a measure of metropolitan size, client demand or commercial opportunity.

Place names and country slugs remain grounded in the source and existing country catalog. Seven selected homonyms require disambiguated new URLs using a source admin code and GeoNames ID. An existing URL is never repurposed to resolve a collision. Where available, `admin1_name` and `admin1_geoname_id` come from GeoNames' official administrative-name extract; no parent city is guessed.

Each record retains its source ID, native/source name, coordinates, population, classification, administrative codes, time zone, source modification date, public source link and hash of the original source row. The metadata lists source URLs, source download fingerprints, attribution and the selection/exclusion policy. Geographic coordinates describe a place, not a business location.

## Server-side consumption

Load this JSON on the backend and create lookup indexes without modifying the original base:

```python
by_slug = {row["loc_slug"]: row for row in expansion["locations"]}
by_id = {row["id"]: row for row in expansion["locations"]}
```

Stable new IDs have the form `geonames:<source-id>`. The top-level `locations` array contains only the additional 4,530 records. `countries` supplies per-country summaries; `base_location_count`, `additional_location_count` and `total_location_count` are distinct.

The data belongs behind paginated country/location queries and direct server lookups. Do not import this approximately 9 MB JSON into the frontend entry bundle or return the entire catalog for each administrator page. The existing small frontend catalog remains intact. Backend integration owns actual routes, pagination, exact database precedence and eligibility; the data file alone does not publish them.

## Rebuilding or extending the finite source coverage

The builder reads local official extracts. It makes no network requests. Keep the exact source snapshot if a byte-for-byte rebuild is required: GeoNames downloads can change, and the recorded hashes identify the snapshot used here.

The exact seven-file source snapshot is included at `data/geonames-snapshot/` for reproducible offline checks. Its GeoNames attribution and CC BY 4.0 terms apply. Required files in a source directory are `cities15000.txt`, `countryInfo.txt` and `TK.txt`. To retain all provenance fields, also keep their downloaded ZIPs, `readme.txt` and `admin1CodesASCII.txt`. Extract the two ZIPs into that source directory before rebuilding.

```bash
python3 scripts/build_world_expansion.py --source-dir data/geonames-snapshot --target-total 5001
```

A larger reviewed project can choose another finite target without changing existing records:

```bash
python3 scripts/build_world_expansion.py --source-dir data/geonames-snapshot --target-total 10000 --output /tmp/expanded-candidates.json
```

Alternatively, select every eligible distinct populated place in the supplied source snapshot:

```bash
python3 scripts/build_world_expansion.py --source-dir data/geonames-snapshot --all-verified-cities --output /tmp/all-source-candidates.json
```

“All verified cities” means all eligible source-backed city/locality records remaining after preservation and quality filters. It does not mean all world locations, and it does not mark their pages reviewed or indexed. The main supplied extract contains 34,188 populated-place rows within the existing country scope before exclusions; a source record is not automatically an additional distinct location. Larger source files or future snapshots require a fresh review rather than an invented completeness claim. `--recorded-at YYYY-MM-DD` records a newly acquired source date explicitly.

The builder rejects protected catalog files as output targets. Review a newly generated candidate file and its changed counts before replacing the expansion file or deploying it. Existing public records and database documents remain outside its write path.

## Data-quality checks

```bash
GEONAMES_SOURCE_DIR=data/geonames-snapshot python -m pytest backend/tests/test_world_expansion_catalog.py -q -n 0
```

Tests verify counts and review gates, immutable base/alias fingerprints, reserved-slug separation, unique IDs and URLs, country coverage, time zones, coordinates, explicit attribution and source hashes. With the retained source snapshot, they also compare every selected row with the original source record, verify administrative names, rebuild the selection reproducibly and confirm that protected files remain byte-identical. Raw-source checks are explicitly skipped if the retained source directory is unavailable; structural and preservation checks still run.

## Sources and licence

Geographical data: [GeoNames](https://www.geonames.org/), [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). GeoNames provides data as-is; source integrity verification does not guarantee every name, boundary, population value or classification is current or error-free.

- [GeoNames export information and terms](https://www.geonames.org/export/)
- [Official extract format and licence](https://download.geonames.org/export/dump/readme.txt)
- [cities15000.zip](https://download.geonames.org/export/dump/cities15000.zip)
- [countryInfo.txt](https://download.geonames.org/export/dump/countryInfo.txt)
- [Administrative names](https://download.geonames.org/export/dump/admin1CodesASCII.txt)
- [Tokelau country extract](https://download.geonames.org/export/dump/TK.zip)

Source SHA-256 fingerprints are stored in the shipped catalog. Retain the attribution on public geographic reference sections and in redistributed derived data.
