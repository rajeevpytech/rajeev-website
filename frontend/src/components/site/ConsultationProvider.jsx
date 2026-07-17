import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import FreeConsultationModal from "@/components/site/FreeConsultationModal";

const ConsultationContext = createContext({ open: () => {}, close: () => {} });

export function useConsultation() {
    return useContext(ConsultationContext);
}

export default function ConsultationProvider({ children }) {
    const [open, setOpen] = useState(false);

    const openModal = useCallback(() => setOpen(true), []);
    const closeModal = useCallback(() => setOpen(false), []);

    // Auto-open once per visitor after 25s of engaged scrolling, unless already booked/dismissed
    useEffect(() => {
        try {
            if (localStorage.getItem("consult_booked") === "1") return;
            if (sessionStorage.getItem("consult_shown") === "1") return;
        } catch (_) {}

        let scrolled = false;
        const onScroll = () => {
            if (window.scrollY > 400) scrolled = true;
        };
        window.addEventListener("scroll", onScroll, { passive: true });

        const timer = setTimeout(() => {
            if (scrolled) {
                setOpen(true);
                try { sessionStorage.setItem("consult_shown", "1"); } catch (_) {}
            }
        }, 25000);

        // Exit intent (desktop)
        const onLeave = (e) => {
            if (e.clientY <= 0 && !scrolled) return;
            if (e.clientY <= 0) {
                try {
                    if (sessionStorage.getItem("consult_shown") !== "1") {
                        setOpen(true);
                        sessionStorage.setItem("consult_shown", "1");
                    }
                } catch (_) {}
            }
        };
        document.addEventListener("mouseleave", onLeave);

        return () => {
            clearTimeout(timer);
            window.removeEventListener("scroll", onScroll);
            document.removeEventListener("mouseleave", onLeave);
        };
    }, []);

    return (
        <ConsultationContext.Provider value={{ open: openModal, close: closeModal }}>
            {children}
            <FreeConsultationModal open={open} onClose={closeModal} />
        </ConsultationContext.Provider>
    );
}
