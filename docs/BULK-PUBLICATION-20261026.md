# Owner-authorised publication of the full catalog

The owner explicitly requested **“lets published all pages”** on 26 October 2026. This supersedes the earlier per-page publication gate for the catalog release. It does not authorise rewriting existing editorial content, fabricating local offices/results or claiming search-engine indexing.

## Execute on the existing VPS

After this release is merged into `main`, run:

```bash
cd /var/www/rajeevfreelancer
git pull --ff-only origin main
bash deploy/publish-all-pages.sh
```

The wrapper finds the application's existing Python environment. It does not install global packages, replace `.env`, alter the database name, rebuild the frontend, restart services or change Nginx. The publication command uses the deployed backend's existing `MONGO_URL` and `DB_NAME`. Credentials are never printed or included in the receipt.

If the server checkout has local changes or a diverged branch, the pull must be resolved before using the wrapper. Do not reset or overwrite production files to force it through. Use the same backend configuration as the running application.

For an optional inspection without writes, in the existing backend Python environment:

```bash
python scripts/publish_all_catalog_pages.py
```

The source implementation is prepared and tested in isolation. **It has not been executed against production in this session**, because the assistant has no VPS shell or direct production database access. Merging source is not executing this database publication.

## What the command does

- Enumerates exactly **5,001 places × eight canonical service entries = 40,008 combinations**. A changed catalog count stops the command for a scope check.
- Retains existing stored titles, descriptions, headings, bodies, service/location data and canonical URL spellings. An existing legacy alias can satisfy its corresponding service/place combination; it is not silently renamed or duplicated to force a count.
- Leaves already index-eligible records unchanged.
- Updates only publication state and revision on complete saved records that need indexing approval. It does not replace their copy with the new drafts.
- Inserts missing additional records using their existing remote-service preview content, or the prepared 24-page pack when that exact new address has no saved record.
- Inserts missing base cache records using the exact existing deterministic public fallback. This preserves the content already served by those routes rather than substituting newly written copy.
- Uses insert-only upserts and conditional updates to preserve records or authored changes that appear during the run. Incomplete existing records are preserved and reported as conflicts; they are not overwritten to make the command appear complete.
- Ensures indexed key/canonical lookups so the growing collection is not scanned for every upsert. The key is unique; the added canonical index is non-unique and does not deduplicate or rename existing documents.
- Writes private before-state receipts outside the web repository. The database name and catalog fingerprint are recorded; no connection URL or credentials are recorded.
- Makes no AI calls, seed calls, emails, WhatsApp messages or IndexNow submissions.

This publishes the current templated catalog; it does not create 40,008 individually researched articles. Similar pages can overlap. Google's [doorway and scaled-content policies](https://developers.google.com/search/docs/essentials/spam-policies) still apply; the command does not certify ranking suitability or guarantee indexing.

## Publication approval is not an individual editorial review

For compatibility with the current renderer, `seo_reviewed: true` is the existing **indexing-approval flag**. The bulk command records:

```json
{
  "publication_method": "owner_authorized_bulk",
  "editorial_review_status": "not_assessed_by_bulk_job"
}
```

It never checks factual-review boxes, invents a reviewer identity, or claims each page was individually reviewed. Existing factual-check evidence is preserved. The Admin preview identifies an owner-authorised bulk release so it can be reviewed later without confusing publication with editorial checking. This Admin label requires the updated frontend build; it is not required for the current backend's publication/indexing flags to function.

## Read the final receipt

The terminal prints progress and a final JSON summary. The default private receipt directory is `rajeev-publication-receipts` in the account's home directory, with a unique child for every run. Each child contains:

- `before-publication.jsonl`: write-ahead publication-state records and content fingerprints.
- `summary.json`: database identity, intended count, processed count, insertions, approvals, existing aliases, conflicts/errors and completion status. A running identity file is created before the first write, so interrupted runs can still be rolled back.

`database_publication_complete: true` means all 40,008 combinations were processed without unresolved conflicts/errors. **It is not a verified live HTTP, sitemap or search-index count.** Existing canonical aliases and other public pages can make the final unique sitemap count differ from 40,008.

A partial run reports `complete: false`; do not describe it as published in full. Database/connection or receipt-write failures stop early. Re-running after resolving the failure is safe: already eligible content is not replaced. Keep the private receipt; do not upload it into a publicly served directory.

## Rollback

In the same backend Python environment, replace the path below with the exact receipt child directory printed by the run:

```bash
python scripts/publish_all_catalog_pages.py --rollback /absolute/path/to/the/receipt
python scripts/publish_all_catalog_pages.py --rollback /absolute/path/to/the/receipt --apply
```

The first command inspects; the second applies. Rollback restores prior publication fields on existing records and removes only new documents still matching this batch, its revision, its written fields and its original content fingerprint. Pages edited after publication are skipped. Existing content is not reconstructed or replaced. Supporting lookup indexes are retained.

## After the live run

1. Inspect the final receipt for `complete`, conflicts and errors.
2. Fetch the uncached live canonical sitemap and count distinct URLs, following sitemap-index children if present. The existing sitemap generator handles approved records and size limits.
3. Check representative base/additional pages, an existing authored page and retained alias: HTTP status, content, canonical and index/follow output.
4. Check public API and browser rendering agree; wait for any existing short-lived sitemap caches to expire before interpreting an old count.
5. Submit the actual updated sitemap to Google and Bing, and notify IndexNow only of actual eligible public URLs. Neither sitemap processing nor IndexNow acceptance proves indexing or rankings.

The previous 2,407-URL acceptance receipt remains historical. It must not be relabelled as a submission of the larger catalog.

## Local validation

The isolated regression checks cover all 40,008 targets in a dry run, preservation of existing copy/aliases, publication without forged review checkboxes, guarded insert/update races, rollback protection for subsequent authored edits, early stopping with sanitised database errors, and an actual FastAPI HTML/sitemap transition for a synthetic published record. They use in-memory collections, not the production database or a real MongoDB server. The Admin import check, production frontend build and metadata-preservation check also pass.
