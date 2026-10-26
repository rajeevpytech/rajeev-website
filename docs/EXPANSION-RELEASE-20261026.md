# Releasing the 40,008-route catalog

Prepared 26 October 2026. This phase adds an offline inventory/draft preparation command and an Admin draft importer. Existing pages, slugs and SEO metadata remain unchanged. There is no database migration, startup seeding or blanket publication.

## Counts with different meanings

- **40,008** potential combinations: 5,001 catalog places × eight services.
- **3,768** combinations use the preserved 471-place base.
- **36,240** combinations use the 4,530 additional places.
- **24** complete draft texts in this first editorial pack: Howrah, Coventry and Denver × eight services.
- The latest stable sitemap snapshot in this follow-up contained **2,407 URLs overall**, of which 1,614 matched the exact preferred service/place combinations in this inventory. Other sitemap entries include articles, project pages, directories and historical canonical routes. Do not subtract the whole sitemap count from 40,008 to calculate a publication backlog.
- **Zero** new live publications, CMS draft saves or indexing submissions were made in this phase. Source changes require deployment. No actual search-index total is inferred.

One initial live read returned 2,137 entries; subsequent uncached root and query reads returned 2,407. The retained inventory uses the final 2,407-URL snapshot, not the transient lower observation. This was a read-only observation; its cause was not established. It is another reason to retain a dated snapshot rather than label a live count permanent.

## First 24 drafts

The editable pack is [expansion-release-20261026/first-24-drafts.json](expansion-release-20261026/first-24-drafts.json).

The eight services retain their existing canonical URL spellings. Each draft has service-specific planning, one clearly hypothetical scenario, acceptance examples, geographic provenance and date-specific scheduling examples. These are not claims of local clients, offices, regional demand, fixed availability or legal compliance. India, the UK and the US remain the first target markets.

The drafts still share layout and general delivery text. Technical validity is not an editorial judgment that every location deserves a separate indexed page. Review useful differentiation against existing service/regional content; consolidate where a location page adds no distinct reader value. Neither a checkbox nor a large inventory establishes search quality or rankings.

## Reproduce the preparation

From the repository root, in the normal backend environment:

```bash
python3 scripts/prepare_expansion_release.py --output /tmp/rajeev-expansion-review
```

Optionally pass `--sitemap-snapshot /path/to/sitemap-urls.json`. The file must be a JSON list of canonical HTTPS URLs, or an object with a `urls` list. Capture all children if the deployed sitemap becomes an index. This command never fetches the network, writes MongoDB, calls an LLM or changes a publication state.

Outputs:

- `all-40008-routes.jsonl`: one distinct path per service/place combination, base/additional classification, explicit sitemap-snapshot membership and uncertified publication/indexing fields.
- `first-24-drafts.json`: at most a small editorial batch, with no imported approval or reviewer identity.
- `release-summary.json`: separated counts and source fingerprints.
- `Expansion_40008_Review.html`: readable, responsive review of all 24 full texts and the workflow.

The large inventory belongs in generated review output, not the frontend entry bundle. The generator requires the supplied GeoNames catalog and Python time-zone data. Revisit its expected 40,008 count explicitly if the underlying catalog changes.

## Use the Admin importer after deployment

1. Open **New service-area pages → Review an individual new page**.
2. Choose `first-24-drafts.json` in **Import prepared page drafts**.
3. Choose one draft and click **Preview imported draft**. Importing performs no save or publication.
4. The UI fetches the current server preview and verifies its additional-location source ID. It blocks importing over original content, any revisioned record or an approved page. A later concurrent change is still guarded by the existing backend revision check.
5. Read the complete draft and source notes. All factual/editorial review checks remain unchecked; imported flags cannot grant approval.
6. Use **Save this new page as a draft** to save it with noindex and sitemap exclusion, or complete the actual review and use **Approve this new page**.
7. After approval, independently inspect the live HTML, canonical, robots directive and sitemap entry. The existing dynamic sitemap includes valid approved records; draft packs must not be submitted as a public sitemap.
8. Notify search engines only of actual new eligible public pages. Do not repeat the unchanged previous 2,407-URL IndexNow batch merely because a local pack was generated.

There is no “approve all 40,008” action. Opening/importing a pack is not a factual or editorial review. An existing saved draft can still be reviewed through its normal page workflow; import will not silently replace it.

## File changes

| File | Purpose |
| --- | --- |
| `frontend/src/pages/admin/ServiceAreaExpansion.jsx` | Bounded JSON pack import, individual preview, source/record checks, unchecked approval state; clearer potential-URL label |
| `frontend/scripts/test-expansion-draft-import.cjs` | Isolated UI checks for file validation, no autosave, stripped approval flags and protected saved content |
| `scripts/prepare_expansion_release.py` | Complete offline route inventory, 24 draft bodies, source notes and readable review |
| `backend/tests/test_expansion_release_pack.py` | Full inventory counts, time-zone examples, malformed snapshot rejection and draft/approval/sitemap integration |
| `docs/expansion-release-20261026/first-24-drafts.json` | First content pack; unpublished |
| This document | Counts, operator workflow, preservation boundaries and validation |

## Source references

- Geographic records and retained fingerprints: [GeoNames](https://www.geonames.org/), CC BY 4.0; see [WORLD-EXPANSION-CATALOG.md](WORLD-EXPANSION-CATALOG.md).
- Date-specific conversions: [Python zoneinfo](https://docs.python.org/3/library/zoneinfo.html), using the available IANA data. Conversions are illustrative; meeting availability is agreed separately.
- [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
- [Google doorway/scaled-content policies](https://developers.google.com/search/docs/essentials/spam-policies).

An indexed-page total, live deployment, field performance, rank improvement or AI citation is not certified by this source release.

## Validation

- All **36,240 additional service/location HTTP routes** passed through the local FastAPI public router: full HTML, headings, remote-delivery statement, geographic source and noindex review policy; zero errors, zero database writes. This checks previews, not live publication.
- The full release checker passed with zero errors and two existing fixture/live-verification warnings.
- Metadata preservation passed: 18 original declarations/templates, 21 captured snapshots and 293 built heads.
- The focused backend tests cover the offline inventory and 24 saved synthetic drafts, one explicit synthetic approval and sitemap inclusion; all data is in memory. An isolated `pymongo.errors` exception stub was used for the portfolio import; these checks are not a real MongoDB integration test.
- The Admin UI test verifies 24 imported drafts, invalid/duplicate/foreign paths, stripping of forged approval flags, no automatic save, unchecked review fields, explicit draft saving and refusal to replace saved content.
- Production frontend build succeeds. Draft import lives in the deferred Admin chunk; no full geographic inventory or content pack is imported into the public entry bundle.
