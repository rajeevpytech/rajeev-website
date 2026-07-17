import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowLeft } from "lucide-react";
import { RevealUp } from "@/components/motion/Reveal";

export const PageHeader = ({ eyebrow, title, italic, subtitle, back }) => (
    <section className="relative pt-36 md:pt-44 pb-14 md:pb-24 spotlight">
        <div className="max-w-[1440px] mx-auto px-6 md:px-10">
            {back && (
                <RevealUp>
                    <Link to={back.to} className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.22em] uppercase text-ash hover:text-acid transition-colors mb-8">
                        <ArrowLeft size={14} /> {back.label}
                    </Link>
                </RevealUp>
            )}
            <RevealUp>
                <p className="eyebrow mb-6">{eyebrow}</p>
            </RevealUp>
            <RevealUp delay={0.05}>
                <h1 className="font-serif text-bone text-5xl md:text-7xl lg:text-8xl leading-[0.9] tracking-tight">
                    {title} {italic && <span className="italic text-ash">{italic}</span>}
                </h1>
            </RevealUp>
            {subtitle && (
                <RevealUp delay={0.15}>
                    <p className="mt-8 text-ash text-base md:text-lg leading-relaxed max-w-2xl">{subtitle}</p>
                </RevealUp>
            )}
        </div>
    </section>
);

export const CTAStrip = ({ title = "Ready when you are.", note = "Reply within 24 hours." }) => (
    <section className="border-y border-white/10 bg-ink">
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-16 md:py-24 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
                <p className="eyebrow mb-4">/ Next step</p>
                <h2 className="font-serif text-bone text-4xl md:text-5xl lg:text-6xl leading-[0.95] tracking-tight">
                    {title}
                </h2>
                <p className="mt-4 text-ash">{note}</p>
            </div>
            <div className="flex flex-wrap gap-3">
                <Link to="/contact" className="btn-acid">
                    Start a project <ArrowUpRight size={14} strokeWidth={2.4} />
                </Link>
                <a
                    href="https://wa.me/919711623561?text=Hi%20Rajeev"
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost"
                >
                    WhatsApp <ArrowUpRight size={14} strokeWidth={2.4} />
                </a>
            </div>
        </div>
    </section>
);
