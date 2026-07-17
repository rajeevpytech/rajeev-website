import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, ArrowUpRight, MessageCircle, Calendar } from "lucide-react";
import { MaskedLines } from "@/components/motion/Reveal";
import { HERO } from "@/constants/testIds";

const WHATSAPP = "https://wa.me/919999999999?text=Hi%20Rajiv%2C%20I%27d%20like%20to%20work%20with%20you.";
const CALENDLY = "https://calendly.com/rajiv-freelancer/intro";

function scrollTo(id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (window.__lenis) window.__lenis.scrollTo(el, { offset: -60 });
    else el.scrollIntoView({ behavior: "smooth" });
}

export default function Hero() {
    const { scrollY } = useScroll();
    const yBg = useTransform(scrollY, [0, 800], [0, 180]);
    const yImg = useTransform(scrollY, [0, 800], [0, -80]);
    const opacityBg = useTransform(scrollY, [0, 500], [1, 0.3]);

    return (
        <section
            id="top"
            data-testid={HERO.root}
            className="relative min-h-[100svh] pt-28 md:pt-36 pb-16 spotlight overflow-hidden"
        >
            {/* Parallax abstract background */}
            <motion.div
                aria-hidden
                style={{ y: yBg, opacity: opacityBg }}
                className="absolute inset-0 -z-0"
            >
                <div
                    className="absolute inset-0 opacity-[0.18] mix-blend-screen"
                    style={{
                        backgroundImage:
                            "url(https://images.unsplash.com/photo-1709377059113-3c429b2e0796?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000)",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        filter: "grayscale(1) contrast(1.1)",
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink/40 to-ink" />
            </motion.div>

            <div className="relative max-w-[1440px] mx-auto px-6 md:px-10 grid grid-cols-12 gap-6 md:gap-10">
                {/* Meta strip */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="col-span-12 flex flex-wrap items-center justify-between gap-4 mb-6 md:mb-10"
                >
                    <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.24em] uppercase text-ash">
                        <span className="w-2 h-2 rounded-full bg-acid animate-pulse" />
                        Available for Q1 2026 — 2 slots
                    </div>
                    <div className="hidden md:flex items-center gap-8 font-mono text-[11px] tracking-[0.24em] uppercase text-ash">
                        <span>N 28.6° E 77.2°</span>
                        <span>Est. 2012</span>
                        <span>Portfolio v.03</span>
                    </div>
                </motion.div>

                {/* Left: Massive display type */}
                <div className="col-span-12 md:col-span-8">
                    <div className="font-serif font-semibold tracking-tighter text-bone leading-[0.86] text-[64px] sm:text-[96px] md:text-[128px] lg:text-[168px]">
                        <MaskedLines lines={["Engineer.", "Marketer.", <span key="acid" className="italic text-acid">Freelancer.</span>]} />
                    </div>

                    <div className="mt-8 md:mt-12 max-w-xl">
                        <MaskedLines
                            className="block font-sans text-ash text-base md:text-lg leading-relaxed"
                            lines={[
                                "Twelve years shipping software, campaigns, and revenue —",
                                "for founders, scaleups, and the occasional Fortune 500.",
                            ]}
                            delay={0.8}
                            stagger={0.08}
                        />
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        className="mt-10 md:mt-14 flex flex-wrap items-center gap-3"
                    >
                        <button
                            data-testid={HERO.hireCta}
                            onClick={() => scrollTo("contact")}
                            className="btn-acid"
                        >
                            Hire Rajiv <ArrowUpRight size={14} strokeWidth={2.4} />
                        </button>
                        <a
                            data-testid={HERO.callCta}
                            href={CALENDLY}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-ghost"
                        >
                            <Calendar size={14} /> Book a call
                        </a>
                        <a
                            data-testid={HERO.whatsappCta}
                            href={WHATSAPP}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-ghost"
                        >
                            <MessageCircle size={14} /> WhatsApp
                        </a>
                    </motion.div>
                </div>

                {/* Right: portrait, clipped frame with parallax */}
                <motion.div
                    style={{ y: yImg }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 1 }}
                    className="col-span-12 md:col-span-4 relative mt-8 md:mt-0"
                >
                    <div className="relative aspect-[3/4] md:aspect-[3/5] overflow-hidden">
                        <div className="absolute inset-0 border border-white/15" />
                        <div className="absolute inset-3">
                            <div className="relative w-full h-full overflow-hidden">
                                <img
                                    src="https://images.unsplash.com/photo-1616851273103-5f0ec44e546f?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"
                                    alt="Rajiv"
                                    className="w-full h-full object-cover grayscale contrast-[1.1]"
                                    style={{ filter: "grayscale(1) contrast(1.15) brightness(0.9)" }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
                            </div>
                        </div>
                        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                            <div>
                                <p className="font-mono text-[10px] tracking-[0.24em] uppercase text-acid">Portrait</p>
                                <p className="font-serif text-bone text-xl mt-1">Rajiv, 2025</p>
                            </div>
                            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ash">/ 001</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Scroll hint */}
            <motion.div
                data-testid={HERO.scrollHint}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8, duration: 0.8 }}
                className="absolute bottom-6 left-6 md:left-10 flex items-center gap-3 font-mono text-[10px] tracking-[0.28em] uppercase text-ash"
            >
                <motion.span
                    animate={{ y: [0, 6, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    className="inline-flex"
                >
                    <ArrowDown size={14} />
                </motion.span>
                Scroll to explore
            </motion.div>
        </section>
    );
}
