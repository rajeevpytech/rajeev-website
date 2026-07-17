import React from "react";
import { PageHeader, CTAStrip } from "@/components/site/PageHeader";
import { RevealUp } from "@/components/motion/Reveal";
import useSEO from "@/hooks/useSEO";

export default function Cookies() {
    useSEO({
        title: "Cookie Policy — Rajeev Freelancer",
        description: "How and when rajeevfreelancer.com uses cookies.",
        path: "/cookies",
    });
    return (
        <>
            <PageHeader eyebrow="/ Legal" title="Cookie" italic="policy." subtitle="Short version: this site uses almost no cookies. The long version is below." />
            <section className="pb-16">
                <div className="max-w-[900px] mx-auto px-6 md:px-10 space-y-10">
                    <RevealUp>
                        <h2 className="font-serif text-bone text-2xl md:text-3xl tracking-tight mb-4">Strictly necessary</h2>
                        <p className="text-ash text-base md:text-lg leading-relaxed">
                            A small number of first-party cookies are used to make the site work — for example, to remember
                            which theme you prefer, or to keep the contact form from double-submitting.
                        </p>
                    </RevealUp>
                    <RevealUp delay={0.05}>
                        <h2 className="font-serif text-bone text-2xl md:text-3xl tracking-tight mb-4">Analytics</h2>
                        <p className="text-ash text-base md:text-lg leading-relaxed">
                            I use privacy-first analytics to understand which pages are useful. IP addresses are anonymised
                            and no data is used to build advertising profiles.
                        </p>
                    </RevealUp>
                    <RevealUp delay={0.1}>
                        <h2 className="font-serif text-bone text-2xl md:text-3xl tracking-tight mb-4">Advertising & tracking</h2>
                        <p className="text-ash text-base md:text-lg leading-relaxed">
                            None. No advertising cookies, no cross-site trackers, no ad networks are loaded on this site.
                        </p>
                    </RevealUp>
                </div>
            </section>
            <CTAStrip />
        </>
    );
}
