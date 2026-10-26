#!/usr/bin/env python3
"""Owner-authorised publication of the finite catalog; existing copy is retained.

Default: inspect only. --apply changes publication flags and inserts missing
documents. No AI, seed, provider notification, deployment or credential output.
"""
import argparse
import ast
import copy
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import sys
import uuid

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from gsc_route_policy import apply_index_policy
from live_service_catalog import source_service_slug
from world_expansion import SERVICE_MAP, _valid_content, catalog, expansion_page_document

PUBLICATION_FIELDS = ("seo_reviewed", "seo_noindex", "publication_method", "publication_batch_id", "publication_approved_at", "editorial_review_status", "revision")


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, default=str).encode()).hexdigest()


def existing_fallback():
    # Compile only the two existing pure functions, avoiding server startup,
    # Mongo clients, provider calls and background generation/seeding.
    tree = ast.parse((ROOT / "backend/server.py").read_text())
    nodes = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in {"_fallback_content", "_page_content"}]
    if len(nodes) != 2: raise ValueError("Existing fallback changed; inspect before publishing")
    ns = {"source_service_slug": source_service_slug}
    exec(compile(ast.Module(body=nodes, type_ignores=[]), "existing_page_fallback", "exec"), ns)
    return ns["_page_content"]


def prepared_copy():
    path = ROOT / "docs/expansion-release-20261026/first-24-drafts.json"
    if not path.is_file(): return {}
    pack = json.loads(path.read_text())
    if pack.get("format") != "rf-service-area-drafts-v1": raise ValueError("Unknown draft pack")
    result = {}
    for row in pack["pages"]:
        path = row["path"]
        parts = path.strip("/").split("/")
        loc = catalog()["additional"].get(parts[-1])
        if len(parts) != 2 or parts[0] not in SERVICE_MAP or not loc or row.get("source_geoname_id") != loc["geoname_id"] or not _valid_content(row.get("content")) or path in result:
            raise ValueError("Draft pack does not match the catalog")
        result[path] = row["content"]
    return result


def targets():
    data = catalog()
    for loc in data["locations"]:
        for service in SERVICE_MAP.values():
            yield service, loc, f"/{service['slug']}/{loc['loc_slug']}"


def selector(service_slug, loc_slug, *, alternate=False):
    names = [service_slug]
    if alternate and service_slug.startswith("freelancer-"):
        names = [service_slug.replace("freelancer-", "freelance-", 1)]
    clauses = []
    for name in names:
        clauses.extend([{"key": f"{name}::{loc_slug}"}, {"canonical": f"/{name}/{loc_slug}"}, {"canonical": f"/{name}/{loc_slug}/"}])
    return {"$or": clauses}


def current_record(collection, service, loc):
    current = collection.find_one(selector(service["slug"], loc["loc_slug"]))
    if current is None and service["slug"].startswith("freelancer-"):
        current = collection.find_one(selector(service["slug"], loc["loc_slug"], alternate=True))
    return current


def complete_existing(doc):
    # Existing documents need enough public structure to render safely, but
    # their authored text is never replaced to satisfy a new template schema.
    return (isinstance(doc.get("content"), dict) and bool(doc["content"].get("title"))
            and bool(doc["content"].get("meta_description")) and isinstance(doc.get("service"), dict)
            and bool(doc["service"].get("name")) and isinstance(doc.get("location"), dict)
            and bool(doc.get("key")) and bool(doc.get("canonical")))


def match_state(doc, fields):
    return {key: copy.deepcopy(doc[key]) if key in doc else {"$exists": False} for key in fields}


