import React, { useState, useEffect } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowUpRight, Check, Sparkles, Clock, ShieldCheck, MessageSquare, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { waUrl, WA_MESSAGES } from "@/lib/whatsapp";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BENEFITS = [
    { icon: Clock, label: "30 minutes", detail: "Focused, on the clock — no meandering." },
    { icon: MessageSquare, label: "Direct with Rajeev", detail: "No sales calls, no discovery reps." },
    { icon: ShieldCheck, label: "Honest read", detail: "Real feedback on fit, scope, and budget." },
];

export default function FreeConsultationModal({ open, onClose }) {
    const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    // Reset when closed
    useEffect(() => {
        if (!open) {
            const t = setTimeout(() => setDone(false), 400);
            return () => clearTimeout(t);
        }
    }, [open]);

    // Body scroll lock (Lenis-aware)
    useEffect(() => {
        if (!open) return;
        const lenis = window.__lenis;
        lenis?.stop();
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const onKey = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            lenis?.start();
            window.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.email) {
            toast.error("Name and email are required.");
            return;
        }
        setSubmitting(true);
        try {
            await axios.post(`${API}/leads`, {
                name: form.name,
                email: form.email,
                project_type: "Free Consultation",
                budget: form.phone ? `Phone: ${form.phone}` : "Not shared",
                message: form.message || "Requested free 30-min consultation.",
                source: "free-consultation-modal",
            });
            setDone(true);
            toast.success("Booked. Rajeev will reach out within 24h.");
            try { localStorage.setItem("consult_booked", "1"); } catch (_) {}
        } catch (err) {
            console.error(err);
            toast.error("Couldn't send. Try WhatsApp or the contact form.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    data-testid="consult-modal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-ink/85 backdrop-blur-md"
                    />

                    {/* Dialog */}
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        initial={{ opacity: 0, y: 40, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.97 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="relative w-full max-w-[1080px] max-h-[92vh] overflow-hidden rounded-2xl md:rounded-3xl border border-white/10 bg-surface shadow-[0_40px_120px_-10px_rgba(0,0,0,0.7),0_0_0_1px_rgba(212,255,0,0.08)]"
                    >
                        <button
                            data-testid="consult-close"
                            onClick={onClose}
                            aria-label="Close"
                            className="absolute top-4 right-4 md:top-6 md:right-6 z-20 w-10 h-10 rounded-full border border-white/15 bg-ink/60 backdrop-blur flex items-center justify-center text-bone/80 hover:text-acid hover:border-acid/40 transition-colors"
                        >
                            <X size={18} />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] max-h-[92vh]">
                            {/* Left: Pitch */}
                            <div
                                className="relative p-8 md:p-12 lg:p-14 overflow-hidden"
                                style={{
                                    background:
                                        "radial-gradient(700px 400px at -10% -20%, rgba(212,255,0,0.18), transparent 60%), radial-gradient(500px 300px at 110% 110%, rgba(212,255,0,0.10), transparent 55%), #0A0A0A",
                                }}
                            >
                                {/* subtle grid */}
                                <div
                                    aria-hidden
                                    className="absolute inset-0 opacity-[0.12] pointer-events-none"
                                    style={{
                                        backgroundImage:
                                            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
                                        backgroundSize: "40px 40px",
                                        maskImage: "radial-gradient(500px 400px at 50% 30%, black 30%, transparent 80%)",
                                    }}
                                />

                                <div className="relative">
                                    <span className="inline-flex items-center gap-2 rounded-full border border-acid/40 bg-acid/10 text-acid px-3 py-1.5 font-mono text-[10px] tracking-[0.24em] uppercase">
                                        <Sparkles size={12} /> Limited · Q1 2026
                                    </span>

                                    <h2 className="mt-8 font-serif text-bone leading-[0.94] tracking-tight text-4xl md:text-5xl lg:text-6xl">
                                        Book a <span className="italic text-acid">free</span><br />
                                        30-minute<br />
                                        consultation.
                                    </h2>

                                    <p className="mt-6 text-ash text-base md:text-lg leading-relaxed max-w-md">
                                        Twelve years of engineering + marketing judgement, on a call.
                                        You bring the problem — I bring the honest first read.
                                    </p>

                                    <ul className="mt-10 space-y-5">
                                        {BENEFITS.map(({ icon: Icon, label, detail }) => (
                                            <li key={label} className="flex items-start gap-4">
                                                <span className="mt-0.5 w-9 h-9 rounded-full bg-acid/10 border border-acid/30 flex items-center justify-center text-acid shrink-0">
                                                    <Icon size={16} strokeWidth={1.8} />
                                                </span>
                                                <div>
                                                    <p className="font-serif text-bone text-lg leading-tight">{label}</p>
                                                    <p className="text-ash text-sm mt-0.5">{detail}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="mt-10 pt-6 border-t border-white/10 flex items-center gap-4">
                                        <div className="flex -space-x-2">
                                            {["#D4FF00", "#8B8B8B", "#F4F4F5"].map((c, i) => (
                                                <span
                                                    key={i}
                                                    className="w-8 h-8 rounded-full border-2 border-surface"
                                                    style={{ background: c }}
                                                />
                                            ))}
                                        </div>
                                        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-ash">
                                            180+ founders trusted the call
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Form */}
                            <div className="relative bg-surface p-8 md:p-12 lg:p-14 overflow-y-auto">
                                <AnimatePresence mode="wait">
                                    {done ? (
                                        <motion.div
                                            key="done"
                                            data-testid="consult-success"
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="h-full min-h-[420px] flex flex-col items-start justify-center"
                                        >
                                            <div className="w-14 h-14 rounded-full bg-acid text-ink flex items-center justify-center mb-6">
                                                <Check size={22} strokeWidth={2.4} />
                                            </div>
                                            <h3 className="font-serif text-bone text-4xl md:text-5xl leading-tight tracking-tight">
                                                Booked.
                                            </h3>
                                            <p className="mt-4 text-ash text-base md:text-lg leading-relaxed max-w-md">
                                                Rajeev will personally reach out within 24 hours with a calendar link.
                                                Keep an eye on your inbox — and check spam, just in case.
                                            </p>
                                            <button
                                                onClick={onClose}
                                                className="mt-10 btn-ghost"
                                            >
                                                Close <X size={14} />
                                            </button>
                                        </motion.div>
                                    ) : (
                                        <motion.form
                                            key="form"
                                            data-testid="consult-form"
                                            onSubmit={submit}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="space-y-5"
                                        >
                                            <p className="eyebrow">/ Take 60 seconds</p>
                                            <h3 className="font-serif text-bone text-2xl md:text-3xl leading-tight tracking-tight">
                                                Tell me who you are.
                                            </h3>

                                            <Field label="Full name" required>
                                                <input
                                                    data-testid="consult-name"
                                                    type="text"
                                                    autoFocus
                                                    value={form.name}
                                                    onChange={onChange("name")}
                                                    placeholder="Jane Doe"
                                                    className={inputCls}
                                                />
                                            </Field>

                                            <Field label="Email" required>
                                                <input
                                                    data-testid="consult-email"
                                                    type="email"
                                                    value={form.email}
                                                    onChange={onChange("email")}
                                                    placeholder="jane@company.com"
                                                    className={inputCls}
                                                />
                                            </Field>

                                            <Field label="Phone / WhatsApp (optional)">
                                                <input
                                                    data-testid="consult-phone"
                                                    type="tel"
                                                    value={form.phone}
                                                    onChange={onChange("phone")}
                                                    placeholder="+91 …"
                                                    className={inputCls}
                                                />
                                            </Field>

                                            <Field label="What do you want to talk about? (optional)">
                                                <textarea
                                                    data-testid="consult-message"
                                                    rows={3}
                                                    value={form.message}
                                                    onChange={onChange("message")}
                                                    placeholder="One or two lines is plenty."
                                                    className={inputCls}
                                                />
                                            </Field>

                                            <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                                <button
                                                    type="submit"
                                                    data-testid="consult-submit"
                                                    disabled={submitting}
                                                    className="btn-acid justify-center flex-1 sm:flex-initial disabled:opacity-60 disabled:cursor-not-allowed"
                                                >
                                                    {submitting ? "Booking…" : "Book my free call"}
                                                    <ArrowUpRight size={14} strokeWidth={2.4} />
                                                </button>
                                                <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ash">
                                                    No spam · Unsubscribe anytime
                                                </p>
                                            </div>

                                            <div className="relative flex items-center gap-4 pt-3">
                                                <span className="flex-1 h-px bg-white/10" />
                                                <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-ash">or</span>
                                                <span className="flex-1 h-px bg-white/10" />
                                            </div>

                                            <a
                                                data-testid="consult-wa"
                                                href={waUrl(WA_MESSAGES.consultation)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn-ghost w-full justify-center"
                                            >
                                                <MessageCircle size={14} strokeWidth={2.2} /> Ping on WhatsApp instead
                                                <ArrowUpRight size={14} strokeWidth={2.4} />
                                            </a>
                                        </motion.form>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

const inputCls =
    "w-full bg-ink border border-white/15 rounded-xl px-4 py-3 text-bone placeholder:text-ash/60 focus:outline-none focus:border-acid/60 transition-colors duration-300 font-sans";

function Field({ label, children, required }) {
    return (
        <label className="block">
            <span className="block font-mono text-[11px] tracking-[0.22em] uppercase text-ash mb-2">
                {label}{required && <span className="text-acid">*</span>}
            </span>
            {children}
        </label>
    );
}
