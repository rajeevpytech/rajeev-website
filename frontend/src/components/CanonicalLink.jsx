import { forwardRef } from "react";
import { Link as RouterLink } from "react-router-dom";
import { canonicalServicePath } from "@/seo/canonicalPath";

function preferredPath(pathname) {
  if (typeof pathname !== "string" || !pathname || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\?)/i.test(pathname)) return pathname;
  const canonical = canonicalServicePath(pathname);
  return pathname.startsWith("/") ? canonical : canonical.slice(1);
}

// Change only internal service pathnames. Router state, query strings, fragments,
// external URLs and every other Link prop retain their original behavior.
export function preferredLinkTarget(to) {
  if (typeof to === "string") {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\?)/i.test(to) || !to) return to;
    const start = to.search(/[?#]/);
    const pathname = start === -1 ? to : to.slice(0, start);
    const suffix = start === -1 ? "" : to.slice(start);
    return `${preferredPath(pathname)}${suffix}`;
  }
  if (to && typeof to === "object" && typeof to.pathname === "string") {
    return { ...to, pathname: preferredPath(to.pathname) };
  }
  return to;
}

const CanonicalLink = forwardRef(function CanonicalLink({ to, ...props }, ref) {
  return <RouterLink {...props} ref={ref} to={preferredLinkTarget(to)} />;
});
export default CanonicalLink;
