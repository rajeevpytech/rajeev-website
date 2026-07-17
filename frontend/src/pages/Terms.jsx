import React from "react";
import { PageHeader, CTAStrip } from "@/components/site/PageHeader";
import { RevealUp } from "@/components/motion/Reveal";
import useSEO from "@/hooks/useSEO";

const SECTIONS = [
    { title: "1. Scope", body: "These terms govern any engagement between Rajeev Freelancer (\"the freelancer\") and any client (\"you\") arising from enquiries made via rajeevfreelancer.com. A separate written statement of work will always accompany a paid engagement." },
    { title: "2. Deliverables", body: "The freelancer will deliver the scope as agreed in the written statement of work. Any change of scope will be quoted separately in writing before work continues." },
    { title: "3. Payments", body: "Unless otherwise agreed, engagements are billed 50% upfront and 50% on delivery, or monthly for retainers. Invoices are due within 14 days. Late payments accrue interest at 2% per month." },
    { title: "4. Intellectual property", body: "On full payment, all deliverables and their IP transfer to you, except for third-party libraries and the freelancer's pre-existing tooling, which remain the freelancer's property under a perpetual licence." },
    { title: "5. Confidentiality", body: "The freelancer treats all client information as confidential. A mutual NDA can be signed on request." },
    { title: "6. Limitation of liability", body: "Total liability for any engagement is limited to the fees paid for that engagement over the preceding twelve months." },
    { title: "7. Termination", body: "Either party may terminate an engagement with 14 days written notice. Work delivered up to the termination date is billed pro-rata." },
    { title: "8. Governing law", body: "These terms are governed by the laws of India, with disputes resolved in the courts of Bengaluru." },
];

export default function Terms() {
    useSEO({
        title: "Terms of Service — Rajeev Freelancer",
        description: "The terms that govern freelance engagements with Rajeev.",
        path: "/terms",
    });
    return (
        <>
            <PageHeader
                eyebrow="/ Legal"
                title="Terms of"
                italic="service."
                subtitle="The short, human version. A signed statement of work always takes precedence."
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
            <CTAStrip />
        </>
    );
}
