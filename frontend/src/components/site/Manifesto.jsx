import React from "react";
import { RevealUp } from "@/components/motion/Reveal";
import { MANIFESTO } from "@/constants/testIds";

const chapters = [
    {
        n: "01",
        title: "The craft, first.",
        body:
            "I write software the way a joiner cuts joinery — deliberately, and to last. Every project is a chance to make the invisible parts as good as the visible ones. If it works but reads badly, it isn't done.",
    },
    {
        n: "02",
        title: "Growth is not a channel.",
        body:
            "After a decade in engineering and marketing, I've stopped believing in silver-bullet channels. Distribution is a system: instrumentation, positioning, a product worth talking about, and enough patience to compound.",
    },
    {
        n: "03",
        title: "Senior, or nothing.",
        body:
            "I take a small number of engagements each year and I do the work myself. No account managers, no offshore relays. You get twelve years of judgement in the room, on the call, in the pull request.",
    },
    {
        n: "04",
        title: "Kind, direct, on time.",
        body:
            "The best clients I've had were people I could disagree with warmly. I show up early, tell the truth about scope, and I'm easy to work with. Everything else is theatre.",
    },
];

export default function Manifesto() {
    return (
        <section
            id="manifesto"
            data-testid={MANIFESTO.root}
            className="relative py-24 md:py-40 bg-ink"
        >
            <div className="max-w-[1440px] mx-auto px-6 md:px-10">
                <RevealUp>
                    <p className="eyebrow mb-8">/ 001 — About Rajiv</p>
                </RevealUp>

                <div className="grid grid-cols-12 gap-6 md:gap-12">
                    <RevealUp delay={0.05} className="col-span-12 md:col-span-5">
                        <h2 className="font-serif text-bone text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-tight">
                            A senior craftsman <span className="italic text-ash">who happens</span> to
                            freelance.
                        </h2>
                        <p className="mt-8 text-ash text-base md:text-lg max-w-md leading-relaxed">
                            Twelve years in production. Roles at IOG, Accenture, and Google. Six years
                            independent. This is what I believe about the work, and how I choose to do
                            it.
                        </p>
                    </RevealUp>

                    <div className="col-span-12 md:col-span-7 md:pl-10 md:border-l border-white/10">
                        <ol className="space-y-14 md:space-y-20">
                            {chapters.map((c, i) => (
                                <RevealUp key={c.n} delay={0.1 + i * 0.08}>
                                    <li
                                        data-testid={MANIFESTO.chapter(c.n)}
                                        className="grid grid-cols-[auto_1fr] gap-6 md:gap-10"
                                    >
                                        <div className="font-mono text-acid text-3xl md:text-4xl leading-none pt-1">
                                            {c.n}
                                        </div>
                                        <div>
                                            <h3 className="font-serif text-bone text-2xl md:text-3xl leading-tight tracking-tight">
                                                {c.title}
                                            </h3>
                                            <p className="mt-4 text-ash text-base md:text-[17px] leading-relaxed max-w-xl">
                                                {c.body}
                                            </p>
                                        </div>
                                    </li>
                                </RevealUp>
                            ))}
                        </ol>
                    </div>
                </div>
            </div>
        </section>
    );
}
