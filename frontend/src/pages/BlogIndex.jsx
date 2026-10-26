import Link from "@/components/CanonicalLink";
import { bootstrapData } from "@/seo/bootstrap";
import { useEffect, useState } from "react";

import { ArrowUpRight, Loader2 } from "lucide-react";
import Seo from "@/components/Seo";
import { Reveal } from "@/components/Reveal";
import { api } from "@/lib/api";

export default function BlogIndex() {
  const [data, setData] = useState(() => bootstrapData("blogIndex") || null);
  const [cat, setCat] = useState("");

  useEffect(() => {
    api.get("/blog").then(({ data }) => setData(data)).catch(() => setData({ posts: [], categories: [] }));
  }, []);

  const posts = data?.posts?.filter((p) => !cat || p.category === cat) || [];

  return (
    <div>
      <Seo title="Insights, Case Studies & Articles | Rajeev Freelancer" description="Practical articles and case studies on SEO, GEO, AI automation, web development and growth — written by Rajeev, a senior freelance consultant." path="/blog" />
      <section className="mx-auto max-w-[1400px] px-5 md:px-10 pt-32 md:pt-40 pb-10">
        <p className="overline">/ Insights</p>
        <h1 className="mt-5 max-w-3xl font-heading font-extrabold tracking-tighter text-5xl sm:text-6xl lg:text-[4.4rem] leading-[0.9]">Notes on SEO, AI &amp; growth.</h1>
        <p className="mt-6 max-w-2xl text-lg text-ink/70 leading-relaxed">Real lessons from twelve years of shipping — no fluff, no recycled listicles.</p>
        {data?.categories?.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2" data-testid="blog-filters">
            <button onClick={() => setCat("")} className={`rounded-full border px-4 py-1.5 text-sm ${!cat ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}>All</button>
            {data.categories.map((c) => (
              <button key={c} data-testid={`blog-filter-${c}`} onClick={() => setCat(c)} className={`rounded-full border px-4 py-1.5 text-sm ${cat === c ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}>{c}</button>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-[1400px] px-5 md:px-10 pb-24">
        {!data ? (
          <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="blog-grid">
            {posts.map((p, i) => (
              <Reveal key={p.slug} delay={(i % 3) * 0.06}>
                <Link to={`/blog/${p.slug}`} data-testid={`blog-card-${p.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white hover:border-ink hover:-translate-y-1 transition-[transform,border-color] duration-300">
                  <div className="aspect-[16/10] overflow-hidden bg-paper">
                    <img src={p.cover_image && p.cover_image.startsWith("/") ? `${process.env.REACT_APP_BACKEND_URL}${p.cover_image}` : p.cover_image} alt={p.title} loading="lazy" decoding="async" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <span className="font-mono text-xs uppercase tracking-wide text-brand">{p.category}{p.featured ? " · ★ Featured" : ""}</span>
                    <h2 className="mt-3 font-heading text-xl font-bold tracking-tight leading-snug">{p.title}</h2>
                    <p className="mt-2 text-sm text-ink/60 leading-relaxed line-clamp-3">{p.excerpt}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-ink/80 group-hover:text-brand">Read <ArrowUpRight className="h-4 w-4" /></span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
