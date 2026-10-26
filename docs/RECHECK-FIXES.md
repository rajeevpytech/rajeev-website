# Second release review and fixes

The user requested another check after the first final package. This update fixes three confirmed local defects; no live deployment, provider request or production-content edit was made.

1. **Exact editorial URLs on restart:** removed the automatic slug normalizer. Existing underscore slugs such as `existing_guide` remain exact; ASCII and Unicode records are also tested. Unicode stripping was not the reproduced bug.
2. **Deleted content on restart:** removed automatic blog/case-study seed calls. Missing or deliberately deleted source articles stay absent and return 404. Seed helpers remain for deliberate initial setup only.
3. **Admin configuration recovery:** invalid provider/model diagnostics retain the actual unlocked vault revision, so the frontend can repair settings without an endless 409 conflict. Repairing one section preserves the other valid provider, model and saved key. Locked vaults remain noneditable.

The combined backend suite now has **203 passing tests, 0 failures**: 28 vault tests, including eight exact frontend-shaped recovery regressions, plus two startup regressions, are included. The actual startup is run twice with six existing blog/case documents; attempts to write documents or restore deleted seeds fail the test. The 279-head release and 6,594 base service/location checks pass. All 277 pre-expansion static pages remain unchanged in main content, metadata and links. The project-brief tool's 62 checks also pass with no network calls or storage writes.

Only backend startup, private Admin credential diagnostics, their regressions and documentation changed in this second review. The frontend build and the previously exhaustive 36,240 new HTTP-route check remain unchanged. Historical reports retain their original run timestamps; see [the final recheck result](recheck-verification.json) for the current combined outcome.

Keep the existing production MongoDB, environment and media when deploying. Existing CMS posts are now the source of truth; this release deliberately does not repopulate an empty/deleted article collection from bundled seeds. A new installation needs deliberate editorial setup through Admin.

A valid API key and controlled generation, Bing ownership verification, public blog/forms/mail, final browser/mobile checks and Google Business Profile account checks still require deployment or authenticated live verification. No worldwide indexing or ranking guarantee is made.