def publish(collection, *, apply=False, journal=None, run_id=None, rows=None, progress=None):
    data, fallback, drafts = catalog(), existing_fallback(), prepared_copy()
    if data["stats"]["candidate_url_count"] != 40008:
        raise ValueError("Catalog capacity changed; inspect its scope before publication")
    stamp = datetime.now(timezone.utc).isoformat()
    run_id = run_id or "catalog-" + uuid.uuid4().hex
    summary = {"run_id": run_id, "mode": "apply" if apply else "dry_run", "catalog_capacity": data["stats"]["candidate_url_count"],
               "processed": 0, "already_eligible": 0, "would_insert": 0, "would_approve_existing": 0,
               "inserted": 0, "approved_existing": 0, "existing_aliases_retained": 0, "conflicts": [], "errors": [],
               "individual_editorial_reviews_performed": 0, "external_indexing_submissions": 0}
    if apply and journal is None: raise ValueError("An apply run requires its write-ahead receipt")
    for service, loc, path in rows if rows is not None else targets():
        summary["processed"] += 1
        try:
            current = current_record(collection, service, loc)
            created = current is None
            if current:
                if not complete_existing(current):
                    summary["conflicts"].append({"path": path, "reason": "incomplete_existing_record_preserved"}); continue
                actual_path = current["canonical"].rstrip("/")
                if actual_path != path: summary["existing_aliases_retained"] += 1
                policy = apply_index_policy(current, actual_path)
                if not policy.get("seo_noindex") and (not policy.get("is_new_location") or policy.get("seo_reviewed") is True):
                    summary["already_eligible"] += 1; continue
                revision = current.get("revision", 0)
                if type(revision) is not int:
                    summary["conflicts"].append({"path": path, "reason": "unexpected_revision_preserved"}); continue
                doc = current
            elif loc["loc_slug"] in data["additional"]:
                doc = expansion_page_document(service, loc, path)
                if path in drafts: doc["content"] = copy.deepcopy(drafts[path])
                revision = 0
            else:
                # Match existing deterministic public copy exactly for base
                # routes, even if no Mongo cache document has been saved yet.
                doc = {"key": f"{service['slug']}::{loc['loc_slug']}", "canonical": path,
                       "service": copy.deepcopy(service), "location": copy.deepcopy(loc),
                       "content": fallback(service, loc), "is_new_location": bool(loc.get("is_new_location")), "ai_generated": False}
                revision = 0
            changes = {"seo_reviewed": True, "seo_noindex": False, "publication_method": "owner_authorized_bulk",
                       "publication_batch_id": run_id, "publication_approved_at": stamp,
                       "editorial_review_status": "not_assessed_by_bulk_job", "revision": revision + 1}
            # seo_reviewed is the application's existing indexing-approval flag.
            # Never forge factual checkboxes, reviewer identity or a claim of
            # individual editorial review to satisfy a bulk owner instruction.
            kind = "would_insert" if created else "would_approve_existing"
            summary[kind] += 1
            if not apply: continue
            receipt = {"run_id": run_id, "key": doc["key"], "canonical": doc["canonical"], "created": created,
                       "content_fingerprint": fingerprint(doc["content"]), "written": changes,
                       "before": {key: copy.deepcopy(doc[key]) for key in PUBLICATION_FIELDS if key in doc},
                       "previously_absent": [key for key in PUBLICATION_FIELDS if key not in doc]}
            journal.write(json.dumps(receipt, default=str, ensure_ascii=False) + "\n"); journal.flush()
            if created:
                inserted_doc = {**doc, **changes}
                query = selector(service["slug"], loc["loc_slug"])
                if service["slug"].startswith("freelancer-"):
                    query["$or"] += selector(service["slug"], loc["loc_slug"], alternate=True)["$or"]
                result = collection.update_one(query, {"$setOnInsert": inserted_doc}, upsert=True)
                if result.upserted_id is None:
                    summary["conflicts"].append({"path": path, "reason": "concurrent_record_preserved"}); continue
                summary["inserted"] += 1
            else:
                query = {"key": doc["key"], "canonical": doc["canonical"], "content": doc["content"],
                         **match_state(doc, PUBLICATION_FIELDS)}
                result = collection.update_one(query, {"$set": changes})
                if result.matched_count != 1:
                    summary["conflicts"].append({"path": path, "reason": "concurrent_edit_preserved"}); continue
                summary["approved_existing"] += 1
        except Exception as exc:
            # Provider/database exception messages can contain connection URIs.
            # Keep only their type in user-visible output; do not print secrets.
            summary["errors"].append({"path": path, "error_type": type(exc).__name__})
            if isinstance(exc, OSError) or type(exc).__name__ in {"AutoReconnect", "ServerSelectionTimeoutError", "ConnectionFailure", "NetworkTimeout", "OperationFailure"}:
                summary["stopped_early"] = True
                break
        if progress and summary["processed"] % 1000 == 0: progress(summary["processed"])
    summary["all_targets_processed"] = summary["processed"] == data["stats"]["candidate_url_count"]
    summary["complete"] = summary["all_targets_processed"] and not summary["conflicts"] and not summary["errors"]
    summary["database_publication_complete"] = apply and summary["complete"]
    return summary


