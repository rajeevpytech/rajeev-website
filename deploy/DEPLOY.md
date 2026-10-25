# Latest Work CMS update

The current package also includes the redesigned homepage, industry/service-filtered Work collection, real project previews and Admin Work/Case Study submission forms. See `docs/WORK-CMS.md` and `docs/WORK-RELEASE-VERIFICATION.json`. Deploy **both** backend and built frontend; keep the existing MongoDB, environment, uploads and admin account. The new `portfolio_projects` collection is created/indexed without rewriting existing pages. Later Admin publications require no rebuild.

After restart, check `/admin`, `/work`, one existing indexed URL and one project detail. Publish a controlled project, confirm its homepage/Work/sitemap visibility, then save it as draft and confirm public404. Verify a real image upload with the existing storage configuration.

# Deploy without replacing the existing database

This package updates the existing Rajeev Freelancer application. Keep the current MongoDB database, environment values, media storage and admin credentials. Existing landing-page documents hold the live title/description text and must be retained.

1. Back up the existing code, backend `.env`, Nginx configuration and MongoDB database before deploying. Record the current systemd service name, API port and project directory. Do not guess these from the example Nginx file.
2. Extract this ZIP into a staging directory. Compare `docs/FILE-CHANGES.md`, then copy the application source into the existing project. Preserve `.env`, the virtual environment, existing uploads/media and operational files. Do not use a destructive reset or database reseed.
3. Build the frontend with Node 20 or later and Python 3 available:

   ```bash
   cd frontend
   npm ci --legacy-peer-deps
   npm run build
   npm run check:seo
   ```

   The lockfile is included. Optional Emergent visual-edit tooling is no longer needed for production builds. Python exports the catalog; CRA creates the browser bundle; the final step writes full HTML and canonical-only sitemap shards. `frontend/build` is also supplied from the verified build.
