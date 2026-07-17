import React from "react";
import { Linkedin, Github, Twitter, Mail, ArrowUpRight } from "lucide-react";
import { FOOTER } from "@/constants/testIds";

function scrollTo(id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (window.__lenis) window.__lenis.scrollTo(el, { offset: -60 });
    else el.scrollIntoView({ behavior: "smooth" });
}

export default function Footer() {
    return (
        <footer data-testid={FOOTER.root} className="relative bg-ink border-t border-white/10 pt-20 pb-10">
            <div className="max-w-[1440px] mx-auto px-6 md:px-10">
                {/* Massive last-word signature */}
                <div className="font-serif text-bone leading-[0.85] tracking-tighter text-[22vw] md:text-[16vw] whitespace-nowrap overflow-hidden select-none pb-8 md:pb-16">
                    RAJIV<span className="text-acid italic">.</span>
                </div>

                <div className="grid grid-cols-12 gap-8 md:gap-10 pt-10 border-t border-white/10">
                    <div className="col-span-12 md:col-span-4">
                        <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash mb-4">Currently based in</p>
                        <p className="font-serif text-bone text-3xl">Bengaluru, IN</p>
                        <p className="text-ash text-sm mt-2">Working with teams globally · IST +05:30</p>
                    </div>

                    <div className="col-span-6 md:col-span-2">
                        <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash mb-4">Sections</p>
                        <ul className="space-y-3 text-bone">
                            <li><button onClick={() => scrollTo("work")} className="link-sweep">Work</button></li>
                            <li><button onClick={() => scrollTo("manifesto")} className="link-sweep">About</button></li>
                            <li><button onClick={() => scrollTo("services")} className="link-sweep">Services</button></li>
                            <li><button onClick={() => scrollTo("experience")} className="link-sweep">Journey</button></li>
                        </ul>
                    </div>

                    <div className="col-span-6 md:col-span-3">
                        <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash mb-4">Elsewhere</p>
                        <ul className="space-y-3 text-bone">
                            <li>
                                <a data-testid={FOOTER.linkedin} href="https://www.linkedin.com/" target="_blank" rel="noreferrer" className="link-sweep inline-flex items-center gap-2">
                                    <Linkedin size={14} /> LinkedIn
                                </a>
                            </li>
                            <li>
                                <a data-testid={FOOTER.github} href="https://github.com/" target="_blank" rel="noreferrer" className="link-sweep inline-flex items-center gap-2">
                                    <Github size={14} /> GitHub
                                </a>
                            </li>
                            <li>
                                <a data-testid={FOOTER.twitter} href="https://twitter.com/" target="_blank" rel="noreferrer" className="link-sweep inline-flex items-center gap-2">
                                    <Twitter size={14} /> Twitter
                                </a>
                            </li>
                            <li>
                                <a data-testid={FOOTER.email} href="mailto:hello@rajivfreelancer.com" className="link-sweep inline-flex items-center gap-2">
                                    <Mail size={14} /> Email
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div className="col-span-12 md:col-span-3">
                        <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash mb-4">Ready when you are</p>
                        <button onClick={() => scrollTo("contact")} className="btn-acid w-full justify-center">
                            Start a project <ArrowUpRight size={14} strokeWidth={2.4} />
                        </button>
                    </div>
                </div>

                <div className="mt-14 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                    <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash">
                        © {new Date().getFullYear()} Rajiv Freelancer — All rights reserved.
                    </p>
                    <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash">
                        Handcrafted / Portfolio v.03
                    </p>
                </div>
            </div>
        </footer>
    );
}
