# Google Business Profile audit and owner checklist

Audit date: 25 October 2026 (India). Scope: supplied source code and public web lookups. No signed-in Google Business Profile account was inspected or changed.

**Status: website integration issues identified; Google listing ownership, verification, settings and performance remain unverified. This audit is not a claim that Google Business Profile optimisation is complete.**

## Evidence and identity

| Item | What was observed | Verification status |
| --- | --- | --- |
| Rajeev website | https://rajeevfreelancer.com/ is publicly discoverable; indexed pages describe Rajeev Freelancer, Gurgaon and web/app/marketing services. | Website presence observed; website statements are not independent proof of a Google listing. |
| Supplied profile URL | `frontend/src/data/site.js` in the Rajeev project defines `GOOGLE_PROFILE` as https://share.google/ddhGdf8R7JkjaWji3. Its comment describes “Rajeev Freelancer - Website and App Development”. | Present in supplied code. The public lookup could not resolve the share link to an inspectable listing; current destination, Place ID and business identity were not independently confirmed. This does not prove the link is broken. |
| Phone and email | Rajeev source constants contain +91 97116 23561 and hello@rajeevfreelancer.com. | Supplied website data; the current Google profile values were not available for comparison. |
| Address | Rajeev source settings contain “Gurgaon, Haryana, India”. | A city label, not a verified customer-facing street address. Storefront/service-area eligibility was not established. |
| Rating/reviews | Original `GoogleBusinessCTA.jsx` defaults to 4.9 and 96 using `biz.rating || 4.9` and `biz.reviews_count || 96`. Similar figures appear in the website search snippet. | Self-published values only; the Google rating and review count were not verified. Zero/unknown values incorrectly become the defaults. |
| Directions/map | Original CTA and backend defaults use a general Gurgaon city place URL and city map embed. | Generic city destination confirmed in source; it does not establish the business location. |
| ER Freelancer | Supplied ER code uses erfreelancer.com, a different contact number and Laxmi Nagar/Delhi details. | Separate source identity. Do not attach the Rajeev Google profile to ER without confirming they represent the same real-world business and permitted branding. |

## Website work to verify before release

- Show Google ratings and review totals only when obtained from a trustworthy current source with a recorded check date. Hide unknown values; never substitute a positive rating or a fabricated count. Avoid adding self-serving rating markup for the business.
- Use the confirmed business share URL for a clearly labelled “View on Google” link. A review-creation link is a separate owner-generated URL; do not assume any share link opens the review form.
- Replace general city “Get directions” links with the actual confirmed business destination only if customers can visit it. For a business without a customer-facing premises, show the truthful service area and profile link instead.
- Embed the actual confirmed public listing when appropriate. Do not show a random city pin as the office, or expose a private/home address unnecessarily.
- Keep website name, phone, contact details and customer-facing location consistent with the confirmed profile. Avoid invented offices on country/city landing pages.
- Use a working HTTPS website URL in the profile; an optional measurable URL is `https://rajeevfreelancer.com/?utm_source=google&utm_medium=organic&utm_campaign=gbp`. The page canonical should stay at the clean homepage URL.
- Check every Google/profile/contact link on mobile and desktop after deployment. Website code changes do not update Google profile settings.

## Owner-side checklist — requires the linked Google account

All boxes below are **pending verification**. Tick an item only after inspecting the actual profile and its saved/public state.

