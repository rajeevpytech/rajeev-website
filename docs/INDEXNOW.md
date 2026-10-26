# IndexNow readiness and configuration

Updated 25 October 2026. IndexNow tells participating search engines, including Bing, that an eligible page changed. Receipt or acceptance does **not** confirm crawling, indexing, ranking or traffic. This implementation does not submit URLs to Google Search Console.

## What is implemented

The existing administrator status, on/off control and submission feature is retained. Existing blog, case-study, publishing and warmup notification calls use a common validator. Nothing submits a URL merely because the application starts or the administrator opens a dashboard.

Configuration follows this order:

1. If any `INDEXNOW_ENABLED`, `INDEXNOW_KEY` or `INDEXNOW_AUTOMATIC_ENABLED` environment variable is explicitly present, the environment controls readiness.
2. Otherwise, the existing `settings` record with `key: "indexnow"` supplies its established `token` and `enabled` state. Reading it never replaces its token or changes its enabled state. Retained enabled configurations keep their existing automatic notification hooks, subject to validation.
3. If neither configuration exists, notifications remain disabled. No token is generated and no setting is written automatically. Configuration-read failures also prevent submissions.

The administrator can still change `enabled` for an existing stored configuration. This changes only that flag, not the token, and does not itself send a notification. An environment-controlled configuration is read-only in the dashboard. Newly configured environment-based automatic notifications require a separate explicit `INDEXNOW_AUTOMATIC_ENABLED=true`; enabling manual submission alone does not activate publishing hooks.

## Ownership file

A configured key must contain 8–128 ASCII letters, numbers or dashes. The same ownership key is made available at:

```text
https://rajeevfreelancer.com/<configured-key>.txt
```

The exact-key middleware passes unrelated requests, including `robots.txt`, `llms.txt` and ordinary assets, through unchanged. Only the exact configured valid key returns its UTF-8 text. The old `/api/indexnow-key` verification URL remains available for compatibility; outgoing notifications specify the root key-file URL instead.

This root mirror is necessary because the protocol scopes a non-root `keyLocation` to its directory. An `/api/` verification file should not be used to authorize pages elsewhere on the site. The existing key is preserved; this correction does not regenerate it. The verification file may remain readable when notifications are disabled, but that does not enable submission.

## New setup

If there is no prior configuration, generate a key on the server when the owner is ready to configure the feature:

```bash
python3 -c 'import secrets; print(secrets.token_hex(16))'
```

Add the generated value to the backend environment and explicitly choose the mode:

```dotenv
INDEXNOW_ENABLED=true
INDEXNOW_KEY=<the-generated-key>
INDEXNOW_AUTOMATIC_ENABLED=false
```

Replace the placeholder; angle brackets are not part of the key. Restart the application using the project's normal deployment procedure. First confirm that the exact root text file returns the configured value, then check the administrator readiness panel. None of these reads submits a URL. Set the automatic flag to `true` only if notifications from the existing publishing hooks are wanted.

Do not add environment overrides to an established deployment merely to display this feature: that would intentionally take precedence over its existing stored configuration.

## Submission rules

An authenticated administrator can submit a batch through `POST /api/admin/indexnow/submit`. The body accepts `urls`, or the existing `paths` field for compatibility:

```json
{"urls":["https://rajeevfreelancer.com/contact"]}
```

Each batch contains at most 100 requested URLs. Duplicate URLs are removed before sending. A mixed valid/invalid batch is rejected as a whole; it is not partially submitted. The current public HTML must be HTTP 200, indexable and self-canonical. This inherits the existing review gates for new location pages. Redirects, unavailable pages, noindex pages, unreviewed new pages and noncanonical aliases are rejected. Submitted URLs must use the exact HTTPS/non-WWW host, without a query string or fragment; admin and API paths are excluded.

There is one outbound JSON request per accepted batch, to the fixed `https://api.indexnow.org/indexnow` endpoint, with an eight-second timeout and no redirect following. The feature does not crawl arbitrary URLs. Batches larger than 100 are rejected rather than silently truncated or expanded into a site-wide submission. Only added or meaningfully updated eligible pages should be notified; do not resubmit an unchanged historical inventory.

Deletion/HTTP-404 notifications are outside this implementation's current-page eligibility policy. Do not submit removed URLs through this control.

## Reading outcomes

The administrator history distinguishes:

| State | Meaning |
|---|---|
| `queued` | A validated request was recorded before the outbound attempt. An interrupted process can leave it here; no automatic retry is started. |
| `sent`, HTTP 200 | IndexNow received the notification. Indexing is not confirmed. |
| `sent`, HTTP 202 | IndexNow accepted the notification while ownership-key validation is pending. Indexing is not confirmed. |
| `failed` | Delivery or upstream validation failed. The result records a safe reason and HTTP status when available. |
| `rejected` / `disabled` | Nothing was submitted. Eligibility or configuration must be addressed first. |

HTTP 403 commonly indicates ownership-file validation failed; 422 indicates a host/key/protocol issue; 429 indicates rate limiting. Do not retry automatically. Check the current page, configuration and Bing Webmaster Tools receipt evidence before an explicit retry. If the result includes `persistence_warning`, the network outcome could not be fully saved; history can still show `queued` and must not be interpreted as proof that no request reached the engine.

Keys are not written into submission history or error messages. History never labels a URL as indexed. Submissions are tracked in `indexnow_submissions`; the dashboard shows the most recent 15 records. No external submissions were performed while implementing or testing this feature.

## Validation and official references

The isolated tests mock HTTP, persistence and page eligibility. They cover configuration precedence, preservation of stored settings, authenticated controls, exact verification files, unsafe URL rejection, noindex/noncanonical rejection, batch limits, deduplication, queued/sent/failed states and acceptance without an indexing claim.

```bash
python -m pytest backend/tests/test_indexnow.py -q -n 0
```

Official references checked on 25 October 2026:

- [IndexNow documentation](https://www.indexnow.org/documentation): ownership files, directory scope, POST payloads and HTTP 200/202/403/422/429 meanings.
- [Bing: How to add IndexNow to your website](https://www.bing.com/indexnow/getstarted): fixed API endpoint, webmaster verification, changed-page notifications and the absence of any indexing guarantee.
