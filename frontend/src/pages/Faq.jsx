import React from "react";
import { PageHeader, CTAStrip } from "@/components/site/PageHeader";
import { RevealUp } from "@/components/motion/Reveal";
import useSEO, { faqSchema } from "@/hooks/useSEO";

const FAQS = [
    {
        q: "What kinds of clients do you work with?",
        a: "Founders and product teams from seed to Series C, agencies who need a senior implementation partner, and Fortune 500 innovation groups. I take a small number of engagements each year — quality over quantity.",
    },
    {
        q: "Do you code the whole thing yourself?",
        a: "Yes. No offshore relay, no account manager, no ghost writer. When you hire Rajeev, you get Rajeev on the call, in the pull request, and in the report.",
    },
    {
        q: "What's your typical engagement length?",
        a: "Sprints are 2–6 weeks. Retainers are usually 3 months minimum. Advisory calls are one-off. Anything shorter than a week I usually decline.",
    },
    {
        q: "Do you work with US / UK / EU clients?",
        a: "Yes — most of my clients are outside India. I keep 4 hours of overlap with US ET and I'm fully overlapped with EMEA business hours.",
    },
    {
        q: "How do you price?",
        a: "Fixed-fee for well-defined scope, weekly rate for exploratory / discovery, monthly retainer for ongoing work. Every proposal includes what's in scope and — importantly — what isn't.",
    },
    {
        q: "Do you sign NDAs?",
        a: "Yes. A mutual NDA can be in place within the day.",
    },
    {
        q: "What's the fastest way to get in touch?",
        a: "WhatsApp at +91 97116 23561 for anything time-sensitive; the contact form for a considered enquiry; Calendly for a 30-minute intro call.",
    },
];

export default function Faq() {
    useSEO({
        title: "FAQ — Working with Rajeev",
        description: "Common questions about working with Rajeev — engagement length, pricing, geography, NDAs, timelines, and process.",
        path: "/faq",
        keywords: ["freelancer faq", "how to hire freelancer", "freelancer pricing"],
        structuredData: [faqSchema(FAQS)],
    });
    return (
        <>
            <PageHeader
                eyebrow="/ FAQ"
                title="Questions"
                italic="answered."
                subtitle="The most common questions I get from prospective clients. Missing one? Ask directly."
            />
            <section className="pb-16">
                <div className="max-w-[1000px] mx-auto px-6 md:px-10 divide-y divide-white/10">
                    {FAQS.map((f, i) => (
                        <RevealUp key={f.q} delay={i * 0.04}>
                            <div className="py-10 grid grid-cols-12 gap-6">
                                <div className="col-span-12 md:col-span-1 font-mono text-acid text-lg">0{i + 1}</div>
                                <div className="col-span-12 md:col-span-11">
                                    <h3 className="font-serif text-bone text-2xl md:text-3xl tracking-tight mb-4">{f.q}</h3>
                                    <p className="text-ash text-base md:text-lg leading-relaxed max-w-2xl">{f.a}</p>
                                </div>
                            </div>
                        </RevealUp>
                    ))}
                </div>
            </section>
            <CTAStrip title="Still curious?" />
        </>
    );
}
