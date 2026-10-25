# Search Console findings and next actions

Read-only audit: **25 October 2026**. Property: **sc-domain:rajeevfreelancer.com**. This is the existing live site's baseline, before deployment of the updated package.

**Google reports 2,333 indexed pages and 1,313 not indexed**, with the Page indexing report last updated **16 October 2026**. The website already has search visibility. Protecting observed indexed URLs and checking the causes of exclusions takes priority over publishing more URL combinations.

## Verified baseline

| Report | Observation | Date / scope |
| --- | --- | --- |
| Page indexing | 2,333 indexed; 1,313 not indexed | Last update 16 October 2026; 1,000 indexed examples exportable |
| Web search | 287 clicks; 14,769 impressions; 1.9% displayed CTR; average position 20.8 | 24 July–23 October 2026; last three months |
| International visibility | 109 countries with impressions in the country export | Same Web period; an impression is not a ranking guarantee in that country |
| Generative AI features (Beta) | 608 aggregate impressions; 318 page rows in the export | Same period; separate/subset Search view, not additive to Web impressions |
| Manual actions | No issues detected | Authenticated report observed 25 October 2026 |
| Security issues | No issues detected | Authenticated report observed 25 October 2026 |
| Core Web Vitals | Not enough usage data in the last 90 days, on mobile and desktop | Insufficient field data; no pass or lab score inferred |
| HTTPS | 138 HTTPS URLs; 0 non-HTTPS URLs; no issues in the last 90 days | Report updated 25 October 2026; this coverage differs from the indexed-page total |
| Crawl stats | 29,083 requests; about 339 MB; 591 ms displayed average response time | Export: 27 July–21 October 2026; both hosts show No problems |
| Structured data reports | Review snippets 1,072 valid / 0 invalid; breadcrumbs 121 / 0; product snippets 8 / 0 | No issues shown in the last 90 days; validity does not verify the truth of claims or guarantee display |
| Links | 16 external links reported, all targeting the homepage; 53,442 internal links | GSC report counts, not an exhaustive independent backlink crawl |

The initial connected reporting provider was blocked by an expired trial. Approved direct browser access subsequently provided the observations and exports recorded here. No settings were changed. Settings showed that the current user was not a verified owner, the property-added date was 25 October 2026, and generative AI inclusion was already set to Include. These observations do not imply that the property itself is unverified.

## Why pages are not indexed

These counts belong to the **16 October** report. Not every exclusion is an error, and the list is not a statement that all 1,313 pages need indexing.

| Reason | Pages | Existing validation state | Action |
| --- | ---: | --- | --- |
| Discovered – currently not indexed | 522 | Started 16 September | Inspect representative useful pages, internal discovery and duplication before expanding publication. |
| Excluded by noindex tag | 401 | Not started | Distinguish intentional exclusions from wanted pages. Do not remove noindex globally. |
| Page with redirect | 157 | Not started | Confirm the destination is appropriate; an intended redirect normally should not be indexed separately. |
| Crawled – currently not indexed | 90 | Failed 5 September; started 29 August | Review page usefulness, duplication, stable canonicals and rendered HTML. |
| Duplicate without user-selected canonical | 85 | Failed 15 September; started 4 September | Resolve exact equivalents against indexed/inspection evidence; do not migrate every old spelling automatically. |
| Not found (404) | 36 | Started 3 September | Restore genuinely needed legacy URLs or an exact equivalent where appropriate; retain proper 404 for unrelated/deleted content. |
| Soft 404 | 19 | Not started | Avoid empty/homepage fallbacks; serve useful content or a genuine 404. |
| Alternate page with proper canonical tag | 3 | Not started | Check the preferred target; this can be intentional. |
| Duplicate, Google chose different canonical than user | 0 | N/A | No affected pages in this snapshot. |

The existing 401-page noindex bucket is **not** the updated package's new-market review gate. They are different observations. New market pages still need editorial approval; historical impressions alone do not establish that an existing noindex should be reversed.

## Three exact URL inspections

