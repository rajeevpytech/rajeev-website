import Link from "@/components/CanonicalLink";

import { ArrowUpRight, MapPin, MessageCircle, Check, Star, ChevronRight } from "lucide-react";
import Seo from "@/components/Seo";
import { Reveal, MaskLines } from "@/components/Reveal";
import ContactForm from "@/components/ContactForm";
import { SERVICES, NCR_AREAS, OFFERS, waLink } from "@/data/site";
import { localBusinessSchema, getSiteConfig, faqSchema, breadcrumbSchema } from "@/lib/siteConfig";

const NCR_REVIEWS = [
  { name: "Ankit Sharma", role: "Founder, D2C brand · Gurgaon", rating: 5, quote: "Rajeev rebuilt our website and set up Google Ads — leads doubled in the first month. Fast, senior and always on WhatsApp." },
  { name: "Priya Malhotra", role: "Clinic owner · Noida", rating: 5, quote: "Ranked us on the first page of Google for our locality in Noida within a few months. Genuinely understands local SEO." },
  { name: "Rahul Verma", role: "Restaurant group · Delhi", rating: 5, quote: "Built our ordering app and a WhatsApp automation. Delivery was on time and the support afterwards has been excellent." },
];

// Exact-match local keyword anchors -> the matching programmatic location pages (strong internal linking).
const POPULAR_SEARCHES = [
  { label: "Freelance web developer in Gurgaon", to: "/freelance-website-developer/gurgaon-india" },
  { label: "SEO expert in Noida", to: "/freelance-seo-expert/noida-india" },
  { label: "App developer in Delhi", to: "/freelance-app-developer/delhi-india" },
  { label: "Digital marketing consultant in Faridabad", to: "/freelance-digital-marketing-consultant/faridabad-india" },
  { label: "AI consultant in Ghaziabad", to: "/freelance-ai-consultant/ghaziabad-india" },
  { label: "WhatsApp marketing in Gurgaon", to: "/whatsapp-marketing-freelancer/gurgaon-india" },
  { label: "Website developer in Greater Noida", to: "/freelance-website-developer/greater-noida-india" },
  { label: "SEO expert in Delhi", to: "/freelance-seo-expert/delhi-india" },
  { label: "Software developer in Noida", to: "/freelance-software-developer/noida-india" },
  { label: "App developer in Gurgaon", to: "/freelance-app-developer/gurgaon-india" },
];

const NCR_FAQS = [
  { q: "Who is the best freelance web developer in Delhi NCR?", a: "Rajeev is a senior freelance engineer and consultant with 12+ years of experience (ex-IOG, Accenture, Google), serving Delhi, Gurgaon, Noida, Greater Noida, Faridabad and Ghaziabad. You work with him directly — no agency, no junior staff." },
  { q: "How fast can you deliver a website in Delhi NCR?", a: "A standard business website starts at ₹4,999 with same-day delivery. Mobile apps start at ₹9,999 and are typically ready within a week. Every project begins with a free consultation and a fixed-scope quote." },
  { q: "Do you meet clients in person in Gurgaon or Noida?", a: "Most work is delivered remotely with fast WhatsApp communication, but being based in the NCR, in-person or video calls for Gurgaon, Noida, Delhi and nearby areas can be arranged when needed." },
  { q: "Which services do you offer across Delhi NCR?", a: "Website & app development, SEO and GEO (AI-search) optimisation, Google Ads and digital marketing, AI chatbots and automation, plus WhatsApp and SMS marketing — for businesses across all of Delhi NCR." },
  { q: "How do I get started?", a: "Message on WhatsApp or send a short brief through the contact form. You'll usually get a reply within the hour and a fixed-scope proposal the same day." },
];

