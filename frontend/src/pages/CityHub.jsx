import Link from "@/components/CanonicalLink";
import { useParams } from "react-router-dom";

import { ArrowUpRight, MapPin, MessageCircle, Check, Star, ChevronRight } from "lucide-react";
import Seo from "@/components/Seo";
import NotFound from "@/pages/NotFound";
import { Reveal, MaskLines } from "@/components/Reveal";
import ContactForm from "@/components/ContactForm";
import GoogleBusinessCTA from "@/components/GoogleBusinessCTA";
import { SERVICES, OFFERS, waLink } from "@/data/site";
import { CITY_HUBS } from "@/data/cityHubs";
import { localBusinessSchema, faqSchema, breadcrumbSchema } from "@/lib/siteConfig";

// Map a service to a natural local search phrase for exact-match anchor text.
const SEARCH_VERB = {
  "freelance-website-developer": "Web developer",
  "freelance-app-developer": "App developer",
  "freelance-seo-expert": "SEO expert",
  "freelance-digital-marketing-consultant": "Digital marketing consultant",
  "freelance-ai-consultant": "AI consultant",
  "freelance-software-developer": "Software developer",
  "whatsapp-marketing-freelancer": "WhatsApp marketing",
  "sms-marketing-freelancer": "SMS marketing",
};

