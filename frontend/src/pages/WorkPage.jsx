import React, { useEffect, useState } from "react";
import axios from "axios";
import Work from "@/components/site/Work";
import Badges from "@/components/site/Badges";
import { PageHeader, CTAStrip } from "@/components/site/PageHeader";
import useSEO from "@/hooks/useSEO";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function WorkPage() {
    useSEO({
        title: "Case Studies — Rajeev Freelancer",
        description: "Selected client work: engineering, marketing, and the projects that sit somewhere in between.",
        path: "/work",
    });
    const [projects, setProjects] = useState([]);
    useEffect(() => { axios.get(`${API}/content`).then((r) => setProjects(r.data.projects || [])).catch(() => {}); }, []);

    return (
        <>
            <PageHeader
                eyebrow="/ Case Studies"
                title="Twelve years,"
                italic="condensed."
                subtitle="A curated cross-section of client work — from Layer-1 blockchain UIs to seven-figure paid growth engines."
            />
            <Work projects={projects} sectionNumber="—" />
            <Badges />
            <CTAStrip title="Have a project like these?" />
        </>
    );
}
