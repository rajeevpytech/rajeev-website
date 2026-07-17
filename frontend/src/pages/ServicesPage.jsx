import React from "react";
import Services from "@/components/site/Services";
import { PageHeader, CTAStrip } from "@/components/site/PageHeader";
import useSEO from "@/hooks/useSEO";

export default function ServicesPage() {
    useSEO({
        title: "Services — Web, Software, Marketing, SEO · Rajeev Freelancer",
        description:
            "Four services, one senior operator: Web Development, Software Engineering, Digital Marketing, SEO & Consulting.",
        path: "/services",
    });
    return (
        <>
            <PageHeader
                eyebrow="/ Services"
                title="Four disciplines,"
                italic="one operator."
                subtitle="Most freelancers pick a lane. I've spent a career building the whole vehicle — startups don't have the luxury of specialists."
            />
            <Services sectionNumber="—" />
            <CTAStrip title="Not sure which one you need?" note="Send a two-line brief and I'll help scope it." />
        </>
    );
}
