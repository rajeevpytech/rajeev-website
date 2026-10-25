import Link from "@/components/CanonicalLink";
import { serviceForSlug, primaryServiceSlug } from "@/seo/serviceAliases";
import CATALOG from "@/seo/catalog.json";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ArrowUpRight, MapPin, Loader2, Check, Star, Zap } from "lucide-react";
import Seo from "@/components/Seo";
import { Reveal, MaskLines } from "@/components/Reveal";
import ContactForm from "@/components/ContactForm";
import NotFound from "@/pages/NotFound";
import { api } from "@/lib/api";
import { SERVICES, visibleStats, waLink } from "@/data/site";
import { SERVICE_CONTENT, SERVICE_PROCESS, SERVICE_IMAGES, TESTIMONIALS } from "@/data/serviceContent";
import { CASE_STUDIES, fetchCaseStudies } from "@/data/caseStudies";
import { serviceSchema, faqSchema, breadcrumbSchema, getSiteConfig } from "@/lib/siteConfig";

export default function ServiceHub() {
  const { serviceSlug } = useParams();
  const [params] = useSearchParams();
  const service = serviceForSlug(serviceSlug);
  const primarySlug = primaryServiceSlug(serviceSlug);
  const [countries, setCountries] = useState(CATALOG.countries);
  const [allCases, setAllCases] = useState(CASE_STUDIES);
  useEffect(() => { fetchCaseStudies().then(setAllCases); }, []);

  useEffect(() => {
    if (!service) return;
    window.scrollTo(0, 0);
    api.get(`/service/${serviceSlug}`).then(({ data }) => setCountries(data.countries)).catch(() => setCountries([]));
  }, [serviceSlug, service]);

  if (!service) return <NotFound />;
  const c = SERVICE_CONTENT[primarySlug] || { hero: service.tagline, sub: service.tagline, benefits: [], deliverables: [], outcomes: [], faqs: [] };
  // Ad-campaign overrides: /service?headline=...&sub=...&cta=...  (match your ad copy)
  const heroLine = params.get("headline") || c.hero;
  const subLine = params.get("sub") || c.sub;
  const ctaLabel = params.get("cta") || "Get a free quote";
  const image = SERVICE_IMAGES[primarySlug];
  const idx = SERVICES.findIndex((s) => s.slug === primarySlug);
  const reviews = [TESTIMONIALS[idx % TESTIMONIALS.length], TESTIMONIALS[(idx + 2) % TESTIMONIALS.length], TESTIMONIALS[(idx + 4) % TESTIMONIALS.length]];
  const relatedCases = allCases.filter((cs) => (cs.services || []).some((slug) => primaryServiceSlug(slug) === primarySlug));

  const jsonLd = [
    serviceSchema({ name: service.name, description: c.sub, path: `/${service.slug}` }),
    faqSchema(c.faqs),
    breadcrumbSchema([
      { name: "Home", path: "" },
      { name: "Services", path: "/services" },
      { name: service.name, path: `/${service.slug}` },
    ]),
  ];

  return (
    <div>
      <Seo
        title={`${service.name} — Hire Rajeev Worldwide | Rajeev Freelancer`}
        description={`${heroLine} ${subLine}`.slice(0, 158)}
        path={`/${service.slug}`}
        jsonLd={jsonLd}
      />

      {/* HERO */}
      <section className="mx-auto max-w-[1400px] px-5 md:px-10 pt-32 md:pt-40 pb-16 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <Link to="/services" className="overline link-underline">/ {service.short}</Link>
          <h1 className="mt-6 max-w-2xl font-heading font-extrabold tracking-tighter text-4xl sm:text-5xl lg:text-[3.6rem] leading-[0.95]">
            <MaskLines lines={[service.name]} />
          </h1>
          <p className="mt-6 max-w-xl text-xl text-ink/80 font-medium leading-snug">{heroLine}</p>
          <p className="mt-4 max-w-xl text-lg text-ink/60 leading-relaxed">{subLine}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/contact" data-testid="service-cta-primary" className="inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 font-medium text-white hover:bg-ink transition-colors">{ctaLabel} <ArrowUpRight className="h-4 w-4" /></Link>
            <a href={waLink(`Hi Rajeev, I'm interested in your ${service.name} service.`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-7 py-3.5 font-medium hover:border-ink transition-colors">WhatsApp now</a>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-ink/60">
            {getSiteConfig().business.reviews_verified && <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 fill-brand text-brand" /> {getSiteConfig().business.rating}/5 client rating</span>}
            <span className="inline-flex items-center gap-1.5"><Zap className="h-4 w-4 text-brand" /> Replies within the hour</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-brand" /> 12+ years · senior-only</span>
          </div>
        </div>
        {image && (
          <Reveal>
            <div className="relative">
              <img src={image} alt={service.name} data-testid="service-hero-image" decoding="async" fetchPriority="high" className="w-full rounded-3xl border border-line object-cover aspect-[4/3] shadow-sm" />
              <div className="absolute -bottom-4 -left-4 rounded-2xl bg-ink text-white px-5 py-3 shadow-lg">
                <p className="font-heading text-lg font-bold">Free quote</p>
                <p className="text-xs text-white/60">Reply within the hour</p>
              </div>
            </div>
          </Reveal>
        )}
      </section>

      {/* BENEFITS + WHAT'S INCLUDED */}
      <section className="bg-white border-y border-line">
        <div className="mx-auto max-w-[1400px] px-5 md:px-10 py-20 md:py-24 grid lg:grid-cols-2 gap-14">
          <div>
            <Reveal><p className="overline">/ Why this works</p></Reveal>
            <div className="mt-8 space-y-6">
              {c.benefits.map((b) => (
                <Reveal key={b.title}>
                  <div className="flex gap-4">
                    <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand"><Check className="h-4 w-4" /></span>
                    <div>
                      <h3 className="font-heading text-lg font-bold">{b.title}</h3>
                      <p className="mt-1 text-ink/60 leading-relaxed">{b.text}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
          <div>
            <Reveal><p className="overline">/ What's included</p></Reveal>
            <ul className="mt-8 grid gap-3" data-testid="service-deliverables">
              {c.deliverables.map((d) => (
                <li key={d} className="flex items-center gap-3 rounded-xl border border-line px-5 py-4 text-sm font-medium hover:border-ink transition-colors">
                  <Check className="h-4 w-4 text-brand shrink-0" /> {d}
                </li>
              ))}
            </ul>
            {c.outcomes?.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {c.outcomes.map((o) => <span key={o} className="rounded-full bg-paper border border-line px-4 py-1.5 text-xs font-medium text-ink/70">{o}</span>)}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="mx-auto max-w-[1400px] px-5 md:px-10 py-20 md:py-24">
        <Reveal><p className="overline">/ How we'll work</p></Reveal>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SERVICE_PROCESS.map((p) => (
            <Reveal key={p.step}>
              <div className="rounded-2xl border border-line p-6 h-full">
                <span className="font-mono text-2xl font-bold text-brand">{p.step}</span>
                <h3 className="mt-3 font-heading text-lg font-bold">{p.title}</h3>
                <p className="mt-2 text-sm text-ink/60 leading-relaxed">{p.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleStats().map((s) => (
            <div key={s.label} className="rounded-2xl border border-line bg-white p-6">
              <p className="font-heading text-3xl font-extrabold tracking-tight text-brand">{s.value}{s.suffix}</p>
              <p className="mt-1 text-sm text-ink/60">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* RELATED CASE STUDIES — proof for exactly this service */}
      {relatedCases.length > 0 && (
        <section className="bg-paper border-y border-line" data-testid="service-related-cases">
          <div className="mx-auto max-w-[1400px] px-5 md:px-10 py-20 md:py-24">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <Reveal><p className="overline">/ Proof for this service</p></Reveal>
                <Reveal delay={0.05}><h2 className="mt-5 font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl lg:text-5xl leading-[0.95]">Related results.</h2></Reveal>
              </div>
              <Reveal delay={0.1}><Link to="/case-studies" className="inline-flex items-center gap-1.5 text-sm font-medium link-underline">All case studies <ArrowUpRight className="h-4 w-4" /></Link></Reveal>
            </div>
            <div className="mt-12 grid md:grid-cols-3 gap-4">
              {relatedCases.slice(0, 3).map((cs) => (
                <Reveal key={cs.slug}>
                  <Link to={`/case-studies/${cs.slug}`} data-testid={`related-case-${cs.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white hover:border-ink transition-colors duration-300">
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <img src={cs.cover} alt={cs.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-ink backdrop-blur">{cs.tag}</span>
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <p className="font-heading text-4xl font-extrabold tracking-tighter text-brand">{cs.metric}</p>
                      <p className="mt-1 text-sm text-ink/55">{cs.metricLabel}</p>
                      <h3 className="mt-4 font-heading text-lg font-bold tracking-tight leading-snug">{cs.title}</h3>
                      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink group-hover:text-brand transition-colors">Read the case study <ArrowUpRight className="h-4 w-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" /></span>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {c.faqs?.length > 0 && (
        <section className="bg-white border-y border-line">
          <div className="mx-auto max-w-[900px] px-5 md:px-10 py-20 md:py-24">
            <Reveal><h2 className="font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl">Frequently asked</h2></Reveal>
            <div className="mt-10 divide-y divide-line" data-testid="service-faqs">
              {c.faqs.map((f) => (
                <details key={f.q} className="group py-5">
                  <summary className="flex cursor-pointer items-center justify-between font-heading text-lg font-semibold">
                    {f.q}
                    <span className="ml-4 text-brand transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-ink/65 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TESTIMONIALS */}
      {getSiteConfig().business.testimonials_verified && <section className="mx-auto max-w-[1400px] px-5 md:px-10 py-20 md:py-24">
        <Reveal><p className="overline flex items-center gap-2"><Star className="h-3.5 w-3.5 fill-brand text-brand" /> What clients say</p></Reveal>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="service-testimonials">
          {reviews.map((r) => (
            <Reveal key={r.name}>
              <figure className="h-full rounded-2xl border border-line bg-white p-6 flex flex-col">
                <div className="flex gap-0.5">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-brand text-brand" />)}</div>
                <blockquote className="mt-4 flex-1 text-ink/75 leading-relaxed">"{r.text}"</blockquote>
                <figcaption className="mt-5 pt-4 border-t border-line">
                  <p className="font-heading font-bold text-sm">{r.name}</p>
                  <p className="text-xs text-ink/50">{r.role}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>}

      {/* CONTACT */}
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-[1400px] px-5 md:px-10 py-20 md:py-24 grid lg:grid-cols-2 gap-14 items-start">
          <div>
            <Reveal><h2 className="font-heading font-extrabold tracking-tighter text-4xl sm:text-5xl leading-[0.95]">Get your free {service.short.toLowerCase()} quote</h2></Reveal>
            <Reveal delay={0.05}><p className="mt-6 max-w-md text-white/70 leading-relaxed">Tell me about your project and I'll come back with a clear, fixed-scope proposal — usually within the hour.</p></Reveal>
          </div>
          <Reveal delay={0.1}><ContactForm defaultService={service.name} compact /></Reveal>
        </div>
      </section>

      {/* CITIES (SEO) */}
      <section className="mx-auto max-w-[1400px] px-5 md:px-10 py-20">
        <Reveal><p className="overline flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-brand" /> Available in these cities</p></Reveal>
        {!countries ? (
          <div className="mt-10 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading locations…</div>
        ) : (
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8">
            {countries.map((cc) => (
              <div key={cc.slug}>
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h3 className="font-heading text-base font-bold">{cc.name}</h3>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{cc.region}</span>
                </div>
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                  {cc.cities.map((city) => (
                    <li key={city.loc_slug}>
                      <Link to={`/${service.slug}/${city.loc_slug}`} className="text-sm text-ink/60 hover:text-brand link-underline">{city.city}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
