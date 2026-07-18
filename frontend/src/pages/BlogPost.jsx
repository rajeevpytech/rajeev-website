import React from "react";
import { useParams, Navigate } from "react-router-dom";
import { Clock, MessageCircle, ArrowUpRight } from "lucide-react";
import { PageHeader, CTAStrip } from "@/components/site/PageHeader";
import { RevealUp } from "@/components/motion/Reveal";
import { posts } from "@/components/site/Blog";
import useSEO from "@/hooks/useSEO";
import { waUrl, WA_MESSAGES } from "@/lib/whatsapp";

// Longer body content for each post
const BODIES = {
    "senior-freelance-playbook": [
        "The single biggest mistake most freelancers make is trying to be a smaller version of an agency. You'll never win on price, you'll never win on volume, and — worst of all — you'll trade the one thing you actually have: judgement.",
        "This is my rough playbook: pick one buyer, one problem, and one price band. Own the outcome, and be visible enough that the right people find you at the right time. That's the whole game.",
        "I turn down more work than I take. That's not a flex — it's the operating principle. When you can afford to say no, the yes gets much better.",
    ],
    "rag-for-real": [
        "Every RAG demo looks impressive. Every RAG production system looks boring. That gap is where the real engineering lives — evaluation harnesses, guardrails, and enough plumbing to make the answers reliable at 3 AM.",
        "I've deployed four RAG systems into enterprise environments. Here's what actually mattered: source-of-truth curation, aggressive chunking discipline, and a hard cap on model creativity.",
        "The models keep getting better. The plumbing does not get any easier.",
    ],
    "seo-in-the-llm-era": [
        "The obituary was premature. SEO is not dead — it's just being written in a different language. That language is entities, topical depth, and being the source LLMs cite.",
        "The tactics have changed. Keyword stuffing was always crude, but now it's actively counterproductive: LLMs synthesise across entities, so being genuinely knowledgeable about a topic is worth more than being narrowly optimised for a query.",
        "What still works: structural clarity, canonical schema, and content that answers the actual question. Everything else is theatre.",
    ],
};

export default function BlogPost() {
    const { slug } = useParams();
    const post = posts.find((p) => p.slug === slug);
    useSEO({
        title: post ? `${post.title} — Journal · Rajeev` : "Post · Rajeev",
        description: post?.excerpt || "",
        path: `/blog/${slug}`,
    });

    if (!post) return <Navigate to="/blog" replace />;
    const body = BODIES[slug] || [post.excerpt];

    return (
        <>
            <PageHeader
                back={{ to: "/blog", label: "Back to Journal" }}
                eyebrow={`/ Journal — ${post.tag}`}
                title={post.title}
            />

            <section className="pb-20">
                <div className="max-w-[1040px] mx-auto px-6 md:px-10">
                    <RevealUp>
                        <div className="flex items-center gap-4 font-mono text-[11px] tracking-[0.22em] uppercase text-ash mb-10">
                            <span className="inline-flex items-center gap-2"><Clock size={12} /> {post.read}</span>
                            <span>By Rajeev</span>
                        </div>
                    </RevealUp>

                    <RevealUp delay={0.05}>
                        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden frame">
                            <img src={post.image} alt={post.title} className="w-full h-full object-cover" style={{ filter: "brightness(0.9)" }} />
                        </div>
                    </RevealUp>

                    <article className="mt-14 space-y-8 text-ash text-lg leading-relaxed">
                        {body.map((p, i) => (
                            <RevealUp key={i} delay={0.05 + i * 0.05}>
                                <p>{p}</p>
                            </RevealUp>
                        ))}
                    </article>

                    <RevealUp delay={0.3}>
                        <div className="mt-16 pt-10 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                            <p className="font-serif italic text-bone text-2xl">Enjoyed this? Working on something similar?</p>
                            <a
                                href={waUrl(WA_MESSAGES.blog(post.title))}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-acid"
                                data-testid="blog-post-wa"
                            >
                                <MessageCircle size={14} strokeWidth={2.2} /> Say hello on WhatsApp <ArrowUpRight size={14} strokeWidth={2.4} />
                            </a>
                        </div>
                    </RevealUp>
                </div>
            </section>

            <CTAStrip title="Reading is nice. Shipping is better." waMessage={WA_MESSAGES.blog(post.title)} />
        </>
    );
}
