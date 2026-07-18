import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { RevealUp } from "@/components/motion/Reveal";
import { SERVICES } from "@/constants/testIds";
import { waUrl, WA_MESSAGES } from "@/lib/whatsapp";

import { Code2, Layers, Megaphone, LineChart } from "lucide-react";

const services = [
    {
        slug: "web-development",
        icon: Layers,
        title: "Web Development",
        blurb:
            "Marketing sites, product interfaces, and Next.js/React storefronts built for speed and search.",
        stack: ["Next.js", "React", "Tailwind", "Vercel"],
    },
    {
        slug: "software-engineering",
        icon: Code2,
        title: "Software Engineering",
        blurb:
            "Custom internal tools, SaaS platforms, LLM-powered products. Backend + frontend + boring parts.",
        stack: ["Python", "TypeScript", "Postgres", "AWS"],
    },
    {
        slug: "digital-marketing",
        icon: Megaphone,
        title: "Campaign Management",
        blurb:
            "Paid, organic, and lifecycle. Deep instrumentation, attribution, and honest reporting.",
        stack: ["Meta", "Google Ads", "GA4", "HubSpot"],
    },
    {
        slug: "seo-consulting",
        icon: LineChart,
        title: "SEO & Consulting",
        blurb:
            "Technical audits, content operations, and long-horizon growth advisory for founders.",
        stack: ["Technical SEO", "Schema", "Content Ops"],
    },
];

export default function Services({ compact = false, sectionNumber = "002" }) {
    return (
        <section
            id="services"
            data-testid={SERVICES.root}
            className="relative py-24 md:py-40"
        >
            <div className="max-w-[1440px] mx-auto px-6 md:px-10">
                <div className="grid grid-cols-12 gap-6 md:gap-10 items-end mb-12 md:mb-20">
                    <RevealUp className="col-span-12 md:col-span-7">
                        <p className="eyebrow mb-6">/ {sectionNumber} — What I do</p>
                        <h2 className="font-serif text-bone text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-tight">
                            Four disciplines, <span className="italic text-ash">one operator.</span>
                        </h2>
                    </RevealUp>
                    <RevealUp delay={0.1} className="col-span-12 md:col-span-5 md:pl-6">
                        <p className="text-ash text-base md:text-lg leading-relaxed max-w-md">
                            Most freelancers pick a lane. I've spent a career building the whole
                            vehicle — because startups don't have the luxury of specialists.
                        </p>
                    </RevealUp>
                </div>

                <div className="grid grid-cols-12 gap-4 md:gap-6">
                    {services.map((s, i) => {
                        const Icon = s.icon;
                        return (
                            <RevealUp
                                key={s.slug}
                                delay={i * 0.08}
                                className="col-span-12 md:col-span-6"
                            >
                                <Link
                                    to={`/services/${s.slug}`}
                                    data-testid={SERVICES.card(s.slug)}
                                    className="group frame rounded-2xl p-8 md:p-10 h-full flex flex-col justify-between hover:border-acid/40 transition-colors duration-500 block"
                                    style={{ transition: "border-color 500ms, transform 500ms" }}
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="w-11 h-11 rounded-full border border-white/15 flex items-center justify-center text-bone group-hover:text-acid group-hover:border-acid/40 transition-colors">
                                                <Icon size={18} strokeWidth={1.6} />
                                            </div>
                                            <span className="font-mono text-[11px] tracking-[0.2em] text-ash uppercase">
                                                / 0{i + 1}
                                            </span>
                                        </div>
                                        <h3 className="font-serif text-bone text-3xl md:text-4xl tracking-tight">
                                            {s.title}
                                        </h3>
                                        <p className="mt-4 text-ash text-base leading-relaxed max-w-md">
                                            {s.blurb}
                                        </p>
                                    </div>

                                    <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex flex-wrap gap-2">
                                            {s.stack.map((t) => (
                                                <span key={t} className="tag">{t}</span>
                                            ))}
                                        </div>
                                        <ArrowUpRight
                                            className="text-ash group-hover:text-acid transition-colors"
                                            size={20}
                                            strokeWidth={1.6}
                                        />
                                    </div>
                                </Link>
                            </RevealUp>
                        );
                    })}
                </div>

                <RevealUp delay={0.4} className="mt-12 md:mt-16 flex flex-wrap items-center justify-between gap-6">
                    <p className="font-serif italic text-bone text-xl md:text-2xl max-w-xl">
                        Not sure which one you need? That's usually a good time to talk.
                    </p>
                    <a
                        data-testid={SERVICES.quoteCta}
                        href={waUrl(WA_MESSAGES.quote)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-acid"
                    >
                        <MessageCircle size={14} strokeWidth={2.2} /> Get a quote on WhatsApp <ArrowUpRight size={14} strokeWidth={2.4} />
                    </a>
                </RevealUp>
            </div>
        </section>
    );
}