These are the only three fresh URL Inspection checks recorded during this audit. The 1,000 indexed export examples are dated report evidence, not 1,000 fresh individual inspections. Crawl times below are as displayed by GSC.

| Exact path | Observation on 25 October | Crawl / canonical evidence | Release implication |
| --- | --- | --- | --- |
| `/freelance-digital-marketing-consultant/manchester-uk` | On Google; indexed | Last crawl 17 October 03:23:49 AM; Smartphone; crawl allowed; fetch successful; indexing allowed. No user canonical; Google canonical is this inspected URL. | Preserve the observed indexed old path rather than automatically redirecting or canonicalizing it to a new spelling. |
| `/freelancer-digital-marketing-consultant/manchester-uk` | Not indexed; Discovered – currently not indexed | No crawl recorded; root sitemap referenced; canonicals unavailable. | Discovery of the newer spelling is not evidence that it should replace the indexed old path. |
| `/freelance-digital-marketing-consultant/laxmi-nagar-delhi` | Not on Google; excluded by noindex robots tag | Last crawl 24 October 22:18:01; fetch successful; indexing disallowed; no canonical recorded. | Preserve exact legacy-route compatibility, but do not automatically remove noindex. Its 17 historical AI impressions do not override the current inspection. |

The canonical preservation policy uses exported indexed examples and current inspection evidence. Historical Web/AI URLs are retained for compatibility where justified, but **historical performance alone does not grant automatic indexing approval**. Unobserved URL pairs still require checks; the capped export cannot prove the state of every one of the 2,333 reported indexed pages.

## Sitemaps and crawl health

| Current submitted sitemap | Status | Submitted / last read | Discovered pages |
| --- | --- | --- | ---: |
| `https://rajeevfreelancer.com/sitemap.xml` | Success | 4 September / 22 October 2026 | 2,095 |
| `https://www.rajeevfreelancer.com/api/sitemap.xml` | Success | 4 September / 22 October 2026 | 2,095 |

These entries share URLs: **do not add them to claim 4,190 pages**. The current canonical sitemap index references the www API child. Three older entries still show historical errors: a www HTTPS sitemap last read in 2022 could not be fetched; HTTP non-www and HTTP www entries show one error with last reads in 2022 and 2023 respectively. No sitemap was removed or submitted during the audit. Review obsolete entries only after deployment and successful processing of the intended canonical sitemap.

All four reported HTTP/HTTPS and www/non-www robots files were fetched, valid and issue-free; each displayed 743 bytes, with checks dated 5–8 October. Crawl Stats shows both hosts healthy: non-www 28,611 requests and www 472. Across the exported 27 July–21 October window, responses were **89.27% HTTP 200 and 10.17% HTTP 404**. Other listed response groups—301, unreachable and 5xx—were each below 1%. JSON accounted for 44.25% and HTML 43.86%; refresh 80.84% and discovery 19.16%.

The exact download total is 338,797,390 bytes. The request-weighted response estimate is 590.908 ms, calculated from rounded daily averages; 591 ms is the displayed headline. Ratios are rounded and should not be turned into exact request totals. The 404 proportion includes requests beyond indexable pages, including unrelated legacy assets. It is not evidence that 10.17% of all useful pages need to be restored.

## Search opportunity and off-page work

| Country | Web clicks | Web impressions |
| --- | ---: | ---: |
| India | 170 | 6,149 |
| Qatar | 13 | 142 |
| Ireland | 10 | 462 |
| United Arab Emirates | 10 | 246 |
| United Kingdom | 9 | 2,239 |
| United States | 4 | 1,404 |

Desktop contributed 184 clicks / 10,054 impressions; mobile 97 / 4,667; tablet 6 / 48. Use relevant query-and-page evidence when choosing markets to improve. UK/US impressions with relatively few clicks are a review opportunity, not proof that changing titles will fix the result. Existing metadata is protected in this release; any later rewrite should be a deliberate, measurable editorial decision.

