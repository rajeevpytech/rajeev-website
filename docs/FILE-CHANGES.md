# Latest homepage and Work CMS changes

- `backend/portfolio.py`, `portfolio-projects.json`: catalog, persistent authenticated CRUD,40 industry choices,10 service choices and combined public filters.
- `backend/server.py`: register Work routes; extend case studies with client/live link/gallery validation and stable URLs.
- `backend/public_seo.py`: live Work HTML, homepage publication updates and current project sitemap entries.
- `frontend/src/pages/admin/WorkManager.jsx`, `ProjectFields.jsx`, `CaseStudyManager.jsx`, `ImageUpload.jsx`, `Admin.jsx`: submission, editing, gallery, industry/services and draft/publication workflow.
- `frontend/src/pages/Home.jsx`, `WorkIndex.jsx`, `WorkDetail.jsx`, `CaseStudies.jsx`, `CaseStudyDetail.jsx`, `components/WorkCard.jsx`, `lib/portfolio.js`: homepage redesign, public filters, live links and project stories.
- `frontend/src/App.js`, `src/ssr/entry-server.jsx`, `components/Nav.jsx`, `components/Footer.jsx`, `scripts/export-catalog.py`, `src/seo/home-portfolio.json`: routes, navigation and reproducible initial snapshot.
- `frontend/public/assets/work/`: actual public homepage screenshots in a uniform1440×900 frame.
- Backend CMS/public HTML tests and frontend admin interaction regression; deployment notes and release verification.
- Preservation exception extended only to owner-authorized homepage visible content/links; its SEO metadata and every other original static page remain protected.

The existing SEO/GEO expansion and earlier preservation fixes remain included below.

# File changes against the uploaded Rajeev ZIP

This list covers the whole Rajeev Freelancer task, including earlier rendering/safety work and the second-review fixes. File modifications do not imply changes to existing SEO titles/descriptions. All 277 pre-expansion static pages still compare unchanged in main content, metadata and links.

One NEW CMS post was admin-marked Published; no existing post was overwritten. Application deployment and live API-generation verification remain pending. The second review removes automatic startup slug changes and source-content resurrection, and fixes Admin provider recovery while preserving the valid other provider. See `RECHECK-FIXES.md`.

## Modified original files

46 files.

- `README.md`
- `backend/autopilot.py`
- `backend/data.py`
- `backend/server.py`
- `frontend/package.json`
- `frontend/public/index.html`
- `frontend/public/llms.txt`
- `frontend/public/robots.txt`
- `frontend/src/App.js`
- `frontend/src/components/Counter.jsx`
- `frontend/src/components/ExitIntentOffer.jsx`
- `frontend/src/components/Footer.jsx`
- `frontend/src/components/GoogleBusinessCTA.jsx`
- `frontend/src/components/Nav.jsx`
- `frontend/src/components/OfferCountdown.jsx`
- `frontend/src/components/OffersStrip.jsx`
- `frontend/src/components/ProofStrip.jsx`
- `frontend/src/components/Reveal.jsx`
- `frontend/src/components/Seo.jsx`
- `frontend/src/context/SettingsContext.jsx`
- `frontend/src/data/caseStudies.js`
- `frontend/src/data/site.js`
- `frontend/src/index.js`
- `frontend/src/lib/api.js`
- `frontend/src/lib/siteConfig.js`
- `frontend/src/pages/About.jsx`
- `frontend/src/pages/Admin.jsx`
- `frontend/src/pages/BlogIndex.jsx`
- `frontend/src/pages/BlogPost.jsx`
- `frontend/src/pages/CaseStudies.jsx`
- `frontend/src/pages/CaseStudyDetail.jsx`
- `frontend/src/pages/CityHub.jsx`
- `frontend/src/pages/Contact.jsx`
- `frontend/src/pages/CountryPage.jsx`
- `frontend/src/pages/DelhiNCR.jsx`
- `frontend/src/pages/Home.jsx`
- `frontend/src/pages/Landing.jsx`
- `frontend/src/pages/LangLanding.jsx`
- `frontend/src/pages/LocationPage.jsx`
- `frontend/src/pages/LocationsIndex.jsx`
- `frontend/src/pages/NotFound.jsx`
- `frontend/src/pages/Pricing.jsx`
- `frontend/src/pages/ServiceHub.jsx`
- `frontend/src/pages/ServicesOverview.jsx`
- `frontend/src/pages/admin/SeoTools.jsx`
- `frontend/src/pages/admin/SiteSettings.jsx`

