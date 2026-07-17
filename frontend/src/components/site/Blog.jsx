import React from "react";
import { ArrowUpRight, Clock } from "lucide-react";
import { RevealUp } from "@/components/motion/Reveal";
import { BLOG } from "@/constants/testIds";

const posts = [
    {
        slug: "senior-freelance-playbook",
        title: "How I run a senior-only freelance practice in 2025",
        excerpt: "Positioning, pricing, and how I say 'no' more than I say 'yes'.",
        read: "8 min read",
        tag: "Playbook",
        image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
    },
    {
        slug: "rag-for-real",
        title: "RAG for real: what actually ships in enterprise",
        excerpt: "A field note from four RAG deployments — evaluation, guardrails, and boring plumbing.",
        read: "12 min read",
        tag: "Engineering",
        image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
    },
    {
        slug: "seo-in-the-llm-era",
        title: "SEO in the LLM era isn't dead — it's just quieter",
        excerpt: "What changed, what didn't, and why entity SEO now matters more than keywords.",
        read: "6 min read",
        tag: "Marketing",
        image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
    },
];

export default function Blog() {
    return (
        <section data-testid={BLOG.root} className="relative py-24 md:py-40 bg-ink">
            <div className="max-w-[1440px] mx-auto px-6 md:px-10">
                <div className="grid grid-cols-12 gap-6 md:gap-10 items-end mb-12 md:mb-16">
                    <RevealUp className="col-span-12 md:col-span-7">
                        <p className="eyebrow mb-6">/ 006 — Field notes</p>
                        <h2 className="font-serif text-bone text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-tight">
                            Long-form thinking, <span className="italic text-ash">short-form time.</span>
                        </h2>
                    </RevealUp>
                    <RevealUp delay={0.1} className="col-span-12 md:col-span-5">
                        <p className="text-ash text-base md:text-lg leading-relaxed">
                            A slow-burning journal of case studies, teardowns, and the odd rant.
                            No newsletters — just the writing.
                        </p>
                    </RevealUp>
                </div>

                <div className="grid grid-cols-12 gap-4 md:gap-6">
                    {posts.map((p, i) => (
                        <RevealUp key={p.slug} delay={i * 0.08} className={`col-span-12 ${i === 0 ? "md:col-span-6 md:row-span-2" : "md:col-span-6"}`}>
                            <a
                                data-testid={BLOG.card(p.slug)}
                                href="#"
                                className="group frame rounded-2xl overflow-hidden block h-full"
                            >
                                <div className={`relative overflow-hidden ${i === 0 ? "aspect-[16/12]" : "aspect-[16/8]"}`}>
                                    <img src={p.image} alt={p.title} className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.05]" style={{ filter: "brightness(0.85)" }} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-ink to-transparent" />
                                    <span className="absolute top-4 left-4 tag !bg-ink/60">{p.tag}</span>
                                </div>
                                <div className="p-6 md:p-8">
                                    <h3 className={`font-serif text-bone tracking-tight leading-tight ${i === 0 ? "text-3xl md:text-4xl" : "text-2xl"}`}>
                                        {p.title}
                                    </h3>
                                    <p className="mt-3 text-ash text-base leading-relaxed max-w-lg">{p.excerpt}</p>
                                    <div className="mt-5 flex items-center justify-between">
                                        <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-ash inline-flex items-center gap-2">
                                            <Clock size={12} /> {p.read}
                                        </span>
                                        <ArrowUpRight className="text-ash group-hover:text-acid transition-colors" size={18} />
                                    </div>
                                </div>
                            </a>
                        </RevealUp>
                    ))}
                </div>
            </div>
        </section>
    );
}
