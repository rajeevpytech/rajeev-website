import React from "react";
import { Link } from "react-router-dom";
import { Linkedin, Github, Twitter, Mail, Phone, MessageCircle, ArrowUpRight } from "lucide-react";
import { FOOTER } from "@/constants/testIds";
import { waUrl, WA_MESSAGES } from "@/lib/whatsapp";

const services = [
    { to: "/services/web-development", label: "Web Development" },
    { to: "/services/software-engineering", label: "Software Engineering" },
    { to: "/services/digital-marketing", label: "Campaign Management" },
    { to: "/services/seo-consulting", label: "SEO & Consulting" },
];

const locations = [
    { to: "/freelancer-in/gurgaon", label: "Freelancer in Gurgaon" },
    { to: "/freelancer-in/mumbai", label: "Freelancer in Mumbai" },
    { to: "/freelancer-in/delhi", label: "Freelancer in Delhi" },
    { to: "/freelancer-in/london", label: "Freelancer in London" },
    { to: "/freelancer-in/new-york", label: "Freelancer in New York" },
    { to: "/freelancer-in/dubai", label: "Freelancer in Dubai" },
];

const company = [
    { to: "/about", label: "About Rajeev" },
    { to: "/journey", label: "Career Journey" },
    { to: "/work", label: "Case Studies" },
    { to: "/blog", label: "Journal" },
    { to: "/faq", label: "FAQ" },
    { to: "/contact", label: "Contact" },
];

const resources = [
    { to: "/blog", label: "Journal" },
    { to: "/sitemap", label: "Sitemap" },
    { href: "https://www.upwork.com/", label: "Upwork Profile" },
    { href: "https://www.peopleperhour.com/", label: "PeoplePerHour Profile" },
];

const legal = [
    { to: "/privacy", label: "Privacy Policy" },
    { to: "/terms", label: "Terms of Service" },
    { to: "/cookies", label: "Cookies" },
];

export default function Footer() {
    return (
        <footer data-testid={FOOTER.root} className="relative bg-ink border-t border-white/10 pt-20 pb-10">
            <div className="max-w-[1440px] mx-auto px-6 md:px-10">
                {/* Signature */}
                <div className="font-serif text-bone leading-[0.85] tracking-tighter text-[22vw] md:text-[16vw] whitespace-nowrap overflow-hidden select-none pb-8 md:pb-16">
                    RAJEEV<span className="text-acid italic">.</span>
                </div>

                {/* CTA + location strip */}
                <div className="grid grid-cols-12 gap-8 md:gap-10 pt-10 border-t border-white/10">
                    <div className="col-span-12 md:col-span-4">
                        <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash mb-4">Currently based in</p>
                        <p className="font-serif text-bone text-3xl">Gurgaon, IN</p>
                        <p className="text-ash text-sm mt-2 leading-relaxed">
                            Open to relocate & work on-site — anywhere in the world.<br/>
                            <span className="text-acid/80">Remote-first · IST +05:30</span>
                        </p>
                        <div className="mt-6 space-y-2">
                            <a href="tel:+919711623561" className="link-sweep inline-flex items-center gap-2 text-bone">
                                <Phone size={14} /> +91 97116 23561
                            </a>
                            <br />
                            <a data-testid={FOOTER.email} href="mailto:hello@rajeevfreelancer.com" className="link-sweep inline-flex items-center gap-2 text-bone">
                                <Mail size={14} /> hello@rajeevfreelancer.com
                            </a>
                        </div>
                        <a
                            href={waUrl(WA_MESSAGES.hire)}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-acid mt-8"
                            data-testid="footer-wa-cta"
                        >
                            <MessageCircle size={14} strokeWidth={2.2} /> Ping on WhatsApp <ArrowUpRight size={14} strokeWidth={2.4} />
                        </a>
                    </div>

                    <FooterCol title="Services" items={services} />
                    <FooterCol title="Company" items={company} />
                    <div className="col-span-12 md:col-span-3 grid grid-cols-2 md:grid-cols-1 gap-8">
                        <FooterCol title="Resources" items={resources} plain />
                        <FooterCol title="Elsewhere" items={[]} plain>
                            <ul className="space-y-3 text-bone">
                                <li>
                                    <a data-testid={FOOTER.linkedin} href="https://www.linkedin.com/" target="_blank" rel="noreferrer" className="link-sweep inline-flex items-center gap-2">
                                        <Linkedin size={14} /> LinkedIn
                                    </a>
                                </li>
                                <li>
                                    <a data-testid={FOOTER.github} href="https://github.com/" target="_blank" rel="noreferrer" className="link-sweep inline-flex items-center gap-2">
                                        <Github size={14} /> GitHub
                                    </a>
                                </li>
                                <li>
                                    <a data-testid={FOOTER.twitter} href="https://twitter.com/" target="_blank" rel="noreferrer" className="link-sweep inline-flex items-center gap-2">
                                        <Twitter size={14} /> Twitter
                                    </a>
                                </li>
                            </ul>
                        </FooterCol>
                    </div>
                </div>

                {/* Locations SEO strip */}
                <div className="mt-14 pt-10 border-t border-white/10">
                    <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash mb-6">Freelancer, working with clients in</p>
                    <ul className="flex flex-wrap gap-x-6 gap-y-3">
                        {locations.map((l) => (
                            <li key={l.to}>
                                <Link to={l.to} className="text-ash hover:text-acid text-sm transition-colors">
                                    {l.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="mt-14 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                    <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash">
                        © {new Date().getFullYear()} Rajeev Freelancer — All rights reserved.
                    </p>
                    <ul className="flex flex-wrap gap-6">
                        {legal.map((l) => (
                            <li key={l.to}>
                                <Link to={l.to} className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash hover:text-acid transition-colors">
                                    {l.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </footer>
    );
}

function FooterCol({ title, items, plain = false, children }) {
    return (
        <div className={plain ? "" : "col-span-6 md:col-span-2"}>
            <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash mb-4">{title}</p>
            {children || (
                <ul className="space-y-3 text-bone">
                    {items.map((i) => (
                        <li key={i.to || i.href}>
                            {i.to ? (
                                <Link to={i.to} className="link-sweep">{i.label}</Link>
                            ) : (
                                <a href={i.href} target="_blank" rel="noreferrer" className="link-sweep inline-flex items-center gap-1.5">
                                    {i.label} <ArrowUpRight size={12} />
                                </a>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
