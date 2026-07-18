import React, { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ArrowUpRight, MessageCircle } from "lucide-react";
import { NAV } from "@/constants/testIds";
import { waUrl, WA_MESSAGES } from "@/lib/whatsapp";

const links = [
    { to: "/work", label: "Work", testid: NAV.work },
    { to: "/about", label: "About", testid: NAV.about },
    { to: "/services", label: "Services", testid: NAV.services },
    { to: "/journey", label: "Journey", testid: NAV.experience },
    { to: "/blog", label: "Journal", testid: "nav-blog" },
    { to: "/contact", label: "Contact", testid: NAV.contact },
];

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
                <Link
                    data-testid={NAV.home}
                    to="/"
                    className="flex items-center gap-3 group"
                >
                    <span className="w-2.5 h-2.5 rounded-full bg-acid shadow-[0_0_20px_rgba(212,255,0,0.7)]" />
                    <span className="font-mono text-[11px] tracking-[0.28em] text-bone/90 uppercase">
                        Rajeev<span className="text-ash">/</span>Freelancer
                    </span>
                </Link>

                <nav className="hidden md:flex items-center gap-7">
                    {links.map((l) => (
                        <NavLink
                            key={l.to}
                            to={l.to}
                            data-testid={l.testid}
                            className={({ isActive }) =>
                                `link-sweep font-mono text-[11px] tracking-[0.22em] uppercase transition-colors duration-300 ${
                                    isActive ? "text-acid" : "text-bone/80 hover:text-acid"
                                }`
                            }
                        >
                            {l.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="hidden md:block">
                    <a
                        data-testid={NAV.hireCta}
                        href={waUrl(WA_MESSAGES.hire)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-acid"
                    >
                        <MessageCircle size={14} strokeWidth={2.2} /> Hire Me <ArrowUpRight size={14} strokeWidth={2.4} />
                    </a>
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
                                <Link
                                    key={l.to}
                                    to={l.to}
                                    data-testid={l.testid + "-mobile"}
                                    onClick={() => setOpen(false)}
                                    className="text-left font-serif text-3xl text-bone hover:text-acid transition-colors"
                                >
                                    {l.label}
                                </Link>
                            ))}
                            <a
                                href={waUrl(WA_MESSAGES.hire)}
                                target="_blank"
                                rel="noreferrer"
                                data-testid={NAV.hireCta + "-mobile"}
                                onClick={() => setOpen(false)}
                                className="btn-acid w-full justify-center mt-4"
                            >
                                <MessageCircle size={14} strokeWidth={2.2} /> Hire Me on WhatsApp <ArrowUpRight size={14} strokeWidth={2.4} />
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
