import React, { useEffect, useState } from "react";
import axios from "axios";
import Experience from "@/components/site/Experience";
import Stats from "@/components/site/Stats";
import { PageHeader, CTAStrip } from "@/components/site/PageHeader";
import useSEO from "@/hooks/useSEO";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Journey() {
    useSEO({
        title: "Career Journey — Rajeev Freelancer",
        description: "From IOG to Accenture to Google — and six years running an independent senior-only practice.",
        path: "/journey",
    });
    const [content, setContent] = useState({ stats: [], experience: [] });
    useEffect(() => { axios.get(`${API}/content`).then((r) => setContent(r.data)).catch(() => {}); }, []);

    return (
        <>
            <PageHeader
                eyebrow="/ Journey"
                title="From Gurgaon"
                italic="to global — the long way."
                subtitle="Twelve years, four continents, and one professional through-line: doing serious work for serious people."
            />
            <Stats items={content.stats} />
            <Experience items={content.experience} />
            <CTAStrip title="Curious what's next?" />
        </>
    );
}
