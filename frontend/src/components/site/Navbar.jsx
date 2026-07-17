import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { NAV } from "@/constants/testIds";

const links = [
    { id: "work", label: "Work", testid: NAV.work },
    { id: "manifesto", label: "About", testid: NAV.about },
    { id: "services", label: "Services", testid: NAV.services },
    { id: "experience", label: "Journey", testid: NAV.experience },
    { id: "contact", label: "Contact", testid: NAV.contact },
];

function scrollTo(id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (window.__lenis) {
        window.__lenis.scrollTo(el, { offset: -80 });
    } else {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

export default function Navbar() {
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 30);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <header
            data-testid={NAV.root}
            className={`fixed top-0 left-0 right-0 z-50 transition-[background,border,backdrop-filter] duration-500 ${
                scrolled ? "backdrop-blur-xl bg-ink/70 border-b border-white/10" : "bg-transparent"
            }`}
        >
            <div className="max-w-[1440px] mx-auto px-6 md:px-10 h-16 md:h-20 flex items-center justify-between">
                <button
                    data-testid={NAV.home}
                    onClick={() => scrollTo("top")}
                    className="flex items-center gap-3 group"
                >
                    <span className="w-2.5 h-2.5 rounded-full bg-acid shadow-[0_0_20px_rgba(212,255,0,0.7)]" />
                    <span className="font-mono text-[11px] tracking-[0.28em] text-bone/90 uppercase">
                        Rajeev<span className="text-ash">/</span>Freelancer
                    </span>
                </button>

                <nav className="hidden md:flex items-center gap-8">
                    {links.map((l) => (
                        <button
                            key={l.id}
                            data-testid={l.testid}
                            onClick={() => scrollTo(l.id)}
                            className="link-sweep font-mono text-[11px] tracking-[0.22em] uppercase text-bone/80 hover:text-acid transition-colors duration-300"
                        >
                            {l.label}
                        </button>
                    ))}
                </nav>

                <div className="hidden md:block">
                    <button
                        data-testid={NAV.hireCta}
                        onClick={() => scrollTo("contact")}
                        className="btn-acid"
                    >
                        Hire Me <ArrowUpRight size={14} strokeWidth={2.4} />
                    </button>
                </div>

                <button
                    data-testid={open ? NAV.menuClose : NAV.menuOpen}
                    onClick={() => setOpen((v) => !v)}
                    className="md:hidden text-bone p-2 -mr-2"
                    aria-label="Toggle menu"
                >
                    {open ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="md:hidden border-t border-white/10 bg-ink/95 backdrop-blur-xl"
                    >
                        <div className="px-6 py-6 flex flex-col gap-5">
                            {links.map((l) => (
                                <button
                                    key={l.id}
                                    data-testid={l.testid + "-mobile"}
                                    onClick={() => { setOpen(false); scrollTo(l.id); }}
                                    className="text-left font-serif text-3xl text-bone hover:text-acid transition-colors"
                                >
                                    {l.label}
                                </button>
                            ))}
                            <button
                                data-testid={NAV.hireCta + "-mobile"}
                                onClick={() => { setOpen(false); scrollTo("contact"); }}
                                className="btn-acid w-full justify-center mt-4"
                            >
                                Hire Me <ArrowUpRight size={14} strokeWidth={2.4} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
