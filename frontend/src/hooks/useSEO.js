import { useEffect } from "react";
import { SITE, url as siteUrl } from "@/lib/seo";

/*
 * Comprehensive SEO hook — handles title, description, keywords, canonical,
 * OpenGraph, Twitter Card, robots directives, and structured data (JSON-LD).
 *
 * Usage:
 *   useSEO({
 *     title: "Page Title",
 *     description: "Page description",
 *     path: "/services",
 *     keywords: ["custom", "keywords"],
 *     ogImage: "https://…",
 *     type: "article",
 *     structuredData: [{ "@context": "https://schema.org", ... }],
 *   });
 */
export default function useSEO({
    title,
    description = SITE.description,
    path = "",
    keywords = [],
    ogImage = SITE.ogImage,
    type = "website",
    noindex = false,
    structuredData = [],
} = {}) {
    useEffect(() => {
        const fullTitle = title ? `${title} · ${SITE.name}` : `${SITE.name} — ${SITE.tagline}`;
        const canonical = siteUrl(path);
        const allKeywords = Array.from(new Set([...(keywords || []), ...SITE.keywords])).join(", ");

        document.title = fullTitle;

        setMeta("description", description);
        setMeta("keywords", allKeywords);
        setMeta("author", SITE.author);
        setMeta("robots", noindex ? "noindex,nofollow" : "index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1");

        setLink("canonical", canonical);

        // OpenGraph
        setMetaProp("og:title", fullTitle);
        setMetaProp("og:description", description);
        setMetaProp("og:url", canonical);
        setMetaProp("og:type", type);
        setMetaProp("og:site_name", SITE.name);
        setMetaProp("og:image", ogImage);
        setMetaProp("og:image:width", "1200");
        setMetaProp("og:image:height", "630");
        setMetaProp("og:locale", "en_US");

        // Twitter Card
        setMeta("twitter:card", "summary_large_image");
        setMeta("twitter:title", fullTitle);
        setMeta("twitter:description", description);
        setMeta("twitter:image", ogImage);
        setMeta("twitter:site", SITE.twitter);
        setMeta("twitter:creator", SITE.twitter);

        // Inject JSON-LD structured data
        clearScripts("data-seo-ld");
        (Array.isArray(structuredData) ? structuredData : [structuredData])
            .filter(Boolean)
            .forEach((data) => {
                const script = document.createElement("script");
                script.type = "application/ld+json";
                script.setAttribute("data-seo-ld", "1");
                script.text = JSON.stringify(data);
                document.head.appendChild(script);
            });

        // Scroll to top on route change (Lenis-aware)
        window.scrollTo({ top: 0, behavior: "instant" });
        if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });

        return () => clearScripts("data-seo-ld");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, description, path, JSON.stringify(keywords), ogImage, type, noindex, JSON.stringify(structuredData)]);
}

function setMeta(name, content) {
    if (!content) return;
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
    }
    el.setAttribute("content", content);
}

function setMetaProp(property, content) {
    if (!content) return;
    let el = document.querySelector(`meta[property="${property}"]`);
    if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
    }
    el.setAttribute("content", content);
}

function setLink(rel, href) {
    if (!href) return;
    let el = document.querySelector(`link[rel="${rel}"]`);
    if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        document.head.appendChild(el);
    }
    el.setAttribute("href", href);
}

function clearScripts(attr) {
    document.querySelectorAll(`script[${attr}]`).forEach((s) => s.remove());
}

// -------- Pre-built structured data helpers --------

export const orgSchema = () => ({
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": siteUrl("/#business"),
    name: SITE.name,
    url: SITE.domain,
    image: SITE.ogImage,
    telephone: SITE.contact.phone,
    email: SITE.contact.email,
    priceRange: "$$-$$$",
    address: { "@type": "PostalAddress", addressLocality: SITE.contact.city, addressCountry: SITE.contact.country },
    areaServed: "Worldwide",
    sameAs: ["https://www.linkedin.com/", "https://github.com/", "https://www.upwork.com/", "https://www.peopleperhour.com/"],
});

export const personSchema = () => ({
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": siteUrl("/#person"),
    name: SITE.author,
    url: SITE.domain,
    image: siteUrl("/og-portrait.jpg"),
    jobTitle: "Senior Freelance Engineer & Marketer",
    email: SITE.contact.email,
    telephone: SITE.contact.phone,
    address: { "@type": "PostalAddress", addressLocality: SITE.contact.city, addressCountry: SITE.contact.country },
    worksFor: { "@type": "Organization", name: "Independent" },
    alumniOf: [
        { "@type": "Organization", name: "IOG" },
        { "@type": "Organization", name: "Accenture" },
        { "@type": "Organization", name: "Google" },
    ],
    knowsAbout: [
        "Web Development", "Software Engineering", "Digital Marketing",
        "SEO", "Brand Identity", "Mobile App Development",
    ],
    sameAs: ["https://www.linkedin.com/", "https://github.com/", "https://www.upwork.com/", "https://www.peopleperhour.com/"],
});

export const websiteSchema = () => ({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": siteUrl("/#website"),
    url: SITE.domain,
    name: SITE.name,
    description: SITE.description,
    publisher: { "@id": siteUrl("/#person") },
    potentialAction: {
        "@type": "SearchAction",
        target: `${SITE.domain}/blog?q={search_term_string}`,
        "query-input": "required name=search_term_string",
    },
});

export const breadcrumbSchema = (items = []) => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: it.name,
        item: siteUrl(it.path),
    })),
});

export const serviceSchema = ({ name, description, slug, priceFrom }) => ({
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: name,
    provider: { "@id": siteUrl("/#person") },
    name,
    description,
    url: siteUrl(`/services/${slug}`),
    areaServed: "Worldwide",
    offers: priceFrom ? { "@type": "Offer", price: priceFrom.replace(/[^0-9]/g, ""), priceCurrency: "USD" } : undefined,
});

export const articleSchema = ({ title, description, slug, datePublished = "2025-11-01", image }) => ({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    author: { "@id": siteUrl("/#person") },
    publisher: { "@id": siteUrl("/#person") },
    datePublished,
    dateModified: datePublished,
    mainEntityOfPage: { "@type": "WebPage", "@id": siteUrl(`/blog/${slug}`) },
    image: image || SITE.ogImage,
});

export const faqSchema = (items = []) => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
        "@type": "Question",
        name: it.q,
        acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
});

export const localBusinessSchema = (city) => ({
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: `${SITE.name} — Freelancer in ${city}`,
    url: siteUrl(`/freelancer-in/${city.toLowerCase().replace(/\s+/g, "-")}`),
    image: SITE.ogImage,
    telephone: SITE.contact.phone,
    email: SITE.contact.email,
    priceRange: "$$-$$$",
    address: { "@type": "PostalAddress", addressLocality: SITE.contact.city, addressCountry: SITE.contact.country },
    areaServed: { "@type": "City", name: city },
});
