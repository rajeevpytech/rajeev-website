import React from "react";
import Contact from "@/components/site/Contact";
import { PageHeader } from "@/components/site/PageHeader";
import useSEO from "@/hooks/useSEO";

export default function ContactPage() {
    useSEO({
        title: "Contact — Rajeev Freelancer",
        description: "Start a project, book a call, or ping on WhatsApp. Reply within 24 hours.",
        path: "/contact",
    });
    return (
        <>
            <PageHeader
                eyebrow="/ Contact"
                title="Let's"
                italic="talk."
                subtitle="Tell me about your project and I'll reply within 24 hours with an honest read on fit, timeline, and price."
            />
            <Contact hideHeader />
        </>
    );
}
