import React, { useState } from "react";
import axios from "axios";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, MessageCircle, ShieldCheck, Sparkles, Globe, Award, Star, Check } from "lucide-react";
import { MaskedLines, RevealUp } from "@/components/motion/Reveal";
import { HERO } from "@/constants/testIds";
import { waUrl, waUrlFromForm, WA_MESSAGES } from "@/lib/whatsapp";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const services = ["Website Development", "Software Engineering", "Digital Marketing", "SEO Consulting", "Brand & Design", "Mobile Apps"];
const budgets = ["$1k – $3k", "$3k – $10k", "$10k – $25k", "$25k+"];

const stats = [
    { icon: Globe, value: "27", label: "Countries served" },
    { icon: Award, value: "180+", label: "Projects delivered" },
    { icon: Star, value: "4.9", label: "Client rating", suffix: "/5" },
];

export default function Hero() {
    const { scrollY } = useScroll();
    const yBg = useTransform(scrollY, [0, 800], [0, 220]);
    const opacityBg = useTransform(scrollY, [0, 500], [1, 0.4]);

    const [form, setForm] = useState({ name: "", phone: "", email: "", service: "", budget: "", message: "" });
    const [submitting, setSubmitting] = useState(false);
    const [sent, setSent] = useState(false);

    const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.email) {
            toast.error("Please share your name and email.");
            return;
        }
        setSubmitting(true);

        // Build WhatsApp URL and open in new tab (primary action)
        const url = waUrlFromForm(
            {
                Name: form.name,
                Email: form.email,
                Phone: form.phone,
                Service: form.service,
                Budget: form.budget,
                Details: form.message,
            },
            "Free Project Quote",
        );
        window.open(url, "_blank");

        // Best-effort backup to Mongo (does not block or fail UX)
        axios.post(`${API}/leads`, {
            name: form.name,
            email: form.email,
            project_type: form.service || "Free Quote",
            budget: `${form.budget || "Not shared"} · ${form.phone || "No phone"}`,
            message: form.message || "Requested a free project quote.",
            source: "hero-quote-form",
        }).catch(() => {});

        setSent(true);
        toast.success("Opening WhatsApp — reply usually within 30 min.");
        setSubmitting(false);
    };

    return (
        <section
            id="top"
            data-testid={HERO.root}
            className="relative pt-28 md:pt-36 pb-16 md:pb-24 spotlight gold-vignette overflow-hidden"
        >
            {/* Parallax abstract background */}
            <motion.div aria-hidden style={{ y: yBg, opacity: opacityBg }} className="absolute inset-0 -z-0">
                <div
                    className="absolute inset-0 opacity-[0.12] mix-blend-screen"
                    style={{
                        backgroundImage:
                            "url(https://images.unsplash.com/photo-1519681393784-d120267933ba?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000)",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        filter: "sepia(1) hue-rotate(-20deg) saturate(1.4) brightness(0.65)",
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink/60 to-ink" />
            </motion.div>

            <div className="relative max-w-[1440px] mx-auto px-5 md:px-10">
                {/* Availability badge */}
                <RevealUp>
                    <div className="flex flex-wrap items-center gap-3 mb-8">
                        <span className="inline-flex items-center gap-2 rounded-full border border-acid/40 bg-acid/10 px-3 py-1.5 font-mono text-[10px] tracking-[0.24em] uppercase text-acid">
                            <span className="relative flex w-2 h-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-acid opacity-70" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-acid" />
                            </span>
                            Available · Jan 2026
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 font-mono text-[10px] tracking-[0.24em] uppercase text-ash">
                            <Globe size={11} className="text-acid" /> Based in Gurgaon · Open to relocate worldwide
                        </span>
                    </div>
                </RevealUp>

                <div className="grid grid-cols-12 gap-6 md:gap-10 lg:gap-16 items-start">
                    {/* Left column: massive display + copy + CTAs + stats */}
                    <div className="col-span-12 lg:col-span-6 xl:col-span-7">
                        <h1 className="font-serif text-bone leading-[0.9] tracking-tight text-[13vw] sm:text-[10vw] lg:text-[7.5vw] xl:text-[6.6vw]">
                            <MaskedLines lines={["Design.", "Build.", <span key="market" className="italic text-acid">Market.</span>, "Scale."]} stagger={0.11} />
                        </h1>

                        <RevealUp delay={1.1}>
                            <p className="mt-8 md:mt-10 text-ash text-base md:text-lg leading-relaxed max-w-xl">
                                I craft high-performance digital experiences that turn visitors into customers.
                                Web, software, and growth marketing — under one obsessive roof.
                            </p>
                        </RevealUp>

                        <RevealUp delay={1.3}>
                            <div className="mt-8 md:mt-10 flex flex-wrap items-center gap-3">
                                <a href="#quote-form" className="btn-acid" data-testid={HERO.hireCta}>
                                    Get Your Free Quote <ArrowUpRight size={14} strokeWidth={2.4} />
                                </a>
                                <a href={waUrl(WA_MESSAGES.hire)} target="_blank" rel="noreferrer" className="btn-ghost" data-testid={HERO.whatsappCta}>
                                    <MessageCircle size={14} /> WhatsApp Now
                                </a>
                            </div>
                        </RevealUp>

                        {/* Stats row */}
                        <RevealUp delay={1.5}>
                            <div className="mt-12 md:mt-16 grid grid-cols-3 gap-4 md:gap-8 max-w-2xl">
                                {stats.map((s, i) => {
                                    const Icon = s.icon;
                                    return (
                                        <motion.div
                                            key={s.label}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 1.6 + i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                                            className="border-l border-acid/30 pl-4"
                                        >
                                            <Icon size={16} className="text-acid mb-2" strokeWidth={1.5} />
                                            <p className="font-serif text-bone text-3xl md:text-4xl leading-none">
                                                {s.value}<span className="text-acid text-2xl">{s.suffix || ""}</span>
                                            </p>
                                            <p className="font-mono text-[10px] tracking-[0.22em] text-ash uppercase mt-2">{s.label}</p>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </RevealUp>
                    </div>

                    {/* Right column: embedded quote form */}
                    <motion.div
                        id="quote-form"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                        className="col-span-12 lg:col-span-6 xl:col-span-5"
                    >
                        <div className="relative frame rounded-3xl p-6 md:p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6),0_0_0_1px_rgba(212,175,55,0.1)]">
                            <div className="absolute -top-3 left-6 inline-flex items-center gap-2 rounded-full border border-acid/40 bg-ink px-3 py-1 font-mono text-[10px] tracking-[0.24em] uppercase text-acid">
                                <Sparkles size={11} /> Free · No obligation
                            </div>

                            {sent ? (
                                <div className="py-8 text-center" data-testid="hero-quote-success">
                                    <div className="mx-auto w-14 h-14 rounded-full bg-acid text-ink flex items-center justify-center mb-6">
                                        <Check size={22} strokeWidth={2.4} />
                                    </div>
                                    <h3 className="font-serif text-bone text-3xl">Sent.</h3>
                                    <p className="mt-3 text-ash">Rajeev will reply within 30 minutes on business hours.</p>
                                </div>
                            ) : (
                                <form onSubmit={submit} data-testid="hero-quote-form" className="space-y-4">
                                    <div>
                                        <div className="flex items-baseline justify-between mb-1">
                                            <p className="eyebrow">Free Project Quote</p>
                                            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.18em] uppercase text-ash">
                                                <ShieldCheck size={11} /> 100% Private
                                            </span>
                                        </div>
                                        <p className="font-serif text-bone text-2xl md:text-3xl mt-1 leading-tight">
                                            Tell me about <span className="italic text-acid">your project</span>
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <label>
                                            <span className="field-label">Full Name</span>
                                            <input data-testid="hero-name" value={form.name} onChange={onChange("name")} placeholder="Your name" className="field-input" />
                                        </label>
                                        <label>
                                            <span className="field-label">Phone</span>
                                            <input data-testid="hero-phone" value={form.phone} onChange={onChange("phone")} placeholder="+91 9XXXXXXXXX" className="field-input" />
                                        </label>
                                    </div>
                                    <label className="block">
                                        <span className="field-label">Email</span>
                                        <input data-testid="hero-email" type="email" value={form.email} onChange={onChange("email")} placeholder="you@company.com" className="field-input" />
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <label>
                                            <span className="field-label">Service</span>
                                            <select data-testid="hero-service" value={form.service} onChange={onChange("service")} className="field-input appearance-none">
                                                <option value="">Select a service</option>
                                                {services.map((s) => <option key={s}>{s}</option>)}
                                            </select>
                                        </label>
                                        <label>
                                            <span className="field-label">Budget (optional)</span>
                                            <select data-testid="hero-budget" value={form.budget} onChange={onChange("budget")} className="field-input appearance-none">
                                                <option value="">Select budget</option>
                                                {budgets.map((b) => <option key={b}>{b}</option>)}
                                            </select>
                                        </label>
                                    </div>
                                    <label className="block">
                                        <span className="field-label">Project Details (optional)</span>
                                        <textarea data-testid="hero-message" rows={3} value={form.message} onChange={onChange("message")} placeholder="A few lines about your goals, timeline, or inspiration." className="field-input resize-none" />
                                    </label>

                                    <button
                                        type="submit"
                                        data-testid="hero-quote-submit"
                                        disabled={submitting}
                                        className="btn-acid w-full justify-center !py-4 disabled:opacity-60"
                                    >
                                        {submitting ? "Sending…" : "Get My Free Quote"}
                                        <ArrowUpRight size={14} strokeWidth={2.4} />
                                    </button>

                                    <p className="text-center text-ash text-[11px] leading-relaxed">
                                        By submitting, you agree to be contacted via email or WhatsApp.
                                        <br /><span className="text-acid">Avg. response under 30 minutes.</span>
                                    </p>
                                </form>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
