import React from "react";
import Blog from "@/components/site/Blog";
import { PageHeader, CTAStrip } from "@/components/site/PageHeader";
import useSEO from "@/hooks/useSEO";

export default function BlogPage() {
    useSEO({
        title: "Journal — Field Notes by Rajeev",
        description: "Long-form thinking on engineering, marketing, and the operator's craft.",
        path: "/blog",
    });
    return (
        <>
            <PageHeader
                eyebrow="/ Journal"
                title="Long-form thinking,"
                italic="short-form time."
                subtitle="A slow-burning journal of case studies, teardowns, and the occasional rant. No newsletters — just the writing."
            />
            <Blog />
            <CTAStrip title="Have an idea worth writing up?" note="I read every email." />
        </>
    );
}
