import React, { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ArrowUpRight, MessageCircle, ChevronDown } from "lucide-react";
import { NAV } from "@/constants/testIds";
import { waUrl, WA_MESSAGES } from "@/lib/whatsapp";
import { AVATAR_URL } from "@/lib/brand";

const links = [
    { to: "/", label: "Home", testid: "nav-home-link" },
    { to: "/about", label: "About", testid: NAV.about },
    { to: "/services", label: "Services", testid: NAV.services, dropdown: true },
    { to: "/work", label: "Work", testid: NAV.work },
    { to: "/sitemap", label: "Locations", testid: "nav-locations" },
    { to: "/blog", label: "Blog", testid: "nav-blog" },
    { to: "/contact", label: "Contact", testid: NAV.contact },
];

const serviceDropdown = [
    { to: "/services/web-development", label: "Web Development" },
    { to: "/services/software-engineering", label: "Software Engineering" },
    { to: "/services/digital-marketing", label: "Digital Marketing" },
    { to: "/services/seo-consulting", label: "SEO & Consulting" },
];

export default function Navbar() {
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [svcOpen, setSvcOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 30);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <header
            data-testid={NAV.root}
            className={`fixed top-0 left-0 right-0 z-50 transition-[background,border,backdrop-filter] duration-500 ${
                scrolled ? "backdrop-blur-xl bg-ink/80 border-b border-acid/15" : "bg-transparent"
            }`}
        >
            <div className="max-w-[1440px] mx-auto px-5 md:px-10 h-20 md:h-24 flex items-center justify-between gap-4">
                {/* Avatar logo */}
                <Link data-testid={NAV.home} to="/" className="flex items-center gap-3 group shrink-0">
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.2, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                        className="relative w-11 h-11 md:w-14 md:h-14 rounded-full overflow-hidden gold-glow"
                    >
                        <img src={AVATAR_URL} alt="Rajeev" className="w-full h-full object-cover" />
                    </motion.div>
                    <div className="hidden md:block">
                        <p className="font-serif text-bone text-base leading-none">Rajeev<span className="text-acid italic">.</span></p>
                        <p className="font-mono text-[9px] tracking-[0.28em] text-ash uppercase mt-1">Freelancer</p>
                    </div>
                </Link>

                {/* Desktop nav */}
                <nav className="hidden lg:flex items-center gap-6 lg:gap-8">
                    {links.map((l) => (
                        l.dropdown ? (
                            <div key={l.to} className="relative" onMouseEnter={() => setSvcOpen(true)} onMouseLeave={() => setSvcOpen(false)}>
                                <NavLink
                                    to={l.to}
                                    data-testid={l.testid}
                                    className={({ isActive }) =>
                                        `flex items-center gap-1 font-mono text-[11px] tracking-[0.22em] uppercase transition-colors duration-300 ${
                                            isActive ? "text-acid" : "text-bone/85 hover:text-acid"
                                        }`
                                    }
                                >
                                    {l.label} <ChevronDown size={11} className={`transition-transform ${svcOpen ? "rotate-180" : ""}`} />
                                </NavLink>
                                <AnimatePresence>
                                    {svcOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 6 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute top-full left-1/2 -translate-x-1/2 pt-4 min-w-[240px]"
                                        >
                                            <div className="frame rounded-2xl p-2 shadow-xl">
                                                {serviceDropdown.map((s) => (
                                                    <Link
                                                        key={s.to}
                                                        to={s.to}
                                                        className="block px-4 py-2.5 text-sm text-bone/90 hover:text-acid hover:bg-acid/5 rounded-lg transition-colors font-serif"
                                                    >
                                                        {s.label}
                                                    </Link>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <NavLink
                                key={l.to}
                                to={l.to}
                                data-testid={l.testid}
                                className={({ isActive }) =>
                                    `link-sweep font-mono text-[11px] tracking-[0.22em] uppercase transition-colors duration-300 ${
                                        isActive ? "text-acid" : "text-bone/85 hover:text-acid"
                                    }`
                                }
                            >
                                {l.label}
                            </NavLink>
                        )
                    ))}
                </nav>

                {/* CTAs */}
                <div className="hidden lg:flex items-center gap-2">
                    <a
                        href={waUrl(WA_MESSAGES.hire)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost !py-2.5 !px-4 !text-[12px]"
                    >
                        <MessageCircle size={13} /> WhatsApp
                    </a>
                    <Link
                        data-testid={NAV.hireCta}
                        to="/contact"
                        className="btn-acid !py-2.5 !px-4 !text-[12px]"
                    >
                        Get Free Quote <ArrowUpRight size={13} strokeWidth={2.4} />
                    </Link>
                </div>

                <button
                    data-testid={open ? NAV.menuClose : NAV.menuOpen}
                    onClick={() => setOpen((v) => !v)}
                    className="lg:hidden text-bone p-2 -mr-2"
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
                        className="lg:hidden border-t border-acid/15 bg-ink/95 backdrop-blur-xl"
                    >
                        <div className="px-6 py-6 flex flex-col gap-4">
                            {links.map((l) => (
                                <Link
                                    key={l.to}
                                    to={l.to}
                                    data-testid={l.testid + "-mobile"}
                                    onClick={() => setOpen(false)}
                                    className="text-left font-serif text-2xl text-bone hover:text-acid transition-colors"
                                >
                                    {l.label}
                                </Link>
                            ))}
                            <div className="flex gap-2 mt-4">
                                <a
                                    href={waUrl(WA_MESSAGES.hire)}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={() => setOpen(false)}
                                    className="btn-ghost flex-1 justify-center"
                                >
                                    <MessageCircle size={14} /> WhatsApp
                                </a>
                                <Link
                                    to="/contact"
                                    data-testid={NAV.hireCta + "-mobile"}
                                    onClick={() => setOpen(false)}
                                    className="btn-acid flex-1 justify-center"
                                >
                                    Free Quote <ArrowUpRight size={14} strokeWidth={2.4} />
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