| Priority | Check | Completion evidence |
| --- | --- | --- |
| P0 | Confirm the correct existing profile, primary owner and manager access; resolve duplicate profiles before creating another. | Exact public listing URL/Place ID and authorised account confirmed. |
| P0 | Check verification state, pending edits, restrictions or suspension. Complete the verification method Google actually offers. | Profile displays verified/manageable state; no unresolved verification prompt. |
| P0 | Establish whether customers visit the premises, staff travel to customers, or service is online only. | Actual operating model confirmed against eligibility policy. Online-only businesses do not qualify merely because they have a website. |
| P0 | Confirm real-world business name; keep additional services and location keywords out of the name unless part of genuine consistent branding. | Name matches real-world materials and accepted public profile. |
| P0 | Verify address/pin or hide address for a qualifying service-area business that does not receive customers there. | Accurate location setting; no virtual-office or generic city pin masquerading as premises. |
| P1 | Review primary and additional categories against the principal business activity. | Selected categories match services actually provided and available choices. |
| P1 | Confirm phone, working website, actual regular hours and special/holiday hours. | Public call/website actions tested; hours match operating availability. |
| P1 | Set specific local service areas if appropriate. | Actual service cities/postcodes saved; do not put worldwide remote reach into a local driving service-area field. |
| P1 | Add concise accurate business description, service entries, relevant attributes and booking/contact options that the account supports. | Saved entries reviewed publicly; claims and prices match current offers. |
| P1 | Add authentic logo, cover, workplace/team/service photographs and project media that the business owns or may publish. | Recent approved photos visible; no fabricated premises or client attribution. |
| P1 | Review current customer feedback; reply helpfully and invite genuine customers neutrally to share experience. | Real review-request link/QR copied from Google; reply workflow documented. |
| P2 | Publish useful updates when there is real news or a relevant service update. Check that links and information stay current. | Approved update visible; no repetitive keyword posts or invented success claims. |
| P2 | Review available social/contact integrations and public questions where offered. | Only supported, genuine channels linked; no promised feature assumed available. |
| P2 | Record a baseline and compare performance over consistent periods. | Export/screenshot or report of available views/searches/call-button clicks/website clicks/directions and resulting enquiries. |
| P2 | Check consistency across relevant real business citations and the website. | Correct name/contact/location; duplicates or obsolete details corrected. |

## Category proposal — not a confirmed setting

If website design/development is the main customer-facing activity, **Website designer** is a reasonable primary-category proposal, subject to availability in the profile's current category picker and the owner's confirmation. If custom software is the main activity, consider **Software company** instead. Additional categories such as **Internet marketing service** or **Marketing consultant** should be considered only where they describe real core activities and are available. Do not add every service keyword as a category. Changing categories can trigger verification again. [Google category guidance](https://support.google.com/business/answer/7249669?hl=en)

## Practical policy and measurement notes

A business must have eligible in-person customer contact. A virtual mailing address alone is not eligible. Customer-facing premises need accurate representation; a service-area profile is for a business that actually travels to customers. Google generally expects one profile per business/location, not a profile for every SEO target city. [Representation guidelines](https://support.google.com/business/answer/3038177?hl=en) · [Eligibility overview](https://support.google.com/business/answer/13762416?hl=en-GB)

Service areas use cities/postcodes/areas rather than a configurable radius. Google permits up to 20 and generally suggests coverage within about two hours' driving time, with exceptions for some businesses. These are service-delivery facts, not a way to expand rankings worldwide. [Service areas](https://support.google.com/business/answer/9157481?hl=en)

Ask for genuine reviews without rewards, discounts, review swapping or suppressing dissatisfied customers. Keep replies brief, relevant and private-data safe. Obtain the review link/QR through the verified profile. [Review guidance](https://support.google.com/business/answer/3474122?hl=en)

Verification methods are determined by Google and vary by business. Do not claim verification is complete from a website link or search snippet. [Verify a business](https://support.google.com/business/answer/7107242?hl=en)

Performance reporting requires access to the verified profile; available metrics vary. A call-button click is not a confirmed answered call or a qualified lead. Use website enquiry data alongside profile metrics. [Performance and insights](https://support.google.com/business/answer/9918094?hl=en)

Local visibility depends on relevance, distance and prominence. Completing fields, adding schema or publishing location pages cannot guarantee a particular local position. [Local ranking guidance](https://support.google.com/business/answer/7091?hl=en)

## Completion boundary

This code audit can correct website links, unsupported rating displays and consistency problems. To mark the Google Business Profile work complete, the owner must supply or permit inspection of the actual profile; its identity, verification, category, address/service area, contact details, hours, reviews and public links must then be checked. No Google account settings were changed during this audit.


## Current search feature note (25 October 2026)

Google's June 2026 documentation update states that FAQ rich results are no longer displayed, following the May 2026 retirement. FAQ content and valid descriptive markup may still be useful to readers and other consumers; this release does not promise FAQ search enhancements. Google's AI search guidance also says that it does not use llms.txt for ranking or visibility.

Sources: https://developers.google.com/search/updates and https://developers.google.com/search/docs/fundamentals/ai-optimization-guide .
