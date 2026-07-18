import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp } from "lucide-react";

export default function ScrollTop() {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const onScroll = () => setVisible(window.scrollY > 600);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const scrollTop = () => {
        if (window.__lenis) window.__lenis.scrollTo(0);
        else window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <AnimatePresence>
            {visible && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    onClick={scrollTop}
                    aria-label="Scroll to top"
                    data-testid="scroll-top"
                    className="hidden md:flex fixed bottom-24 right-8 z-40 w-11 h-11 rounded-full items-center justify-center border border-acid/30 bg-ink/80 backdrop-blur text-acid hover:bg-acid hover:text-ink transition-colors duration-500"
                >
                    <ChevronUp size={18} strokeWidth={2} />
                </motion.button>
            )}
        </AnimatePresence>
    );
}
