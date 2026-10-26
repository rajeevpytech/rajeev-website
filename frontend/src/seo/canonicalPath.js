// Search Console evidence can keep an exact established URL preferred over
// the production service-prefix default. HTTP and rendering paths are untouched.
import LIVE_SERVICES from "./live-services.json";
import PATH_MAP from "./canonical-path-map.json";
const preferred = new Map(LIVE_SERVICES.map(service => [service.primarySlug, service.slug]));
const exactPreferences = PATH_MAP.preferences || {};
const blockedFallbackTargets = new Set(PATH_MAP.blockedFallbackTargets || []);
const eligibleDefaultLocationSlugs = new Set(PATH_MAP.eligibleDefaultLocationSlugs || []);
function exactPreference(pathname) {
  const key = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  let decoded = key;
  try { decoded = decodeURI(key); } catch { /* retain the literal path */ }
  const value = exactPreferences[key] || exactPreferences[decoded];
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : undefined;
}
export function canonicalServicePath(path = "/") {
  const clean = String(path).split(/[?#]/)[0] || "/";
  const rooted = clean.startsWith("/") ? clean : `/${clean}`;
  const selected = exactPreference(rooted);
  if (selected) return selected;
  const parts = rooted.split("/");
  if (preferred.has(parts[1])) {
    const locationParts = parts.slice(2).filter(Boolean);
    if (locationParts.length) {
      let slug = locationParts[0];
      try { slug = decodeURI(slug); } catch { /* retain literal slug */ }
      // Only the established base catalog can use a generic prefix migration.
      // New, historical-alias and unknown DB paths keep themselves preferred
      // unless the exact Search Console evidence above selected a counterpart.
      if (locationParts.length !== 1 || !eligibleDefaultLocationSlugs.has(slug)) return rooted;
    }
    parts[1] = preferred.get(parts[1]);
  }
  const fallback = parts.join("/");
  const target = exactPreference(fallback) || fallback;
  const targetKey = target.length > 1 ? target.replace(/\/+$/, "") : target;
  let decodedTarget = targetKey;
  try { decodedTarget = decodeURI(targetKey); } catch { /* retain literal target */ }
  // A known noindex page cannot become the canonical target of an otherwise
  // indexable existing path merely through the default service-prefix rule.
  if (blockedFallbackTargets.has(targetKey) || blockedFallbackTargets.has(decodedTarget)) return rooted;
  return target;
}
