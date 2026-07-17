import React, { useEffect, useState } from "react";
import axios from "axios";
import { Toaster } from "sonner";
import useLenis from "@/hooks/useLenis";
import Navbar from "@/components/site/Navbar";
import Hero from "@/components/site/Hero";
import EditorialMarquee from "@/components/site/EditorialMarquee";
import Manifesto from "@/components/site/Manifesto";
import Services from "@/components/site/Services";
import Work from "@/components/site/Work";
import Stats from "@/components/site/Stats";
import Experience from "@/components/site/Experience";
import Testimonials from "@/components/site/Testimonials";
import Badges from "@/components/site/Badges";
import Blog from "@/components/site/Blog";
import Contact from "@/components/site/Contact";
import Footer from "@/components/site/Footer";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Home() {
    useLenis();
    const [content, setContent] = useState({ projects: [], testimonials: [], stats: [], experience: [] });

    useEffect(() => {
        axios.get(`${API}/content`)
            .then((r) => setContent(r.data))
            .catch((e) => console.warn("content load failed", e));
    }, []);

    return (
        <div className="grain-overlay relative">
            <Toaster theme="dark" position="bottom-right" richColors />
            <Navbar />
            <main>
                <Hero />
                <EditorialMarquee />
                <Manifesto />
                <Services />
                <Work projects={content.projects} />
                <Stats items={content.stats} />
                <Experience items={content.experience} />
                <Testimonials items={content.testimonials} />
                <Badges />
                <Blog />
                <Contact />
            </main>
            <Footer />
        </div>
    );
}
