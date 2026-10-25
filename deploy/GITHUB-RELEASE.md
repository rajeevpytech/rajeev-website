# GitHub release handover

Repository: https://github.com/rajeevpytech/rajeev-website

Release branch: `work-cms-seo-release-20261026`

This branch contains the tested RajeevFreelancer source, homepage redesign, Work CMS and existing SEO/GEO work. The repository main branch is retained. Deploy this release branch rather than assuming main contains the update.

## Developer workflow

1. Clone the release branch into a new staging folder, or fetch the branch into a clean developer checkout. Keep the live deployment and its MongoDB/environment/media in place.
2. Frontend: `cd frontend`, `npm ci --legacy-peer-deps`, `npm run build`, `npm run check:seo`. Requires Node20+ and Python3.
3. Backend: install `backend/requirements.txt` in the intended virtual environment. Keep existing `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, media and mail settings. Provider keys remain server/Admin configuration, outside Git.
4. Apply the existing server routing and restart instructions from `DEPLOY.md` using the actual service name, paths and port. Do not reseed content or rewrite existing slugs.
5. Follow the Work acceptance checks in `docs/WORK-CMS.md`, then verify live uploads, forms and browser rendering.

The GitHub snapshot excludes dependencies, compiled build, environments, private raw Search Console exports and operational account material. Location data and reproducible source catalog are included. Deployment still requires building frontend and retaining the live database.
