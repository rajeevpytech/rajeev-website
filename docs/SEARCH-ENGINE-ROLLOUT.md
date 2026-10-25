# Search engine rollout — Rajeev Freelancer

Updated 25 October 2026. This is a practical execution order for worldwide remote services, not a market-share or ranking table. The latest application code is prepared for the user to deploy to the server. Existing/indexed page and post titles, descriptions, slugs and bodies remain read-only.

| Priority | Provider | Work and actual status |
| --- | --- | --- |
| 1 | Google | Authenticated read-only Search Console audit completed. No GSC settings, sitemap submissions, indexing requests or fix validations changed. See `SEARCH-CONSOLE-FINDINGS.md`. |
| 2 | Bing | Signed in and manually added only `https://rajeevfreelancer.com/`. Ownership remains unverified because Bing could not fetch the XML file from the current live root. The verification file is included; sitemap submission is unconfirmed. No broad GSC account import was performed. |
| 3 | Yahoo / DuckDuckGo | Complete Bing verification first. Yahoo directs website submission through Bing; most DuckDuckGo organic links come from Bing, alongside other sources. No separate submission or automatic inclusion is claimed. |
| 4 | Brave Search | Only the homepage was submitted through the official form, with Success confirmation observed. Acceptance does not confirm crawling, indexing or ranking. |
| 5 | Yandex / Naver / Seznam.cz / Yep | IndexNow readiness is included. Actual notifications and regional verification depend on configuration, approved new content and relevant language/audience. No submission to these providers is claimed. |
| 6 | Baidu | Consider a separate workflow if real Chinese-language demand/content warrants it. Not submitted. |

Browsers such as Chrome, Edge, Safari, Firefox, Brave and Opera use a selected search provider; there is no single browser-submission process that establishes visibility everywhere.

## Finish Bing after server deployment

The operation was limited to manually adding this one website. No broad import of other Search Console properties was used.

1. Deploy the exact included `frontend/public/BingSiteAuth.xml` so it is publicly available at `https://rajeevfreelancer.com/BingSiteAuth.xml`. It is a public verification file, not a login password or API credential.
2. The release serves that file through FastAPI with GET and HEAD. Use the actual existing server paths/port and the deployment instructions; do not replace the database or operational configuration.
3. After the file is available, return to this site's Bing verification panel and verify ownership. DNS verification is an alternative owner-controlled route; it was not performed here.
4. Only after ownership is confirmed, submit `https://rajeevfreelancer.com/sitemap.xml` and inspect processing. Do not submit noindex, unreviewed candidate URLs or invented local-presence pages.
5. Keep notification acceptance, successful crawling and index inclusion as separate evidence. Retained IndexNow settings are supported; missing settings do not silently create a key or enable submissions. Existing page/post content remains read-only.

## CMS publication and public visibility

Production Admin authentication was confirmed. The original 31 published posts were reviewed by title/slug, then **one NEW post** was created and admin-marked Published: `/blog/scope-remote-website-project`, on 25 October 2026. The observed published count became 32. No existing post was overwritten, and the newly created post is now also protected from edits or duplicate creation.

**Public article content remains unconfirmed pending deployment.** The current public listing/direct page returned the existing shell without verified article content. Do not describe the CMS status as a publicly verified live article. The user will deploy the latest code first; verify the public body and links afterwards.

The content plan contains five complete texts: two read-only existing-review references, two new unpublished articles, and this one CMS-created/admin-published article with public verification pending. Eight briefs remain within the original 13-week programme. Reference texts must not be merged into existing posts or queued as duplicate new posts.

## Production prerequisites and automatic publishing

Deploy the backend dependencies and matched frontend build using [the deployment guide](../deploy/DEPLOY.md). The encrypted Admin API Settings feature requires a stable backend protection key and a retained backup alongside the existing database. Keep provider credentials on the backend; saving settings and validating actual generation are separate steps. Follow the API owner's setup and test limitations in the deployment documentation.

The existing production AI autopilot was enabled daily at 09:00 IST, with auto-publish, dedupe and cover generation enabled. At observation its queue was empty, generated count was zero, no successful run was shown, and the latest failure was **upstream Google HTTP 401: invalid API key**. No key value was read. The new API Settings controls do not establish that the production error has been resolved. A valid selected-provider configuration and an actual successful generation run must be verified after deployment; manual CMS article creation does not prove automatic publishing works.

The separate 90-day application workflow is not activated merely by saving the source files. Preserve the existing database, credentials, queues, provider defaults and publishing settings unless an explicit authorised settings change is performed.

## Scheduled review and AI discovery

A **13-occurrence Monday-morning SEO/GEO review and blog-draft task** is enabled, starting 26 October 2026 in India time. It prepares public checks, sourced drafts and legitimate action recommendations in chat. It does not deploy code or automatically publish CMS posts. The former Daily SEO Blog automation was found paused and was not silently re-enabled.

ChatGPT, Claude and Perplexity discovery also depends on the applicable provider's search access and useful crawlable content. Google indexing, an llms.txt file, structured data or allowing a crawler is not a guaranteed recommendation. See [AI search access](AI-SEARCH-ACCESS.md), [actual execution status](EXECUTION-STATUS.md), [worldwide priorities](WORLDWIDE-SEO-PRIORITIES.md), and [content/capacity constraints](CONTENT-AND-CAPACITY-CONSTRAINTS.md).

Official references: [Bing setup](https://blogs.bing.com/webmaster/2025/6/Start-Using-Bing-Webmaster-Tools-to-Improve-Your-Site-Visibility/), [Yahoo submission](https://help.yahoo.com/kb/SLN2217.html), [DuckDuckGo sources](https://duckduckgo.com/duckduckgo-help-pages/r-legal/platform-to-business-regulation), [Brave form](https://search.brave.com/submit-url), [IndexNow participants](https://www.indexnow.org/).
