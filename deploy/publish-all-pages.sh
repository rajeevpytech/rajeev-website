#!/usr/bin/env bash
set -euo pipefail

RF_PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd -- "$RF_PROJECT_ROOT"

# Reuse this application's environment rather than installing packages into
# the system interpreter or changing another application's environment.
for RF_ENV_PYTHON in "$RF_PROJECT_ROOT/venv/bin/python" "$RF_PROJECT_ROOT/backend/venv/bin/python" "$RF_PROJECT_ROOT/.venv/bin/python" "$RF_PROJECT_ROOT/backend/.venv/bin/python"; do
    if [[ -x "$RF_ENV_PYTHON" ]] && "$RF_ENV_PYTHON" -c 'import dotenv, pymongo, fastapi' >/dev/null 2>&1; then
        exec "$RF_ENV_PYTHON" scripts/publish_all_catalog_pages.py --apply "$@"
    fi
done
if python3 -c 'import dotenv, pymongo, fastapi' >/dev/null 2>&1; then
    exec python3 scripts/publish_all_catalog_pages.py --apply "$@"
fi
printf '%s\n' 'Activate the existing backend Python environment, then run: python scripts/publish_all_catalog_pages.py --apply' >&2
exit 1
