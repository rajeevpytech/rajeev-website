# Live blog intent review and actual publication

The primary agent authenticated the CMS on 25 October 2026, read 31 existing published titles/slugs, then created one NEW remote-scoping post and admin-marked it Published. The observed published count became 32. No existing post was overwritten. This was a title/slug intent check, not an exhaustive body comparison.

**Public visibility is unconfirmed.** The public listing/direct page still showed the current shell without verified article content. The user will deploy the latest code to the server before further public verification. Creation/publication dates are known only as 25 October 2026; no exact time is asserted.

Five full texts are prepared: two read-only existing-review references, two new unpublished articles and one CMS-created/admin-published article with public verification pending. The manually created article used the 991-word source body and three added FAQs, category Guide. Its exact slug is `scope-remote-website-project`; do not queue it again.

The latest instruction freezes every existing/indexed body as well as metadata. The two overlapping source references must never be merged, replaced or published as duplicate new posts. See [constraints](CONTENT-AND-CAPACITY-CONSTRAINTS.md).

## Intent decisions

| Week | Topic | Action | Targets |
| --- | --- | --- | --- |
| 1 | Hiring a Web Freelancer in Gurgaon: A Practical Decision Checklist | READ-ONLY existing review | `/blog/freelance-website-developer-gurgaon`, `/blog/hiring-freelancer-vs-agency` |
| 2 | How to Scope a Remote Website Project Before Development Starts | Already created; admin Published / public unconfirmed | `/blog/scope-remote-website-project` |
| 3 | SEO and GEO: Check Search Eligibility Before Chasing AI Visibility | READ-ONLY existing review | `/blog/seo-vs-geo-2026`, `/blog/getting-cited-by-ai-answers` |
| 4 | Redesigning a Website Without Losing Track of Existing URLs | Distinct new topic; only weeks 4/7 have full unpublished text | No clear matching title in the original 31-post inventory; recheck before any creation |
| 5 | What to Measure When Core Web Vitals Has Insufficient Data | READ-ONLY existing review | `/blog/core-web-vitals-checklist`, `/blog/core-web-vitals-praxis-guide-deutsch` |
| 6 | What a Useful Service Page Should Answer Before a Visitor Enquires | READ-ONLY existing review | `/blog/conversion-first-web-design`, `/blog/ecommerce-conversion-rate-playbook` |
| 7 | Testing a Website Enquiry Form From Submit to Follow-up | Distinct new topic; only weeks 4/7 have full unpublished text | No clear matching title in the original 31-post inventory; recheck before any creation |
| 8 | Choosing Website Editing Features Before Choosing a CMS | Distinct new topic; only weeks 4/7 have full unpublished text | No clear matching title in the original 31-post inventory; recheck before any creation |
| 9 | A Small Business Accessibility Checklist for Website Procurement | Read-only scope review before any new topic | `/blog/ada-compliance-ecommerce-guide-us` |
| 10 | When a Location Page Helps Customers and When It Adds Duplication | READ-ONLY existing review | `/blog/programmatic-seo-done-right`, `/blog/local-seo-for-service-businesses` |
| 11 | How to Prepare a Credible Website Project Case Study | Distinct new topic; only weeks 4/7 have full unpublished text | No clear matching title in the original 31-post inventory; recheck before any creation |
| 12 | Google Business Profile for Remote and Service-Area Businesses | READ-ONLY existing review | `/blog/local-seo-for-service-businesses` |
| 13 | A 90-Day SEO Review That Separates Work Completed From Results | Distinct new topic; only weeks 4/7 have full unpublished text | No clear matching title in the original 31-post inventory; recheck before any creation |

Queue flags are false for existing-review tasks, unresolved scope review and the already-created article. A fresh actual-DB check remains necessary for any new topic. Source metadata is not itself proof that a live CMS record exists.

The production autopilot is enabled daily at 09:00 IST with auto-publish, dedupe and cover generation. At observation its queue was empty, generated count zero and no successful run was shown. Its latest failure was upstream Google HTTP 401 invalid API key. No API-key value was read. A manual article creation does not establish that automated generation works.

[Latest execution status](EXECUTION-STATUS.md) records Bing, Brave, weekly review and the deployment boundary. The application's new 90-day workflow is not activated simply by saving the source plan.
