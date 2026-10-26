# Current release status

The latest release adds the redesigned homepage and an editable Work portfolio while retaining the previous SEO/GEO expansion. See `WORK-RELEASE-VERIFICATION.json` for the current test summary and `WORK-CMS.md` for the Admin workflow.

- Admin Work submissions:40 industry choices and10 independent service choices, live links, images/gallery, descriptions, delivered project story, feature/order and draft/publication controls.
- Case studies: client name, industry/services, live link, cover/gallery, challenge/approach/results, optional chart/testimonial and explicit draft/publish. Existing slugs remain fixed.
- Published Work appears immediately in public HTML/API, homepage previews and sitemap. Drafts and archives remain hidden; project details return404 after unpublishing.
- Portfolio contains36entries:23source/owner-confirmed projects with actual public captures, plus13original functional demos clearly labelled with sample data. All previews use a1440×900 frame. No fabricated search-ranking screenshots or numerical outcomes were added.
- The owner explicitly authorized homepage visible content/navigation changes. Its title, description, canonical, robots and URL remain preserved. The other original static pages remain unchanged.
- Local production build, metadata/preservation, isolated backend tests and frontend interaction checks pass. Mounted HTTP QA covers publication, filters, media and URL preservation. Live VPS deployment, real storage/form/provider requests and browser visual/mobile verification remain pending.

Existing worldwide capacity remains5001 locations/40008 candidate service-location URLs. The previously tested36240 new HTTP routes remain review-gated; no new location indexing changes were introduced by Work CMS. Existing live database content is retained.

Source is handed over through the separate GitHub release branch documented in `../deploy/GITHUB-RELEASE.md`; main and production have not been overwritten.
