# SEO execution foundation

Prepared 26 October 2026. This is implementation work on top of release `4b900c8`, not completion of the 90 day programme or proof of ranking changes.

## Changes ready for deployment

- The existing homepage, 36-entry portfolio, Work/Case Study CMS and HTML rendering remain in the release.
- The added read-only acceptance command tests 20 priority URLs against the built release, plus admin indexing, a true 404, database health, robots, sitemap, feed and emitted local bundles. It detects a successful HTTP response containing an empty application shell or wrong metadata.
- Public journey events distinguish stored form receipts, contact actions, portfolio filters, project opens and case-study opens. Filters send taxonomy and a search-present flag, never the typed search text. Custom event payloads exclude form contents, query strings and full external project URLs.
- A form success requires the API's `ok: true` and receipt ID. A successful stored lead and a delivered notification remain separate conditions; notification delivery still needs production verification.
- Existing titles, descriptions, slugs, page bodies, canonical decisions and review gates are preserved. No source seed, bulk indexing or content rewrite is introduced.
- The full release harness now requests portfolio pages within the API's existing 60-row maximum. Its previous 100-row request returned 422 during verification; the API limit and public behavior are unchanged.

## Developer handover

Use the actual existing directory, service name, port, database and environment. Take backups first and follow `deploy/DEPLOY.md`. Do not replace production environment values or database content.

1. Build the frontend and run its SEO check:

   ```bash
   cd frontend
   npm ci --legacy-peer-deps
   npm run build
   npm run check:seo
   ```

2. From the repository root, verify the local application using the actual API port:

   ```bash
   python3 scripts/verify_live_deployment.py --base-url http://127.0.0.1:ACTUAL_PORT --output /tmp/rajeev-local-acceptance.json
   ```

   Replace `ACTUAL_PORT` before running. The command needs the generated `frontend/build/seo-manifest.json`. It performs GET requests only. An exit code of 1 means failures require review, and 2 means a configuration or build prerequisite is missing. A missing priority route cannot be silently skipped. The four database-rendered routes have explicit expectations in `deploy/priority-url-checks.json` because they do not appear in the static build manifest.

3. Apply the existing Nginx routing example to the real server configuration, validate with `nginx -t`, restart the actual application service and reload only valid Nginx configuration. Test the public origin:

   ```bash
   python3 scripts/verify_live_deployment.py --base-url https://rajeevfreelancer.com --output /tmp/rajeev-public-acceptance.json
   ```

4. Inspect Google-selected canonicals after deployment. Do not treat this HTTP report as indexing or ranking verification. Preserve the exact-path decisions in the existing GSC policy.

## Activate and validate measurement

The code uses the existing Admin Site Settings tracking fields. No GA property, measurement ID, Ads account, tag manager or new tracking service was created. Empty IDs keep measurement disabled. Existing valid GA4 and Google Ads configuration is required.

SPA page views are now sent explicitly with public paths and without query strings. In GA4 Enhanced Measurement, turn off history-based page-change measurement when using this implementation, to avoid duplicate route views. Also review automatic outbound/form measurement if those reports would duplicate the named custom events. This account configuration is not changed by the code.

| Event | Meaning | Do not infer |
| --- | --- | --- |
| `page_view` | Public route view, excluding admin/API and private-looking paths | A unique person or qualified visit |
| `generate_lead` | The lead API returned a successful stored receipt | Email or WhatsApp notification delivery |
| `whatsapp_click` | A link to the configured business WhatsApp number was clicked | A message was sent |
| `phone_click` or `email_click` | The configured business contact link was clicked | A completed call or email |
| `work_open` | A controlled project link was clicked, with details/live/demo kind | Successful loading of the external client website |
| `case_study_open` | A case-study link was clicked | The whole article was read |
| `portfolio_filter` | Industry/service/search selection changed | The free-text query or a lead |

In DebugView or a test property, verify one route transition, one contact click and one controlled form receipt. Use only the stored receipt event as the form lead event. Confirm it is counted once. Compare test activity with the Admin lead and its separate notification delivery status. Disable/remove test data using the established operating procedure, not a seed reset.

These protections concern custom event payloads. They are not a claim that every vendor's automatic collection or every other existing website script has been audited. Configure privacy/consent and vendor settings according to the business's actual audience and requirements.

## Work that remains external or time dependent

- VPS installation, correct live proxy routing, a production form test and real notification delivery.
- Valid provider credentials and a successful generation test; local mock tests are not proof of a working provider account.
- Bing ownership, Google Business Profile eligibility/verification, and fresh Search Console/Analytics reports.
- Client evidence and permission for eight detailed case studies. Existing portfolio entries are not reclassified by this patch.
- The 13 week content programme, editorial approvals, authorized outreach, and ranking/AI visibility observation over time.

The dated export interpretation and first review queue are in `CTR-REVIEW-QUEUE-20261026.md`. Its figures describe the historical export, not current performance after these changes.
