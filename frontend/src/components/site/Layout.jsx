import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import useLenis from "@/hooks/useLenis";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";

export default function Layout() {
    useLenis();
    const { pathname } = useLocation();

    // Ensure top-of-page on route change (Lenis-aware)
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "instant" });
        if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
    }, [pathname]);

    return (
        <div className="grain-overlay relative min-h-screen bg-ink">
            <Toaster theme="dark" position="bottom-right" richColors />
            <Navbar />
            <main>
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}
