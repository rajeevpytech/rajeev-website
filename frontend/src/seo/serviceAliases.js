// Existing production URLs remain valid alongside the uploaded source's service URLs.
import { SERVICES } from "@/data/site";
import LIVE_SERVICES from "./live-services.json";
export { LIVE_SERVICES };
const servicesBySlug = new Map([...SERVICES, ...LIVE_SERVICES].map(service => [service.slug, service]));
export const serviceForSlug = slug => servicesBySlug.get(slug);
export const primaryServiceSlug = slug => serviceForSlug(slug)?.primarySlug || slug;

export { canonicalServicePath } from "./canonicalPath";
