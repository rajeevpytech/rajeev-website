import Link from "@/components/CanonicalLink";
import { useEffect, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import Marquee from "react-fast-marquee";
import { ArrowUpRight } from "lucide-react";
import { CASE_STUDIES, fetchCaseStudies } from "@/data/caseStudies";

// Thin, animated results strip that links into individual case studies.
export default function ProofStrip() {
  const [i, setI] = useState(0);
  const [items, setItems] = useState(CASE_STUDIES);
  useEffect(() => { fetchCaseStudies().then(setItems); }, []);

  useEffect(() => {
    if (!items.length) return;
    const t = setInterval(() => setI((v) => (v + 1) % items.length), 2600);
    return () => clearInterval(t);
  }, [items.length]);

  const active = items[i % items.length];
  if (!active) return null;

  return (
    <div data-testid="home-proof-strip" className="border-y border-line bg-ink text-white">
      <div className="mx-auto max-w-[1400px] px-5 md:px-10 py-3.5 flex items-center gap-4 md:gap-8">
        <span className="hidden lg:block font-mono text-[11px] uppercase tracking-[0.25em] text-white/40 shrink-0">
          Proven results
        </span>

        {/* Desktop: continuous marquee of all metrics */}
        <div className="hidden md:block flex-1 min-w-0">
          <Marquee speed={34} gradient gradientColor="#141414" gradientWidth={60} pauseOnHover autoFill>
            {items.map((c) => (
              <Link
                key={c.slug}
                to={`/case-studies/${c.slug}`}
                data-testid={`proof-metric-${c.slug}`}
                className="group mx-7 inline-flex items-baseline gap-2 whitespace-nowrap"
              >
                <span className="font-heading text-xl font-extrabold tracking-tighter text-brand">{c.metric}</span>
                <span className="text-xs text-white/60 group-hover:text-white transition-colors">{c.metricLabel}</span>
                <span className="ml-3 text-white/20">·</span>
              </Link>
            ))}
          </Marquee>
        </div>

        {/* Mobile: rotating single metric */}
        <Link to={`/case-studies/${active.slug}`} className="md:hidden flex-1 min-w-0 h-6 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.span
              key={active.slug}
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="flex items-baseline gap-2 whitespace-nowrap"
            >
              <span className="font-heading text-xl font-extrabold tracking-tighter text-brand">{active.metric}</span>
              <span className="text-xs text-white/60 truncate">{active.metricLabel}</span>
            </motion.span>
          </AnimatePresence>
        </Link>

        <Link
          to="/case-studies"
          data-testid="proof-strip-cta"
          className="group inline-flex items-center gap-1.5 text-xs font-medium text-white/70 hover:text-white transition-colors shrink-0"
        >
          See case studies <ArrowUpRight className="h-3.5 w-3.5 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
