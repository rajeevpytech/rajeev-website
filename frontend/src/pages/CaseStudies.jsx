import Link from "@/components/CanonicalLink";
import { bootstrapData } from "@/seo/bootstrap";
import { useState, useEffect } from "react";

import { ArrowUpRight, TrendingUp, Search } from "lucide-react";
import Seo from "@/components/Seo";
import { Reveal, MaskLines } from "@/components/Reveal";
import TiltCard from "@/components/TiltCard";
import { CASE_STUDIES, CS_CATEGORIES, fetchCaseStudies } from "@/data/caseStudies";
import { canonicalBase, breadcrumbSchema } from "@/lib/siteConfig";
import { projectLabel } from "@/lib/portfolio";

export default function CaseStudies() {
  const base = canonicalBase();
  const [active, setActive] = useState("All");
  const [industry, setIndustry] = useState("");
  const [service, setService] = useState("");
  const [query, setQuery] = useState("");
  const [all, setAll] = useState(() => bootstrapData("cases")?.items || CASE_STUDIES);
  useEffect(() => { fetchCaseStudies().then(setAll); }, []);
  const industries = [...new Set(all.map(c => c.industry).filter(Boolean))].sort();
  const services = [...new Set(all.flatMap(c => c.services || []).filter(s => typeof s === "string"))].sort();
  const serviceName = projectLabel;
  const filtered = all.filter(c => (active === "All" || c.category === active) && (!industry || c.industry === industry) && (!service || c.services?.includes(service)) && (!query.trim() || `${c.title} ${c.industry} ${c.excerpt} ${c.client_name || ""}`.toLowerCase().includes(query.trim().toLowerCase())));
  const jsonLd = [
    breadcrumbSchema([
      { name: "Home", path: "" },
      { name: "Case Studies", path: "/case-studies" },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Case Studies — Rajeev Freelancer",
      url: `${base}/case-studies`,
      hasPart: all.map((c) => ({
        "@type": "CreativeWork",
        name: c.title,
        url: `${base}/case-studies/${c.slug}`,
        about: c.industry,
      })),
    },
  ];

  return (
    <div>
      <Seo
        title="Case Studies — Real Results with Numbers | Rajeev Freelancer"
        description="See how Rajeev delivered 3× organic traffic, 80% faster support and +52% conversion. Real freelance web, SEO, AI and automation case studies with the numbers."
        path="/case-studies"
        jsonLd={jsonLd}
      />

      <section className="mx-auto max-w-[1400px] px-5 md:px-10 pt-32 md:pt-40 pb-14">
        <p className="overline flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5 text-brand" /> / Case studies</p>
        <h1 className="mt-6 font-heading font-extrabold tracking-tighter text-5xl sm:text-6xl lg:text-[4.6rem] leading-[0.9]">
          <MaskLines lines={["From challenge,", "to delivery."]} />
        </h1>
        <p className="mt-8 max-w-2xl text-lg text-ink/70 leading-relaxed">
          The work we delivered, from the first challenge to the finished experience. Explore the approach, project images and the services behind each engagement.
        </p>
        <div className="mt-10 flex flex-wrap gap-2" data-testid="case-study-filters">
          {CS_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActive(cat)}
              data-testid={`case-filter-${cat.toLowerCase()}`}
              aria-pressed={active === cat}
              className={`rounded-full border px-5 py-2 text-sm font-medium transition-colors duration-200 ${
                active === cat ? "border-ink bg-ink text-white" : "border-line bg-white text-ink/70 hover:border-ink hover:text-ink"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="mt-6 grid gap-4 rounded-2xl border border-line bg-white p-5 md:grid-cols-3">
          <label className="text-xs font-semibold text-ink/60">Search case studies<div className="relative mt-2"><Search className="absolute left-3 top-3 h-4 w-4 text-ink/40" /><input type="search" value={query} onChange={event => setQuery(event.target.value)} className="w-full rounded-lg border border-line py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand" placeholder="Project or client" /></div></label>
          <label className="text-xs font-semibold text-ink/60">Industry<select value={industry} onChange={event => setIndustry(event.target.value)} className="mt-2 w-full rounded-lg border border-line bg-white p-2.5 text-sm outline-none focus:border-brand"><option value="">All industries</option>{industries.map(value => <option key={value} value={value}>{projectLabel(value)}</option>)}</select></label>
          <label className="text-xs font-semibold text-ink/60">Service delivered<select value={service} onChange={event => setService(event.target.value)} className="mt-2 w-full rounded-lg border border-line bg-white p-2.5 text-sm outline-none focus:border-brand"><option value="">All services</option>{services.map(value => <option key={value} value={value}>{serviceName(value)}</option>)}</select></label>
        </div>
        <p className="mt-4 text-xs text-ink/50" aria-live="polite">{filtered.length} case {filtered.length === 1 ? "study" : "studies"} in this selection</p>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 md:px-10 pb-24 grid md:grid-cols-3 gap-4" data-testid="case-studies-grid">
        {filtered.length === 0 && <div className="col-span-full rounded-2xl border border-line bg-white p-10 text-center"><p className="text-ink/60">No case studies match these filters.</p><button type="button" onClick={() => { setActive("All"); setIndustry(""); setService(""); setQuery(""); }} className="mt-4 text-sm font-semibold text-brand">Show all case studies</button></div>}
        {filtered.map((c, i) => (
          <Reveal key={c.slug} delay={i * 0.08}>
            <TiltCard className="h-full">
              <Link
                to={`/case-studies/${c.slug}`}
                data-testid={`case-study-card-${c.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white hover:border-ink transition-[border-color] duration-300"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  {c.cover && <img src={c.cover} alt={c.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />}
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-ink backdrop-blur">{c.tag}</span>
                </div>
                <div className="flex flex-1 flex-col p-7">
                  {c.metric && <p className="font-heading text-5xl font-extrabold tracking-tighter text-brand">{c.metric}</p>}
                  {c.metricLabel && <p className="mt-1 text-sm text-ink/55">{c.metricLabel}</p>}
                  <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-brand">{c.industry}</p>
                  <h2 className="mt-5 font-heading text-xl font-bold tracking-tight leading-snug">{c.title}</h2>
                  <p className="mt-3 flex-1 text-sm text-ink/60 leading-relaxed line-clamp-3">{c.excerpt}</p>
                  <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink group-hover:text-brand transition-colors">
                    Read the case study <ArrowUpRight className="h-4 w-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            </TiltCard>
          </Reveal>
        ))}
      </section>
    </div>
  );
}
