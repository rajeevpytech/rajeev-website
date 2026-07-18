import React from "react";
import { Link } from "react-router-dom";
import {
    Globe, Store, LayoutGrid, Sparkles, Gauge,
    Palette, Type, Image as ImageIcon, Tag,
    Smartphone, ShoppingBag, Layers,
    Megaphone, Target, Users, BarChart3, Mail,
    ArrowUpRight, MessageCircle,
} from "lucide-react";
import { RevealUp } from "@/components/motion/Reveal";
import { motion } from "framer-motion";
import { SERVICES } from "@/constants/testIds";
import { waUrl, WA_MESSAGES } from "@/lib/whatsapp";

const categories = [
    {
        n: "01", key: "web", slug: "web-development",
        title: "Website Development",
        blurb: "Custom websites, eCommerce, corporate, and landing pages that convert visitors into customers.",
        items: [
            { icon: Globe, title: "Website Development", desc: "Bespoke websites engineered for speed, SEO, and conversion." },
            { icon: LayoutGrid, title: "Business Websites", desc: "Brand-authority sites that turn first impressions into trust." },
            { icon: Store, title: "eCommerce Stores", desc: "High-converting online stores with secure payments and inventory." },
            { icon: Layers, title: "Landing Pages", desc: "Single-page funnels purpose-built for ad campaigns." },
            { icon: Sparkles, title: "Portfolio Sites", desc: "Editorial showcases that elevate your work and your story." },
            { icon: Gauge, title: "Performance Optimization", desc: "Lighthouse-perfect scores with sub-second load times." },
        ],
    },
    {
        n: "02", key: "brand", slug: "seo-consulting",
        title: "Brand Identity",
        blurb: "Logos, brand systems and content that earn attention and stay in memory.",
        items: [
            { icon: Palette, title: "Logo Design", desc: "Memorable marks that define your brand identity." },
            { icon: Tag, title: "Brand Identity", desc: "Complete visual systems — logo, type, color, voice." },
            { icon: Type, title: "Typography Systems", desc: "Considered type pairings tuned for your brand tone." },
            { icon: ImageIcon, title: "Social Media Graphics", desc: "Engaging visuals tuned for every channel." },
        ],
    },
    {
        n: "03", key: "apps", slug: "software-engineering",
        title: "App Development",
        blurb: "Native and hybrid mobile apps that ship fast and feel premium on every device.",
        items: [
            { icon: Smartphone, title: "Android Apps", desc: "Native Android apps for the Google Play Store." },
            { icon: ShoppingBag, title: "iOS Apps", desc: "Premium iOS apps for iPhone and iPad." },
            { icon: Layers, title: "Hybrid Apps", desc: "One codebase, both platforms — Flutter & React Native." },
        ],
    },
    {
        n: "04", key: "growth", slug: "digital-marketing",
        title: "Digital Marketing",
        blurb: "Paid, organic, and lifecycle marketing engineered around revenue, not vanity metrics.",
        items: [
            { icon: Target, title: "SEO", desc: "Long-horizon organic growth via technical + content SEO." },
            { icon: BarChart3, title: "Content Marketing", desc: "Editorial content that ranks and converts." },
            { icon: Megaphone, title: "Google Ads", desc: "Instant visibility and qualified leads with PPC." },
            { icon: Target, title: "Meta Ads", desc: "Targeted advertising on Facebook and Instagram." },
            { icon: Users, title: "Lead Generation", desc: "Quality leads engineered for your sales team." },
            { icon: BarChart3, title: "Analytics & CRO", desc: "Measure, learn, and lift conversion month over month." },
            { icon: Mail, title: "Email Marketing", desc: "Lifecycle and broadcast campaigns that drive repeat revenue." },
        ],
    },
];