export default function CityHub() {
  const { hubSlug } = useParams();
  const hub = CITY_HUBS[hubSlug];
  if (!hub) return <NotFound />;

  const path = `/${hub.slug}`;
  const jsonLd = [
    localBusinessSchema({
      city: hub.name,
      country: "India",
      path,
      name: `Freelance web, app, SEO & marketing services in ${hub.display}`,
      areaServed: hub.areas.map((a) => a.city),
      reviews: hub.reviews,
    }),
    faqSchema(hub.faqs),
    breadcrumbSchema([
      { name: "Home", path: "" },
      { name: "Delhi NCR", path: "/delhi-ncr" },
      { name: hub.name, path },
    ]),
  ];

  const popular = SERVICES.map((s) => ({
    label: `${SEARCH_VERB[s.slug] || s.short} in ${hub.name}`,
    to: `/${s.slug}/${hub.citySlug}`,
  }));

  return (
    <div>
      <Seo
        title={`Freelance Web, App, SEO & Marketing Services in ${hub.display} | Rajeev`}
        description={`Senior freelance web & app developer, SEO expert and digital marketer in ${hub.display}. Websites from ₹4,999, same-day delivery. Free quote. Serving ${hub.region}.`}
        path={path}
        jsonLd={jsonLd}
      />

      {/* HERO */}
      <section className="mx-auto max-w-[1400px] px-5 md:px-10 pt-32 md:pt-40 pb-14">
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink/50" data-testid="cityhub-breadcrumb">
            <li><Link to="/" className="hover:text-brand">Home</Link></li>
            <li><ChevronRight className="h-3 w-3" /></li>
            <li><Link to="/delhi-ncr" className="hover:text-brand">Delhi NCR</Link></li>
            <li><ChevronRight className="h-3 w-3" /></li>
            <li className="text-ink/70 font-medium">{hub.name}</li>
          </ol>
        </nav>
        <p className="overline flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-brand" /> / Serving {hub.display}</p>
        <h1 className="mt-6 max-w-5xl font-heading font-extrabold tracking-tighter text-4xl sm:text-5xl lg:text-[4.4rem] leading-[0.92]">
          <MaskLines lines={["Websites, apps & growth", <>{hub.heroLead}</>]} />
        </h1>
        <p className="mt-8 max-w-3xl text-lg text-ink/70 leading-relaxed">{hub.intro}</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link to="/contact" data-testid="cityhub-quote-btn" className="inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 font-medium text-white hover:bg-ink transition-colors">Get a free quote <ArrowUpRight className="h-4 w-4" /></Link>
          <a href={waLink(`Hi Rajeev, I'm in ${hub.name} and need a quote.`)} target="_blank" rel="noopener noreferrer" data-testid="cityhub-whatsapp-btn" className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-7 py-3.5 font-medium hover:border-ink transition-colors"><MessageCircle className="h-4 w-4" /> WhatsApp now</a>
        </div>
      </section>

      {/* POPULAR LOCAL SEARCHES */}
      <section className="bg-white border-y border-line">
        <div className="mx-auto max-w-[1400px] px-5 md:px-10 py-16 md:py-20">
          <Reveal><p className="overline">/ Popular in {hub.name}</p></Reveal>
          <Reveal delay={0.05}><h2 className="mt-5 max-w-3xl font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl lg:text-5xl leading-[0.95]">Every service, localised for {hub.name}</h2></Reveal>
          <div className="mt-10 flex flex-wrap gap-3" data-testid="cityhub-popular-searches">
            {popular.map((l) => (
              <Link key={l.to} to={l.to} data-testid={`cityhub-search-${l.to.split("/")[1]}`} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-4 py-2.5 text-sm text-ink/70 hover:border-ink hover:text-ink transition-colors">
                <MapPin className="h-3.5 w-3.5 text-brand" /> {l.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* OFFERS */}
      <section className="mx-auto max-w-[1400px] px-5 md:px-10 py-16 md:py-20">
        <Reveal><h2 className="font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl">Launch offers for {hub.name}</h2></Reveal>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {OFFERS.map((o) => (
            <Link key={o.title} to={`/${o.slug}`} className="group rounded-2xl border border-line bg-white p-6 hover:border-ink transition-colors">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-lg font-bold tracking-tight">{o.title}</h3>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-brand transition-colors" />
              </div>
              <p className="mt-3"><span className="text-sm text-ink/50">From </span><span className="font-heading text-2xl font-extrabold text-brand">₹{o.inr}</span><span className="text-sm text-ink/50">{o.unit}</span></p>
              <p className="mt-1 text-sm text-ink/60">{o.delivery}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* AREAS × SERVICES */}
      <section className="bg-paper border-y border-line">
        <div className="mx-auto max-w-[1400px] px-5 md:px-10 py-16 md:py-24">
          <Reveal><p className="overline">/ Nearby areas</p></Reveal>
          <Reveal delay={0.05}><h2 className="mt-5 max-w-3xl font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl lg:text-5xl leading-[0.95]">Local pages around {hub.name}</h2></Reveal>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="cityhub-areas-grid">
            {hub.areas.map((a) => (
              <div key={a.slug} className="rounded-2xl border border-line bg-white p-6">
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-brand" /><h3 className="font-heading text-lg font-bold tracking-tight">{a.city}</h3></div>
                <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5">
                  {SERVICES.map((s) => (
                    <Link key={s.slug} to={`/${s.slug}/${a.slug}`} className="text-sm text-ink/60 hover:text-brand link-underline">{s.short}</Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <GoogleBusinessCTA label={hub.display} />

      {/* REVIEWS */}
      <section className="mx-auto max-w-[1400px] px-5 md:px-10 py-16 md:py-24">
        <Reveal><p className="overline">/ {hub.name} clients</p></Reveal>
        <Reveal delay={0.05}><h2 className="mt-5 max-w-3xl font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl lg:text-5xl leading-[0.95]">Trusted locally</h2></Reveal>
        <div className="mt-12 grid md:grid-cols-3 gap-4" data-testid="cityhub-reviews">
          {hub.reviews.map((r) => (
            <figure key={r.name} className="flex h-full flex-col justify-between rounded-2xl border border-line bg-white p-7">
              <div>
                <div className="flex gap-0.5">{[...Array(r.rating)].map((_, j) => <Star key={j} className="h-4 w-4 fill-coral text-coral" />)}</div>
                <blockquote className="mt-5 font-heading text-lg font-medium leading-snug tracking-tight">"{r.quote}"</blockquote>
              </div>
              <figcaption className="mt-7"><p className="font-semibold text-sm">{r.name}</p><p className="text-xs text-muted-foreground">{r.role}</p></figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white border-y border-line">
        <div className="mx-auto max-w-[900px] px-5 md:px-10 py-16 md:py-24">
          <p className="overline">/ {hub.name} FAQs</p>
          <h2 className="mt-5 font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl lg:text-5xl">Answered.</h2>
          <div className="mt-10 divide-y divide-line">
            {hub.faqs.map((f, i) => (
              <details key={f.q} className="group py-5" data-testid={`cityhub-faq-${i}`}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-heading text-lg md:text-xl font-semibold tracking-tight">
                  {f.q}
                  <span className="ml-4 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/10 text-brand transition-transform duration-300 group-open:rotate-45">+</span>
                </summary>
                <p className="mt-4 text-ink/65 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="mx-auto max-w-[1400px] px-5 md:px-10 py-16 md:py-24 grid lg:grid-cols-2 gap-14 items-start">
        <div>
          <h2 className="font-heading font-extrabold tracking-tighter text-4xl sm:text-5xl leading-[0.92]">Get your {hub.name}<br />project quote.</h2>
          <p className="mt-6 max-w-md text-ink/70 leading-relaxed">Share a short brief and get a fixed-scope proposal, usually within the hour.</p>
        </div>
        <ContactForm defaultService="Website Development" location={`${hub.name}, India`} countrySlug="india" />
      </section>
    </div>
  );
}