export default function DelhiNCR() {
  const path = "/delhi-ncr";
  const jsonLd = [
    localBusinessSchema({
      city: "Delhi NCR",
      country: "India",
      path,
      name: "Freelance web, app, SEO & marketing services across Delhi NCR",
      areaServed: ["Delhi", "Gurgaon", "Noida", "Greater Noida", "Faridabad", "Ghaziabad"],
      reviews: NCR_REVIEWS,
    }),
    faqSchema(NCR_FAQS),
    breadcrumbSchema([
      { name: "Home", path: "" },
      { name: "Delhi NCR", path },
    ]),
  ];

  return (
    <div>
      <Seo
        title="Freelance Web, App, SEO & Marketing Services in Delhi NCR | Rajeev"
        description="Senior freelance web & app developer, SEO expert and digital marketer serving Delhi, Gurgaon, Noida, Faridabad & Ghaziabad. Websites from ₹4,999, same-day delivery. Free quote."
        path={path}
        jsonLd={jsonLd}
      />

      {/* HERO */}
      <section className="mx-auto max-w-[1400px] px-5 md:px-10 pt-32 md:pt-40 pb-14">
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-1.5 text-xs text-ink/50" data-testid="ncr-breadcrumb">
            <li><Link to="/" className="hover:text-brand">Home</Link></li>
            <li><ChevronRight className="h-3 w-3" /></li>
            <li className="text-ink/70 font-medium">Delhi NCR</li>
          </ol>
        </nav>
        <p className="overline flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-brand" /> / Serving Delhi NCR</p>
        <h1 className="mt-6 max-w-5xl font-heading font-extrabold tracking-tighter text-4xl sm:text-5xl lg:text-[4.4rem] leading-[0.92]">
          <MaskLines lines={["Websites, apps & growth", <>for <span className="text-shimmer">Delhi NCR</span> businesses.</>]} />
        </h1>
        <p className="mt-8 max-w-3xl text-lg text-ink/70 leading-relaxed">
          A senior freelancer for Delhi, Gurgaon, Noida, Greater Noida, Faridabad and Ghaziabad — with 12+ years' experience across web, apps, SEO, AI automation and marketing. Direct, senior-only, and fast. Websites start at <strong>₹4,999 with same-day delivery</strong>.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link to="/contact" data-testid="ncr-quote-btn" className="inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 font-medium text-white hover:bg-ink transition-colors">Get a free quote <ArrowUpRight className="h-4 w-4" /></Link>
          <a href={waLink("Hi Rajeev, I'm in Delhi NCR and need a quote.")} target="_blank" rel="noopener noreferrer" data-testid="ncr-whatsapp-btn" className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-7 py-3.5 font-medium hover:border-ink transition-colors"><MessageCircle className="h-4 w-4" /> WhatsApp now</a>
        </div>
      </section>

      {/* OFFERS RECAP */}
      <section className="bg-white border-y border-line">
        <div className="mx-auto max-w-[1400px] px-5 md:px-10 py-16">
          <Reveal><h2 className="font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl">Launch offers for NCR</h2></Reveal>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {OFFERS.map((o) => (
              <Link key={o.title} to={`/${o.slug}`} className="group rounded-2xl border border-line bg-paper p-6 hover:border-ink transition-colors">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-lg font-bold tracking-tight">{o.title}</h3>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-brand transition-colors" />
                </div>
                <p className="mt-3"><span className="text-sm text-ink/50">From </span><span className="font-heading text-2xl font-extrabold text-brand">₹{o.inr}</span><span className="text-sm text-ink/50">{o.unit}</span></p>
                <p className="mt-1 text-sm text-ink/60">{o.delivery}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* AREAS × SERVICES — strong internal linking to every NCR location page */}
      <section className="mx-auto max-w-[1400px] px-5 md:px-10 py-16 md:py-24">
        <Reveal><p className="overline">/ Every area, every service</p></Reveal>
        <Reveal delay={0.05}><h2 className="mt-5 max-w-3xl font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl lg:text-5xl leading-[0.95]">Local pages across all of Delhi NCR</h2></Reveal>
        <p className="mt-5 max-w-2xl text-ink/70">Pick your area to see localized services, pricing and FAQs for {NCR_AREAS.length} NCR locations.</p>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="ncr-areas-grid">
          {NCR_AREAS.map((a) => (
            <div key={a.slug} className="rounded-2xl border border-line bg-white p-6">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand" />
                <h3 className="font-heading text-lg font-bold tracking-tight">{a.city}</h3>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5">
                {SERVICES.map((s) => (
                  <Link key={s.slug} to={`/${s.slug}/${a.slug}`} data-testid={`ncr-link-${s.slug}-${a.slug}`} className="text-sm text-ink/60 hover:text-brand link-underline">{s.short}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* POPULAR LOCAL SEARCHES — exact-match keyword internal links */}
      <section className="mx-auto max-w-[1400px] px-5 md:px-10 py-16 md:py-20">
        <Reveal><p className="overline">/ Popular local searches</p></Reveal>
        <Reveal delay={0.05}><h2 className="mt-5 max-w-3xl font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl lg:text-5xl leading-[0.95]">What NCR businesses search for</h2></Reveal>
        <p className="mt-5 max-w-2xl text-ink/70">Jump straight to the service and area you need — each page has localized pricing, deliverables and FAQs.</p>
        <div className="mt-10 flex flex-wrap gap-3" data-testid="ncr-popular-searches">
          {POPULAR_SEARCHES.map((l) => (
            <Link key={l.to} to={l.to} data-testid={`ncr-search-${l.to.split("/").pop()}`} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2.5 text-sm text-ink/70 hover:border-ink hover:text-ink transition-colors">
              <MapPin className="h-3.5 w-3.5 text-brand" /> {l.label}
            </Link>
          ))}
        </div>
      </section>

      {/* LOCAL REVIEWS */}
      {getSiteConfig().business.testimonials_verified && <section className="bg-paper border-y border-line">
        <div className="mx-auto max-w-[1400px] px-5 md:px-10 py-16 md:py-24">
          <Reveal><p className="overline">/ Delhi NCR clients</p></Reveal>
          <Reveal delay={0.05}><h2 className="mt-5 max-w-3xl font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl lg:text-5xl leading-[0.95]">Trusted by local businesses</h2></Reveal>
          <div className="mt-12 grid md:grid-cols-3 gap-4" data-testid="ncr-reviews">
            {NCR_REVIEWS.map((r) => (
              <figure key={r.name} className="flex h-full flex-col justify-between rounded-2xl border border-line bg-white p-7">
                <div>
                  <div className="flex gap-0.5">{[...Array(r.rating)].map((_, j) => <Star key={j} className="h-4 w-4 fill-coral text-coral" />)}</div>
                  <blockquote className="mt-5 font-heading text-lg font-medium leading-snug tracking-tight">"{r.quote}"</blockquote>
                </div>
                <figcaption className="mt-7">
                  <p className="font-semibold text-sm">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>}

      {/* WHY LOCAL */}
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-[1400px] px-5 md:px-10 py-16 md:py-24">
          <h2 className="max-w-3xl font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl lg:text-5xl">Why NCR businesses choose Rajeev</h2>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { t: "Same-day websites", d: "Get online today from ₹4,999 — no month-long agency timelines." },
              { t: "Senior, hands-on", d: "12+ years, ex-IOG/Accenture/Google. You deal with Rajeev directly." },
              { t: "Local + remote", d: "Based in the NCR with fast WhatsApp comms and calls when needed." },
              { t: "Rank on Google & AI", d: "SEO + GEO so you show up in search and in AI answers." },
              { t: "Leads on autopilot", d: "Google Ads, WhatsApp automation and chatbots that capture enquiries." },
              { t: "Transparent pricing", d: "Fixed-scope quotes after a free consultation — no surprises." },
            ].map((w) => (
              <div key={w.t} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand/20 text-brand"><Check className="h-5 w-5" /></span>
                <h3 className="mt-4 font-heading text-lg font-bold">{w.t}</h3>
                <p className="mt-2 text-sm text-white/60 leading-relaxed">{w.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white border-y border-line">
        <div className="mx-auto max-w-[900px] px-5 md:px-10 py-16 md:py-24">
          <p className="overline">/ Delhi NCR FAQs</p>
          <h2 className="mt-5 font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl lg:text-5xl">Answered.</h2>
          <div className="mt-10 divide-y divide-line">
            {NCR_FAQS.map((f, i) => (
              <details key={f.q} className="group py-5" data-testid={`ncr-faq-${i}`}>
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
          <h2 className="font-heading font-extrabold tracking-tighter text-4xl sm:text-5xl leading-[0.92]">Get your NCR<br />project quote.</h2>
          <p className="mt-6 max-w-md text-ink/70 leading-relaxed">Share a short brief and get a fixed-scope proposal, usually within the hour.</p>
        </div>
        <ContactForm defaultService="Website Development" location="Delhi NCR, India" countrySlug="india" />
      </section>
    </div>
  );
}
