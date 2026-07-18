import React from "react";
import { useParams } from "react-router-dom";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { PageHeader, CTAStrip } from "@/components/site/PageHeader";
import { RevealUp } from "@/components/motion/Reveal";
import useSEO from "@/hooks/useSEO";
import { waUrl, WA_MESSAGES } from "@/lib/whatsapp";

const CITIES = {
    bengaluru: { name: "Bengaluru", country: "India", tz: "IST +05:30", note: "My home base. Most in-person meetings happen here." },
    mumbai: { name: "Mumbai", country: "India", tz: "IST +05:30", note: "Frequent client visits for fintech and D2C engagements." },
    delhi: { name: "Delhi NCR", country: "India", tz: "IST +05:30", note: "Regular travel for enterprise and SaaS engagements." },
    london: { name: "London", country: "United Kingdom", tz: "GMT / BST", note: "5-hour overlap with UK working hours. Fully asynchronous when needed." },
    "new-york": { name: "New York", country: "United States", tz: "ET −05:00", note: "Regular working hours overlap from 6:30pm IST onwards." },
    dubai: { name: "Dubai", country: "UAE", tz: "GST +04:00", note: "Same-day communication with GCC-based clients." },
    singapore: { name: "Singapore", country: "Singapore", tz: "SGT +08:00", note: "Almost full working-hours overlap with SEA clients." },
    sydney: { name: "Sydney", country: "Australia", tz: "AEST +10:00", note: "Morning sync windows with AU/NZ clients." },
};

const SERVICES = [
    { label: "Web Development", to: "/services/web-development" },
    { label: "Software Engineering", to: "/services/software-engineering" },
    { label: "Campaign Management", to: "/services/digital-marketing" },
    { label: "SEO & Consulting", to: "/services/seo-consulting" },
];

export default function LocationPage() {
    const { city } = useParams();
    const c = CITIES[city] || { name: city.replace(/-/g, " "), country: "", tz: "", note: "Working with clients globally." };
    useSEO({
        title: `Freelance Engineer & Marketer in ${c.name} — Rajeev`,
        description: `Senior freelance engineering, software, and marketing services for teams in ${c.name}${c.country ? ", " + c.country : ""}. 12+ years experience.`,
        path: `/freelancer-in/${city}`,
    });

    return (
        <>
            <PageHeader
                back={{ to: "/sitemap", label: "All locations" }}
                eyebrow={`/ Freelancer in — ${c.name}`}
                title={`Freelance senior for teams in`}
                italic={c.name + "."}
                subtitle={`Twelve years of engineering and marketing experience, available to teams in ${c.name}${c.country ? " and across " + c.country : ""}. ${c.note}`}
            />

            <section className="py-16 md:py-24">
                <div className="max-w-[1200px] mx-auto px-6 md:px-10 grid grid-cols-12 gap-6 md:gap-16">
                    <RevealUp className="col-span-12 md:col-span-7">
                        <p className="eyebrow mb-6">/ Services in {c.name}</p>
                        <p className="font-serif text-bone text-2xl md:text-3xl leading-snug tracking-tight max-w-2xl">
                            The same four disciplines — offered to founders and product teams operating in {c.name}.
                        </p>
                        <ul className="mt-10 space-y-4">
                            {SERVICES.map((s) => (
                                <li key={s.to}>
                                    <Link to={s.to} className="group flex items-center justify-between py-5 border-b border-white/10">
                                        <span className="font-serif text-bone text-2xl md:text-3xl tracking-tight group-hover:text-acid transition-colors">
                                            {s.label} in {c.name}
                                        </span>
                                        <ArrowUpRight size={20} className="text-ash group-hover:text-acid transition-colors" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </RevealUp>

                    <RevealUp delay={0.1} className="col-span-12 md:col-span-5">
                        <div className="frame rounded-2xl p-8 md:p-10 sticky top-28 space-y-6">
                            <div>
                                <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash">City</p>
                                <p className="font-serif text-bone text-3xl mt-2">{c.name}{c.country && <span className="text-ash">, {c.country}</span>}</p>
                            </div>
                            {c.tz && (
                                <div>
                                    <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash">Working overlap</p>
                                    <p className="font-serif text-bone text-2xl mt-2">{c.tz}</p>
                                </div>
                            )}
                            <div>
                                <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash">Availability</p>
                                <p className="font-serif text-bone text-2xl mt-2">Remote-first, on-site on request</p>
                            </div>
                            <a
                                href={waUrl(WA_MESSAGES.location(c.name))}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-acid w-full justify-center mt-2"
                                data-testid={`location-${city}-wa`}
                            >
                                <MessageCircle size={14} strokeWidth={2.2} /> Ping on WhatsApp <ArrowUpRight size={14} strokeWidth={2.4} />
                            </a>
                        </div>
                    </RevealUp>
                </div>
            </section>

            <CTAStrip title={`Have a project in ${c.name}?`} waMessage={WA_MESSAGES.location(c.name)} />
        </>
    );
}
