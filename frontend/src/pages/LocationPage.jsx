import ExpansionLocationPage from "@/pages/ExpansionLocationPage";
import Link from "@/components/CanonicalLink";
import { primaryServiceSlug } from "@/seo/serviceAliases";
import { bootstrapData } from "@/seo/bootstrap";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, MapPin, Check, Plus, Minus, MessageCircle, Loader2 } from "lucide-react";
import Seo from "@/components/Seo";
import { Reveal, MaskLines } from "@/components/Reveal";
import ContactForm from "@/components/ContactForm";
import NotFound from "@/pages/NotFound";
import { api } from "@/lib/api";
import { SERVICES, waLink } from "@/data/site";
import { localBusinessSchema, serviceSchema, faqSchema, breadcrumbSchema } from "@/lib/siteConfig";

function Faq({ q, a, index }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div className="border-b border-line" data-testid={`faq-item-${index}`}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-4 py-5 text-left" data-testid={`faq-toggle-${index}`}>
        <span className="font-heading text-lg md:text-xl font-bold tracking-tight">{q}</span>
        <span className="shrink-0 text-brand">{open ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}</span>
      </button>
      {open && (
        <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pb-6 text-ink/70 leading-relaxed max-w-3xl">
          {a}
        </motion.p>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="mx-auto max-w-[1400px] px-5 md:px-10 pt-40 pb-32">
      <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Crafting this page…</div>
      <div className="mt-10 space-y-4 animate-pulse">
        <div className="h-16 w-3/4 rounded-xl bg-line" />
        <div className="h-16 w-1/2 rounded-xl bg-line" />
        <div className="mt-8 h-4 w-full max-w-2xl rounded bg-line" />
        <div className="h-4 w-full max-w-xl rounded bg-line" />
        <div className="h-4 w-full max-w-lg rounded bg-line" />
      </div>
    </div>
  );
}

export default function LocationPage() {
  const { serviceSlug, locSlug } = useParams();
  const [data, setData] = useState(() => bootstrapData("locationPage") || null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!bootstrapData("locationPage")) setData(null);
    setError(false);
    window.scrollTo(0, 0);
    api.get(`/page/${serviceSlug}/${locSlug}`)
      .then(({ data }) => setData(data))
      .catch(() => setError(true));
  }, [serviceSlug, locSlug]);

  if (error) return <NotFound />;
  if (!data) return <Skeleton />;
  if (data.new_world_expansion === true) return <ExpansionLocationPage data={data} serviceSlug={serviceSlug} locSlug={locSlug} />;

  const { content, location, service } = data;
  const path = `/${serviceSlug}/${locSlug}`;
  const related = SERVICES.filter((s) => s.slug !== primaryServiceSlug(serviceSlug)).slice(0, 4);

  const jsonLd = [
    serviceSchema({ name: service.name, description: content.meta_description, path, city: location.city, areaType: location.location_type === "locality" ? "Place" : "City" }),
    localBusinessSchema({ city: location.city, country: location.country, path, name: content.h1 }),
    faqSchema(content.faqs),
    breadcrumbSchema([
      { name: "Home", path: "" },
      { name: service.name, path: `/${serviceSlug}` },
      { name: `${location.city}, ${location.country}`, path },
    ]),
  ];

  const waText = `Hi Rajeev, I'm looking for a ${service.keyword || service.name} in ${location.city}. Are you available?`;

  return (
    <div>
      <Seo title={content.title} description={content.meta_description} path={path} jsonLd={jsonLd} noindex={data.seo_noindex === true || (data.is_new_location === true && data.seo_reviewed !== true)} />

      {/* HERO */}
      <section className="mx-auto max-w-[1400px] px-5 md:px-10 pt-32 md:pt-40 pb-14">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
          <Link to={`/${serviceSlug}`} className="link-underline">{service.short || service.name}</Link>
          <span>/</span>
          <span className="flex items-center gap-1 text-brand"><MapPin className="h-3.5 w-3.5" />{location.city}, {location.country}</span>
        </nav>
        <h1 className="mt-6 max-w-5xl font-heading font-extrabold tracking-tighter text-4xl sm:text-5xl lg:text-[4rem] leading-[0.92]">
          <MaskLines lines={[content.h1]} />
        </h1>
        <div className="mt-8 max-w-3xl space-y-4 text-lg text-ink/70 leading-relaxed">
          {(content.intro || []).map((p, i) => <p key={i}>{p}</p>)}
        </div>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link to="/contact" data-testid="loc-consultation-btn" className="inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 font-medium text-white hover:bg-ink transition-colors">Schedule a free consultation <ArrowUpRight className="h-4 w-4" /></Link>
          <a href={waLink(waText)} target="_blank" rel="noopener noreferrer" data-testid="loc-whatsapp-btn" className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-7 py-3.5 font-medium hover:border-ink transition-colors"><MessageCircle className="h-4 w-4" /> Chat on WhatsApp</a>
        </div>
      </section>

      {/* WHY CHOOSE */}
      <section className="bg-white border-y border-line">
        <div className="mx-auto max-w-[1400px] px-5 md:px-10 py-20">
          <Reveal><h2 className="max-w-3xl font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl lg:text-5xl leading-[0.95]">Why choose Rajeev as your {service.short || service.name} freelancer in {location.city}?</h2></Reveal>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(content.why_choose || []).map((w, i) => (
              <Reveal key={i} delay={(i % 3) * 0.08}>
                <div className="h-full rounded-2xl border border-line bg-paper p-7">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand"><Check className="h-5 w-5" /></span>
                  <h3 className="mt-5 font-heading text-lg font-bold tracking-tight">{w.title}</h3>
                  <p className="mt-2 text-sm text-ink/65 leading-relaxed">{w.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* DETAILS + LOCAL CONTEXT */}
      <section className="mx-auto max-w-[1400px] px-5 md:px-10 py-20 grid lg:grid-cols-2 gap-12">
        <Reveal>
          <p className="overline">/ How it's delivered</p>
          <p className="mt-5 text-lg text-ink/75 leading-relaxed">{content.service_details}</p>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="overline flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-brand" /> {location.city} context</p>
          <p className="mt-5 text-lg text-ink/75 leading-relaxed">{content.local_context}</p>
        </Reveal>
      </section>

      {/* PROCESS */}
      {data.is_new_location && location.planning_notes?.length > 0 && <section className="mx-auto max-w-[1400px] px-5 md:px-10 pb-20">
        <h2 className="font-heading text-2xl font-bold">Location and delivery planning</h2>
        <ul className="mt-5 list-disc space-y-3 pl-5 text-ink/70">{location.planning_notes.map((note) => <li key={note}>{note}</li>)}</ul>
        <p className="mt-5 text-sm text-ink/60">This is remote service coverage from India, rather than an office address in {location.city}. <Link className="underline" to={`/locations/${location.country_slug}`}>Browse {location.country}</Link>.</p>
        {location.source_url && /^https:\/\//.test(location.source_url) && <p className="mt-3 text-xs text-ink/50">Geographic reference: <a className="underline" href={location.source_url} target="_blank" rel="noopener noreferrer">source directory</a>.</p>}
      </section>}
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-[1400px] px-5 md:px-10 py-20">
          <Reveal><p className="overline text-white/50">/ How it works</p></Reveal>
          <Reveal delay={0.05}><h2 className="mt-5 font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl lg:text-5xl">A clear, senior process.</h2></Reveal>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-5 gap-8">
            {(content.process || []).map((p, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <span className="font-mono text-sm text-brand">{p.step}</span>
                <h3 className="mt-4 font-heading text-xl font-bold">{p.title}</h3>
                <p className="mt-2 text-sm text-white/60 leading-relaxed">{p.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* WHATSAPP */}
      <section className="mx-auto max-w-[1400px] px-5 md:px-10 py-20">
        <Reveal>
          <div className="rounded-2xl border border-line bg-white p-8 md:p-12 grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <p className="overline flex items-center gap-2"><MessageCircle className="h-4 w-4 text-[#25D366]" /> WhatsApp-first communication</p>
              <p className="mt-5 text-lg text-ink/75 leading-relaxed">{content.whatsapp_section}</p>
            </div>
            <div className="lg:text-right">
              <a href={waLink(waText)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-7 py-3.5 font-medium text-white hover:brightness-95 transition">Message Rajeev on WhatsApp <ArrowUpRight className="h-4 w-4" /></a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="bg-white border-y border-line">
        <div className="mx-auto max-w-[1400px] px-5 md:px-10 py-20">
          <Reveal><p className="overline">/ FAQs</p></Reveal>
          <Reveal delay={0.05}><h2 className="mt-5 font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl lg:text-5xl">{service.short || service.name} in {location.city} — answered.</h2></Reveal>
          <div className="mt-10 max-w-4xl">
            {(content.faqs || []).map((f, i) => <Faq key={i} q={f.q} a={f.a} index={i} />)}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="mx-auto max-w-[1400px] px-5 md:px-10 py-20 grid lg:grid-cols-2 gap-14 items-start">
        <div>
          <Reveal><h2 className="font-heading font-extrabold tracking-tighter text-4xl sm:text-5xl leading-[0.92]">Request a custom<br />proposal for {location.city}.</h2></Reveal>
          <Reveal delay={0.05}><p className="mt-6 max-w-md text-ink/70 leading-relaxed">Share your brief and get a fixed-scope proposal, usually within the hour.</p></Reveal>
          <Reveal delay={0.1}>
            <div className="mt-8">
              <p className="overline mb-3">Related services in {location.city}</p>
              <div className="flex flex-wrap gap-2">
                {related.map((r) => (
                  <Link key={r.slug} to={`/${r.slug}/${locSlug}`} className="rounded-full border border-line px-4 py-1.5 text-sm hover:border-ink hover:bg-paper transition-colors">{r.short}</Link>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <Link to={`/locations/${location.country_slug}`} className="mt-6 inline-flex items-center gap-2 text-sm font-medium link-underline">Other cities in {location.country} <ArrowUpRight className="h-4 w-4" /></Link>
          </Reveal>
        </div>
        <Reveal delay={0.1}><ContactForm defaultService={service.name} location={`${location.city}, ${location.country}`} countrySlug={location.country_slug} /></Reveal>
      </section>
    </div>
  );
}
