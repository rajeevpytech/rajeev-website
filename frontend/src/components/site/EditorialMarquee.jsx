import React from "react";
import Marquee from "react-fast-marquee";
import { Asterisk } from "lucide-react";

const items = [
    "Software Architect",
    "Growth Engineer",
    "Ex-IOG · Accenture · Google",
    "Independent since 2020",
    "Full-Stack · React · Python · Rust",
    "SEO · Paid · Analytics",
];

export default function EditorialMarquee() {
    return (
        <div className="relative py-8 md:py-12 border-y border-white/10 bg-ink">
            <Marquee gradient={false} speed={38} pauseOnHover={false}>
                {items.map((t, i) => (
                    <span
                        key={i}
                        className="inline-flex items-center gap-8 md:gap-12 font-serif italic text-bone text-4xl md:text-6xl lg:text-7xl px-8 md:px-12"
                    >
                        {t}
                        <Asterisk className="text-acid shrink-0" size={28} strokeWidth={1.5} />
                    </span>
                ))}
            </Marquee>
        </div>
    );
}
