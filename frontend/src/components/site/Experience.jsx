import React from "react";
import { RevealUp } from "@/components/motion/Reveal";
import { EXPERIENCE as TID } from "@/constants/testIds";

export default function Experience({ items = [] }) {
    return (
        <section id="experience" data-testid={TID.root} className="relative py-24 md:py-40">
            <div className="max-w-[1440px] mx-auto px-6 md:px-10">
                <div className="grid grid-cols-12 gap-6 md:gap-10 items-end mb-12 md:mb-16">
                    <RevealUp className="col-span-12 md:col-span-8">
                        <p className="eyebrow mb-6">/ 004 — Journey</p>
                        <h2 className="font-serif text-bone text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-tight">
                            From <span className="italic">Bengaluru</span> to global — <br className="hidden md:block"/> the long way.
                        </h2>
                    </RevealUp>
                </div>

                <ol className="relative">
                    <div className="absolute left-[7.75rem] md:left-[9.5rem] top-2 bottom-2 w-px bg-white/10" aria-hidden />

                    {items.map((it, i) => (
                        <RevealUp key={it.year + it.company} delay={i * 0.06}>
                            <li
                                data-testid={TID.item(it.year)}
                                className="relative grid grid-cols-[6rem_auto_1fr] md:grid-cols-[8rem_auto_1fr] gap-4 md:gap-8 py-7 md:py-9 border-b border-white/10"
                            >
                                <div className="font-mono text-acid text-lg md:text-xl pt-1">
                                    {it.year}
                                </div>
                                <div className="relative flex items-start justify-center pt-2">
                                    <span className="relative z-10 w-3 h-3 rounded-full bg-acid shadow-[0_0_18px_rgba(212,255,0,0.6)]" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-3 md:gap-10">
                                    <div>
                                        <p className="font-serif text-bone text-2xl md:text-3xl tracking-tight leading-tight">
                                            {it.company}
                                        </p>
                                        <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash mt-2">
                                            {it.role}
                                        </p>
                                    </div>
                                    <p className="text-ash text-base leading-relaxed max-w-xl">
                                        {it.detail}
                                    </p>
                                </div>
                            </li>
                        </RevealUp>
                    ))}
                </ol>
            </div>
        </section>
    );
}