4. Update backend dependencies in the existing virtual environment using `backend/requirements.txt`, including `cryptography==50.0.0` for encrypted API settings. Run the backend from its own directory. Set `FRONTEND_BUILD_DIR` to the absolute `frontend/build` path if the default adjacent directory is not used. Keep the same `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, mail settings and API port. Complete the encrypted API storage prerequisite below before saving provider keys in Admin.
5. Apply the routing pattern in `nginx-routes.conf.example` to the current HTTPS server, substituting the **actual existing API port and project path**. Keep certificate settings. Route dynamic pages and root crawl files to FastAPI; serve hashed `/static/` assets with long cache headers. Remove conflicting SPA fallback locations.
6. Restart the actual existing application service. Run `nginx -t`, then reload Nginx only when validation succeeds. Check `/api/health` and the URLs below. Keep the code/config/database backups for rollback.

## Live acceptance

- `/`, `/about`, `/pricing`, `/us`, `/uk`, `/de`, `/locations`, and a country page contain their own content and metadata in **View Page Source**.
- Both `/freelancer-website-developer` and the uploaded `/freelance-website-developer` still work. Exact indexed-export and URL Inspection evidence takes precedence over the default live spelling. Canonical targets and internal links share this policy; noindex targets cannot silently become canonical destinations.
- Check an existing live city page and a stored page outside the bundled catalog. Its existing metadata must remain intact.
- Check `/freelancer-website-developer/laxmi-nagar-india`. It is a new market page, rendered with remote-delivery context and kept out of the sitemap until reviewed.
- `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/feed.xml` and `/api/sitemaps/content.xml` return their correct content types for GET and HEAD. `/api/sitemap.xml` redirects to the root sitemap.
- A random nonexistent URL returns HTTP 404 and noindex; an unpublished blog/case URL returns 404. An admin URL is not indexable.
- Confirm API forms, admin login, enquiries, email and messaging after deployment against the existing production configuration. A signed-in production Admin session was observed during the CMS review; that does not verify the new deployed login flow, email, messaging or AI provider credentials.

## Encrypted Admin API Settings

The new Admin → API Settings panel configures text generation and cover-image providers separately. It does not supply a valid provider key or resolve the recorded upstream HTTP 401 by itself. The 401 remains unresolved until a valid key for the selected provider is supplied and the relevant operation actually succeeds. No real provider key or successful provider generation was established by local QA; provider tests used mocked responses.

1. Install the backend requirements in the existing virtual environment. Generate a **dedicated, stable** Fernet protection key once using that environment's Python:

   ```bash
   python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'
   ```

   Store the output as `API_SETTINGS_ENCRYPTION_KEY` in the backend server environment, then restart the backend once to load it. Never put it in `REACT_APP_*`, browser code, committed files or a support message. `backend/.env.example` is an additive reference; do not replace the existing production `.env` with it.
2. Back up this protection key securely alongside the MongoDB backup. Provider settings are encrypted in the separate MongoDB `settings` document `_id=api_credentials_v1`; existing site settings are retained. Losing or changing the protection key makes the saved credentials unreadable. Restore the original key rather than deleting/replacing the saved ciphertext. Deliberate rotation requires a separate decrypt/re-encrypt migration.
3. A sufficiently strong, explicitly configured, stable `JWT_SECRET` can provide a context-derived compatibility fallback when the dedicated key is absent. The implementation rejects short/repetitive/common placeholder values. Keep the existing JWT secret stable; the dedicated key is preferred. An invalid dedicated key does not silently fall back to JWT. Missing/invalid protection produces an actionable Admin diagnostic and blocks saves with HTTP 503; there is no plaintext or temporary-key fallback. Environment-only generation can continue using its existing configuration when no saved vault exists.
4. Open Admin → API Settings and choose the matching provider for each purpose. The default remains **Emergent** for both text and image generation, using the existing `EMERGENT_LLM_KEY` environment fallback and original models `gemini-3-flash-preview` / `gemini-3.1-flash-image-preview`. A Google key alone does not change that provider. Direct Google requires explicit selection in Admin or `AI_TEXT_PROVIDER=google` / `AI_IMAGE_PROVIDER=google`; it uses `GEMINI_API_KEY` or `GOOGLE_API_KEY`, with `GEMINI_IMAGE_API_KEY` / `GOOGLE_IMAGE_API_KEY` taking precedence for images. An Emergent key is never sent to direct Google.
5. Save each provider's key/model. Saved keys take precedence over the matching provider's environment key and are resolved on each generation call, without restarting. A blank password field **keeps** that provider's saved key. **Clear saved override** removes only that saved key; a matching environment key may remain active. Changing provider never reuses the other provider's key. Keys are never returned to the browser. Existing environment model overrides are preserved when saving only a key.
6. Saving or opening the panel makes no provider request. Run an explicit check using the saved settings: Google checks credential/model metadata access only, without generating text or images; Emergent text sends a minimal request that may use provider quota; Emergent image reports readiness only and makes no provider request. Neither a saved key nor an image readiness/model lookup result proves cover generation or automatic publishing works. Verify an explicitly requested controlled draft and cover operation before declaring the recorded AI failure resolved. Check the provider account's permissions, model access, quota and billing if it still fails. Test errors are sanitized; do not paste keys into logs or tickets.

The API endpoints are authenticated: `GET/PUT /api/admin/api-settings` and `POST /api/admin/api-settings/test`. An application HTTP 401 still means the Admin session needs authentication; a sanitized upstream 401 diagnostic refers to the selected provider credential/access.

## Google Search Console and existing indexing

Authenticated read-only review on 25 October 2026 observed 2,333 indexed / 1,313 not indexed in the Page indexing report last updated 16 October. The indexed export contains only 1,000 examples; three exact URLs were freshly inspected, not all 2,333. The public sitemap snapshot contained 2,095 unique URLs, which is a different measurement. Existing MongoDB landing records remain supported even when absent from the uploaded catalog. `docs/live-url-inventory.json` records the public snapshot; `docs/SEARCH-CONSOLE-FINDINGS.md` and `docs/search-console-access.json` record the account baseline.

Use the exact GSC preservation decisions rather than assuming every old service spelling should move to the newer one. The inspected old Manchester URL was indexed with itself selected by Google; its new spelling was only discovered. The Laxmi Nagar legacy URL had a current noindex exclusion despite historical impressions, so historical Web/AI activity alone does not authorise indexing. Existing noindex exclusions and the new-market editorial gate are separate.

Both current sitemap submissions were successful, last read 22 October, with 2,095 discovered URLs each; the URLs overlap and must not be summed. Three much older sitemap entries retain historical errors. Do not remove a working submission or start fix validation merely to tidy the report; first verify the deployed canonical sitemap and exact affected URLs. No GSC submissions or settings were changed during its read-only audit. Bing site addition and Brave homepage acceptance are separately recorded in `docs/EXECUTION-STATUS.md`.

Baseline Web performance for 24 July–23 October was 287 clicks / 14,769 impressions. Preserve that date range for later comparison. The Beta AI report's 608 impressions across 318 pages form a separate/subset view, not an extra total. Manual actions and Security issues were clear when observed; CWV was insufficient-data on both devices, not a pass. Recheck after deployment as Google reprocesses the site.

After deployment, inspect representative existing and new URLs. Confirm Google's selected canonical for each proposed migration; the capped export cannot establish the state of every indexed URL. Do not use Change of Address: the domain is unchanged. Submit `https://rajeevfreelancer.com/sitemap.xml`; inspect sitemap processing, exclusions and selected canonicals. Monitor existing page clicks/impressions separately from new pages. No Search Console settings or indexing requests were changed by this package.

