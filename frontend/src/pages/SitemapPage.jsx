import React from "react";
import { Link } from "react-router-dom";
import { PageHeader, CTAStrip } from "@/components/site/PageHeader";
import { RevealUp } from "@/components/motion/Reveal";
import useSEO from "@/hooks/useSEO";

const GROUPS = [
    {
        title: "Primary",
        links: [
            { to: "/", label: "Home" },
            { to: "/about", label: "About" },
            { to: "/journey", label: "Journey" },
            { to: "/work", label: "Case Studies" },
            { to: "/services", label: "Services" },
            { to: "/blog", label: "Journal" },
            { to: "/faq", label: "FAQ" },
            { to: "/contact", label: "Contact" },
        ],
    },
    {
        title: "Services",
        links: [
            { to: "/services/web-development", label: "Web Development" },
            { to: "/services/software-engineering", label: "Software Engineering" },
            { to: "/services/digital-marketing", label: "Campaign Management" },
            { to: "/services/seo-consulting", label: "SEO & Consulting" },
        ],
    },
    {
        title: "Locations",
        links: [
            { to: "/freelancer-in/gurgaon", label: "Freelancer in Gurgaon" },
            { to: "/freelancer-in/mumbai", label: "Freelancer in Mumbai" },
            { to: "/freelancer-in/delhi", label: "Freelancer in Delhi" },
            { to: "/freelancer-in/london", label: "Freelancer in London" },
            { to: "/freelancer-in/new-york", label: "Freelancer in New York" },
            { to: "/freelancer-in/dubai", label: "Freelancer in Dubai" },
            { to: "/freelancer-in/singapore", label: "Freelancer in Singapore" },
            { to: "/freelancer-in/sydney", label: "Freelancer in Sydney" },
        ],
    },
    {
        title: "Legal",
        links: [
            { to: "/privacy", label: "Privacy Policy" },
            { to: "/terms", label: "Terms of Service" },
            { to: "/cookies", label: "Cookies" },
        ],
    },
];

export default function SitemapPage() {
    useSEO({
        title: "Sitemap — Rajeev Freelancer",
        description: "Every page on rajeevfreelancer.com, one click away.",
        path: "/sitemap",
    });
    return (
        <>
            <PageHeader eyebrow="/ Sitemap" title="Every page," italic="one click away." />
            <section className="pb-16">
                <div className="max-w-[1200px] mx-auto px-6 md:px-10 grid grid-cols-1 md:grid-cols-2 gap-14 md:gap-20">
                    {GROUPS.map((g, i) => (
                        <RevealUp key={g.title} delay={i * 0.05}>
                            <p className="eyebrow mb-6">/ {g.title}</p>
                            <ul className="space-y-3">
                                {g.links.map((l) => (
                                    <li key={l.to}>
                                        <Link to={l.to} className="font-serif text-bone text-xl md:text-2xl link-sweep">
                                            {l.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </RevealUp>
                    ))}
                </div>
            </section>
            <CTAStrip />
        </>
    );
}
