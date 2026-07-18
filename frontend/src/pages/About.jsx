import React, { useEffect, useState } from "react";
import axios from "axios";
import Manifesto from "@/components/site/Manifesto";
import Experience from "@/components/site/Experience";
import Stats from "@/components/site/Stats";
import Testimonials from "@/components/site/Testimonials";
import { PageHeader, CTAStrip } from "@/components/site/PageHeader";
import useSEO, { personSchema, breadcrumbSchema } from "@/hooks/useSEO";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function About() {
    useSEO({
        title: "About Rajeev — 12+ Years of Senior Freelance Work",
        description:
            "The story behind Rajeev Freelancer: 12 years shipping software and marketing across IOG, Accenture, Google, and six years as an independent senior operator.",
        path: "/about",
        keywords: ["about rajeev", "freelance developer bio", "senior freelance operator"],
        structuredData: [
            personSchema(),
            breadcrumbSchema([{ name: "Home", path: "/" }, { name: "About", path: "/about" }]),
        ],
    });
    const [content, setContent] = useState({ stats: [], experience: [], testimonials: [] });
    useEffect(() => { axios.get(`${API}/content`).then((r) => setContent(r.data)).catch(() => {}); }, []);

    return (
        <>
            <PageHeader
                eyebrow="/ About"
                title="The story behind"
                italic="the résumé."
                subtitle="I'm Rajeev — a senior engineer and marketer who's spent twelve years shipping software, campaigns, and revenue. This page is the long version of that story."
            />
            <Manifesto />
            <Stats items={content.stats} />
            <Experience items={content.experience} />
            <Testimonials items={content.testimonials} />
            <CTAStrip title="Think we might be a fit?" />
        </>
    );
}
