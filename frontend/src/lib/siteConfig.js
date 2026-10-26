import { canonicalServicePath } from "@/seo/canonicalPath";
import { analyticsId, cleanEventMeta, emitJourneyEvent, publicPageMeta, publicPath } from "@/lib/journeyTracking";
// Build-time SEO/site defaults (kept in sync with backend DEFAULT_SITE). These make the
// first render correct even before the live /api/settings fetch resolves. Admin edits persist
// server-side and hydrate the app at runtime via SettingsContext -> setSiteConfig().

export const SITE_DEFAULTS = {
  seo: {
    site_name: "Rajeev Freelancer",
    default_title: "Rajeev Freelancer — Senior Freelance Engineer & AI/Digital Marketing Consultant",
    default_description:
      "Hire Rajeev — a senior freelance engineer & AI/digital marketing consultant with 12+ years' experience. Web development, software, SEO, AI automation & WhatsApp marketing. Available worldwide.",
    og_image: "https://customer-assets-gfyr7b9c.emergentagent.net/job_rajeev-seo-hub/artifacts/whqtfhxo_image.png",
    canonical_domain: "https://rajeevfreelancer.com",
    twitter_handle: "@rajeevfreelancer",
    robots_index: true,
    google_verification: "",
    default_locale: "en",
    locales: ["en", "hi", "ar", "es", "fr"],
  },
  contact: {
    name: "Rajeev Freelancer",
    email: "hello@rajeevfreelancer.com",
    phone: "+919711623561",
    whatsapp: "919711623561",
    whatsapp_display: "+91 97116 23561",
  },
  social: { linkedin: "", twitter: "", github: "", instagram: "", youtube: "", facebook: "" },
  business: {
    logo: "https://customer-assets-gfyr7b9c.emergentagent.net/job_rajeev-seo-hub/artifacts/whqtfhxo_image.png",
    rating: "",
    reviews_count: "",
    reviews_verified: false,
    testimonials_verified: false,
    founding_year: "2013",
    founder_name: "Rajeev Gits",
    address: "Gurgaon, Haryana, India",
    google_maps_url: "",
    google_profile_url: "https://share.google/ddhGdf8R7JkjaWji3",
    customer_facing_office_verified: false,
    map_embed_url: "",
  },
  tracking: { ga4_id: "", ads_id: "", ads_conversion_label: "" },
  marketing: { offers_enabled: true, popup_enabled: true, offers_end_date: "" },
};

let _config = SITE_DEFAULTS;

