import React, { useEffect, useState } from "react";
import axios from "axios";
import Hero from "@/components/site/Hero";
import EditorialMarquee from "@/components/site/EditorialMarquee";
import Manifesto from "@/components/site/Manifesto";
import Services from "@/components/site/Services";
import Work from "@/components/site/Work";
import Stats from "@/components/site/Stats";
import Testimonials from "@/components/site/Testimonials";
import Badges from "@/components/site/Badges";
import Blog from "@/components/site/Blog";
import { InlineCTA } from "@/components/site/MobileStickyBar";
import { WA_MESSAGES } from "@/lib/whatsapp";
import useSEO from "@/hooks/useSEO";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Home() {
    useSEO({
        title: "Rajeev — Senior Freelance Engineer & Marketer",
        description:
            "12+ years shipping software, campaigns, and revenue. Ex-IOG, Accenture, Google. Senior-only freelance engagements. Book a call or start a project.",
        path: "/",
    });
    const [content, setContent] = useState({ projects: [], testimonials: [], stats: [], experience: [] });

    useEffect(() => {
        axios.get(`${API}/content`).then((r) => setContent(r.data)).catch(() => {});
    }, []);

    return (
        <>
            <Hero />
            <EditorialMarquee />
            <Manifesto />
            <InlineCTA label="Skip the manifesto. Start the conversation." message={WA_MESSAGES.hire} testid="home-cta-after-manifesto" />
            <Services />
            <InlineCTA label="Not sure which service? Ask directly." message={WA_MESSAGES.quote} testid="home-cta-after-services" />
            <Work projects={content.projects} limit={4} />
            <Stats items={content.stats} />
            <Testimonials items={content.testimonials} />
            <Badges />
            <InlineCTA label="Ready to build something like these?" message={WA_MESSAGES.hire} testid="home-cta-after-badges" />
            <Blog />
        </>
    );
}
