# Project brief builder

Public route: `/project-brief`. This is a browser-based planning tool for prospective website, mobile app, software, AI automation and SEO work. It is not an application generator or a pricing calculator.

The form collects the project goal, existing URL, audience, target countries, languages, pages, features, user roles, integration requirements, content responsibilities, desired timeline, optional budget and review topics. A deterministic counter explains whether each of six planning sections has the stated details. It does not calculate an SEO, quality or readiness score.

Choosing features produces relevant acceptance and handover checklists. These describe work to agree and test; selecting a check does not claim the work has passed an audit. Empty details remain labelled “To decide”. A project type and a goal of at least ten characters are required for generation. URL fields accept only HTTP/HTTPS without credentials; account/admin features require roles or an explicit open question; named integrations require details.

## Local data handling

Draft values live in React state within the current tab. This component makes no API request, server save, local/session-storage write or automatic email. Reloading, leaving the page or using **Clear brief** removes the draft from the page. The component introduces no API keys, provider credentials, accounts or authenticated endpoint dependency.

The entire builder is marked `ph-no-capture` and `ph-no-autocapture`, with the corresponding no-autocapture data attribute. This excludes its inputs and generated preview from the website's existing PostHog automatic capture and replay. Global tracking and existing pages are unchanged. No draft text is placed in DOM tracking attributes, link parameters or named form fields.

Copy and download operate only after an explicit click. Downloads use a local browser Blob, with Markdown or plain-text MIME types and a filename stripped of path characters. Markdown generation escapes user-supplied formatting, HTML and links. The preview is a read-only textarea; user text is not rendered as HTML. If clipboard permission is unavailable, the page offers preview selection or file download.

Changing the form after generation disables export of the stale snapshot until **Update my brief** is used. The contact action opens the fixed `/contact` path in a separate tab, carrying no draft values in the URL. Sharing the downloaded or copied brief remains the user's choice. Visitors should leave passwords, API keys, payment details and sensitive customer records out of the form.

## Files and integration

- `frontend/src/pages/ProjectBriefBuilder.jsx`: the new page and interactions.
- `frontend/src/lib/projectBrief.js`: pure validation, completion, checklist and export helpers.
- `frontend/scripts/test-project-brief.mjs`: helper, SSR and actual React/DOM interaction tests.

The frontend owner adds only the new `/project-brief` App route and SSR route entry. Existing page text, titles, descriptions and navigation are outside this component's scope. Server rendering produces a useful H1, planning form, privacy explanation, checklists and FAQ; browser-only APIs execute inside explicit copy/download/submit actions.

Run the isolated test from the project root:

```bash
node frontend/scripts/test-project-brief.mjs
```

It checks actual empty/invalid form handling, valid generation, optional budget, feature-based checklists, safe Markdown and filenames, SSR metadata and content, capture exclusions, unique field IDs, copy/download contents, stale-snapshot blocking, explicit clearing, and the contact URL. Network and storage spies must record zero calls. Downloads and clipboard access are mocked; no external service is used.

PostHog's documented element-level controls were checked against its official [privacy controls](https://posthog.com/docs/session-replay/privacy) and [autocapture documentation](https://posthog.com/docs/product-analytics/autocapture). The component does not rely on changing a visitor's global analytics preferences.
