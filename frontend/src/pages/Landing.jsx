import Link from "@/components/CanonicalLink";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Phone, MessageCircle, Code, Smartphone, TrendingUp, Search, Bot, CheckCircle2, Star, ShieldCheck, Clock, Zap, ChevronDown } from "lucide-react";
import Seo from "@/components/Seo";
import ContactForm from "@/components/ContactForm";
import { Reveal } from "@/components/Reveal";
import Counter from "@/components/Counter";
import { CONTACT, waLink, OFFERS, offerPrice, visibleStats, googleProfileUrl } from "@/data/site";
import { useOfferRegion } from "@/hooks/useOfferRegion";
import { REVIEWS, getSiteConfig, canonicalBase, breadcrumbSchema, faqSchema } from "@/lib/siteConfig";

const PATH = "/free-quote";
const PILLARS = {
  website: { icon: Code, title: "Website Development", kw: "website development", slug: "freelance-website-developer",
    text: "Fast, mobile-first business websites, WordPress builds and custom React web apps designed to convert visitors into enquiries.",
    points: ["Business & company websites", "WordPress, Shopify & custom React", "Landing pages that convert", "Speed, security & Core Web Vitals"] },
  app: { icon: Smartphone, title: "Mobile App Development", kw: "app development", slug: "freelance-app-developer",
    text: "iOS, Android and React Native apps — from MVP to App Store launch — built by a senior engineer, not a junior team.",
    points: ["Android & iOS apps", "React Native / cross-platform", "Backend, APIs & admin panels", "App Store & Play Store launch"] },
  marketing: { icon: TrendingUp, title: "Digital Marketing & SEO", kw: "digital marketing", slug: "freelance-digital-marketing-consultant",
    text: "Google Ads, SEO, WhatsApp automation and AI-search visibility engineered around leads and revenue — not vanity metrics.",
    points: ["Google Ads & Meta Ads management", "SEO, local SEO & technical SEO", "WhatsApp & SMS marketing automation", "AI chatbots & lead nurturing"] },
};
const ORDER = { website: ["website", "app", "marketing"], app: ["app", "website", "marketing"], marketing: ["marketing", "website", "app"] };
const HEADLINES = {
  website: "Need a website that actually brings customers?",
  app: "Launch your mobile app with a senior freelance developer",
  marketing: "Get more leads with expert digital marketing & SEO",
  default: "Website, App & Digital Marketing — one senior freelancer, zero agency overhead",
};
const FAQS = [
  { q: "How quickly can you start my website, app or marketing project?", a: "Usually within 24–48 hours of our first call. Simple business websites can go live the same day; apps and marketing campaigns start with a short kickoff and a clear timeline." },
  { q: "What does a website, app or digital marketing project cost?", a: "Business websites start at ₹4,999 / $99, mobile apps from ₹9,999 / $399, SEO from ₹6,999 / $129 per month and managed Google Ads from ₹9,999 / $199 per month. You get a fixed written quote before any work begins." },
  { q: "Do you work with businesses outside India?", a: "Yes. I'm based in Gurgaon (Delhi NCR) and work with clients across India, Dubai, London, Singapore, Australia and the USA, with communication over WhatsApp, email and video calls in your time zone." },
  { q: "Why hire a freelancer instead of an agency?", a: "You work directly with the senior engineer who builds and markets your product — faster decisions, lower cost and full accountability, with no account managers or hand-offs." },
  { q: "Will I own the website, app and ad accounts?", a: "Always. You own the code, hosting, domains, Google Ads and analytics accounts. I set everything up in your name and hand over full access and documentation." },
];