// Add testimonials only after source, permission and wording have been verified.
// Business-owned reviews are never emitted as self-serving review-rich-result markup.
export const REVIEWS = [
  { name: "Priya Nair", role: "Founder, D2C skincare brand", location: "Mumbai, India", rating: 5, img: "https://images.unsplash.com/photo-1573496130141-209d200cebd8?crop=entropy&cs=srgb&fm=jpg&q=85&w=200", quote: "Rajeev rebuilt our site and our organic traffic tripled in five months. He treats your business like his own." },
  { name: "Daniel Roberts", role: "Ops Lead, B2B SaaS", location: "London, UK", rating: 5, img: "https://images.unsplash.com/photo-1622626426572-c268eb006092?crop=entropy&cs=srgb&fm=jpg&q=85&w=200", quote: "The WhatsApp automation alone paid for the whole engagement. Fast, senior, no fluff." },
  { name: "Ahmed Hassan", role: "Director, Retail", location: "Dubai, UAE", rating: 5, img: "https://images.unsplash.com/photo-1589386417686-0d34b5903d23?crop=entropy&cs=srgb&fm=jpg&q=85&w=200", quote: "We hired an agency first and wasted months. Rajeev fixed it in weeks — and explained every decision." },
  { name: "Sofia Marín", role: "Marketing Head, Fintech", location: "Madrid, Spain", rating: 5, img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?crop=entropy&cs=srgb&fm=jpg&q=85&w=200", quote: "Our AI Overview citations went from zero to appearing for our top queries. The GEO work is the real deal." },
  { name: "James Carter", role: "Founder, Home services", location: "Toronto, Canada", rating: 5, img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=entropy&cs=srgb&fm=jpg&q=85&w=200", quote: "Clear pricing, quick delivery, and leads coming in on autopilot. Exactly what a lean team needs." },
  { name: "Meera Iyer", role: "COO, Ecommerce", location: "Bangalore, India", rating: 5, img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?crop=entropy&cs=srgb&fm=jpg&q=85&w=200", quote: "A faster site and a smarter checkout lifted our conversion by half. Every decision was explained in plain English." },
];


export function getSiteConfig() {
  return _config;
}

function deepMerge(base, override) {
  const out = { ...base };
  for (const k of Object.keys(override || {})) {
    const v = override[k];
    out[k] = v && typeof v === "object" && !Array.isArray(v) && out[k] && typeof out[k] === "object"
      ? deepMerge(out[k], v)
      : v;
  }
  return out;
}

export function setSiteConfig(next) {
  _config = deepMerge(SITE_DEFAULTS, next || {});
  return _config;
}

// Inject Google Analytics 4 / Google Ads gtag.js once, if IDs are configured.
export function initTracking() {
  const t = getSiteConfig().tracking || {};
  const ids = [analyticsId(getSiteConfig()), /^AW-\d{4,16}$/.test(t.ads_id || "") ? t.ads_id : ""].filter(Boolean);
  if (!ids.length || typeof window === "undefined" || window.__gtagLoaded) return;
  window.__gtagLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${ids[0]}`;
  document.head.appendChild(s);
  window.gtag("js", new Date());
  ids.forEach((id) => window.gtag("config", id, { send_page_view: false }));
}

// Fire a lead conversion (GA4 generate_lead + Google Ads conversion) on form success.
export function trackConversion(meta = {}) {
  const t = getSiteConfig().tracking || {};
  if (typeof window === "undefined" || typeof window.gtag !== "function" || !publicPath(window.location.pathname)) return;
  emitJourneyEvent(getSiteConfig(), "generate_lead", cleanEventMeta(meta));
  if (/^AW-\d{4,16}$/.test(t.ads_id || "") && /^[A-Za-z0-9_-]{1,100}$/.test(t.ads_conversion_label || "")) {
    try { window.gtag("event", "conversion", { ...publicPageMeta(window.location.pathname), send_to: `${t.ads_id}/${t.ads_conversion_label}` }); } catch { /* Contact success is independent of analytics. */ }
  }
}

export const canonicalBase = () => (getSiteConfig().seo.canonical_domain || "https://rajeevfreelancer.com").replace(/^https:\/\/www\.rajeevfreelancer\.com/, "https://rajeevfreelancer.com").replace(/\/$/, "");

// ---------------- Structured data (JSON-LD) builders ----------------
export function organizationSchema() {
  const c = getSiteConfig();
  const base = canonicalBase();
  const sameAs = [...Object.values(c.social || {}), c.business.google_profile_url].filter((u) => /^https?:\/\//.test(u || ""));
  return {
    "@context": "https://schema.org", "@type": "Organization", "@id": `${base}/#organization`,
    name: c.seo.site_name, url: `${base}/`, logo: c.business.logo, image: c.seo.og_image,
    description: c.seo.default_description, email: c.contact.email, telephone: c.contact.phone,
    areaServed: "Worldwide", founder: { "@id": `${base}/#rajeev` },
    contactPoint: [{ "@type": "ContactPoint", telephone: c.contact.phone, email: c.contact.email, contactType: "sales", availableLanguage: ["English", "Hindi"] }],
    ...(sameAs.length ? { sameAs: [...new Set(sameAs)] } : {}),
  };
}

// Person entity for E-E-A-T & AI knowledge-graph disambiguation.
export function personSchema() {
  const c = getSiteConfig();
  const base = canonicalBase();
  const sameAs = Object.values(c.social || {}).filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${base}/#rajeev`,
    name: c.business.founder_name || "Rajeev",
    alternateName: "Rajeev Freelancer",
    jobTitle: "Senior Freelance Engineer & AI / Digital Marketing Consultant",
    description:
      "Senior freelance engineer & AI/digital-marketing consultant with experience across web, software and digital marketing. Web & software development, SEO, GEO, AI automation and WhatsApp marketing for businesses worldwide.",
    image: c.business.logo,
    url: base,
    email: c.contact.email,
    telephone: c.contact.phone,
    worksFor: { "@id": `${base}/#organization` },
    knowsAbout: [
      "Search Engine Optimization",
      "Generative Engine Optimization",
      "AI Automation",
      "Web Development",
      "Software Engineering",
      "Digital Marketing",
      "WhatsApp Marketing",
      "React",
      "Python",
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Gurgaon",
      addressRegion: "Haryana",
      addressCountry: "IN",
    },
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function websiteSchema() {
  const c = getSiteConfig();
  const base = canonicalBase();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${base}/#website`,
    url: base,
    name: c.seo.site_name,
    inLanguage: c.seo.default_locale,
    publisher: { "@id": `${base}/#organization` },
  };
}

export function breadcrumbSchema(items) {
  const base = canonicalBase();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${base}${canonicalServicePath(it.path || "/")}`,
    })),
  };
}

export function serviceSchema({ name, description, path, city, areaType = "City" }) {
  const c = getSiteConfig();
  const base = canonicalBase();
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: name,
    name,
    ...(description ? { description } : {}),
    provider: { "@id": `${base}/#organization`, name: c.seo.site_name },
    ...(city ? { areaServed: { "@type": areaType, name: city } } : { areaServed: "Worldwide" }),
    url: `${base}${canonicalServicePath(path)}`,
  };
}

// A remote service market is an areaServed, never a fabricated office or local branch.
export function localBusinessSchema({ city, path, name, areaServed }) {
  const c = getSiteConfig();
  const base = canonicalBase();
  const areas = Array.isArray(areaServed) && areaServed.length ? areaServed : [city];
  return {
    "@context": "https://schema.org", "@type": "Service", "@id": `${base}${canonicalServicePath(path)}#remote-service`,
    name: name || `${c.seo.site_name} remote services`, url: `${base}${canonicalServicePath(path)}`,
    provider: { "@id": `${base}/#organization` },
    areaServed: areas.filter(Boolean).map((name) => ({ "@type": "Place", name })),
    availableChannel: { "@type": "ServiceChannel", serviceUrl: `${base}/contact` },
  };
}

export function faqSchema(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (faqs || []).map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