The reported external-link sample is concentrated: 13 from sitelike, and one each from LinkedIn, tonyoga and yellowpages. Build genuine client references, accurate business citations and relevant editorial mentions. This sample alone does not establish that a link is harmful and does not justify automatic disavowal. No link campaign or disavow action was performed.

The Beta generative AI report demonstrates historical impressions within Google's Search reporting. Its chart and country aggregates total 608, while the 318 page rows sum to 635; retain those different aggregation levels rather than substituting a page-row sum for the headline. It does not supply observed click totals here, verify citations in every assistant, or guarantee future AI visibility. Keep it separate from Web metrics and from Google Business Profile performance.

## Priority actions

1. **Protect observed indexed URLs.** Check the exact-path canonical decisions and legacy aliases against the exported indexed examples and three current inspections. Avoid a blanket old-to-new service-spelling migration; preserve existing title/description text.
2. **Finish and test legacy compatibility before deployment.** The initial package comparison found 232 canonical changes and two local 404 responses among 1,000 indexed examples. Historical Web/AI examples also exposed local route gaps. These are comparisons with the package fixture, not counts of current live-site 404s. Final remediation results belong in the release checks, not in the historical baseline.
3. **Review exclusions by intent, read-only.** Record recommendations for wanted duplicates, soft 404s and genuinely useful missing URLs without changing any existing/indexed metadata or body. Keep intentional exclusions distinct. Do not claim every exclusion is fixed or should be indexed.
4. **Deploy with the existing database and metadata intact.** Then test initial HTML, canonicals, status codes, robots, live forms and the canonical sitemap. None of the local source changes has been deployed during this audit.
5. **Monitor reprocessing after deployment.** Compare the same Web date ranges, inspect affected exact URLs, review sitemap processing and validate a known resolved issue only after live verification. No indexing request or validation was initiated here.
6. **Develop useful evidence for priority markets.** Add genuine project examples, accurate profile information and purposeful internal links. Approve new location pages individually; do not publish every combination solely to raise URL counts.
7. **Measure real experience and conversions.** CWV has insufficient field data, and the PageSpeed API was quota-limited. Obtain an actual lab measurement and measure qualified enquiries alongside search clicks when production access is available.

## Evidence and limits

- [Machine-readable audit](search-console-access.json), [export manifest](gsc-exports/manifest.json), [three URL inspections](gsc-url-inspections.json), [crawl summary](gsc-crawl-stats-summary.json).
- [Baseline package comparison](gsc-indexing-comparison.json), [active URL inventory](gsc-active-url-inventory.json), [canonical decision evidence](gsc-applied-canonical-decisions.json), and [release checks](release-checks.json) serve different purposes. Do not describe a baseline fixture failure as a current live failure or a post-fix result.
- The indexed examples export contains 1,000 of 2,333 reported URLs; 1,333 were not individually enumerated. Web query and page exports each contain a maximum of 1,000 rows. Only three fresh individual inspections were performed.
- Page indexing, Web history, AI impressions, HTTPS coverage and local checks have different dates and populations. Their totals must not be summed or treated as interchangeable.
- GSC can lag live changes. Aggregate counts and three inspections do not prove that every indexed URL is healthy today. Existing report validation states were observed, not restarted.
- “Valid” review snippets describe the reported markup state. They do not verify customer-review authenticity or justify publishing unsupported ratings; the release's verification controls remain necessary.
- Google Business Profile ownership, categories, address eligibility and performance remain separately unverified. See [Business Profile audit](GOOGLE-BUSINESS-AUDIT.md).

The Search Console review itself was read-only: no GSC setting, sitemap submission, indexing request or fix validation changed, and no Business Profile mutation was performed. Later task execution created one NEW CMS article and admin-marked it Published; its public visibility remains unconfirmed pending the user's server deployment. No application deployment or existing-post overwrite was performed. Bing single-site addition and Brave homepage acceptance are separate discovery actions; see [latest execution status](EXECUTION-STATUS.md). Existing/indexed bodies and metadata are now strictly read-only. This report makes no ranking, indexing, rich-result or AI-citation guarantee.