def rollback(collection, receipts, *, apply=False):
    summary = {"mode": "rollback" if apply else "rollback_dry_run", "would_restore": 0, "restored": 0, "skipped_changed_or_absent": 0}
    for row in reversed(receipts):
        current = collection.find_one({"key": row["key"], "publication_batch_id": row["run_id"]})
        if (not current or fingerprint(current.get("content")) != row["content_fingerprint"]
                or any(current.get(key) != value for key, value in row["written"].items())):
            summary["skipped_changed_or_absent"] += 1; continue
        summary["would_restore"] += 1
        if not apply: continue
        query = {"key": row["key"], "canonical": row["canonical"], "content": current["content"], **row["written"]}
        if row["created"]:
            result = collection.delete_one(query)
            summary["restored"] += result.deleted_count
        else:
            update = {"$set": row["before"], "$unset": {key: "" for key in row["previously_absent"]}}
            result = collection.update_one(query, update)
            summary["restored"] += result.matched_count
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Execute the owner's bulk publication instruction")
    parser.add_argument("--receipt-dir", type=Path, default=Path.home() / "rajeev-publication-receipts")
    parser.add_argument("--rollback", type=Path, help="Receipt directory from an earlier run; --apply executes rollback")
    args = parser.parse_args()
    # Use the existing server configuration. Never print or copy credentials.
    from dotenv import load_dotenv
    from pymongo import MongoClient
    load_dotenv(ROOT / "backend/.env", override=False)
    if not os.environ.get("MONGO_URL") or not os.environ.get("DB_NAME"):
        raise SystemExit("Run in the existing backend environment; MONGO_URL and DB_NAME are required.")
    client = MongoClient(os.environ["MONGO_URL"], serverSelectionTimeoutMS=10000)
    try:
        client.admin.command("ping")
        collection = client[os.environ["DB_NAME"]].location_pages
        if args.rollback:
            receipt_path = args.rollback.resolve()
            meta = json.loads((receipt_path / "summary.json").read_text())
            if meta.get("database") != os.environ["DB_NAME"]: raise SystemExit("Receipt database does not match the configured database.")
            receipts = [json.loads(line) for line in (receipt_path / "before-publication.jsonl").read_text().splitlines()]
            report = rollback(collection, receipts, apply=args.apply)
        else:
            run_id = "catalog-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8]
            receipt_path = args.receipt_dir.resolve() / run_id
            if receipt_path == ROOT or ROOT in receipt_path.parents:
                raise SystemExit("Keep publication receipts outside the web repository.")
            receipt_path.mkdir(parents=True, mode=0o700)
            summary_path = receipt_path / "summary.json"
            # Save database/run identity before the first write, so an
            # interrupted run still has a usable, guarded rollback receipt.
            summary_path.write_text(json.dumps({"database": os.environ["DB_NAME"], "run_id": run_id, "state": "running", "mode": "apply" if args.apply else "dry_run"}, indent=2) + "\n")
            summary_path.chmod(0o600)
            if args.apply:
                indexes = list(collection.index_information().values())
                if not any(row.get("key") == [("key", 1)] and row.get("unique") for row in indexes):
                    collection.create_index("key", unique=True)
                # Every OR lookup must be indexed; otherwise 40k upserts can
                # turn into repeated collection scans as the catalog grows.
                if not any(row.get("key") == [("canonical", 1)] for row in indexes):
                    collection.create_index("canonical")
            journal_path = receipt_path / "before-publication.jsonl"
            with journal_path.open("x", encoding="utf-8") as journal:
                journal_path.chmod(0o600)
                report = publish(collection, apply=args.apply, journal=journal, run_id=run_id,
                                 progress=lambda count: print(json.dumps({"processed": count}), flush=True))
            report.update({"database": os.environ["DB_NAME"], "receipt_directory": str(receipt_path),
                           "catalog_sha256": hashlib.sha256((ROOT / "backend/world-expansion-catalog.json").read_bytes()).hexdigest(),
                           "search_indexing_confirmed": False})
            summary_path.write_text(json.dumps(report, indent=2) + "\n"); summary_path.chmod(0o600)
        print(json.dumps(report, indent=2))
        return 0 if report.get("complete", True) else 1
    finally:
        client.close()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (KeyboardInterrupt, SystemExit):
        raise
    except Exception as exc:
        raise SystemExit(f"Publication stopped ({type(exc).__name__}); inspect the private receipt and server configuration. No credential values were printed.") from None
