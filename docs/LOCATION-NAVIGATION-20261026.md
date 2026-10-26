# City-page server navigation

Live checks on 26 October 2026 found that all 51 sampled service/city documents had only the Home breadcrumb as an internal link in their initial main content. The interactive React pages already offer more onward journeys, but the first server response should also let readers continue to the service and enquiry pages.

`backend/public_seo.py` now appends an accessible, wrapping navigation section to the city-page server document. It links to the established service overview, the country directory when its saved slug is valid, Project examples and Discuss your project. It does not construct sibling-city links that might be unpublished.

Existing saved bodies, titles, descriptions, headings, canonical routes, publication flags and database records are preserved. This change adds navigation around the saved content. It has no database writes, external requests, notification hooks, asset changes or new dependencies.

## Validation

41 focused tests passed, covering server navigation, all eight expansion services, preservation of supplied content/metadata and original noindex eligibility, unsafe country slugs, bulk publication, world expansion and sitemap shards. One upstream Starlette/AnyIO deprecation warning remains.

Command:

```bash
python -m pytest backend/tests/test_location_navigation.py backend/tests/test_bulk_catalog_publication.py backend/tests/test_sitemap_shards.py backend/tests/test_world_expansion.py -q -n 0
```

## Deployment and verification

Deploy this backend change using the site's existing VPS procedure and actual application service name; do not replace the environment, database, uploads or Nginx configuration. A frontend build is not needed for this server-rendered navigation addition. Once deployed, inspect the initial HTML of one old city URL and one expansion city URL with JavaScript disabled. Confirm the Service and project links navigation is present, the established canonical remains unchanged, the contact link works, and a noindex preview retains its existing indexing controls.

This source release does not certify a production deployment, individual editorial review of 40,008 pages, or search indexing. The private Search Console priority analysis and submission receipts are intentionally outside this public repository.
