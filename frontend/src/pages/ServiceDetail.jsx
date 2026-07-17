import React from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Check, ArrowUpRight } from "lucide-react";
import { PageHeader, CTAStrip } from "@/components/site/PageHeader";
import { RevealUp } from "@/components/motion/Reveal";
import useSEO from "@/hooks/useSEO";

const SERVICES = {
    "web-development": {
        title: "Web Development",
        tagline: "Marketing sites, storefronts, and product surfaces built for speed and search.",
        description:
            "I build the front door for your business. Fast, accessible, semantic sites and web apps in Next.js and React that load in under a second and rank well while doing it.",
        deliverables: [
            "Marketing sites (Next.js / Astro)",
            "Product interfaces & dashboards",
            "Headless e-commerce (Shopify, Stripe)",
            "Performance & accessibility audits",
            "Design system implementation",
        ],
        stack: ["Next.js", "React", "TypeScript", "Tailwind", "Vercel", "Stripe"],
        priceFrom: "$3,000",
        eta: "3–6 weeks",
    },
    "software-engineering": {
        title: "Software Engineering",
        tagline: "Custom internal tools, SaaS platforms, and LLM-powered products.",
        description:
            "For teams that need serious engineering — from realtime dashboards to LLM copilots. I handle the boring parts: auth, billing, observability, and the code that keeps the lights on.",
        deliverables: [
            "SaaS MVPs (frontend + backend + infra)",
            "Internal tools & admin consoles",
            "LLM copilots & RAG systems",
            "API & integration work",
            "Fractional CTO advisory",
        ],
        stack: ["Python / FastAPI", "TypeScript", "PostgreSQL", "AWS", "Docker", "OpenAI / Anthropic"],
        priceFrom: "$6,000",
        eta: "4–12 weeks",
    },
    "digital-marketing": {
        title: "Campaign Management",
        tagline: "Paid, organic, and lifecycle — with honest reporting.",
        description:
            "I've run paid and organic for founders, DTC brands, and B2B SaaS. Deep instrumentation, real attribution, and reporting that doesn't lie to you.",
        deliverables: [
            "Paid social & search campaigns",
            "Attribution & analytics setup (GA4, Segment)",
            "Lifecycle & email flows",
            "Landing pages & CRO",
            "Monthly growth reports",
        ],
        stack: ["Meta Ads", "Google Ads", "GA4", "HubSpot", "Segment", "Klaviyo"],
        priceFrom: "$2,500 / month",
        eta: "Ongoing",
    },
    "seo-consulting": {
        title: "SEO & Consulting",
        tagline: "Technical audits, content ops, and long-horizon growth advisory.",
        description:
            "SEO is not dead — it's just quieter. I audit, restructure, and set up the content operation that compounds organic traffic while your competitors chase novelty.",
        deliverables: [
            "Technical SEO audits",
            "Site architecture & schema",
            "Content operation setup",
            "Entity & topical authority strategy",
            "Founder-level advisory calls",
        ],
        stack: ["Ahrefs", "Screaming Frog", "GSC", "Schema.org", "Sitebulb"],
        priceFrom: "$1,500",
        eta: "2–8 weeks",
    },
};

export default function ServiceDetail() {
    const { slug } = useParams();
    const s = SERVICES[slug];
    useSEO({
        title: s ? `${s.title} — Rajeev Freelancer` : "Service — Rajeev Freelancer",
        description: s?.tagline || "",
        path: `/services/${slug}`,
    });
    if (!s) return <Navigate to="/services" replace />;

    return (
        <>
            <PageHeader
                back={{ to: "/services", label: "All services" }}
                eyebrow={`/ Services — ${s.title}`}
                title={s.title}
                subtitle={s.tagline}
            />

            <section className="py-16 md:py-24">
                <div className="max-w-[1440px] mx-auto px-6 md:px-10 grid grid-cols-12 gap-6 md:gap-16">
                    <RevealUp className="col-span-12 md:col-span-7">
                        <p className="eyebrow mb-6">/ Overview</p>
                        <p className="font-serif text-bone text-2xl md:text-3xl leading-snug tracking-tight max-w-2xl">
                            {s.description}
                        </p>

                        <div className="mt-14">
                            <p className="eyebrow mb-6">/ What's included</p>
                            <ul className="space-y-4">
                                {s.deliverables.map((d) => (
                                    <li key={d} className="flex items-start gap-4 text-bone">
                                        <span className="mt-1 w-5 h-5 rounded-full bg-acid/15 border border-acid/40 flex items-center justify-center shrink-0">
                                            <Check size={12} className="text-acid" strokeWidth={2.5} />
                                        </span>
                                        <span className="text-base md:text-lg">{d}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </RevealUp>

                    <RevealUp delay={0.1} className="col-span-12 md:col-span-5">
                        <div className="frame rounded-2xl p-8 md:p-10 sticky top-28">
                            <p className="eyebrow mb-6">/ Engagement</p>
                            <div className="space-y-6">
                                <div>
                                    <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash">Starting from</p>
                                    <p className="font-serif text-bone text-4xl md:text-5xl mt-2">{s.priceFrom}</p>
                                </div>
                                <div>
                                    <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash">Typical timeline</p>
                                    <p className="font-serif text-bone text-2xl md:text-3xl mt-2">{s.eta}</p>
                                </div>
                                <div>
                                    <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash mb-3">Stack</p>
                                    <div className="flex flex-wrap gap-2">
                                        {s.stack.map((t) => <span key={t} className="tag">{t}</span>)}
                                    </div>
                                </div>
                                <Link to="/contact" className="btn-acid w-full justify-center mt-2">
                                    Get a quote <ArrowUpRight size={14} strokeWidth={2.4} />
                                </Link>
                            </div>
                        </div>
                    </RevealUp>
                </div>
            </section>

            <CTAStrip title={`Interested in ${s.title.toLowerCase()}?`} />
        </>
    );
}
