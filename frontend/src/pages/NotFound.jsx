import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import useSEO from "@/hooks/useSEO";

export default function NotFound() {
    useSEO({
        title: "Page not found — Rajeev Freelancer",
        description: "The page you're looking for does not exist.",
        path: "/404",
    });
    return (
        <section className="min-h-[80vh] flex items-center pt-32 pb-24 spotlight">
            <div className="max-w-[1200px] mx-auto px-6 md:px-10 grid grid-cols-12 gap-6 md:gap-10 items-center">
                <div className="col-span-12 md:col-span-7">
                    <p className="eyebrow mb-6">/ 404</p>
                    <h1 className="font-serif text-bone text-6xl md:text-8xl lg:text-9xl tracking-tighter leading-[0.9]">
                        Nothing<br/> here <span className="italic text-acid">yet.</span>
                    </h1>
                    <p className="mt-8 text-ash text-base md:text-lg max-w-md">
                        The page you're looking for either moved, was renamed, or never existed. Wherever it went, it isn't here.
                    </p>
                    <div className="mt-10 flex flex-wrap gap-3">
                        <Link to="/" className="btn-acid">Back to home <ArrowUpRight size={14} strokeWidth={2.4} /></Link>
                        <Link to="/contact" className="btn-ghost">Say hello anyway <ArrowUpRight size={14} strokeWidth={2.4} /></Link>
                    </div>
                </div>
                <div className="col-span-12 md:col-span-5 font-mono text-acid text-[24vw] md:text-[16vw] leading-none tracking-tighter text-right select-none">
                    404
                </div>
            </div>
        </section>
    );
}
