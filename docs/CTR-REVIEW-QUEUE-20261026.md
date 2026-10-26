# Search click review queue

Prepared 26 October 2026 from the prior authenticated Search Console export recorded in `SEARCH-CONSOLE-FINDINGS.md`. Period: 24 July through 23 October 2026. No fresh GSC query, title edit, indexing request or publication is represented here.

## What the dated figures imply

The property recorded 287 clicks, 14,769 impressions, displayed CTR 1.9 percent and average position 20.8. These are different from a forecast. Country and query mixes matter: a low overall CTR does not establish that the homepage headline is the cause.

| Country | Clicks | Impressions | Exported CTR | Average position |
| --- | ---: | ---: | ---: | ---: |
| India | 170 | 6,149 | 2.76% | 17.59 |
| UK | 9 | 2,239 | 0.40% | 26.70 |
| US | 4 | 1,404 | 0.28% | 18.49 |
| Australia | 1 | 633 | 0.16% | 31.52 |
| Ireland | 10 | 462 | 2.16% | 23.85 |
| UAE | 10 | 246 | 4.07% | 17.30 |

UK/US data supports investigating relevance and visibility as well as snippets. UAE has fewer impressions and a different position/query mix; it does not prove that the UAE offer converts better. The samples do not contain qualified-lead or revenue attribution.

## First query reviews

| Query | Clicks | Impressions | Average position | Proposed investigation |
| --- | ---: | ---: | ---: | --- |
| rajiv wellington | 0 | 657 | 9.21 | Likely unrelated name/entity intent. Inspect the matching page/query in GSC before optimizing for this phrase. |
| seo freelancer in delhi | 1 | 155 | 44.08 | Ranking/relevance opportunity. Review useful proof and exact route; a snippet-only test is insufficient. |
| freelance seo leeds | 0 | 143 | 23.61 | Confirm matching landing page and remote-delivery fit. |
| seo freelancer brisbane | 0 | 139 | 42.53 | Lower initial priority unless real enquiry or client relevance supports it. |
| seo freelancer leeds | 1 | 115 | 17.18 | Investigate canonical and intent overlap alongside the related Leeds query. |
| best freelance digital marketer in riyadh | 0 | 80 | 8.95 | Small top-ten review cohort; inspect country, device and displayed result. |
| seo freelancer in noida | 0 | 78 | 15.49 | Review local relevance and service proof; monitor before expanding pages. |
| seo freelancer in ahmedabad | 1 | 72 | 7.74 | Candidate snippet/intent review, but sample is too small for a quick confident CTR conclusion. |

Query averages and page averages are separate aggregations. The next step is a combined query/page/country/device view, not assuming that the most visible query caused every impression on a page.

## First exact page reviews

- `/freelancer-ai-consultant/wellington-new-zealand`: 0 clicks / 589 impressions, position 8.97. Review intent and entity ambiguity; do not assume demand for AI work.
- `/whatsapp-marketing-freelancer/wellington-new-zealand`: 0 / 344, position 8.47. Investigate the same issue independently; do not merge pages solely because both mention Wellington.
- `/freelance-digital-marketing-consultant/riyadh-saudi-arabia`: 3 / 346, CTR 0.87 percent, position 8.76. Inspect actual queries and displayed result.
- `/freelance-seo-expert/delhi-india`: 2 / 241, position 38.52, and `/freelancer-seo-expert/delhi-india`: 1 / 193, position 64.46. Inspect Google's selected canonical and query overlap before any consolidation. Preserve the existing exact-path policy.
- `/`: 25 / 360, CTR 6.94 percent, position 9.18. Improve visitor clarity and enquiry measurement, but do not infer that its snippet is the principal cause of the site's low aggregate CTR.

## Review protocol

1. Finish deployment and record release date.
2. Obtain a fresh complete 28 day export and the preceding 28 days, with 90 day context. Use the historical figures above as a separate baseline.
3. Filter exact query and page together, then country and device. Keep branded/name queries separate from commercial non-branded searches.
4. Inspect the real result and page proof. Prepare at most five specific editorial proposals, including before/after wording and expected buyer relevance.
5. Keep existing title, description, slug and body unchanged until the specific proposal is approved. Review/measurement changes in this patch do not apply those proposals.
6. Record recrawl, position changes, impressions, clicks and qualified leads. Extend observation for small samples. Do not attribute all change to one edit without checking other causes.

Source query and page exports are capped at 1,000 rows; anonymized queries and aggregation differences limit reconciliation. No raw account exports, secrets or personal enquiries are added to the repository by this work.
