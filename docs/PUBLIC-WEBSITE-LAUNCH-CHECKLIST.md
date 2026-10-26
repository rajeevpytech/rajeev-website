# A practical website launch acceptance checklist

A website is ready when a visitor can complete the important journeys and the owner can operate it. Use this checklist with a small set of representative pages before a launch or redesign. It is a reusable working document, not a claim that every check has passed on a particular website.

## 1. Agree on the journeys

- [ ] Write down the main visitor action: enquiry, booking, purchase, application or account access.
- [ ] List who receives each enquiry and where the owner will find the saved record.
- [ ] Identify public pages, authenticated screens and unpublished content separately.
- [ ] Assign an owner to content approval, integrations and launch acceptance.

Choose a homepage, a service page, a detail page, an article and the contact journey as the first sample. Add templates that have different navigation, permissions or rendering. A successful homepage test does not establish that the rest of the site works.

## 2. Preserve working URLs during a redesign

- [ ] Export the existing URLs before replacing the site.
- [ ] Keep useful URLs working where their purpose is unchanged.
- [ ] Map retired URLs to the closest relevant replacement when one exists.
- [ ] Check that redirects reach the intended destination without loops.
- [ ] Verify that missing pages return an appropriate missing-page response instead of a misleading success page.
- [ ] Check representative deep links by opening them directly and refreshing the browser.

Record the old URL, intended result, actual response and final destination. Do not send every removed page to the homepage merely to hide missing pages.

## 3. Check public discovery separately from the browser view

- [ ] Confirm the preferred HTTPS host and consistent internal links.
- [ ] Inspect the actual response and rendered document for each sampled public page.
- [ ] Check that important page content and its descriptive heading are available as intended.
- [ ] Review canonical URLs and any indexing directives for the sampled templates.
- [ ] Keep administrative, private and unpublished routes out of public discovery lists.
- [ ] Ensure sitemap entries use intended canonical URLs rather than broken, redirected or unpublished pages.

A sitemap helps discovery; it is not evidence that a search engine has indexed a page. Keep submission receipts, crawl observations and indexing observations as different records. Use the search engine's own inspection tools when checking its current view.

## 4. Test an enquiry from submit to receipt

- [ ] Submit one clearly labelled internal test with a unique reference.
- [ ] Check required fields, invalid input and useful error messages.
- [ ] Confirm that the success message follows an accepted submission.
- [ ] Locate the same reference in the owner's saved records.
- [ ] Confirm the notification arrives in the actual receiving inbox or connected destination.
- [ ] Test optional destinations independently: email success does not establish WhatsApp success.
- [ ] Confirm a failed destination is visible to the operator and has a recovery process.
- [ ] Exclude internal tests from qualified-lead and revenue reporting.

Use synthetic details. Avoid repeated submissions just to get another screenshot. Record the time, reference, saved-record result and each notification result. Never include customer records or provider credentials in a public acceptance report.

## 5. Check accessibility and movement

- [ ] Complete navigation and the main form with a keyboard.
- [ ] Check visible focus and understandable control names.
- [ ] Associate form controls with labels and keep error messages understandable.
- [ ] Review small text and muted text against their actual backgrounds.
- [ ] Check narrow mobile widths for clipped controls and horizontal overflow.
- [ ] Respect reduced-motion preferences and provide a pause control for suitable persistent animation.

Automated checks are useful evidence, but they do not replace trying the real journey. Test overlays, menus and error states as well as the initial screen.

## 6. Measure the work the first page requires

- [ ] Record the production build's initial JavaScript and CSS payloads.
- [ ] Check whether large optional features can load when they are used.
- [ ] Verify that deferred downloads still work and recover from loading failures.
- [ ] Compare measurements under the same device, network and test configuration.
- [ ] Repeat lab measurements and report the range or median rather than selecting the best run.
- [ ] Keep local lab results separate from measurements of the deployed website and real-user field data.

For example, an administrative screen or PDF export library may not need to load for every homepage visitor. Confirm functionality after splitting code; a smaller bundle is only useful if the feature still works.

## 7. Hand over an operable website

- [ ] Confirm that authorised staff can sign in and perform a representative edit.
- [ ] Verify the public result of that edit without exposing unpublished content.
- [ ] Document backup, rollback and integration ownership.
- [ ] Record remaining failures with their owner and next action.
- [ ] Recheck the deployed version after release rather than treating a local pass as a live pass.

Use an acceptance log with: check, environment, URL or reference, expected result, actual result, date, evidence and owner. Mark untested items as untested. Keep sensitive operational evidence outside public repositories.

## Reference guidance

- [Google: SEO fundamentals](https://developers.google.com/search/docs/fundamentals/get-started)
- [Google: canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google: sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)
- [W3C: accessibility evaluation checks](https://www.w3.org/WAI/test-evaluate/easy-checks/)

Prepared by **Rajeev Kumar**. Website and project enquiries: [Rajeev Freelancer](https://rajeevfreelancer.com/).