In Admin → SEO tools, load a **new** location page, review its visible copy, source context, contact and delivery details, then approve it. Approval makes that new page eligible for the dynamic sitemap and notifies participating IndexNow engines when configured. Google is not an IndexNow participant. Existing pages are not put through a blanket noindex migration.

## Content and settings snapshots

`frontend/src/seo/live-route-meta.json` preserves current live metadata captured through the rendered public website. Original uploaded metadata declarations remain in source; this exact-path map takes precedence for observed live routes. `live-site-settings.json` retains public site settings for the initial build, including the current contact and marketing state. Review and refresh these snapshots when the owner intentionally changes live metadata/settings; ordinary location additions do not require editing them.

Google Business review counts, testimonials and a customer-facing office are displayed only when their explicit verification settings are enabled. Keep them disabled until verified against the actual business. Remote coverage does not create eligibility for a Google profile in every country.

## Current deployment-first boundary

The user will deploy the latest ZIP before further live verification. The remote-scoping CMS post already exists and is admin-marked Published: `/blog/scope-remote-website-project`, created/published date 25 October 2026, count 31→32. Do not reseed, recreate or edit it; public article content is still unconfirmed. After deploying, check its public body and links, and check the exact `BingSiteAuth.xml` endpoint before returning to Bing ownership verification. Do not call admin publication public verification.

All existing/indexed page/post metadata and bodies are read-only. Preserve the 471 base location records and 63 legacy geography aliases. New candidate capacity stays separate and review-gated, outside automatic XML/publication. The two existing-intent source references cannot be merged or applied. The two new global guides remain unpublished drafts.

Existing AI autopilot is enabled but its last observed failure is upstream Google HTTP 401 invalid key. No secret value was read. A manual CMS post does not repair automatic generation; verify a real successful run only after the authorised credential configuration is resolved. The weekly 13-occurrence review is a separate enabled review/draft task. No application deployment or existing-post overwrite was performed in this task.

## Startup content preservation

The second-review release removes automatic blog/case-study seeding and slug normalization on restart. Existing CMS URLs and content remain authoritative, and deleted/missing bundled seed articles stay absent. Retain the production database; a fresh installation requires deliberate editorial setup through Admin. Do not run source seed helpers or a slug migration as part of this deployment. See `docs/RECHECK-FIXES.md` and the two startup regressions.
