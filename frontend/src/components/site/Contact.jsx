import React, { useState } from "react";
import axios from "axios";
import { ArrowUpRight, Check, MessageCircle, Calendar, Mail } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { RevealUp } from "@/components/motion/Reveal";
import { CONTACT } from "@/constants/testIds";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const WHATSAPP = "https://wa.me/919999999999?text=Hi%20Rajiv%2C%20I%27d%20like%20to%20work%20with%20you.";
const CALENDLY = "https://calendly.com/rajiv-freelancer/intro";

const projectTypes = ["Web Development", "Software Engineering", "Digital Marketing", "SEO Consulting", "Not sure yet"];
const budgets = ["$1k – $3k", "$3k – $10k", "$10k – $25k", "$25k+"];

export default function Contact() {
    const [form, setForm] = useState({ name: "", email: "", project_type: projectTypes[0], budget: budgets[1], message: "" });
    const [submitting, setSubmitting] = useState(false);
    const [sent, setSent] = useState(false);

    const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.message) {
            toast.error("Please fill in name, email and a short brief.");
            return;
        }
        setSubmitting(true);
        try {
            await axios.post(`${API}/leads`, form);
            setSent(true);
            toast.success("Message received. Rajiv will reply within 24h.");
            setForm({ name: "", email: "", project_type: projectTypes[0], budget: budgets[1], message: "" });
        } catch (err) {
            console.error(err);
            toast.error("Could not send. Please try WhatsApp or email.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section id="contact" data-testid={CONTACT.root} className="relative py-24 md:py-40">
            <div className="max-w-[1440px] mx-auto px-6 md:px-10 grid grid-cols-12 gap-6 md:gap-16">
                <RevealUp className="col-span-12 md:col-span-5">
                    <p className="eyebrow mb-6">/ 007 — Start a project</p>
                    <h2 className="font-serif text-bone text-5xl md:text-6xl lg:text-7xl leading-[0.94] tracking-tight">
                        Let's <span className="italic text-acid">talk.</span>
                    </h2>
                    <p className="mt-6 text-ash text-base md:text-lg leading-relaxed max-w-md">
                        Tell me about your project — I'll reply within 24 hours with an honest read on
                        fit, timeline, and price. Or reach out directly:
                    </p>

                    <div className="mt-10 space-y-4">
                        <a
                            data-testid={CONTACT.calendly}
                            href={CALENDLY}
                            target="_blank"
                            rel="noreferrer"
                            className="group flex items-center justify-between p-5 frame rounded-2xl hover:border-acid/40 transition-colors duration-500"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-bone group-hover:text-acid group-hover:border-acid/40 transition-colors">
                                    <Calendar size={16} />
                                </div>
                                <div>
                                    <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash">Book a call</p>
                                    <p className="font-serif text-bone text-xl mt-0.5">30-min intro</p>
                                </div>
                            </div>
                            <ArrowUpRight className="text-ash group-hover:text-acid transition-colors" size={18} />
                        </a>
                        <a
                            data-testid={CONTACT.whatsapp}
                            href={WHATSAPP}
                            target="_blank"
                            rel="noreferrer"
                            className="group flex items-center justify-between p-5 frame rounded-2xl hover:border-acid/40 transition-colors duration-500"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-bone group-hover:text-acid group-hover:border-acid/40 transition-colors">
                                    <MessageCircle size={16} />
                                </div>
                                <div>
                                    <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash">WhatsApp</p>
                                    <p className="font-serif text-bone text-xl mt-0.5">Same-day reply</p>
                                </div>
                            </div>
                            <ArrowUpRight className="text-ash group-hover:text-acid transition-colors" size={18} />
                        </a>
                        <a
                            href="mailto:hello@rajivfreelancer.com"
                            className="group flex items-center justify-between p-5 frame rounded-2xl hover:border-acid/40 transition-colors duration-500"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-bone group-hover:text-acid group-hover:border-acid/40 transition-colors">
                                    <Mail size={16} />
                                </div>
                                <div>
                                    <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash">Email</p>
                                    <p className="font-serif text-bone text-xl mt-0.5">hello@rajivfreelancer.com</p>
                                </div>
                            </div>
                            <ArrowUpRight className="text-ash group-hover:text-acid transition-colors" size={18} />
                        </a>
                    </div>
                </RevealUp>

                <RevealUp delay={0.1} className="col-span-12 md:col-span-7">
                    <div className="frame rounded-2xl p-6 md:p-10">
                        <AnimatePresence mode="wait">
                            {sent ? (
                                <motion.div
                                    key="sent"
                                    data-testid={CONTACT.success}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="py-16 text-center"
                                >
                                    <div className="mx-auto w-14 h-14 rounded-full bg-acid text-ink flex items-center justify-center mb-6">
                                        <Check size={22} strokeWidth={2.4} />
                                    </div>
                                    <h3 className="font-serif text-bone text-3xl md:text-4xl">Message received.</h3>
                                    <p className="mt-4 text-ash max-w-md mx-auto">
                                        Thanks for reaching out. Rajiv reads every message personally — expect a reply within 24 hours.
                                    </p>
                                    <button
                                        onClick={() => setSent(false)}
                                        className="mt-8 link-sweep font-mono text-[11px] tracking-[0.22em] uppercase text-acid"
                                    >
                                        Send another
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.form
                                    key="form"
                                    data-testid={CONTACT.form}
                                    onSubmit={onSubmit}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="space-y-6"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FieldInput
                                            label="Your name"
                                            testid={CONTACT.name}
                                            value={form.name}
                                            onChange={onChange("name")}
                                            placeholder="Jane Doe"
                                        />
                                        <FieldInput
                                            label="Email"
                                            testid={CONTACT.email}
                                            type="email"
                                            value={form.email}
                                            onChange={onChange("email")}
                                            placeholder="jane@company.com"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FieldSelect
                                            label="Project type"
                                            testid={CONTACT.projectType}
                                            value={form.project_type}
                                            onChange={onChange("project_type")}
                                            options={projectTypes}
                                        />
                                        <FieldSelect
                                            label="Budget"
                                            testid={CONTACT.budget}
                                            value={form.budget}
                                            onChange={onChange("budget")}
                                            options={budgets}
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-mono text-[11px] tracking-[0.22em] uppercase text-ash mb-3">
                                            The brief
                                        </label>
                                        <textarea
                                            data-testid={CONTACT.message}
                                            value={form.message}
                                            onChange={onChange("message")}
                                            rows={6}
                                            placeholder="What are you building, when do you need it, and what does success look like?"
                                            className="w-full bg-transparent border border-white/15 rounded-xl px-4 py-3 text-bone placeholder:text-ash/60 focus:outline-none focus:border-acid/60 transition-colors duration-300 font-sans"
                                        />
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                                        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-ash">
                                            No newsletters. No spam. Ever.
                                        </p>
                                        <button
                                            type="submit"
                                            data-testid={CONTACT.submit}
                                            disabled={submitting}
                                            className="btn-acid disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {submitting ? "Sending…" : "Send message"}
                                            <ArrowUpRight size={14} strokeWidth={2.4} />
                                        </button>
                                    </div>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </div>
                </RevealUp>
            </div>
        </section>
    );
}

function FieldInput({ label, testid, ...rest }) {
    return (
        <div>
            <label className="block font-mono text-[11px] tracking-[0.22em] uppercase text-ash mb-3">
                {label}
            </label>
            <input
                data-testid={testid}
                {...rest}
                className="w-full bg-transparent border border-white/15 rounded-xl px-4 py-3 text-bone placeholder:text-ash/60 focus:outline-none focus:border-acid/60 transition-colors duration-300 font-sans"
            />
        </div>
    );
}

function FieldSelect({ label, testid, options, value, onChange }) {
    return (
        <div>
            <label className="block font-mono text-[11px] tracking-[0.22em] uppercase text-ash mb-3">
                {label}
            </label>
            <div className="relative">
                <select
                    data-testid={testid}
                    value={value}
                    onChange={onChange}
                    className="appearance-none w-full bg-ink border border-white/15 rounded-xl px-4 py-3 text-bone focus:outline-none focus:border-acid/60 transition-colors duration-300 font-sans pr-10"
                >
                    {options.map((o) => (
                        <option key={o} value={o} className="bg-ink text-bone">{o}</option>
                    ))}
                </select>
                <svg
                    aria-hidden
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ash"
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                >
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </div>
        </div>
    );
}
