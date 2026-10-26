import { ArrowRight, ArrowUpRight, Bot, Check, Clock, Code, Globe, Layers, Mail, MapPin, MessageCircle, Phone, Search, ShieldCheck, Smartphone, TrendingUp } from "lucide-react";
import Link from "@/components/CanonicalLink";
import Seo from "@/components/Seo";
import ContactForm from "@/components/ContactForm";
import { CONTACT, SERVICES, waLink } from "@/data/site";
import { LIVE_SERVICES, canonicalServicePath, primaryServiceSlug } from "@/seo/serviceAliases";
import { breadcrumbSchema, canonicalBase, faqSchema, getSiteConfig } from "@/lib/siteConfig";

function serviceIcon(slug = "") {
  if (slug.includes("app-developer")) return Smartphone;
  if (slug.includes("seo")) return Search;
  if (slug.includes("marketing-consultant")) return TrendingUp;
  if (slug.includes("ai-consultant")) return Bot;
  if (slug.includes("whatsapp") || slug.includes("sms")) return MessageCircle;
  return Code;
}
function geographicSource(value) {
  try { const parsed = new URL(value); return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : null; } catch { return null; }
}

// Used only for newly added world-expansion documents. Original location-page
// rendering remains in LocationPage and never enters this component.
export default function ExpansionLocationPage({ data, serviceSlug, locSlug }) {
  const { content, location, service } = data;
  const cfg = getSiteConfig();
  const base = canonicalBase();
  const path = data.canonical || `/${serviceSlug}/${locSlug}`;
  const canonical = `${base}${canonicalServicePath(path)}`;
  const Icon = serviceIcon(service.slug || serviceSlug);
  const source = geographicSource(location.source_url);
  const timezone = location.timezone;
  const primary = primaryServiceSlug(service.slug || serviceSlug);
  const formService = SERVICES.find(item => item.slug === primary)?.name || service.name;
  const faqs = Array.isArray(content.faqs) ? content.faqs : [];
  const process = Array.isArray(content.process) ? content.process : [];
  const essentials = Array.isArray(content.why_choose) ? content.why_choose : [];
  const intro = Array.isArray(content.intro) ? content.intro : [content.intro].filter(Boolean);
  const related = SERVICES.filter(item => item.slug !== primary).slice(0, 3);
  const jsonLd = [
    breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Service areas", path: "/service-areas" }, { name: `${location.city}, ${location.country}`, path }]),
    { "@context": "https://schema.org", "@type": "Service", "@id": `${canonical}#service`, url: canonical, name: content.h1, serviceType: service.name, description: content.meta_description,
      provider: { "@id": `${base}/#organization` }, areaServed: { "@type": "Place", name: location.city, containedInPlace: { "@type": "Country", name: location.country } },
      availableChannel: { "@type": "ServiceChannel", serviceUrl: `${base}/contact`, servicePhone: { "@type": "ContactPoint", telephone: cfg.contact.phone, contactType: "sales" } } },
    ...(faqs.length ? [faqSchema(faqs)] : []),
  ];
  return <div data-testid="new-expansion-location-page">
    <Seo title={content.title} description={content.meta_description} path={path} jsonLd={jsonLd} noindex={data.seo_noindex === true || data.seo_reviewed !== true} />
    <section className="relative overflow-hidden border-b border-line bg-paper pt-28 md:pt-36">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle at 85% 20%, rgba(0,85,255,.12), transparent 42%), linear-gradient(rgba(0,85,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,85,255,.035) 1px, transparent 1px)", backgroundSize: "auto, 48px 48px, 48px 48px" }} />
      <div className="relative mx-auto max-w-[1400px] px-5 md:px-10 pb-16 md:pb-24">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-ink/50"><Link to="/" className="hover:text-brand">Home</Link><span>/</span><Link to="/service-areas" className="hover:text-brand">Service areas</Link><span>/</span><span>{location.city}, {location.country}</span></nav>
        <div className="mt-10 grid items-center gap-12 lg:grid-cols-[1.25fr_.85fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-white px-4 py-2 text-xs font-semibold text-brand"><Globe className="h-3.5 w-3.5" /> Remote collaboration from India</span>
            <h1 className="mt-7 max-w-4xl font-heading text-4xl font-extrabold leading-[1.02] tracking-tighter sm:text-5xl lg:text-[3.7rem]">{content.h1}</h1>
            {intro.map((paragraph, index) => <p key={index} className={`mt-5 max-w-2xl leading-relaxed ${index ? "text-base text-ink/60" : "text-lg text-ink/75"}`}>{paragraph}</p>)}
            <div className="mt-8 flex flex-wrap gap-3"><a href="#project-brief" className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-semibold text-white hover:bg-ink">Discuss your project <ArrowUpRight className="h-4 w-4" /></a><a href={waLink(`Hi Rajeev, I would like to discuss ${service.name.toLowerCase()} for a business in ${location.city}, ${location.country}.`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-6 py-3.5 text-sm font-semibold hover:border-ink"><MessageCircle className="h-4 w-4 text-brand" /> WhatsApp</a></div>
            <Link to="/project-brief" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand underline underline-offset-4">Build a project brief <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <aside className="relative rounded-[28px] bg-ink p-7 text-white shadow-xl sm:p-8" aria-label="Remote project planning">
            <div className="flex items-center justify-between"><span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10"><Icon className="h-6 w-6 text-white" /></span><span className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-white/60">Project planning</span></div>
            <p className="mt-7 text-xs font-medium uppercase tracking-[.2em] text-white/40">{service.short || service.name}</p>
            <h2 className="mt-3 font-heading text-3xl font-bold leading-tight tracking-tight">Your goals.<br /><span className="text-blue-300">A clear working plan.</span></h2>
            <div className="mt-7 space-y-2.5">{process.slice(0, 3).map((step, index) => <div key={step.step || index} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.04] px-4 py-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold">{step.step || index + 1}</span><span className="text-sm text-white/85">{step.title}</span>{index === 2 ? <Check className="ml-auto h-4 w-4 text-blue-300" /> : <ArrowRight className="ml-auto h-4 w-4 text-white/30" />}</div>)}</div>
            <div className="mt-7 border-t border-white/10 pt-5"><p className="flex items-center gap-2 text-sm text-white/80"><MapPin className="h-4 w-4 text-blue-300" /> Client location: {location.city}</p><p className="mt-2 text-xs leading-relaxed text-white/45">Delivery from India · Meetings and milestones agreed together</p></div>
          </aside>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-[1400px] px-5 md:px-10 py-16 md:py-24">
      <div className="grid gap-8 border-b border-line pb-12 lg:grid-cols-[.7fr_1.3fr]"><div><p className="overline text-brand">/ The project scope</p><h2 className="mt-4 font-heading text-3xl font-extrabold leading-tight tracking-tighter sm:text-4xl">Designed around the work you need done.</h2></div><p className="text-lg leading-relaxed text-ink/70">{content.service_details}</p></div>
      <div className="mt-10 grid gap-4 md:grid-cols-2">{essentials.map((item, index) => { const FeatureIcon = [Layers, ShieldCheck, Clock, Code][index % 4]; return <article key={item.title} className="rounded-2xl border border-line bg-white p-6 sm:p-7"><FeatureIcon className="h-5 w-5 text-brand" /><h3 className="mt-4 font-heading text-xl font-bold tracking-tight">{item.title}</h3><p className="mt-3 text-sm leading-relaxed text-ink/65">{item.text}</p></article>; })}</div>
    </section>

    <section className="border-y border-line bg-paper/60"><div className="mx-auto grid max-w-[1400px] gap-12 px-5 md:px-10 py-16 md:py-24 lg:grid-cols-[.8fr_1.2fr]"><div><p className="overline text-brand">/ How we work</p><h2 className="mt-4 font-heading text-3xl font-extrabold leading-tight tracking-tighter sm:text-4xl">A practical path from brief to handover.</h2><p className="mt-6 text-base leading-relaxed text-ink/65">{content.whatsapp_section}</p><div className="mt-7 flex flex-wrap gap-3"><a href={`mailto:${CONTACT.email}`} className="inline-flex items-center gap-2 text-sm font-semibold text-brand"><Mail className="h-4 w-4" /> Email your brief</a><a href={`tel:${CONTACT.phone}`} className="inline-flex items-center gap-2 text-sm font-semibold text-ink/70"><Phone className="h-4 w-4" /> {CONTACT.phone}</a></div></div><ol className="space-y-4">{process.map((step, index) => <li key={step.step || index} className="flex gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6"><span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 font-mono text-xs font-bold text-brand">{step.step || String(index + 1).padStart(2, "0")}</span><div><h3 className="font-heading text-lg font-bold">{step.title}</h3><p className="mt-2 text-sm leading-relaxed text-ink/65">{step.text}</p></div></li>)}</ol></div></section>

    <section className="mx-auto max-w-[1400px] px-5 md:px-10 py-16 md:py-24"><div className="grid gap-8 rounded-3xl border border-line p-6 sm:p-8 lg:grid-cols-[1.2fr_.8fr]"><div><p className="overline flex items-center gap-2 text-brand"><MapPin className="h-3.5 w-3.5" /> / Planning for {location.city}</p><h2 className="mt-4 font-heading text-2xl font-bold tracking-tight sm:text-3xl">Local context. Remote delivery.</h2><p className="mt-5 leading-relaxed text-ink/65">{content.local_context}</p>{source && <a href={source} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-brand underline underline-offset-4">Geographic reference <ArrowUpRight className="h-3.5 w-3.5" /></a>}</div><dl className="divide-y divide-line rounded-2xl bg-paper px-5"><div className="py-4"><dt className="text-xs text-ink/45">Place</dt><dd className="mt-1 text-sm font-semibold">{location.city}{location.parent_city ? `, ${location.parent_city}` : ""}</dd></div><div className="py-4"><dt className="text-xs text-ink/45">Country</dt><dd className="mt-1 text-sm font-semibold">{location.country}</dd></div><div className="py-4"><dt className="text-xs text-ink/45">Review time zone</dt><dd className="mt-1 break-words text-sm font-semibold">{timezone || "Agree during discovery"}</dd></div><div className="py-4"><dt className="text-xs text-ink/45">Delivery</dt><dd className="mt-1 text-sm font-semibold">Remote from India</dd></div></dl></div></section>

    {faqs.length > 0 && <section className="mx-auto max-w-[900px] px-5 md:px-10 pb-16 md:pb-24"><p className="overline text-brand">/ Before you begin</p><h2 className="mt-4 font-heading text-3xl font-extrabold tracking-tighter sm:text-4xl">Your questions, answered.</h2><div className="mt-8 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white" data-testid="expansion-faqs">{faqs.map((faq, index) => <details key={faq.q || index} className="group p-5 sm:p-6"><summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-semibold leading-relaxed">{faq.q}<span className="text-brand transition-transform group-open:rotate-45" aria-hidden="true">+</span></summary><p className="mt-4 text-sm leading-relaxed text-ink/65">{faq.a}</p></details>)}</div></section>}

    <section id="project-brief" className="scroll-mt-8 bg-ink text-white"><div className="mx-auto grid max-w-[1400px] gap-10 px-5 md:px-10 py-16 md:py-24 lg:grid-cols-2"><div><p className="overline text-white/45">/ Let's talk through it</p><h2 className="mt-5 font-heading text-3xl font-extrabold leading-tight tracking-tighter sm:text-4xl">Tell us what your {location.city} business needs.</h2><p className="mt-5 max-w-lg leading-relaxed text-white/65">Share your current website or workflow, priorities and preferred launch date. We can discuss scope, dependencies and a realistic next step.</p><div className="mt-7 space-y-3 text-sm"><p><a href={`mailto:${CONTACT.email}`} className="text-white/85 underline underline-offset-4">{CONTACT.email}</a></p><p><a href={`tel:${CONTACT.phone}`} className="text-white/85">{CONTACT.phone}</a></p></div></div><div className="rounded-2xl border border-white/10 bg-white p-5 text-ink sm:p-7"><ContactForm defaultService={formService} location={`${location.city}, ${location.country}`} countrySlug={location.country_slug} compact /></div></div></section>
    <section className="mx-auto max-w-[1400px] px-5 md:px-10 py-14"><div className="flex flex-wrap items-center justify-between gap-4"><h2 className="font-heading text-xl font-bold">Explore related services</h2><Link to="/service-areas" className="text-sm font-semibold text-brand">Browse service areas <ArrowRight className="ml-1 inline h-4 w-4" /></Link></div><div className="mt-5 grid gap-3 md:grid-cols-3">{related.map(item => <Link key={item.slug} to={`/${LIVE_SERVICES.find(alias => alias.primarySlug === item.slug)?.slug || item.slug}/${locSlug}`} className="flex items-center justify-between gap-3 rounded-xl border border-line p-5 text-sm font-semibold hover:border-brand hover:text-brand">{item.short}<ArrowUpRight className="h-4 w-4 shrink-0" /></Link>)}</div></section>
  </div>;
}
