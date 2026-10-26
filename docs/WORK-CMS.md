# Work and Case Study publishing

Open `/admin` and sign in with the existing administrator account.

## Add a project

1. Open **Work / Project submissions** and choose **Submit project**.
2. Enter the project and client names. Choose one of 40 industries, then select every service delivered. Industry and service are independent: a hotel may have Website Redesign, SEO and Google Ads together.
3. Add the live website/application link if public. Private applications can leave it blank. Add a summary in completed-work language, such as “We redesigned the hotel website.”
4. Upload a cover and additional project photos/screenshots. Add alt text and captions. Public preview cards use the same 16:10 frame.
5. Describe the overview, delivery scope, approach, features and handover. Add only supported results or client quotes.
6. Choose **Save draft** to continue later, or **Publish to Work** to display it publicly. Featured projects sort first on the homepage; display order breaks ties.

Published content appears immediately on `/work`, `/work/<slug>`, the homepage project previews and the dynamic sitemap. No frontend rebuild is needed for later Admin submissions. Drafts remain private. Editing does not change an existing project URL. Remove archives a project so source-catalog entries do not return after restart.

## Add a case study

Open **Case studies** and choose **New case study**. Select industry and services, add the client name, live link, cover, gallery, challenge, approach and results, then save a draft or publish. Charts, numeric results and client testimonials are optional. Existing case-study URLs stay fixed when edited.

## Technical handover

- Source catalog: `backend/portfolio-projects.json`. Admin changes use the new MongoDB `portfolio_projects` collection with unique project ID and slug indexes. Source projects can be edited through Admin using persistent overrides; archived entries retain a tombstone.
- Existing `case_studies` records stay in their current collection. No startup content migration, reseeding or slug rewrite was added.
- Public Work JSON: `/api/portfolio`; independent `industry`, `service`, `q`, `page` and `page_size` filters. Taxonomy: `/api/portfolio/taxonomy`.
- Authenticated project management: `/api/admin/portfolio` and `/api/admin/portfolio/<id>`; explicit publication control: `PATCH /api/admin/portfolio/<id>/publish`.
- Uploads use the existing authenticated image-upload/storage service. Keep its server environment and media. This update fixes same-origin URL handling; it does not replace the storage provider.
- Backend HTML serves current Work records and homepage proof, including for search crawlers. Unpublished/deleted project details return404 even if a stale static file exists.
- Deploy both backend and frontend together. Preserve the existing database, environment, admin credentials, media and indexed service/location pages. See `deploy/DEPLOY.md`.

## Validation boundary

Unit, mounted HTTP, frontend interaction, build and metadata preservation checks run locally with isolated fixtures. The production database and storage are not changed by these checks. After VPS deployment, verify existing Admin login, real photo upload, publication, live forms and mobile/desktop browser rendering.
