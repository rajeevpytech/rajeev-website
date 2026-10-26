"""Exact observed route continuity. Reports describe URLs, not blanket geo approval."""
import json
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent

def _read(name):
    try:
        return json.loads((ROOT / name).read_text())
    except (OSError, ValueError):
        return {}

ROUTE_STATUS = _read('gsc-route-status.json').get('routes', {})
EXACT_PREFERENCES = _read('canonical-path-map.json').get('preferences', {})
LEGACY_REDIRECTS = _read('legacy-redirects.json').get('redirects', {})
_ALIAS_DATA = _read('gsc-location-aliases.json')
LOCATION_ALIASES = _ALIAS_DATA.get('aliases', {})
if isinstance(LOCATION_ALIASES, list):
    LOCATION_ALIASES = {row['loc_slug']: row for row in LOCATION_ALIASES}


def normalized_path(path):
    path = unquote(str(path).split('?', 1)[0].split('#', 1)[0])
    return '/' + path.strip('/').lower() if path.strip('/') else '/'


def status_for_path(path):
    return ROUTE_STATUS.get(normalized_path(path), {})


def location_for_path(city_map, slug, path):
    if slug in city_map:
        return city_map[slug]
    normalized = normalized_path(path)
    observed_target = EXACT_PREFERENCES.get(normalized)
    # Only exact URLs observed in GSC or their evidenced canonical counterpart
    # are restored. Do not multiply every locality into every service.
    bits = normalized.lstrip("/").split("/", 1)
    alternate = None
    if len(bits) == 2:
        if bits[0].startswith("freelance-"): alternate = "/" + bits[0].replace("freelance-", "freelancer-", 1) + "/" + bits[1]
        elif bits[0].startswith("freelancer-"): alternate = "/" + bits[0].replace("freelancer-", "freelance-", 1) + "/" + bits[1]
    if normalized not in ROUTE_STATUS and alternate not in ROUTE_STATUS and not (observed_target and observed_target in ROUTE_STATUS):
        return None
    alias = LOCATION_ALIASES.get(slug)
    if not alias:
        return None
    return {**alias, 'loc_slug': slug, 'is_legacy_location_alias': True,
            'is_new_location': True}


def apply_index_policy(doc, path):
    result = dict(doc)
    status = status_for_path(path)
    reviewed = result.get('seo_reviewed') is True
    if status.get('noindex') and not reviewed:
        result['seo_noindex'] = True
    elif status.get('index_continuity'):
        result['is_new_location'] = False
        result['seo_noindex'] = False
        result['index_continuity_source'] = 'observed indexed GSC URL'
    else:
        result['seo_noindex'] = bool(result.get('seo_noindex')) or bool(result.get('is_new_location') and not reviewed)
    return result
