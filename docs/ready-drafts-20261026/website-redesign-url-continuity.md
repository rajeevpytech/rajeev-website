# Redesigning a Website Without Losing Track of Existing URLs

Status: unpublished source draft. Publication approval remains pending. Reviewed against the current 32 published titles and six relevant live bodies on 26 October 2026. No live content overwritten.

A redesign can improve the way a website works without changing the address of every useful page. Before approving a new navigation or publishing platform, separate visual and technical changes from URL changes. An existing link might be used by a customer, a saved proposal, an email campaign or a search result even when it is absent from the new menu.

For a small business working with a remote development team, a simple continuity register makes these dependencies visible. The aim is an accountable migration process, not a promise that a redesign will preserve every search position.

## Decide whether a URL change is necessary

First ask what actually needs to change. A new design, content editor or hosting arrangement does not automatically require new paths. Google distinguishes moves that change URLs from infrastructure changes that do not; its migration guidance recommends planning and testing the appropriate type of move. [1]

If the current page still serves the same customer need, keeping its path can reduce avoidable decisions. Where a change is justified, record the reason and the destination before development is considered complete.

## Build a register from more than one source

Start with the current sitemap, but do not stop there. Add important landing pages from search reports, analytics, internal links and business records. If an export is limited, label the sample instead of describing it as the whole website.

Record these fields for each significant URL:

| Field | Purpose |
| --- | --- |
| Existing address | The exact path, including meaningful spelling and language |
| Customer purpose | What the visitor expects to read or do |
| Evidence | Source and date: search report, internal link or business dependency |
| Proposed treatment | Retain, redirect to a real equivalent, or deliberately retire |
| Expected response | The required status and final destination |
| Acceptance owner | Who checks the result and records the outcome |

Keep important downloads, images and form destinations in the register as well. A page can look complete while its brochure link or enquiry action still points to a retired system.

## Map by customer purpose, not by convenience

Consider a hypothetical consultancy serving customers in several countries. Its old `/services/operations-review` page explains a specific service. A redesign introduces a shorter `/operations` path. If the content and intended audience are equivalent, the team can evaluate a deliberate mapping. If the new page is merely a generic homepage, it does not meet the same expectation.

A second old page might describe a service that is no longer offered. That needs an explicit retirement decision, not an automatic redirect to whichever page is easiest to configure. Preserve a useful explanation or return an appropriate missing-page response according to the actual content decision.

Google documents permanent and temporary redirects as different signals. Use the correct behaviour for the intended move; do not choose a redirect type solely because the browser appears to reach the destination. [2]

## Preserve meaning before improving presentation

For retained pages, carry across the agreed title, description, main topic, useful content and important actions. Treat an editorial rewrite as a separate decision with its own review. This makes it easier to identify whether a problem came from routing, missing material or a changed message.

For multilingual content, record each real language variant and its relationship to the others. Do not translate an address mechanically and assume the translated page exists. For international enquiry forms, check the same journey with an appropriate test name, country code and contact preference rather than assuming every visitor uses the business's local format.

## Test the server response and the visitor journey

A migration test should check more than “the page opens.” For each important case, verify the response, final URL, visible content, preferred-URL signals and navigation links. Also try the page directly in a fresh session.

A successful HTTP response alone does not establish search eligibility or quality. Google's status-code guidance explains that content behind a success response may still be an error or empty result, and that success does not guarantee indexing. [3]

Check the enquiry or purchase action separately. Confirm that a submission reaches the intended system and that the responsible person can find it. Use synthetic data and log the actual result. A front-end success message is not evidence of a delivered notification.

## Update internal discovery and keep launch reversible

Update navigation and contextual links to the agreed preferred pages. Use meaningful link text and proper links rather than click-only interface elements. Google's linking guidance supports crawlable links that help visitors understand where they lead. [4]

Before launch, save the current routing/configuration, agree the rollback trigger and identify the person able to restore service. Confirm that the preview environment's access and indexing restrictions will not accidentally be copied to wanted public pages. Recheck important journeys immediately after the production change.

## Monitor the same evidence after launch

Keep a dated change log and compare the same page groups and report periods. Search systems need time to process changes; Google notes that significant moves can cause temporary fluctuations. [1] Investigate a specific affected path before making another broad change.

A useful completion report states what was retained, what moved, what was retired, which samples were checked and what remains unverified. It should not present a successful deployment as proof that every search engine has accepted the result.

If you are preparing a redesign, [send the current website and important customer journeys](/contact). You can also [review website development services](/freelancer-website-developer) and identify which changes genuinely require new URLs before agreeing the build.

## Sources

Researched 25 October 2026. The register and consultancy example are original planning aids; the example does not describe an actual client.

1. [Google Search Central: Site moves with URL changes](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)
2. [Google Search Central: Redirects](https://developers.google.com/search/docs/crawling-indexing/301-redirects)
3. [Google crawling documentation: HTTP status codes](https://developers.google.com/crawling/docs/troubleshooting/http-status-codes)
4. [Google Search Central: Crawlable links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)
