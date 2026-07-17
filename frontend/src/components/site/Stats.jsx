import React from "react";
import { motion, useInView } from "framer-motion";
import { RevealUp } from "@/components/motion/Reveal";
import { STATS } from "@/constants/testIds";

// Animate numbers from 0 to target
function AnimatedValue({ value }) {
    const ref = React.useRef(null);
    const inView = useInView(ref, { once: true, margin: "-40px" });
    const [display, setDisplay] = React.useState(value);

    React.useEffect(() => {
        if (!inView) return;
        const match = String(value).match(/^(\d+)(.*)$/);
        if (!match) { setDisplay(value); return; }
        const target = parseInt(match[1], 10);
        const suffix = match[2] || "";
        let start = 0;
        const duration = 1400;
        const t0 = performance.now();
        let raf;
        const tick = (t) => {
            const p = Math.min(1, (t - t0) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            const cur = Math.round(start + (target - start) * eased);
            setDisplay(cur + suffix);
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [inView, value]);

    return <span ref={ref}>{display}</span>;
}

export default function Stats({ items = [] }) {
    return (
        <section data-testid={STATS.root} className="relative py-20 md:py-28 bg-ink border-y border-white/10">
            <div className="max-w-[1440px] mx-auto px-6 md:px-10 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
                {items.map((s, i) => (
                    <RevealUp key={s.label} delay={i * 0.08}>
                        <div data-testid={STATS.item(s.label)} className="flex flex-col">
                            <p className="font-serif text-bone text-6xl md:text-7xl lg:text-8xl leading-none tracking-tight">
                                <AnimatedValue value={s.value} />
                            </p>
                            <p className="mt-4 font-mono text-[11px] tracking-[0.22em] uppercase text-ash">
                                {s.label}
                            </p>
                        </div>
                    </RevealUp>
                ))}
            </div>
        </section>
    );
}