export default function Services({ sectionNumber = "02" }) {
    return (
        <section id="services" data-testid={SERVICES.root} className="relative py-24 md:py-40 overflow-hidden">
            <div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(1000px 500px at 50% 0%, rgba(212,175,55,0.08), transparent 60%)" }}
            />
            <div className="relative max-w-[1440px] mx-auto px-5 md:px-10">
                <div className="grid grid-cols-12 gap-6 md:gap-10 items-end mb-16 md:mb-24">
                    <RevealUp className="col-span-12 md:col-span-7">
                        <p className="eyebrow mb-6">/ {sectionNumber} — My Expertise</p>
                        <h2 className="font-serif text-bone text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-tight">
                            Premium services, <br className="hidden md:block" />
                            <span className="italic text-acid">obsessively crafted.</span>
                        </h2>
                    </RevealUp>
                    <RevealUp delay={0.1} className="col-span-12 md:col-span-5 md:pl-6">
                        <p className="text-ash text-base md:text-lg leading-relaxed max-w-md">
                            Twenty disciplines. One studio. Every engagement is treated as a flagship —
                            designed end-to-end for outcome, not just output.
                        </p>
                    </RevealUp>
                </div>

                <div className="space-y-20 md:space-y-32">
                    {categories.map((cat, ci) => (
                        <div key={cat.key} className="grid grid-cols-12 gap-6 md:gap-10">
                            <RevealUp className="col-span-12 md:col-span-4">
                                <div className="md:sticky md:top-28">
                                    <p className="font-mono text-acid text-sm tracking-[0.28em] mb-4">
                                        {cat.n} <span className="text-ash">/ {cat.key.toUpperCase()}</span>
                                    </p>
                                    <h3 className="font-serif text-bone text-4xl md:text-5xl leading-[0.95] tracking-tight">
                                        {cat.title}
                                    </h3>
                                    <p className="mt-5 text-ash text-base leading-relaxed max-w-sm">{cat.blurb}</p>
                                    <Link to={`/services/${cat.slug}`} className="btn-ghost mt-8" data-testid={`services-discuss-${cat.key}`}>
                                        Discuss {cat.title} <ArrowUpRight size={13} strokeWidth={2.4} />
                                    </Link>
                                </div>
                            </RevealUp>

                            <div className="col-span-12 md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                                {cat.items.map((it, i) => {
                                    const Icon = it.icon;
                                    return (
                                        <motion.a
                                            key={it.title}
                                            href={waUrl(WA_MESSAGES.service(it.title))}
                                            target="_blank"
                                            rel="noreferrer"
                                            data-testid={SERVICES.card(it.title.toLowerCase().replace(/\s+/g, "-"))}
                                            initial={{ opacity: 0, y: 30 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true, margin: "-40px" }}
                                            transition={{ delay: i * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                            whileHover={{ y: -4 }}
                                            className="group frame rounded-2xl p-6 md:p-7 flex flex-col justify-between h-full hover:border-acid/50 transition-colors duration-500"
                                        >
                                            <div>
                                                <div className="w-11 h-11 rounded-xl border border-acid/20 bg-acid/5 flex items-center justify-center text-acid mb-5 group-hover:bg-acid/15 group-hover:border-acid/50 transition-colors">
                                                    <Icon size={18} strokeWidth={1.6} />
                                                </div>
                                                <h4 className="font-serif text-bone text-xl md:text-2xl leading-tight tracking-tight">
                                                    {it.title}
                                                </h4>
                                                <p className="mt-2 text-ash text-sm leading-relaxed">{it.desc}</p>
                                            </div>
                                            <span className="mt-6 inline-flex items-center gap-1.5 text-acid font-mono text-[11px] tracking-[0.18em] uppercase group-hover:gap-3 transition-all">
                                                Get a Quote <ArrowUpRight size={12} strokeWidth={2.4} />
                                            </span>
                                        </motion.a>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <RevealUp delay={0.2} className="mt-24 md:mt-32 flex flex-wrap items-center justify-between gap-6 pt-10 border-t border-acid/15">
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
                        <MessageCircle size={14} strokeWidth={2.2} /> Get a Quote on WhatsApp <ArrowUpRight size={14} strokeWidth={2.4} />
                    </a>
                </RevealUp>
            </div>
        </section>
    );
}
