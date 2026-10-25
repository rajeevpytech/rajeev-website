import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Check, ExternalLink, Loader2, MessageCircle } from "lucide-react";
import Link from "@/components/CanonicalLink";
import Seo from "@/components/Seo";
import NotFound from "@/pages/NotFound";
import { WorkCard, ProjectPreview } from "@/components/WorkCard";
import { api } from "@/lib/api";
import { waLink } from "@/data/site";
import { breadcrumbSchema, canonicalBase } from "@/lib/siteConfig";
import { bootstrapData } from "@/seo/bootstrap";
import { portfolioProject, storyItems } from "@/lib/portfolio";

const SECTIONS = [
  ["scope", "01", "What we delivered"],
  ["process", "02", "How we approached the work"],
  ["delivery", "03", "From build to delivery"],
  ["handover", "04", "Handover & ongoing work"],
];
export default function WorkDetail() {
  const { slug } = useParams();
  const rawInitial = bootstrapData("portfolioProject") || bootstrapData("portfolioDetail") || bootstrapData("workProject");
  const initial = (rawInitial?.project?.slug || rawInitial?.slug) === slug ? rawInitial : null;
  const [view, setView] = useState(() => ({ slug, payload: initial?.project ? initial : initial?.slug === slug ? { project: initial, related: [] } : null }));
  const [status, setStatus] = useState(initial ? "ready" : "loading");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setStatus("loading");
    api.get(`/portfolio/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then(({ data }) => { if (active) { setView({ slug, payload: data }); setStatus("ready"); } })
      .catch(error => { if (active && error.code !== "ERR_CANCELED") setStatus(error.response?.status === 404 ? "missing" : "error"); });
    return () => { active = false; controller.abort(); };
  }, [slug, retry]);
  const payload = view.slug === slug ? view.payload : null;
  if (status === "missing") return <NotFound />;
  if (!payload?.project) return <div className="flex min-h-[75vh] items-center justify-center px-5 text-center">{status === "error" ? <div role="alert"><h1 className="font-heading text-2xl font-bold">This project could not be loaded.</h1><button onClick={() => setRetry(value => value + 1)} className="mt-5 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white">Try again</button><Link to="/work" className="ml-4 text-sm font-semibold text-brand">All work</Link></div> : <Loader2 className="h-6 w-6 animate-spin text-brand" aria-label="Loading project" />}</div>;
  const project = portfolioProject(payload.project);
  const story = project.story || {};
  const related = (payload.related || []).map(portfolioProject);
  const path = `/work/${encodeURIComponent(project.slug)}`;
  const title = project.meta_title || project.seo?.title || `${project.title} | Project Work | Rajeev Freelancer`;
  const description = project.meta_description || project.seo?.description || project.summary;
  return <div className="bg-[#f8f9fb] text-[#122440]" data-testid="work-detail">
    <Seo title={title} description={description} path={path} image={project.preview_image} jsonLd={[
      breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Our work", path: "/work" }, { name: project.title, path }]),
      { "@context": "https://schema.org", "@type": "CreativeWork", name: project.title, description, url: `${canonicalBase()}${path}`, image: project.preview_image || undefined, about: project.category_name, creator: { "@type": "Person", name: "Rajeev Kumar" } },
    ]} />
    <section className="mx-auto max-w-[1400px] px-5 pb-12 pt-32 md:px-10 md:pb-16 md:pt-40">
      <Link to="/work" className="inline-flex items-center gap-2 text-sm font-medium text-[#64718a] hover:text-brand"><ArrowLeft className="h-4 w-4" /> All work</Link>
      <div className="mt-10 grid gap-9 lg:grid-cols-[1.4fr_.6fr] lg:gap-20">
        <div><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-brand">{project.category_name} · {project.project_type === "demo" ? "Original Interactive Demo" : "Delivered work"}</p><h1 className="mt-5 max-w-4xl font-heading text-4xl font-extrabold leading-[1.02] tracking-tighter sm:text-5xl lg:text-6xl">{project.title}</h1><p className="mt-6 max-w-2xl text-base leading-relaxed text-[#52617a] sm:text-lg">{project.summary}</p>
          <div className="mt-7 flex flex-wrap gap-3">{project.live_url && <a href={project.live_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#122440]" data-testid="work-live-link">Open live project <ExternalLink className="h-4 w-4" /></a>}<Link to="/contact" className="inline-flex items-center gap-2 rounded-full border border-[#172b4d]/20 bg-white px-6 py-3.5 text-sm font-semibold hover:border-brand hover:text-brand">Build something similar <ArrowUpRight className="h-4 w-4" /></Link></div>
        </div>
        <aside className="self-start rounded-2xl border border-[#172b4d]/10 bg-white p-6"><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#64718a]">Project snapshot</p><dl className="mt-5 space-y-5">{project.client_name && <div><dt className="text-xs text-[#64718a]">Client</dt><dd className="mt-1 text-sm font-semibold">{project.client_name}</dd></div>}<div><dt className="text-xs text-[#64718a]">Industry</dt><dd className="mt-1 text-sm font-semibold">{project.category_name}</dd></div>{project.services.length > 0 && <div><dt className="text-xs text-[#64718a]">Services we delivered</dt><dd className="mt-2 flex flex-wrap gap-2">{project.services.map((service, index) => <span key={service.slug || `${service.name}-${index}`} className="rounded-full bg-brand/[.06] px-3 py-1.5 text-[11px] font-medium text-brand">{service.name}</span>)}</dd></div>}{project.technology?.length > 0 && <div><dt className="text-xs text-[#64718a]">Technology</dt><dd className="mt-1 text-sm leading-relaxed">{project.technology.join(" · ")}</dd></div>}</dl></aside>
      </div>
    </section>
    <section className="mx-auto max-w-[1400px] px-5 md:px-10" aria-label="Project preview"><ProjectPreview key={project.preview_image} project={project} priority className="aspect-[16/10] rounded-[22px] border border-[#172b4d]/10" /></section>
    <section className="mx-auto max-w-[1100px] px-5 py-16 md:px-10 md:py-24">
      {story.overview && <div className="mb-14 grid gap-5 md:grid-cols-[.55fr_1.45fr]"><h2 className="font-heading text-2xl font-bold tracking-tight">The project</h2><p className="whitespace-pre-line text-base leading-relaxed text-[#52617a]">{story.overview}</p></div>}
      {SECTIONS.map(([key, number, heading]) => {
        const items = storyItems(story[key]);
        return items.length ? <div key={key} className="grid gap-5 border-t border-[#172b4d]/15 py-9 md:grid-cols-[.55fr_1.45fr]"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-brand">{number} / {key}</p><h2 className="mt-3 font-heading text-2xl font-bold tracking-tight">{heading}</h2></div><ul className="space-y-5">{items.map((item, index) => <li key={index} className="flex gap-3"><Check className="mt-1 h-4 w-4 shrink-0 text-brand" /><div>{item.title && <h3 className="font-semibold">{item.title}</h3>}{item.text && <p className={`${item.title ? "mt-2" : ""} whitespace-pre-line text-sm leading-relaxed text-[#52617a]`}>{item.text}</p>}</div></li>)}</ul></div> : null;
      })}
    </section>
    {project.gallery.length > 0 && <section className="mx-auto max-w-[1400px] px-5 pb-16 md:px-10 md:pb-24" aria-labelledby="work-gallery-heading"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-brand">A closer look</p><h2 id="work-gallery-heading" className="mt-3 font-heading text-3xl font-bold tracking-tight">The project in pictures.</h2><div className="mt-8 grid gap-6 md:grid-cols-2">{project.gallery.map((image, index) => <figure key={`${image.url}-${index}`}><a href={image.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${image.alt}`}><img src={image.url} alt={image.alt} width="1440" height="900" loading="lazy" decoding="async" className="aspect-[16/10] w-full rounded-2xl border border-[#172b4d]/10 bg-white object-cover object-top" /></a>{image.caption && <figcaption className="mt-3 text-sm text-[#64718a]">{image.caption}</figcaption>}</figure>)}</div></section>}
    <section className="bg-[#10233e] text-white"><div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-8 px-5 py-14 md:px-10 md:py-20"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-blue-300">Your project could be next</p><h2 className="mt-4 font-heading text-3xl font-bold tracking-tight sm:text-4xl">Tell us what you want to build.</h2><p className="mt-4 max-w-xl text-sm leading-relaxed text-white/65">Share your goals and a project reference. We will help you shape the scope, features and next steps.</p></div><div className="flex flex-wrap gap-3"><Link to="/project-brief" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-[#122440]">Create your brief <ArrowUpRight className="h-4 w-4" /></Link><a href={waLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3.5 text-sm font-semibold hover:bg-white/10"><MessageCircle className="h-4 w-4" /> WhatsApp</a></div></div></section>
    {related.length > 0 && <section className="mx-auto max-w-[1400px] px-5 py-16 md:px-10 md:py-24"><div className="flex flex-wrap items-center justify-between gap-5"><h2 className="font-heading text-3xl font-bold tracking-tight">More of our work.</h2><Link to="/work" className="inline-flex items-center gap-2 text-sm font-semibold text-brand">Explore all projects <ArrowUpRight className="h-4 w-4" /></Link></div><div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{related.map(item => <WorkCard key={item.slug} project={item} />)}</div></section>}
  </div>;
}
