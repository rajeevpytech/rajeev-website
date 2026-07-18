import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { PageHeader, CTAStrip } from "@/components/site/PageHeader";
import { RevealUp } from "@/components/motion/Reveal";
import useSEO from "@/hooks/useSEO";
import { waUrl, WA_MESSAGES } from "@/lib/whatsapp";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CaseStudy() {
    const { slug } = useParams();
    const [projects, setProjects] = useState([]);
    useEffect(() => { axios.get(`${API}/content`).then((r) => setProjects(r.data.projects || [])).catch(() => {}); }, []);
    const p = projects.find((x) => x.slug === slug);

    useSEO({
        title: p ? `${p.title} — Case Study · Rajeev Freelancer` : "Case Study · Rajeev Freelancer",
        description: p?.subtitle || "",
        path: `/work/${slug}`,
    });

    return (
        <>
            <PageHeader
                back={{ to: "/work", label: "All case studies" }}
                eyebrow={`/ Case Study — ${p?.category || ""}`}
                title={p?.title || "Case study"}
                subtitle={p?.subtitle}
            />

            {p && (
                <section className="pb-16">
                    <div className="max-w-[1440px] mx-auto px-6 md:px-10">
                        <RevealUp>
                            <div className="relative aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden frame">
                                <img src={p.image} alt={p.title} className="w-full h-full object-cover" style={{ filter: "brightness(0.9)" }} />
                                <div className="absolute inset-0 bg-gradient-to-t from-ink to-transparent" />
                                {p.metric && (
                                    <span className="absolute top-6 left-6 tag !border-acid/40 !text-acid !bg-acid/5">{p.metric}</span>
                                )}
                            </div>
                        </RevealUp>

                        <div className="grid grid-cols-12 gap-6 md:gap-16 mt-14">
                            <RevealUp delay={0.05} className="col-span-12 md:col-span-8">
                                <p className="eyebrow mb-6">/ The brief</p>
                                <p className="font-serif text-bone text-2xl md:text-3xl leading-snug tracking-tight max-w-2xl">
                                    {p.subtitle} A senior operator was brought in to own the outcome end-to-end.
                                </p>

                                <p className="eyebrow mt-14 mb-6">/ Approach</p>
                                <div className="space-y-6 text-ash text-base md:text-lg leading-relaxed max-w-2xl">
                                    <p>
                                        The engagement started with a two-week discovery — audit, stakeholder interviews, and a
                                        prioritised roadmap. The goal wasn't features, it was clarity: what will move the metric,
                                        and what won't.
                                    </p>
                                    <p>
                                        Delivery ran as a single lane. No agency layer, no offshore relay. One senior
                                        operator, weekly ship, honest reports.
                                    </p>
                                    <p>
                                        The result — {p.metric ? <strong className="text-acid font-mono text-base tracking-wider">{p.metric}</strong> : "measurable, defensible improvement"} —
                                        held six months after handover.
                                    </p>
                                </div>
                            </RevealUp>

                            <RevealUp delay={0.1} className="col-span-12 md:col-span-4">
                                <div className="frame rounded-2xl p-8 sticky top-28 space-y-6">
                                    <div>
                                        <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash">Discipline</p>
                                        <p className="font-serif text-bone text-2xl mt-2">{p.category}</p>
                                    </div>
                                    <div>
                                        <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash">Year</p>
                                        <p className="font-serif text-bone text-2xl mt-2">{p.year}</p>
                                    </div>
                                    {p.metric && (
                                        <div>
                                            <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash">Outcome</p>
                                            <p className="font-serif text-acid text-3xl mt-2">{p.metric}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash mb-3">Stack</p>
                                        <div className="flex flex-wrap gap-2">
                                            {p.tags.map((t) => <span key={t} className="tag">{t}</span>)}
                                        </div>
                                    </div>
                                    <a
                                        href={waUrl(WA_MESSAGES.caseStudy(p.title))}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn-acid w-full justify-center"
                                        data-testid={`case-${slug}-wa`}
                                    >
                                        <MessageCircle size={14} strokeWidth={2.2} /> Similar project? <ArrowUpRight size={14} strokeWidth={2.4} />
                                    </a>
                                </div>
                            </RevealUp>
                        </div>
                    </div>
                </section>
            )}

            <CTAStrip waMessage={p ? WA_MESSAGES.caseStudy(p.title) : WA_MESSAGES.general} />
        </>
    );
}
