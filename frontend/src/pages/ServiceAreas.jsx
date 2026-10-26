import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowUpRight, ChevronLeft, ChevronRight, Globe, Loader2, MapPin, Search } from "lucide-react";
import Link from "@/components/CanonicalLink";
import Seo from "@/components/Seo";
import { api, formatApiErrorDetail } from "@/lib/api";
import { bootstrapData } from "@/seo/bootstrap";
import { breadcrumbSchema, canonicalBase, getSiteConfig } from "@/lib/siteConfig";

const PATH = "/service-areas";
const PAGE_SIZE = 24;
const FIELD = "mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";

export default function ServiceAreas() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const country = params.get("country") || "";
  const service = params.get("service") || "";
  const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);
  const [data, setData] = useState(() => bootstrapData("serviceAreas") || null);
  const [search, setSearch] = useState(q);
  const [selectedCountry, setSelectedCountry] = useState(country);
  const [selectedService, setSelectedService] = useState(service);
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const cfg = getSiteConfig();
  const base = canonicalBase();
  const filtered = Boolean(params.toString());

  useEffect(() => { setSearch(q); setSelectedCountry(country); setSelectedService(service); }, [q, country, service]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    api.get("/service-areas", { params: { q: q || undefined, country: country || undefined, service: service || undefined, page, page_size: PAGE_SIZE }, signal: controller.signal })
      .then(({ data: response }) => { setData(response); setLoading(false); })
      .catch(err => { if (controller.signal.aborted || err.code === "ERR_CANCELED") return; setData(null); setLoading(false); setError(formatApiErrorDetail(err.response?.data?.detail) || "The location directory could not be loaded. Please try again."); });
    return () => controller.abort();
  }, [q, country, service, page, refresh]);

  const searchLocations = event => {
    event.preventDefault();
    const next = new URLSearchParams();
    if (search.trim()) next.set("q", search.trim());
    if (selectedCountry) next.set("country", selectedCountry);
    const chosen = selectedService || data?.filters?.service;
    if (chosen) next.set("service", chosen);
    setParams(next);
  };
  const pagePath = number => {
    const next = new URLSearchParams(params);
    if (number === 1) next.delete("page"); else next.set("page", String(number));
    return PATH + (next.toString() ? `?${next}` : "");
  };
  const items = data?.items || [];
  const pagination = data?.pagination || { page, total: 0, total_pages: 0 };
  const services = data?.services || [];
  const selectedName = services.find(item => item.slug === (data?.filters?.service || selectedService))?.name;
  const description = "Browse locations for remote website, app, software, SEO, marketing and AI projects with Rajeev in India. Discuss scope, delivery and meeting times.";
  const schema = [breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Service areas", path: PATH }]), {
    "@context": "https://schema.org", "@type": "CollectionPage", "@id": `${base}${PATH}#webpage`, url: `${base}${PATH}`,
    name: "Remote services for businesses worldwide", description, inLanguage: "en", isPartOf: { "@id": `${base}/#website` },
    mainEntity: { "@type": "ItemList", numberOfItems: items.length, itemListElement: items.filter(item => item.path).map((item, index) => ({ "@type": "ListItem", position: index + 1, name: `${item.city}, ${item.country}`, url: `${base}${item.path}` })) },
  }];

  return <div>
    <Seo title={`Worldwide Remote Service Areas | ${cfg.seo.site_name}`} description={description} path={PATH} noindex={filtered} jsonLd={schema} />
    {filtered && <Helmet><link rel="canonical" href={`${base}${PATH}`} /></Helmet>}
    <section className="mx-auto max-w-[1400px] px-5 md:px-10 pt-32 md:pt-40 pb-12">
      <p className="overline inline-flex items-center gap-2"><Globe className="h-4 w-4 text-brand" /> / Remote service areas</p>
      <h1 className="mt-6 max-w-4xl font-heading font-extrabold tracking-tighter text-4xl sm:text-5xl lg:text-6xl leading-[0.95]">Remote services for businesses worldwide</h1>
      <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink/70">Explore website development, apps, SEO and automation for businesses around the world. Projects are coordinated from India and delivered remotely, with a clear scope and agreed communication times.</p>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink/60">The places below describe where clients can work with us remotely. They do not represent local offices or an on-site service in every city.</p>
      <Link to="/contact" className="mt-7 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 font-medium text-white hover:bg-ink">Discuss your project <ArrowUpRight className="h-4 w-4" /></Link>
      <Link to="/project-brief" className="ml-4 mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand underline underline-offset-4">Build a project brief</Link>
    </section>
    <section className="mx-auto max-w-[1400px] px-5 md:px-10 pb-20" aria-busy={loading}>
      <form action={PATH} method="get" onSubmit={searchLocations} data-testid="service-areas-search" className="grid items-end gap-4 rounded-2xl border border-line bg-paper/50 p-5 md:grid-cols-[1fr_1fr_1fr_auto]">
        <label className="text-xs font-semibold text-ink/70">City or town<input name="q" value={search} onChange={event => setSearch(event.target.value)} maxLength={120} placeholder="Search a place" className={FIELD} /></label>
        <label className="text-xs font-semibold text-ink/70">Country<select name="country" value={selectedCountry} onChange={event => setSelectedCountry(event.target.value)} className={FIELD}><option value="">All countries</option>{(data?.countries || []).map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-ink/70">Service<select name="service" value={selectedService || data?.filters?.service || ""} onChange={event => setSelectedService(event.target.value)} className={FIELD}>{!services.length && <option value="">Loading services…</option>}{services.map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-medium text-white hover:bg-brand"><Search className="h-4 w-4" /> Search</button>
      </form>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><h2 className="font-heading text-xl font-bold">{selectedName || "Locations"}</h2><div className="flex items-center gap-4 text-sm text-ink/60">{data && <span>{Number(pagination.total || 0).toLocaleString()} locations</span>}{filtered && <Link to={PATH} className="text-brand underline underline-offset-4">Clear filters</Link>}</div></div>
      {loading && <p className="mt-5 flex items-center gap-2 text-sm text-ink/60" role="status"><Loader2 className="h-4 w-4 animate-spin" /> Loading locations…</p>}
      {error && <div className="mt-6 rounded-xl border border-line p-5" role="alert"><p className="text-sm text-ink/70">{error}</p><button type="button" onClick={() => setRefresh(value => value + 1)} className="mt-3 text-sm font-medium text-brand underline">Try again</button></div>}
      {!error && <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="service-areas-grid">{items.map(item => <article key={`${item.service_slug || data?.filters?.service}-${item.loc_slug}`} className="flex flex-col rounded-2xl border border-line bg-white p-6"><p className="flex items-start gap-2 text-sm text-ink/55"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />{item.country}</p><h3 className="mt-3 font-heading text-xl font-bold">{item.path ? <Link to={item.path} className="hover:text-brand">{item.city}</Link> : item.city}</h3><p className="mt-3 text-sm leading-relaxed text-ink/65">{services.find(option => option.slug === item.service_slug)?.name || selectedName || "Digital project services"} for clients in {item.city}, delivered remotely from India.</p><p className="mt-4 text-xs font-medium text-ink/50">Remote collaboration · Agreed project milestones</p>{item.path && <Link to={item.path} className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand">Explore services <ArrowUpRight className="h-4 w-4" /></Link>}</article>)}</div>}
      {!loading && !error && !items.length && <p className="mt-6 rounded-xl border border-line p-6 text-sm text-ink/60">No locations match these filters. Try another place or country.</p>}
      {data && pagination.total_pages > 1 && <nav aria-label="Location pages" className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6"><span className="text-sm text-ink/55">Page {pagination.page} of {pagination.total_pages}</span><div className="flex items-center gap-3">{pagination.page > 1 ? <Link to={pagePath(pagination.page - 1)} className="inline-flex items-center gap-1 rounded-full border border-line px-4 py-2 text-sm hover:border-ink"><ChevronLeft className="h-4 w-4" /> Previous</Link> : <span className="px-4 py-2 text-sm text-ink/30" aria-disabled="true">Previous</span>}{pagination.page < pagination.total_pages ? <Link to={pagePath(pagination.page + 1)} className="inline-flex items-center gap-1 rounded-full border border-line px-4 py-2 text-sm hover:border-ink">Next <ChevronRight className="h-4 w-4" /></Link> : <span className="px-4 py-2 text-sm text-ink/30" aria-disabled="true">Next</span>}</div></nav>}
      <p className="mt-10 text-xs leading-relaxed text-ink/45">Additional geographic names: <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer" className="underline">GeoNames</a>, licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline">CC BY 4.0</a>.</p>
    </section>
  </div>;
}
