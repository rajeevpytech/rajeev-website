import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useConsultation } from "@/components/site/ConsultationProvider";

// Floating pill button — bottom-left, always visible, opens the consultation modal
export default function FloatingConsultButton() {
    const { open } = useConsultation();
    return (
        <motion.button
            data-testid="floating-consult-btn"
            onClick={open}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3 }}
            className="fixed bottom-5 left-5 md:bottom-8 md:left-8 z-40 group"
            aria-label="Book a free consultation"
        >
            <span className="relative flex items-center gap-2.5 rounded-full pl-3 pr-4 py-2.5 bg-acid text-ink border border-acid shadow-[0_12px_40px_-10px_rgba(212,255,0,0.5)] font-mono text-[11px] tracking-[0.16em] uppercase">
                <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-ink text-acid">
                    <Sparkles size={12} strokeWidth={2} />
                    <span className="absolute inset-0 rounded-full animate-ping bg-acid/20" />
                </span>
                Free Consultation
            </span>
        </motion.button>
    );
}
