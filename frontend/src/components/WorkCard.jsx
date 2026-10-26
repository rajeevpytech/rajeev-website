import { useEffect, useState } from "react";
import { ArrowUpRight, ExternalLink, Monitor } from "lucide-react";
import Link from "@/components/CanonicalLink";
import { portfolioProject, readableHost } from "@/lib/portfolio";

export function ProjectPreview({ project, priority = false, className = "" }) {
  const item = portfolioProject(project);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [item.preview_image]);
  return <div className={`relative overflow-hidden bg-[#e9eef5] ${className}`}>
    {item.preview_image && !failed ? <img src={item.preview_image} alt={item.preview_alt} width={project.screenshot?.width || project.preview_width || 1440} height={project.screenshot?.height || project.preview_height || 900} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} decoding="async" onError={() => setFailed(true)} className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.025]" />
      : <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 bg-[#edf1f6] px-6 text-center text-[#21334d]/65"><Monitor className="h-8 w-8" strokeWidth={1.4} /><p className="text-sm font-medium">Website preview unavailable</p><p className="max-w-xs text-xs leading-relaxed">{item.live_url ? "Open the published website to explore this project." : "Project details are available below."}</p></div>}
  </div>;
}

export function WorkCard({ project, priority = false }) {
  const item = portfolioProject(project);
  const detail = `/work/${encodeURIComponent(item.slug)}`;
  return <article className="group flex h-full flex-col overflow-hidden rounded-[22px] border border-[#172b4d]/10 bg-white shadow-[0_8px_40px_-28px_rgba(15,35,65,.24)] transition-[border-color,box-shadow] duration-300 hover:border-brand/40 hover:shadow-[0_20px_50px_-30px_rgba(15,35,65,.28)]" data-testid={`work-card-${item.slug}`}>
    <Link to={detail} data-rf-project={item.slug} data-rf-link-kind="details" aria-label={`Explore ${item.title}`} className="block border-b border-[#172b4d]/10 bg-[#e9eef5] p-3 sm:p-4">
      <div aria-hidden="true" className="flex h-7 items-center gap-1.5 rounded-t-lg border border-b-0 border-[#172b4d]/10 bg-white px-3"><span className="h-1.5 w-1.5 rounded-full bg-[#c8d0dc]" /><span className="h-1.5 w-1.5 rounded-full bg-[#c8d0dc]" /><span className="h-1.5 w-1.5 rounded-full bg-[#c8d0dc]" /><span className="ml-3 truncate font-mono text-[9px] text-[#61718b]">{readableHost(item.live_url)}</span></div>
      <ProjectPreview project={project} priority={priority} className="aspect-[16/10] rounded-b-lg border border-[#172b4d]/10" />
    </Link>
    <div className="flex flex-1 flex-col p-6 sm:p-7">
      <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-brand">{item.category_name}{item.project_type === "demo" ? " · Interactive Demo" : ""}</p>
      <h3 className="mt-3 font-heading text-2xl font-bold leading-tight tracking-tight text-[#122440]"><Link to={detail} data-rf-project={item.slug} data-rf-link-kind="details" className="hover:text-brand">{item.title}</Link></h3>
      {item.summary && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[#52617a]">{item.summary}</p>}
      {item.services.length > 0 && <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Services delivered">{item.services.slice(0, 4).map((service, index) => <li key={service.slug || `${service.name}-${index}`} className="rounded-full bg-brand/[.06] px-2.5 py-1 text-[10px] font-medium text-brand">{service.name}</li>)}</ul>}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
        <Link to={detail} data-rf-project={item.slug} data-rf-link-kind="details" className="inline-flex items-center gap-2 text-xs font-semibold text-[#122440] transition-colors hover:text-brand">Project details <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        {item.live_url && <a href={item.live_url} data-rf-project={item.slug} data-rf-link-kind={item.project_type === "demo" ? "demo" : "live"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-[#172b4d]/15 px-3 py-2 text-xs font-semibold text-[#52617a] transition-colors hover:border-brand hover:text-brand">Open live project <ExternalLink className="h-3 w-3" /></a>}
      </div>
    </div>
  </article>;
}

export default WorkCard;
