// Events use controlled taxonomy and public paths, never enquiry text or URL queries.
const EVENTS = new Set(["generate_lead", "whatsapp_click", "phone_click", "email_click", "work_open", "case_study_open", "portfolio_filter"]);
const PRIVATE = /^\/(?:admin|api)(?:\/|$)/i;

export function publicPath(value) {
  if (typeof value !== "string") return "";
  let path = value.split(/[?#]/)[0];
  try { path = decodeURIComponent(path); } catch { return ""; }
  if (!path.startsWith("/") || path.startsWith("//") || PRIVATE.test(path) || /[@\\\s?#]|\d{8,}/.test(path)) return "";
  return /^[\p{L}\p{N}/_.-]{1,240}$/u.test(path) ? path : "";
}

function token(value) {
  return typeof value === "string" && /^[a-z][a-z0-9-]{0,79}$/.test(value) && !/\d{8,}/.test(value) ? value : "";
}

export function cleanEventMeta(meta = {}) {
  const out = {};
  const path = publicPath(meta.page_path);
  if (path) out.page_path = path;
  for (const key of ["service", "industry", "project"]) {
    const value = token(meta[key]);
    if (value) out[key] = value;
  }
  if (["details", "live", "demo"].includes(meta.link_kind)) out.link_kind = meta.link_kind;
  if (typeof meta.has_search === "boolean") out.has_search = meta.has_search;
  return out;
}

export function analyticsId(config) {
  const id = config?.tracking?.ga4_id;
  return typeof id === "string" && /^G-[A-Z0-9]{4,24}$/.test(id) ? id : "";
}

export function publicPageMeta(path) {
  const clean = publicPath(path);
  if (!clean || typeof window === "undefined") return {};
  let referrer = "";
  try { referrer = new URL(document.referrer).origin; } catch { /* No referrer. */ }
  return { page_path: clean, page_location: window.location.origin + clean, page_referrer: referrer };
}

export function emitJourneyEvent(config, name, meta = {}) {
  const id = analyticsId(config);
  if (!id || !EVENTS.has(name) || typeof window === "undefined" || typeof window.gtag !== "function") return false;
  const path = publicPath(window.location.pathname);
  if (!path) return false;
  try {
    window.gtag("event", name, { ...cleanEventMeta(meta), ...publicPageMeta(path), send_to: id });
    return true;
  } catch { return false; } // Measurement must never interrupt a contact action.
}

export function emitPageView(config, path) {
  const id = analyticsId(config), clean = publicPath(path);
  if (!id || !clean || typeof window === "undefined" || typeof window.gtag !== "function") return false;
  const key = `${id}:${clean}`;
  if (window.__rfLastPageView === key) return false;
  try {
    window.gtag("event", "page_view", { ...publicPageMeta(clean), send_to: id });
    window.__rfLastPageView = key;
    return true;
  } catch { return false; }
}

export function installJourneyClicks(getConfig, doc = document) {
  const click = (event) => {
    const anchor = event.target?.closest?.("a[href]");
    if (!anchor || event.defaultPrevented || event.button > 0) return;
    const config = getConfig();
    try {
      const url = new URL(anchor.getAttribute("href"), window.location.href);
      const digits = value => String(value || "").replace(/\D/g, "");
      const contact = config.contact || {};
      if (anchor.dataset.rfProject) {
        emitJourneyEvent(config, "work_open", { project: anchor.dataset.rfProject, link_kind: anchor.dataset.rfLinkKind });
      } else if (url.origin === window.location.origin && /^\/case-studies\/[a-z0-9-]+$/.test(url.pathname)) {
        emitJourneyEvent(config, "case_study_open");
      } else if (url.protocol === "tel:" && digits(url.pathname) === digits(contact.phone) && digits(contact.phone)) {
        emitJourneyEvent(config, "phone_click");
      } else if (url.protocol === "mailto:" && url.pathname.toLowerCase() === String(contact.email || "").toLowerCase() && contact.email) {
        emitJourneyEvent(config, "email_click");
      } else if (url.protocol === "https:" && (url.hostname === "wa.me" || url.hostname === "api.whatsapp.com" || url.hostname === "web.whatsapp.com")) {
        const target = url.hostname === "wa.me" ? digits(url.pathname) : digits(url.searchParams.get("phone"));
        if (target && target === digits(contact.whatsapp)) emitJourneyEvent(config, "whatsapp_click");
      }
    } catch { /* Invalid or unsupported links are left to the browser. */ }
  };
  doc.addEventListener("click", click, true);
  return () => doc.removeEventListener("click", click, true);
}