## Added source, data and audit files

204 files, including read-only GSC exports, seven GeoNames snapshots and second-review regressions/reports.

- `backend/.env.example`
- `backend/ai-crawler-policy.json`
- `backend/ai_discovery.py`
- `backend/ai_runtime.py`
- `backend/api_credentials.py`
- `backend/build_gsc_preservation.py`
- `backend/canonical-path-map.json`
- `backend/gsc-location-aliases.json`
- `backend/gsc-route-status.json`
- `backend/gsc_route_policy.py`
- `backend/indexnow.py`
- `backend/legacy-redirects.json`
- `backend/live_location_catalog.json`
- `backend/live_route_meta.json`
- `backend/live_service_catalog.py`
- `backend/live_services.json`
- `backend/new_market_content.py`
- `backend/original_location_slugs.json`
- `backend/public_seo.py`
- `backend/seo_content_plan.json`
- `backend/seo_workflow.py`
- `backend/sitemap_shards.py`
- `backend/tests/test_ai_discovery.py`
- `backend/tests/test_api_credentials.py`
- `backend/tests/test_autopilot_queue_preservation.py`
- `backend/tests/test_existing_page_readonly.py`
- `backend/tests/test_indexnow.py`
- `backend/tests/test_indexnow_server_integration.py`
- `backend/tests/test_manual_blog_delivery.py`
- `backend/tests/test_provider_runtime_integration.py`
- `backend/tests/test_seo_edgecases.py`
- `backend/tests/test_seo_workflow.py`
- `backend/tests/test_sitemap_shards.py`
- `backend/tests/test_startup_url_preservation.py`
- `backend/tests/test_warmup_preservation.py`
- `backend/tests/test_world_expansion.py`
- `backend/tests/test_world_expansion_catalog.py`
- `backend/tests/test_world_locations.py`
- `backend/uploaded_location_slugs.json`
- `backend/world-expansion-catalog.json`
- `backend/world_expansion.py`
- `backend/world_locations.json`
- `data/geonames-snapshot/TK.txt`
- `data/geonames-snapshot/TK.zip`
- `data/geonames-snapshot/admin1CodesASCII.txt`
- `data/geonames-snapshot/cities15000.txt`
- `data/geonames-snapshot/cities15000.zip`
- `data/geonames-snapshot/countryInfo.txt`
- `data/geonames-snapshot/readme.txt`
- `deploy/DEPLOY.md`
- `deploy/nginx-routes.conf.example`
- `docs/13-WEEK-CONTENT-CALENDAR.md`
- `docs/90-DAY-SEO-GEO-OPERATIONS.md`
- `docs/AI-SEARCH-ACCESS.md`
- `docs/API-SETTINGS.md`
- `docs/CONTENT-AND-CAPACITY-CONSTRAINTS.md`
- `docs/EXECUTION-STATUS.md`
- `docs/FILE-CHANGES.md`
- `docs/FINAL-STATUS.md`
- `docs/GOOGLE-BUSINESS-AUDIT.md`
- `docs/INDEXNOW.md`
- `docs/LIVE-BLOG-INTENT-REVIEW.md`
- `docs/PROJECT-BRIEF-BUILDER.md`
- `docs/RECHECK-FIXES.md`
- `docs/SEARCH-CONSOLE-FINDINGS.md`
- `docs/SEARCH-ENGINE-ROLLOUT.md`
- `docs/SEO-AEO-GEO-AUDIT.html`
- `docs/SEO-GEO-DISCOVERABILITY-PLAN.md`
- `docs/WORLD-EXPANSION-CATALOG.md`
- `docs/WORLDWIDE-COVERAGE.md`
- `docs/WORLDWIDE-SEO-PRIORITIES.md`
- `docs/ai-discovery-audit.json`
- `docs/ai-discovery-smoke.json`
- `docs/audit-parameters.json`
- `docs/blog-drafts/hire-web-freelancer-gurgaon-checklist.md`
- `docs/blog-drafts/scope-remote-website-project.md`
- `docs/blog-drafts/seo-geo-search-eligibility-checklist.md`
- `docs/blog-drafts/website-enquiry-form-acceptance.md`
- `docs/blog-drafts/website-redesign-url-continuity.md`
- `docs/browser-qa.json`
- `docs/existing-page-readonly-check.json`
- `docs/expansion-baseline-pages.json`
- `docs/expansion-preservation-checks.json`
- `docs/final-verification.json`
- `docs/gsc-active-url-inventory.json`
- `docs/gsc-applied-canonical-decisions.json`
- `docs/gsc-canonical-preferences.json`
- `docs/gsc-crawl-stats-summary.json`
- `docs/gsc-exports/alternate-canonical.zip`
- `docs/gsc-exports/alternate-canonical/Chart.csv`
- `docs/gsc-exports/alternate-canonical/Metadata.csv`
- `docs/gsc-exports/alternate-canonical/Table.csv`
- `docs/gsc-exports/crawl-stats.zip`
- `docs/gsc-exports/crawl-stats/File type table.csv`
- `docs/gsc-exports/crawl-stats/Googlebot type table.csv`
- `docs/gsc-exports/crawl-stats/Hosts table.csv`
- `docs/gsc-exports/crawl-stats/Purpose table.csv`
- `docs/gsc-exports/crawl-stats/Response table.csv`
- `docs/gsc-exports/crawl-stats/Summary crawl stats chart.csv`
- `docs/gsc-exports/crawled-not-indexed.zip`
- `docs/gsc-exports/crawled-not-indexed/Chart.csv`
- `docs/gsc-exports/crawled-not-indexed/Metadata.csv`
- `docs/gsc-exports/crawled-not-indexed/Table.csv`
- `docs/gsc-exports/discovered-not-indexed.zip`
- `docs/gsc-exports/discovered-not-indexed/Chart.csv`
- `docs/gsc-exports/discovered-not-indexed/Metadata.csv`
- `docs/gsc-exports/discovered-not-indexed/Table.csv`
- `docs/gsc-exports/duplicate-no-canonical.zip`
- `docs/gsc-exports/duplicate-no-canonical/Chart.csv`
- `docs/gsc-exports/duplicate-no-canonical/Metadata.csv`
- `docs/gsc-exports/duplicate-no-canonical/Table.csv`
- `docs/gsc-exports/generative-ai-3-months.zip`
- `docs/gsc-exports/generative-ai-3-months/Chart.csv`
- `docs/gsc-exports/generative-ai-3-months/Countries.csv`
- `docs/gsc-exports/generative-ai-3-months/Devices.csv`
- `docs/gsc-exports/generative-ai-3-months/Filters.csv`
- `docs/gsc-exports/generative-ai-3-months/Pages.csv`
- `docs/gsc-exports/indexed.zip`
- `docs/gsc-exports/indexed/Chart.csv`
- `docs/gsc-exports/indexed/Metadata.csv`
- `docs/gsc-exports/indexed/Table.csv`
- `docs/gsc-exports/indexing-summary.zip`
- `docs/gsc-exports/indexing-summary/Chart.csv`
- `docs/gsc-exports/indexing-summary/Critical issues.csv`
- `docs/gsc-exports/indexing-summary/Metadata.csv`
- `docs/gsc-exports/indexing-summary/Non-critical issues.csv`
- `docs/gsc-exports/manifest.json`
- `docs/gsc-exports/noindex.zip`
- `docs/gsc-exports/noindex/Chart.csv`
- `docs/gsc-exports/noindex/Metadata.csv`
- `docs/gsc-exports/noindex/Table.csv`
- `docs/gsc-exports/not-found-404.zip`
- `docs/gsc-exports/not-found-404/Chart.csv`
- `docs/gsc-exports/not-found-404/Metadata.csv`
- `docs/gsc-exports/not-found-404/Table.csv`
- `docs/gsc-exports/performance-3-months.zip`
- `docs/gsc-exports/performance-3-months/Chart.csv`
- `docs/gsc-exports/performance-3-months/Countries.csv`
- `docs/gsc-exports/performance-3-months/Devices.csv`
- `docs/gsc-exports/performance-3-months/Filters.csv`
- `docs/gsc-exports/performance-3-months/Pages.csv`
- `docs/gsc-exports/performance-3-months/Queries.csv`
- `docs/gsc-exports/performance-3-months/Search appearance.csv`
- `docs/gsc-exports/redirect.zip`
- `docs/gsc-exports/redirect/Chart.csv`
- `docs/gsc-exports/redirect/Metadata.csv`
- `docs/gsc-exports/redirect/Table.csv`
- `docs/gsc-exports/soft-404.zip`
- `docs/gsc-exports/soft-404/Chart.csv`
- `docs/gsc-exports/soft-404/Metadata.csv`
- `docs/gsc-exports/soft-404/Table.csv`
- `docs/gsc-indexing-comparison.json`
- `docs/gsc-legacy-route-findings.json`
- `docs/gsc-observed-location-slugs.json`
- `docs/gsc-route-checks.json`
- `docs/gsc-url-inspections.json`
- `docs/live-url-inventory.json`
- `docs/manual-blog-delivery-check.json`
- `docs/offpage-destinations.json`
- `docs/ongoing-review.json`
- `docs/provider-runtime-check.json`
- `docs/recheck-verification.json`
- `docs/release-checks.json`
- `docs/search-console-access.json`
- `docs/search-engine-submissions.json`
- `docs/seo-90-day-progress.json`
- `docs/seo-90-day-status.json`
- `docs/startup-content-preservation-check.json`
- `docs/static-seo-checks.json`
- `docs/world-expansion-route-checks.json`
- `frontend/package-lock.json`
- `frontend/public/BingSiteAuth.xml`
- `frontend/scripts/check-seo.mjs`
- `frontend/scripts/crawler-policy.mjs`
- `frontend/scripts/export-catalog.py`
- `frontend/scripts/prerender.mjs`
- `frontend/scripts/test-project-brief.mjs`
- `frontend/src/components/CanonicalLink.jsx`
- `frontend/src/lib/projectBrief.js`
- `frontend/src/pages/ExpansionLocationPage.jsx`
- `frontend/src/pages/ProjectBriefBuilder.jsx`
- `frontend/src/pages/RegionalLanding.jsx`
- `frontend/src/pages/ServiceAreas.jsx`
- `frontend/src/pages/admin/ApiSettings.jsx`
- `frontend/src/pages/admin/SeoWorkflow.jsx`
- `frontend/src/pages/admin/ServiceAreaExpansion.jsx`
- `frontend/src/seo/bootstrap.js`
- `frontend/src/seo/canonical-path-map.json`
- `frontend/src/seo/canonicalPath.js`
- `frontend/src/seo/catalog.json`
- `frontend/src/seo/live-region-data.json`
- `frontend/src/seo/live-route-meta.json`
- `frontend/src/seo/live-service-meta.json`
- `frontend/src/seo/live-services.json`
- `frontend/src/seo/live-site-settings.json`
- `frontend/src/seo/serviceAliases.js`
- `frontend/src/ssr/entry-server.jsx`
- `scripts/audit_ai_discovery.py`
- `scripts/build_world_expansion.py`
- `scripts/check_expansion_preservation.py`
- `scripts/check_gsc_routes.py`
- `scripts/check_release.py`
- `scripts/check_world_expansion.py`
- `scripts/test_metadata_preservation.py`

## Removed application files

None. Development/tool configuration, actual environment secrets, dependencies and caches are excluded. Secret-free `.env.example` references are included.

## Generated production build

305 generated files under `frontend/build/`; 279 static HTML routes; main entry `main.d432a382.js`. Backend-only second-review changes require no frontend rebuild.

## Verification

- `recheck-verification.json`: 203 backend tests, 28 vault tests and two startup tests; 0 failures.
- `expansion-preservation-checks.json`: 277 baseline pages, 0 content/metadata/link changes.
- `release-checks.json`: 279 static heads, 6,594 base route variants and 2,095 observed old sitemap paths; 0 errors.
- `gsc-route-checks.json`: 1,664 exact paths, including 1,000 capped indexed examples; 0 errors.
- `world-expansion-route-checks.json`: previously completed 36,240 new HTTP paths, 0 errors; unchanged public renderer in this recheck.
- `final-verification.json`: combined outcome and remaining live-verification limits.