function Pillar({ p, i }) {
  const Icon = p.icon;
  return (
    <Reveal delay={i * 0.08}>
      <div data-testid={`landing-pillar-${p.kw.split(" ")[0]}`} className="h-full rounded-2xl border border-line bg-white p-7 hover:border-ink transition-colors">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand"><Icon className="h-5 w-5" /></span>
        <h3 className="mt-5 font-heading text-xl font-bold tracking-tight">{p.title}</h3>
        <p className="mt-2 text-sm text-ink/70 leading-relaxed">{p.text}</p>
        <ul className="mt-4 space-y-2">
          {p.points.map((pt) => <li key={pt} className="flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {pt}</li>)}
        </ul>
        <Link to={`/${p.slug}`} className="mt-5 inline-flex items-center gap-1 text-sm font-medium link-underline">Learn more <ArrowUpRight className="h-3.5 w-3.5" /></Link>
      </div>
    </Reveal>
  );
}

export default function Landing() {
  const [params] = useSearchParams();
  const { inIndia } = useOfferRegion();
  const cfg = getSiteConfig();
  const base = canonicalBase();
  const svc = (params.get("svc") || "").toLowerCase();
  const focus = PILLARS[svc] ? svc : "default";
  const kw = params.get("kw") || (PILLARS[svc]?.kw ?? "");
  const headline = params.get("headline") || (kw && focus === "default" ? `Looking for expert ${kw}? Work directly with a senior freelancer.` : HEADLINES[focus]);
  const sub = params.get("sub") || "12+ years building websites, mobile apps and marketing systems for businesses in Gurgaon, Delhi NCR and 27+ countries. Fixed quotes, fast delivery, direct communication.";
  const cta = params.get("cta") || "Get my free quote";
  const order = ORDER[svc] || ORDER.website;
  const defaultService = PILLARS[svc]?.title || "";

  const jsonLd = useMemo(() => [
    { "@context": "https://schema.org", "@type": "WebPage", "@id": `${base}${PATH}`, url: `${base}${PATH}`, name: "Free Quote — Website, App & Digital Marketing Services",
      description: "Get a free, fixed-price quote for website development, mobile app development, SEO and digital marketing from a senior freelancer in Gurgaon, Delhi NCR — serving clients worldwide.",
      isPartOf: { "@id": `${base}/#website` }, about: { "@id": `${base}/#organization` } },
    { "@context": "https://schema.org", "@type": "Service", name: "Website, App Development & Digital Marketing Services", serviceType: ["Website Development", "Mobile App Development", "Digital Marketing", "SEO"],
      provider: { "@id": `${base}/#organization` }, areaServed: ["Gurgaon", "Delhi NCR", "India", "Dubai", "London", "Singapore", "Australia", "USA"], url: `${base}${PATH}`,
      offers: OFFERS.map((o) => ({ "@type": "Offer", name: o.title, price: o.inr.replace(/,/g, ""), priceCurrency: "INR", url: `${base}/${o.slug}` })) },
    breadcrumbSchema([{ name: "Home", path: "" }, { name: "Free quote", path: PATH }]),
    faqSchema(FAQS),
  ], [base]);

  const scrollToForm = () => document.getElementById("quote-form")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="grain bg-paper min-h-screen" data-testid="landing-page">
      <Seo title="Free Quote: Website, App Development & Digital Marketing Expert | Rajeev Freelancer" description="Get a free fixed-price quote for website development, mobile app development, SEO & digital marketing. Senior freelancer in Gurgaon / Delhi NCR serving India, Dubai, UK, USA & more. Reply within 30 minutes." path={PATH} jsonLd={jsonLd} />

      <header className="sticky top-0 z-40 border-b border-line/60 bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 md:px-10 py-3">
          <Link to="/" className="flex items-center gap-2" data-testid="landing-logo">
            <img src={cfg.business.logo} alt={cfg.business.founder_name} className="h-9 w-9 rounded-full object-cover border border-line" />
            <span className="font-heading font-bold tracking-tight">{cfg.seo.site_name}</span>
          </Link>
          <div className="flex items-center gap-2">
            <a href={`tel:${CONTACT.phone}`} data-testid="landing-call" className="hidden sm:inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-ink transition-colors"><Phone className="h-4 w-4" /> {CONTACT.whatsappDisplay}</a>
            <a href={waLink("Hi Rajeev, I came from your ad and I'd like a free quote.")} target="_blank" rel="noopener noreferrer" data-testid="landing-whatsapp" className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-medium text-white hover:bg-ink transition-colors"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-brand/15 blur-3xl" />
        <div className="mx-auto grid max-w-[1200px] gap-10 px-5 md:px-10 pt-12 md:pt-20 pb-14 lg:grid-cols-[1.1fr_.9fr] lg:items-start">
          <div>
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="overline text-brand">Free quote · Reply within 30 minutes · Gurgaon, Delhi NCR & worldwide</motion.p>
            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} data-testid="landing-headline" className="mt-4 font-heading font-extrabold tracking-tighter text-4xl sm:text-5xl lg:text-6xl leading-[0.98]">{headline}</motion.h1>
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} data-testid="landing-sub" className="mt-6 max-w-xl text-base md:text-lg text-ink/70 leading-relaxed">{sub}</motion.p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={scrollToForm} data-testid="landing-cta" className="inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 font-medium text-white hover:bg-ink transition-colors">{cta} <ArrowUpRight className="h-4 w-4" /></button>
              <a href={`tel:${CONTACT.phone}`} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-6 py-3.5 font-medium hover:border-ink transition-colors"><Phone className="h-4 w-4" /> Call now</a>
            </div>
            <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm" data-testid="landing-trust">
              {[["Fixed-price quotes", ShieldCheck], ["Same-day websites", Zap], ["Direct with Rajeev", Star], ["12+ yrs experience", Clock]].map(([t, I]) => (
                <li key={t} className="flex items-center gap-2 text-ink/80"><I className="h-4 w-4 text-brand" /> {t}</li>
              ))}
            </ul>
            <a href={googleProfileUrl()} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm text-ink/70 hover:text-ink">
              <span>Find the current reviews on Google</span>
            </a>
          </div>
          <div id="quote-form" className="lg:sticky lg:top-24 scroll-mt-24">
            <div className="rounded-3xl bg-ink p-1.5 shadow-2xl shadow-brand/10">
              <div className="rounded-[20px] bg-white">
                <div className="px-6 pt-6">
                  <p className="font-heading text-xl font-bold tracking-tight">Tell me about your project</p>
                  <p className="mt-1 text-sm text-ink/60">Website · App · Marketing — get a fixed quote, no obligation.</p>
                </div>
                <ContactForm compact defaultService={defaultService} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-6 px-5 md:px-10 py-10 md:grid-cols-4" data-testid="landing-stats">
          {visibleStats().map((s) => (
            <div key={s.label}>
              <p className="font-heading text-3xl md:text-4xl font-extrabold tracking-tighter"><Counter value={s.value} suffix={s.suffix} decimals={s.decimals} /></p>
              <p className="mt-1 text-xs font-mono uppercase tracking-wide text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 md:px-10 py-16 md:py-24">
        <Reveal><p className="overline">/ What I do</p><h2 className="mt-3 font-heading text-3xl md:text-4xl font-extrabold tracking-tighter">Website development, app development &amp; digital marketing — under one roof</h2></Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">{order.map((k, i) => <Pillar key={k} p={PILLARS[k]} i={i} />)}</div>
      </section>

      <section className="bg-ink text-white">
        <div className="mx-auto max-w-[1200px] px-5 md:px-10 py-16 md:py-24">
          <Reveal><p className="overline text-white/50">/ Launch offers</p><h2 className="mt-3 font-heading text-3xl md:text-4xl font-extrabold tracking-tighter">Transparent pricing. Fast delivery.</h2></Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="landing-offers">
            {OFFERS.map((o, i) => {
              const price = offerPrice(o, inIndia);
              const Icon = { Code, Smartphone, Search, Bot, MessageCircle, TrendingUp }[o.icon] || Code;
              return (
                <Reveal key={o.title} delay={i * 0.05}>
                  <div className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 hover:bg-white/[0.08] transition-colors">
                    <div className="flex items-center justify-between"><Icon className="h-5 w-5 text-brand" /><span className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-mono uppercase tracking-wide text-white/70">{o.tag}</span></div>
                    <h3 className="mt-4 font-heading text-lg font-bold">{o.title}</h3>
                    <p className="mt-2 font-heading text-3xl font-extrabold tracking-tighter">{price.sym}{price.amt}<span className="text-base font-medium text-white/60">{price.unit}</span></p>
                    <p className="mt-1 text-sm text-white/60">{o.delivery}</p>
                    <button onClick={scrollToForm} className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-white transition-colors">Claim this offer <ArrowUpRight className="h-3.5 w-3.5" /></button>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 md:px-10 py-16 md:py-24">
        <Reveal><p className="overline">/ How it works</p><h2 className="mt-3 font-heading text-3xl md:text-4xl font-extrabold tracking-tighter">From enquiry to launch in 4 simple steps</h2></Reveal>
        <ol className="mt-10 grid gap-5 md:grid-cols-4" data-testid="landing-process">
          {[["Send your brief", "Fill the form or WhatsApp me. I reply within 30 minutes during working hours."], ["Free consultation", "A 20-minute call to understand goals, scope and budget — no sales pressure."], ["Fixed quote & plan", "You get a written quote, timeline and milestones before any work starts."], ["Build, launch, grow", "Weekly updates, on-time delivery and marketing that turns traffic into leads."]].map(([t, d], i) => (
            <li key={t} className="rounded-2xl border border-line bg-white p-6"><span className="font-mono text-xs text-brand">0{i + 1}</span><h3 className="mt-3 font-heading text-lg font-bold">{t}</h3><p className="mt-2 text-sm text-ink/70 leading-relaxed">{d}</p></li>
          ))}
        </ol>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-[1200px] px-5 md:px-10 py-16 md:py-24">
          <Reveal><p className="overline">/ Client reviews</p><h2 className="mt-3 font-heading text-3xl md:text-4xl font-extrabold tracking-tighter">Trusted by founders and marketing teams worldwide</h2></Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3" data-testid="landing-reviews">
            {REVIEWS.slice(0, 3).map((r) => (
              <figure key={r.name} className="rounded-2xl border border-line bg-paper p-6">
                <div className="flex">{[...Array(r.rating)].map((_, i) => <Star key={i} className="h-4 w-4 fill-[#FBBC05] text-[#FBBC05]" />)}</div>
                <blockquote className="mt-4 text-sm text-ink/80 leading-relaxed">“{r.quote}”</blockquote>
                <figcaption className="mt-4 flex items-center gap-3"><img src={r.img} alt={r.name} loading="lazy" className="h-9 w-9 rounded-full object-cover" /><div><p className="text-sm font-semibold">{r.name}</p><p className="text-xs text-ink/60">{r.role} · {r.location}</p></div></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[900px] px-5 md:px-10 py-16 md:py-24">
        <Reveal><p className="overline">/ FAQ</p><h2 className="mt-3 font-heading text-3xl md:text-4xl font-extrabold tracking-tighter">Questions before you request a quote</h2></Reveal>
        <div className="mt-8 divide-y divide-line rounded-2xl border border-line bg-white" data-testid="landing-faq">
          {FAQS.map((f) => (
            <details key={f.q} className="group px-6 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">{f.q}<ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
              <p className="mt-3 text-sm text-ink/70 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 md:px-10 pb-28 md:pb-24">
        <div className="rounded-3xl bg-brand p-8 md:p-14 text-white text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-extrabold tracking-tighter">Ready to grow your business online?</h2>
          <p className="mt-3 text-white/85">Get a free, fixed-price quote for your website, app or marketing campaign today.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button onClick={scrollToForm} data-testid="landing-cta-bottom" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-medium text-ink hover:bg-ink hover:text-white transition-colors">{cta} <ArrowUpRight className="h-4 w-4" /></button>
            <a href={waLink("Hi Rajeev, I came from your ad and I'd like a free quote.")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3.5 font-medium hover:bg-white/10 transition-colors"><MessageCircle className="h-4 w-4" /> WhatsApp me</a>
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-5 md:px-10 py-6 text-xs text-ink/60">
          <p>© {new Date().getFullYear()} {cfg.seo.site_name} · Gurgaon, Delhi NCR · Serving clients worldwide</p>
          <p data-testid="landing-public-contact" className="flex flex-wrap items-center gap-x-3 gap-y-1">{CONTACT.email && <a href={`mailto:${CONTACT.email}`} className="break-all hover:text-ink hover:underline">Email: {CONTACT.email}</a>}{CONTACT.phone && <a href={`tel:${CONTACT.phone}`} className="hover:text-ink hover:underline">Phone: {CONTACT.phone}</a>}</p>
          <nav className="flex flex-wrap gap-4"><Link to="/" className="hover:text-ink">Home</Link><Link to="/services" className="hover:text-ink">Services</Link><Link to="/case-studies" className="hover:text-ink">Case studies</Link><Link to="/pricing" className="hover:text-ink">Pricing</Link><Link to="/contact" className="hover:text-ink">Contact</Link></nav>
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 gap-2 border-t border-line bg-white/95 p-2 backdrop-blur md:hidden" data-testid="landing-mobile-bar">
        <a href={`tel:${CONTACT.phone}`} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line py-3 text-sm font-medium"><Phone className="h-4 w-4" /> Call</a>
        <a href={waLink("Hi Rajeev, I came from your ad and I'd like a free quote.")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] py-3 text-sm font-medium text-white"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
        <button onClick={scrollToForm} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand py-3 text-sm font-medium text-white">Get quote</button>
      </div>
    </div>
  );
}
