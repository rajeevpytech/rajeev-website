# Worldwide remote-service coverage

Updated 25 October 2026. This catalog describes locations where remote work can be discussed. A location page is not evidence of an office, local registration, a customer project, or guaranteed search visibility.

| Catalog | Original ZIP | Existing live catalog | Preserved base catalog | Newly added beyond live |
|---|---:|---:|---:|---:|
| Countries and territories | 49 | 49 | 246 | 197 |
| Cities and localities | 225 | 248 | 471 | 223 |
| Additional Delhi localities | — | — | 10 | 10 |

The live public catalog was newer than the uploaded ZIP. It contains **248 distinct location slugs**, including 23 additional locations: 12 in the UK and 11 in Germany. The public API's own `total_cities` field and the counted records both equal 248. These live locations are preserved as existing pages, including the Unicode `düsseldorf-germany` slug.

All original 225 location records and their order within each uploaded country remain unchanged. All 248 existing live location slugs, names, country names, country slugs and regions are retained. New locations carry `is_new_location: true`, while all 248 existing source/live locations remain outside that new-page marker. No service definitions were changed by the geographic merge.

The 248-location preservation baseline is retained in `backend/original_location_slugs.json`; the uploaded 225-location list remains in `backend/uploaded_location_slugs.json`. The exact public API snapshot is retained in `backend/live_location_catalog.json`.

Coverage includes populated current country/territory records in the GeoNames source, including dependencies. It does not describe all territories as sovereign states. The obsolete Serbia and Montenegro (`CS`) and Netherlands Antilles (`AN`) records are excluded. Antarctica, Bouvet Island, Heard Island and McDonald Islands, and United States Minor Outlying Islands have zero population in the downloaded source and are not added as freelance customer markets.

Selection adds each listed capital plus up to three populated places above one million inhabitants, using the source population field; it is not a claim about metro-area boundaries. When a territory has neither a listed capital nor a million-plus city, its largest available populated place is used. Existing location spellings and URLs take priority over new aliases to prevent duplicate hubs. For the one capital missing from `cities15000`, only the source-listed name is used; no latitude, longitude or time zone is invented.

The ten additional East Delhi locality records are Laxmi Nagar, Preet Vihar, Patparganj, Geeta Colony, Pandav Nagar, New Ashok Nagar, Kalyanpuri, Trilokpuri, Vasundhara Enclave and Ghazipur. They are marked as localities within Delhi, not separate offices or cities.

## Additional capacity in the final release

The table above describes the immutable **471-place base**, rather than the full new capacity. The final separate expansion adds **4,530** source-backed places, for **5,001 places × eight primary services = 40,008 candidate URLs** across the 246 countries/territories. The original Tokelau country directory has no base city; it is preserved, and three sourced Tokelau settlements are available through the new expansion directory. New candidates remain noindex until accurate individual review. The finite selection is not every location in the world. See [the expansion catalog, source snapshot and selection checks](WORLD-EXPANSION-CATALOG.md).

## Data sources and attribution

Geographical data: [GeoNames](https://www.geonames.org/), Creative Commons Attribution 4.0. The derived catalog retains existing locations and adds a selected subset of current GeoNames records. Source data is supplied as-is by GeoNames and can change.

- [Existing Rajeev public location catalog](https://rajeevfreelancer.com/api/locations): captured on 25 October 2026; preserves all current public location names and slugs.
- [GeoNames countryInfo.txt](https://download.geonames.org/export/dump/countryInfo.txt): country/territory codes and names, capitals, currency codes, language codes, continents and source IDs.
- [GeoNames cities15000.zip](https://download.geonames.org/export/dump/cities15000.zip): selected city names, populated-place classification, population, coordinates and IANA time zones.
- [GeoNames export and terms](https://www.geonames.org/export/).
- [CC BY 4.0 license](https://creativecommons.org/licenses/by/4.0/).
- [Delhi State Health Mission government directory](https://dshm.delhi.gov.in/%28S%28m5rtk2psiutcyqjfe431yqvo%29%29/PDF/STATUTORY_AUDIT_TENDER.pdf): evidence for the ten additional East Delhi localities and geographic reference points. The directory is not used as business contact information.

Downloaded source files on 25 October 2026. Source SHA-256 fingerprints and selection rules are recorded in `backend/world_locations.json`.

## Before indexing newly generated service/location pages

Keep existing URLs and metadata intact. Review each new service/location page for useful project guidance, an accurate remote-service statement, relevant internal links, and factual geographic context. Add actual case studies, local customer questions or delivery experience when available. Do not invent reviews, offices, local phone numbers, client counts, local market statistics or guarantees. Country/city directory coverage is not a reason to manufacture thousands of near-identical landing pages.

Geographic metadata is discovery context, not legal or regulatory guidance. Confirm project payment availability, languages, scope, taxes and privacy obligations with the client and relevant providers during discovery.
