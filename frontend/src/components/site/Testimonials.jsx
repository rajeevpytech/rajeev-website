import React from "react";
import { Quote, Star } from "lucide-react";
import { RevealUp } from "@/components/motion/Reveal";
import { TESTIMONIALS } from "@/constants/testIds";

export default function Testimonials({ items = [] }) {
    return (
        <section data-testid={TESTIMONIALS.root} className="relative py-24 md:py-40">
            <div className="max-w-[1440px] mx-auto px-6 md:px-10">
                <div className="grid grid-cols-12 gap-6 md:gap-10 items-end mb-12 md:mb-16">
                    <RevealUp className="col-span-12 md:col-span-7">
                        <p className="eyebrow mb-6">/ 005 — What people say</p>
                        <h2 className="font-serif text-bone text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-tight">
                            The quiet part, <span className="italic text-ash">out loud.</span>
                        </h2>
                    </RevealUp>
                    <RevealUp delay={0.1} className="col-span-12 md:col-span-5 flex items-center gap-3 md:justify-end">
                        <div className="flex items-center gap-1 text-acid">
                            {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="#D4FF00" strokeWidth={0} />)}
                        </div>
                        <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash">
                            5.0 avg / 96 reviews
                        </span>
                    </RevealUp>
                </div>

                <div className="grid grid-cols-12 gap-4 md:gap-6">
                    {items.map((t, i) => (
                        <RevealUp key={t.id} delay={i * 0.08} className={`col-span-12 ${i % 3 === 0 ? "md:col-span-7" : "md:col-span-5"}`}>
                            <div
                                data-testid={TESTIMONIALS.card(t.id)}
                                className="frame rounded-2xl p-8 md:p-10 h-full flex flex-col justify-between"
                            >
                                <div>
                                    <Quote className="text-acid mb-6" size={24} strokeWidth={1.6} />
                                    <blockquote className="font-serif text-bone text-2xl md:text-3xl leading-snug tracking-tight">
                                        "{t.quote}"
                                    </blockquote>
                                </div>
                                <footer className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
                                    <div>
                                        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-bone">{t.author}</p>
                                        <p className="text-ash text-sm mt-1">{t.role} · {t.company}</p>
                                    </div>
                                    <div className="flex items-center gap-1 text-acid">
                                        {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="#D4FF00" strokeWidth={0} />)}
                                    </div>
                                </footer>
                            </div>
                        </RevealUp>
                    ))}
                </div>
            </div>
        </section>
    );
}
