import React from "react";
import { motion } from "framer-motion";
import { Phone, MessageCircle, ArrowUpRight } from "lucide-react";
import { waUrl, WA_MESSAGES, WA_DISPLAY } from "@/lib/whatsapp";

// Mobile-only sticky bottom bar with WhatsApp + Call. Hidden on desktop.
export default function MobileStickyBar() {
    return (
        <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden fixed bottom-3 left-3 right-3 z-40 flex gap-2"
            data-testid="mobile-sticky-bar"
        >
            <a
                data-testid="mobile-cta-whatsapp"
                href={waUrl(WA_MESSAGES.hire)}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 rounded-full py-3.5 px-4 bg-acid text-ink font-mono text-[11px] tracking-[0.16em] uppercase shadow-[0_16px_40px_-10px_rgba(212,255,0,0.45)]"
            >
                <MessageCircle size={14} strokeWidth={2.2} /> WhatsApp
            </a>
            <a
                data-testid="mobile-cta-call"
                href="tel:+919711623561"
                aria-label={`Call ${WA_DISPLAY}`}
                className="flex items-center justify-center rounded-full py-3.5 px-5 bg-ink/90 backdrop-blur border border-white/15 text-bone"
            >
                <Phone size={16} strokeWidth={2} />
            </a>
        </motion.div>
    );
}

// Reusable inline CTA banner — drop between sections
export function InlineCTA({ label = "Ready to talk?", message = WA_MESSAGES.general, testid = "inline-cta" }) {
    return (
        <section className="relative py-14 md:py-20" data-testid={testid}>
            <div className="max-w-[1440px] mx-auto px-6 md:px-10">
                <div className="frame rounded-2xl md:rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                    <div
                        aria-hidden
                        className="absolute -top-24 -right-24 w-96 h-96 rounded-full pointer-events-none"
                        style={{ background: "radial-gradient(circle, rgba(212,255,0,0.14), transparent 60%)" }}
                    />
                    <div className="relative">
                        <p className="eyebrow mb-3">/ Quick answer</p>
                        <p className="font-serif text-bone text-3xl md:text-4xl lg:text-5xl tracking-tight leading-[1.02] max-w-xl">
                            {label}
                        </p>
                        <p className="mt-3 text-ash text-sm md:text-base">
                            Ping on WhatsApp — Rajeev usually replies within an hour.
                        </p>
                    </div>
                    <a
                        href={waUrl(message)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-acid whitespace-nowrap"
                        data-testid={`${testid}-wa`}
                    >
                        <MessageCircle size={14} strokeWidth={2.2} /> Ask on WhatsApp
                        <ArrowUpRight size={14} strokeWidth={2.4} />
                    </a>
                </div>
            </div>
        </section>
    );
}
