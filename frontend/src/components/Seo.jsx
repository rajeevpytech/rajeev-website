import { canonicalServicePath } from "@/seo/serviceAliases";
import LIVE_META from "@/seo/live-route-meta.json";
import { Helmet } from "react-helmet-async";
import { getSiteConfig, canonicalBase } from "@/lib/siteConfig";

export default function Seo({ title, description, path = "/", image, jsonLd, noindex = false, type = "website", alternates = null, language = null }) {
  const cfg = getSiteConfig();
  const base = canonicalBase();
  // Canonical must be clean: no query string, no hash, no trailing slash (except root).
  let cleanPath = String(path).split("?")[0].split("#")[0];
  if (cleanPath.length > 1) cleanPath = cleanPath.replace(/\/+$/, "");
  const canonical = `${base}${canonicalServicePath(cleanPath || "/")}`;
  const liveMeta = LIVE_META[cleanPath || "/"];
  const seoTitle = liveMeta?.title ?? title ?? cfg.seo.default_title;
  const seoDesc = liveMeta?.description ?? description ?? cfg.seo.default_description;
  const pageLanguage = language || cfg.seo.default_locale || "en";
  const ogImage = image || cfg.seo.og_image;
  const robots = noindex || cfg.seo.robots_index === false ? "noindex, follow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
  const blocks = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  // hreflang alternates are emitted ONLY when a page genuinely has language variants
  // (e.g. the homepage <-> /hi /ar /es /fr). Emitting per-locale alternates that all
  // point to the same URL is invalid and creates duplicate-content signals, so we don't.
  const alts = Array.isArray(alternates) && alternates.length ? alternates : null;
  const xDefault = alts ? (alts.find((a) => a.lang === "en") || alts[0]) : null;

  return (
    <Helmet>
      <html lang={pageLanguage} dir={pageLanguage.startsWith("ar") ? "rtl" : "ltr"} />
      <title>{seoTitle}</title>
      <meta name="description" content={seoDesc} />
      <meta name="robots" content={robots} />
      {!noindex && <link rel="canonical" href={canonical} />}
      {cfg.seo.google_verification ? <meta name="google-site-verification" content={cfg.seo.google_verification} /> : null}

      {alts &&
        alts.map((a) => (
          <link key={a.lang} rel="alternate" hrefLang={a.lang} href={`${base}${a.path}`} />
        ))}
      {alts && <link rel="alternate" hrefLang="x-default" href={`${base}${xDefault.path}`} />}

      {/* Open Graph */}
      <meta property="og:site_name" content={cfg.seo.site_name} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDesc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content={pageLanguage.replace("-", "_")} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDesc} />
      <meta name="twitter:image" content={ogImage} />
      {cfg.seo.twitter_handle ? <meta name="twitter:site" content={cfg.seo.twitter_handle} /> : null}

      {blocks.map((block, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(block).replace(/</g, "\\u003c")}</script>
      ))}
    </Helmet>
  );
}
