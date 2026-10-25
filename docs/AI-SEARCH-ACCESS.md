# AI search discovery and verification

The website serves the same public HTML to visitors and crawlers. Search crawling supports discovery; it does not guarantee that ChatGPT, Claude, Perplexity or Google will index, cite, recommend or rank a page.

| Purpose | User agents | Website preference |
|---|---|---|
| Search discovery | `OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot` | Public pages and the explicit public content API allowlist are accessible. |
| User-directed retrieval | `ChatGPT-User`, `Claude-User`, `Perplexity-User` | The same public/private preferences are declared. Provider behavior differs for user-initiated fetches. |
| Named model-training crawlers | `GPTBot`, `ClaudeBot` | Crawling is disallowed. Search access does not grant these agents access. |

The shared policy is `backend/ai-crawler-policy.json`. Python and the frontend build generate equivalent robots files from it. Each named group repeats the private restrictions: a specific bot group does not inherit the wildcard group's restrictions. Admin, authentication, leads, private/internal paths and unlisted API routes remain disallowed. Authentication remains the access control for private resources.

Public `noindex` pages remain crawlable so their directives can be observed. Global indexing settings still produce `noindex` HTML and suppress sitemap entries, feed items and optional LLM navigation links. New-market and observed GSC review gates remain in force. Canonical preferences continue to protect indexed examples and existing production documents.

`llms.txt` is an optional navigation aid. Canonical HTML, working links, source-backed content, consistent business identity and search access do the substantive work. Neither this file nor FAQ markup certifies expertise or guarantees AI citations. The RSS feed contains published, indexable posts only; it is not a submission endpoint to any AI provider.

Run the read-only per-page audit after the production build:

```bash
PYTHONPATH=backend python scripts/audit_ai_discovery.py
```

Its technical checks inspect HTML and declared data. Human review is still needed for employer history, project outcomes, testimonials, business address and service claims. The report distinguishes intentional review gates and editorial evidence requests from technical failures. Local editorial fixtures are labelled; they are not production copy or proof of publication.

After deployment, verify a public service page, a canonical city page and a published article can be fetched without a login or JavaScript, and that private routes remain protected. If a firewall blocks an authentic search crawler, compare the request with the provider's published identity/IP documentation. Do not grant access based solely on a user-agent string or disable authentication.

## Official sources checked on 25 October 2026

- [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots): search and training controls are independent; `ChatGPT-User` is a separate user-directed fetcher.
- [Anthropic crawler documentation](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler): distinguishes search, user retrieval and model-training agents.
- [Perplexity crawler documentation](https://docs.perplexity.ai/docs/resources/perplexity-crawlers): distinguishes search crawling and user retrieval, and provides current IP sources.
