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
import TrustedBrands from "@/components/site/TrustedBrands";
import { InlineCTA } from "@/components/site/MobileStickyBar";
import { WA_MESSAGES } from "@/lib/whatsapp";
import useSEO, { orgSchema, personSchema, websiteSchema } from "@/hooks/useSEO";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Home() {
    useSEO({
        title: "Senior Freelance Engineer & Marketer",
        description:
            "Hire Rajeev — a senior freelance engineer & digital marketer with 12+ years of experience. Web development, software engineering, digital marketing & SEO. Ex-IOG, Accenture, Google. Available worldwide.",
        path: "/",
        keywords: ["hire freelancer", "senior freelance developer", "freelance digital marketer", "web development freelancer", "seo consultant"],
        structuredData: [websiteSchema(), personSchema(), orgSchema()],
    });
    const [content, setContent] = useState({ projects: [], testimonials: [], stats: [], experience: [] });
    useEffect(() => { axios.get(`${API}/content`).then((r) => setContent(r.data)).catch(() => {}); }, []);

    return (
        <>
            <Hero />
            <Stats items={content.stats} />
            <TrustedBrands />
            <EditorialMarquee />
            <Manifesto />
            <InlineCTA label="Skip the manifesto. Start the conversation." message={WA_MESSAGES.hire} testid="home-cta-after-manifesto" />
            <Services />
            <InlineCTA label="Not sure which service? Ask directly." message={WA_MESSAGES.quote} testid="home-cta-after-services" />
            <Work projects={content.projects} limit={4} />
            <Testimonials items={content.testimonials} />
            <Badges />
            <InlineCTA label="Ready to build something like these?" message={WA_MESSAGES.hire} testid="home-cta-after-badges" />
            <Blog />
        </>
    );
}
