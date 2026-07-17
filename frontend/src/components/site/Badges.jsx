import React from "react";
import { ArrowUpRight, Star } from "lucide-react";
import { RevealUp } from "@/components/motion/Reveal";
import { BADGES } from "@/constants/testIds";

const badges = [
    {
        id: "upwork",
        testid: BADGES.upwork,
        label: "Upwork",
        title: "Top Rated Plus",
        stat: "100% Job Success",
        subline: "5.0 · 84 completed contracts",
        href: "https://www.upwork.com/",
    },
    {
        id: "pph",
        testid: BADGES.pph,
        label: "PeoplePerHour",
        title: "CERT V — Elite Freelancer",
        stat: "12+ years verified",
        subline: "4.9 · 210 completed jobs",
        href: "https://www.peopleperhour.com/",
    },
];

export default function Badges() {
    return (
        <section data-testid={BADGES.root} className="relative py-16 md:py-24 bg-ink border-y border-white/10">
            <div className="max-w-[1440px] mx-auto px-6 md:px-10 grid grid-cols-12 gap-6 md:gap-10 items-center">
                <RevealUp className="col-span-12 md:col-span-4">
                    <p className="eyebrow mb-4">/ Verified elsewhere</p>
                    <h3 className="font-serif text-bone text-3xl md:text-4xl leading-tight tracking-tight">
                        Same person, <span className="italic text-ash">same standard</span> — on every platform.
                    </h3>
                </RevealUp>
                <div className="col-span-12 md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {badges.map((b, i) => (
                        <RevealUp key={b.id} delay={i * 0.08}>
                            <a
                                data-testid={b.testid}
                                href={b.href}
                                target="_blank"
                                rel="noreferrer"
                                className="group frame rounded-2xl p-6 md:p-8 block hover:border-acid/40 transition-colors duration-500"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash">{b.label}</span>
                                    <ArrowUpRight className="text-ash group-hover:text-acid transition-colors" size={18} />
                                </div>
                                <p className="mt-4 font-serif text-bone text-2xl md:text-3xl leading-tight">{b.title}</p>
                                <p className="mt-3 text-acid font-mono text-sm tracking-wider">{b.stat}</p>
                                <div className="mt-3 flex items-center gap-2 text-ash text-sm">
                                    <span className="flex text-acid gap-0.5">
                                        {[...Array(5)].map((_, i) => <Star key={i} size={11} fill="#D4FF00" strokeWidth={0} />)}
                                    </span>
                                    <span>{b.subline}</span>
                                </div>
                            </a>
                        </RevealUp>
                    ))}
                </div>
            </div>
        </section>
    );
}
