import { useEffect } from "react";
import Lenis from "lenis";

// Attach Lenis smooth scrolling globally
export default function useLenis() {
    useEffect(() => {
        const lenis = new Lenis({
            duration: 1.15,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            wheelMultiplier: 1,
            smoothWheel: true,
        });
        let rafId;
        function raf(time) {
            lenis.raf(time);
            rafId = requestAnimationFrame(raf);
        }
        rafId = requestAnimationFrame(raf);

        // Expose for anchor jumps
        window.__lenis = lenis;

        return () => {
            cancelAnimationFrame(rafId);
            lenis.destroy();
            delete window.__lenis;
        };
    }, []);
}
