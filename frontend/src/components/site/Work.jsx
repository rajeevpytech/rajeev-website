import React from "react";
import { ArrowUpRight } from "lucide-react";
import { RevealUp } from "@/components/motion/Reveal";
import { WORK } from "@/constants/testIds";

export default function Work({ projects = [] }) {
    return (
        <section id="work" data-testid={WORK.root} className="relative py-24 md:py-40 bg-ink">
            <div className="max-w-[1440px] mx-auto px-6 md:px-10">
                <div className="grid grid-cols-12 gap-6 md:gap-10 items-end mb-12 md:mb-16">
                    <RevealUp className="col-span-12 md:col-span-8">
                        <p className="eyebrow mb-6">/ 003 — Selected work</p>
                        <h2 className="font-serif text-bone text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-tight">
                            Six briefs. <span className="italic text-ash">Twelve years condensed.</span>
                        </h2>
                    </RevealUp>
                    <RevealUp delay={0.1} className="col-span-12 md:col-span-4">
                        <p className="text-ash text-base md:text-lg leading-relaxed">
                            A curated cross-section — engineering, marketing, and the projects that
                            sit somewhere in between. Case studies available on request.
                        </p>
                    </RevealUp>
                </div>

                <div className="grid grid-cols-12 gap-4 md:gap-6">
                    {projects.map((p, i) => (
                        <RevealUp key={p.id} delay={i * 0.06} className={p.span}>
                            <a
                                data-testid={WORK.card(p.slug)}
                                href={p.href || "#"}
                                className="group block frame rounded-2xl overflow-hidden h-full"
                            >
                                <div className="relative aspect-[16/10] md:aspect-[16/9] overflow-hidden">
                                    <img
                                        src={p.image}
                                        alt={p.title}
                                        className="w-full h-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
                                        style={{ filter: "brightness(0.85) contrast(1.05)" }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
                                    {p.metric && (
                                        <div className="absolute top-4 left-4">
                                            <span className="tag !border-acid/40 !text-acid !bg-acid/5">
                                                {p.metric}
                                            </span>
                                        </div>
                                    )}
                                    <div className="absolute top-4 right-4 w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-bone/80 group-hover:text-ink group-hover:bg-acid group-hover:border-acid transition-colors duration-500">
                                        <ArrowUpRight size={16} strokeWidth={2} />
                                    </div>
                                </div>

                                <div className="p-6 md:p-8">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash">
                                            {p.category}
                                        </span>
                                        <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash">
                                            {p.year}
                                        </span>
                                    </div>
                                    <h3 className="font-serif text-bone text-2xl md:text-3xl tracking-tight leading-tight">
                                        {p.title}
                                    </h3>
                                    <p className="mt-3 text-ash text-sm md:text-base leading-relaxed max-w-lg">
                                        {p.subtitle}
                                    </p>
                                    <div className="mt-5 flex flex-wrap gap-2">
                                        {p.tags.map((t) => (
                                            <span key={t} className="tag">{t}</span>
                                        ))}
                                    </div>
                                </div>
                            </a>
                        </RevealUp>
                    ))}
                </div>
            </div>
        </section>
    );
}
