import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Layers3, Loader2, Search, X } from "lucide-react";
import Link from "@/components/CanonicalLink";
import Seo from "@/components/Seo";
import { WorkCard } from "@/components/WorkCard";
import { api } from "@/lib/api";
import { bootstrapData } from "@/seo/bootstrap";
import { breadcrumbSchema, canonicalBase } from "@/lib/siteConfig";
import { WORK_DESCRIPTION, WORK_TITLE, portfolioProject, workPagination } from "@/lib/portfolio";
import { getSiteConfig } from "@/lib/siteConfig";
import { emitJourneyEvent } from "@/lib/journeyTracking";

export default function WorkIndex() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("industry") || searchParams.get("category") || "";
  const service = searchParams.get("service") || "";
  const query = (searchParams.get("q") || "").trim().slice(0, 120);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const requestKey = `${category}|${service}|${query}|${page}`;
  const [view, setView] = useState(() => ({ key: requestKey, payload: bootstrapData("portfolio") || bootstrapData("portfolioIndex") || null }));
  const [draft, setDraft] = useState(query);
  const [loading, setLoading] = useState(!view.payload);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [taxonomy, setTaxonomy] = useState({ industries: [], services: [] });
  useEffect(() => {
    const controller = new AbortController();
    api.get("/portfolio/taxonomy", { signal: controller.signal }).then(({ data }) => setTaxonomy(data)).catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => { setDraft(query); }, [query]);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    api.get("/portfolio", { params: { industry: category || undefined, service: service || undefined, q: query || undefined, page, page_size: 12 }, signal: controller.signal })
      .then(({ data }) => { if (active) setView({ key: requestKey, payload: data }); })
      .catch(error => { if (active && error?.code !== "ERR_CANCELED") setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [category, service, query, page, requestKey, retry]);

  const payload = view.key === requestKey ? view.payload : null;
  const projects = useMemo(() => (payload?.items || []).map(portfolioProject), [payload]);
  const categories = payload?.industries || payload?.categories || view.payload?.categories || [];
  const industryOptions = taxonomy.industries?.length ? taxonomy.industries : categories;
  const serviceOptions = taxonomy.services?.length ? taxonomy.services : payload?.services || [];
  const pagination = workPagination(payload?.pagination, projects.length);
  const totalProjects = Number(payload?.total_projects ?? view.payload?.total_projects);
  const updateFilters = ({ nextCategory = category, nextService = service, nextQuery = query, nextPage = 1 } = {}) => {
    if (nextCategory !== category || nextService !== service || nextQuery !== query) {
      emitJourneyEvent(getSiteConfig(), "portfolio_filter", {
        industry: industryOptions.some(item => item.slug === nextCategory) ? nextCategory : "",
        service: serviceOptions.some(item => item.slug === nextService) ? nextService : "",
        has_search: Boolean(nextQuery.trim()),
      });
    }
    const params = new URLSearchParams();
    if (nextCategory) params.set("industry", nextCategory);
    if (nextService) params.set("service", nextService);
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextPage > 1) params.set("page", String(nextPage));
    setSearchParams(params);
  };
  const schema = [
    breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Project work", path: "/work" }]),
    { "@context": "https://schema.org", "@type": "CollectionPage", name: WORK_TITLE, description: WORK_DESCRIPTION, url: `${canonicalBase()}/work`,
      mainEntity: { "@type": "ItemList", itemListElement: projects.map((project, index) => ({ "@type": "ListItem", position: (page - 1) * 12 + index + 1, name: project.title, url: `${canonicalBase()}/work/${encodeURIComponent(project.slug)}` })) } },
  ];

  return <div className="bg-[#f8f9fb] text-[#122440]" data-testid="work-index">
    <Seo title={WORK_TITLE} description={WORK_DESCRIPTION} path="/work" noindex={searchParams.toString().length > 0} jsonLd={schema} />
    <section className="relative overflow-hidden border-b border-[#172b4d]/10 bg-[#f5f6f3] pt-28 sm:pt-32 md:pt-40">
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 top-16 h-96 w-96 rounded-full bg-[#0055ff]/[.055] blur-3xl" />
      <div className="relative mx-auto grid max-w-[1400px] gap-10 px-5 pb-14 md:px-10 md:pb-20 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
        <div>
          <nav aria-label="Breadcrumb" className="mb-9 flex items-center gap-2 text-xs text-[#64718a]"><Link to="/" className="hover:text-brand">Home</Link><span aria-hidden="true">/</span><span>Project work</span></nav>
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.23em] text-brand"><span className="h-1.5 w-1.5 rounded-full bg-brand" /> The project collection</p>
          <h1 className="mt-5 max-w-3xl font-heading text-5xl font-extrabold leading-[.98] tracking-tighter sm:text-6xl lg:text-[5.4rem]">The work,<br /><span className="text-brand">up close.</span></h1>
          <p className="mt-7 max-w-xl text-base leading-relaxed text-[#52617a] sm:text-lg">Websites, apps, business systems and automation we delivered. Find a project in your industry, see the work and open the live experience.</p>
        </div>
        <aside className="rounded-[22px] border border-[#172b4d]/10 bg-white/80 p-6 sm:p-7" aria-label="How to explore this collection">
          <div className="flex items-center gap-3"><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand"><Layers3 className="h-5 w-5" /></span><p className="font-heading text-xl font-bold tracking-tight">Find the right reference.</p></div>
          <ul className="mt-5 space-y-3 text-sm leading-relaxed text-[#52617a]">{["Filter by your industry and the services you need.", "See what we delivered and explore the live project.", "Tell us what you want to build next."].map(item => <li key={item} className="flex items-start gap-2.5"><Check className="mt-1 h-3.5 w-3.5 shrink-0 text-brand" /><span>{item}</span></li>)}</ul>
          <Link to="/project-brief" className="mt-6 inline-flex items-center gap-2 border-b border-brand/30 pb-1 text-xs font-semibold text-brand">Already have an idea? Build your brief <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </aside>
      </div>
    </section>

    <section id="project-collection" className="mx-auto max-w-[1400px] px-5 py-12 md:px-10 md:py-16" aria-label="Browse project work">
      <div className="flex flex-wrap items-center justify-between gap-6"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-brand">Explore the collection</p><h2 className="mt-2 font-heading text-2xl font-bold tracking-tight sm:text-3xl">Different industries. Work we delivered.</h2></div>{Number.isFinite(totalProjects) && <p className="text-sm text-[#64718a]"><span className="font-semibold text-[#122440]">{totalProjects}</span> projects to explore</p>}</div>
      <div className="mt-8 flex flex-col gap-5 rounded-[20px] border border-[#172b4d]/10 bg-white p-5 sm:p-6">
        <form onSubmit={event => { event.preventDefault(); updateFilters({ nextQuery: draft }); }} role="search" className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1"><label htmlFor="work-search" className="sr-only">Search projects</label><Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-[#78849a]" /><input id="work-search" type="search" value={draft} maxLength={120} onChange={event => setDraft(event.target.value)} placeholder="Search a name, industry or project…" className="w-full rounded-xl border border-[#172b4d]/15 bg-[#f8f9fb] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" /></div>
          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#122440] px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand">Search projects <ArrowRight className="h-4 w-4" /></button>
        </form>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-xs font-semibold text-[#52617a]">Industry
            <select data-testid="work-industry-filter" value={category} onChange={event => updateFilters({ nextCategory: event.target.value })} className="mt-2 w-full rounded-xl border border-[#172b4d]/15 bg-white px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"><option value="">All industries</option>{industryOptions.map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select>
          </label>
          <label className="block text-xs font-semibold text-[#52617a]">Service delivered
            <select data-testid="work-service-filter" value={service} onChange={event => updateFilters({ nextService: event.target.value })} className="mt-2 w-full rounded-xl border border-[#172b4d]/15 bg-white px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"><option value="">All services</option>{serviceOptions.map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select>
          </label>
        </div>
      </div>
      <div className="mt-7 flex min-h-6 flex-wrap items-center justify-between gap-3 text-xs text-[#64718a]" aria-live="polite"><p>{loading ? "Updating project selection…" : payload ? `${pagination.total} project${pagination.total === 1 ? "" : "s"} in this selection` : "Explore our delivered work below."}{query && !loading ? ` · Search: “${query}”` : ""}</p>{(query || category || service) && <button type="button" onClick={() => updateFilters({ nextCategory: "", nextService: "", nextQuery: "" })} className="inline-flex items-center gap-1.5 font-semibold text-brand"><X className="h-3.5 w-3.5" /> Clear filters</button>}</div>
      {error && <div className="mt-5 rounded-2xl border border-[#d7dfeb] bg-white p-6" role="alert"><p className="font-semibold">The collection could not be refreshed.</p><p className="mt-2 text-sm leading-relaxed text-[#64718a]">{payload ? "The previously loaded projects are still available below." : "Please try again, or contact Rajeev to discuss your project."}</p><button type="button" onClick={() => setRetry(value => value + 1)} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand">Try again <ArrowRight className="h-4 w-4" /></button></div>}
      <div className="mt-6" aria-busy={loading}>
        {projects.length > 0 ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" data-testid="work-grid">{projects.map((project, index) => <WorkCard key={project.slug} project={project} priority={index < 3} />)}</div>
          : loading ? <div className="flex min-h-64 items-center justify-center gap-3 rounded-[22px] border border-[#172b4d]/10 bg-white text-sm text-[#64718a]"><Loader2 className="h-5 w-5 animate-spin text-brand" /> Loading project previews…</div>
            : !error ? <div className="rounded-[22px] border border-[#172b4d]/10 bg-white px-6 py-16 text-center"><Search className="mx-auto h-7 w-7 text-brand" /><h3 className="mt-5 font-heading text-2xl font-bold">No projects match this selection.</h3><p className="mt-3 text-sm text-[#64718a]">Try another industry or service, or explore the full collection.</p><button type="button" onClick={() => updateFilters({ nextCategory: "", nextService: "", nextQuery: "" })} className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#172b4d]/15 px-5 py-3 text-sm font-semibold">View all projects <ArrowRight className="h-4 w-4" /></button></div> : null}
      </div>
      {payload && pagination.pages > 1 && <nav aria-label="Project pagination" className="mt-10 flex flex-wrap items-center justify-center gap-4"><button type="button" disabled={page <= 1 || loading} onClick={() => updateFilters({ nextPage: page - 1 })} className="inline-flex items-center gap-2 rounded-full border border-[#172b4d]/15 bg-white px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft className="h-4 w-4" /> Previous</button><span className="text-sm text-[#64718a]">Page {page} of {pagination.pages}</span><button type="button" disabled={page >= pagination.pages || loading} onClick={() => updateFilters({ nextPage: page + 1 })} className="inline-flex items-center gap-2 rounded-full border border-[#172b4d]/15 bg-white px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">Next <ArrowRight className="h-4 w-4" /></button></nav>}
    </section>
    <section className="bg-[#10233e] text-white"><div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-8 px-5 py-14 md:px-10 md:py-20 lg:flex-row lg:items-center"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-blue-300">A starting point for your own project</p><h2 className="mt-4 font-heading text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Like something you see?<br />Let's shape it around your business.</h2><p className="mt-4 max-w-xl text-sm leading-relaxed text-white/60">Share a reference, the work you need done and what matters most. Scope and delivery can then be agreed together.</p></div><Link to="/contact" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-semibold text-[#122440] transition hover:bg-blue-100">Discuss your project <ArrowUpRight className="h-4 w-4" /></Link></div></section>
  </div>;
}
