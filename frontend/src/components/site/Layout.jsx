import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import useLenis from "@/hooks/useLenis";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import ConsultationProvider from "@/components/site/ConsultationProvider";
import FloatingConsultButton from "@/components/site/FloatingConsultButton";

export default function Layout() {
    useLenis();
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "instant" });
        if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
    }, [pathname]);

    return (
        <ConsultationProvider>
            <div className="grain-overlay relative min-h-screen bg-ink">
                <Toaster theme="dark" position="bottom-right" richColors />
                <Navbar />
                <main>
                    <Outlet />
                </main>
                <Footer />
                <FloatingConsultButton />
            </div>
        </ConsultationProvider>
    );
}
