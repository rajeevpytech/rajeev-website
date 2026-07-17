import React from "react";
import { PageHeader, CTAStrip } from "@/components/site/PageHeader";
import { RevealUp } from "@/components/motion/Reveal";
import useSEO from "@/hooks/useSEO";

const SECTIONS = [
    {
        title: "1. What I collect",
        body: "When you use rajeevfreelancer.com, I collect only what you volunteer: the contents of the contact form (name, email, project type, budget, message) and light anonymous analytics (page views, referrer, coarse geography). No cookies are set for advertising.",
    },
    {
        title: "2. How I use it",
        body: "Contact form submissions are used exclusively to reply to your enquiry. Analytics data helps me understand which pages are useful. I do not sell, rent, or share your data with third parties for marketing.",
    },
    {
        title: "3. Where it lives",
        body: "Enquiry data is stored securely in a private MongoDB database and, for delivery, sent through an email provider (Resend). Both providers process data on my behalf under standard data-processing terms.",
    },
    {
        title: "4. Your rights",
        body: "You can ask me to delete any data I hold about you at any time — email hello@rajeevfreelancer.com and I'll action it within 7 days.",
    },
    {
        title: "5. Retention",
        body: "Enquiry data is kept for as long as we are in active conversation and up to 24 months afterwards for tax/audit purposes. Then it's deleted.",
    },
    {
        title: "6. Changes to this policy",
        body: "If this policy changes I'll update the effective date below. Material changes will be communicated to active clients directly.",
    },
];

export default function Privacy() {
    useSEO({
        title: "Privacy Policy — Rajeev Freelancer",
        description: "How rajeevfreelancer.com collects, stores, and uses data.",
        path: "/privacy",
    });
    return (
        <>
            <PageHeader
                eyebrow="/ Legal"
                title="Privacy"
                italic="policy."
                subtitle="Plain-English version. Effective December 2025."
            />
            <section className="pb-16">
                <div className="max-w-[900px] mx-auto px-6 md:px-10 space-y-12">
                    {SECTIONS.map((s, i) => (
                        <RevealUp key={s.title} delay={i * 0.04}>
                            <h2 className="font-serif text-bone text-2xl md:text-3xl tracking-tight mb-4">{s.title}</h2>
                            <p className="text-ash text-base md:text-lg leading-relaxed">{s.body}</p>
                        </RevealUp>
                    ))}
                </div>
            </section>
            <CTAStrip title="Questions about your data?" note="Email me directly." />
        </>
    );
}
