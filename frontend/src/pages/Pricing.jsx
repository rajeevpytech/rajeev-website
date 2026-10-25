import Link from "@/components/CanonicalLink";

import { motion } from "framer-motion";
import { Check, ArrowUpRight, Sparkles } from "lucide-react";
import Seo from "@/components/Seo";
import { Reveal, MaskLines } from "@/components/Reveal";
import ContactForm from "@/components/ContactForm";
import { useCurrency } from "@/hooks/useCurrency";
import { waLink } from "@/data/site";
import { faqSchema, breadcrumbSchema } from "@/lib/siteConfig";

const PRICING_FAQS = [
  { q: "How much does it cost to hire a freelancer like Rajeev?", a: "Fixed-scope projects typically start around the Launch tier (a sharp site or funnel) and scale up for custom builds, software and ongoing growth. Every quote is fixed in writing after a free consultation, so there are no surprises." },
  { q: "Why are prices shown in my local currency?", a: "Prices are anchored in INR and converted live at current exchange rates to the currency detected for your location, so you see a realistic figure instantly. Your final quote is fixed in your own currency." },
  { q: "What's included in a fixed-scope package?", a: "Each package lists exactly what you get — design, build, SEO setup, automation and support as applicable. Scope, timeline and deliverables are agreed up front and put in writing before any work starts." },
  { q: "Do you offer monthly retainers?", a: "Yes. Beyond one-off projects, the Scale tier and custom retainers cover ongoing SEO, GEO, paid growth, automation and support with monthly strategy and reporting." },
  { q: "Is there a free consultation?", a: "Yes — every engagement begins with a free consultation to understand your goals and recommend the fastest path to ROI, followed by a written, fixed-price proposal." },
  { q: "What if my project doesn't fit a package?", a: "Most projects are scoped bespoke. Share what you're building on WhatsApp or the contact form and you'll get a tailored, fixed-price proposal — usually within the hour." },
];

const TIERS = [
  {
    name: "Launch", inr: 9900, cadence: "project",
    tagline: "For a sharp, fast site or landing funnel.",
    features: ["1–5 page website or landing funnel", "Mobile-first, SEO-ready build", "Contact form + WhatsApp", "Basic on-page SEO", "1 round of revisions", "Delivery in ~1–2 weeks"],
  },
  {
    name: "Growth", inr: 30000, cadence: "project", featured: true,
    tagline: "Custom build + marketing engine to compound.",
    features: ["Custom website or web app", "Technical + content SEO setup", "AI automation / chatbot integration", "WhatsApp marketing setup", "Analytics + conversion tracking", "Priority WhatsApp support"],
  },
  {
    name: "Scale", inr: 120000, cadence: "project",
    tagline: "Full software + growth partnership.",
    features: ["Custom software / platform build", "Ongoing SEO & paid growth", "Advanced AI workflows & agents", "Lifecycle & WhatsApp automation", "Monthly strategy + reporting", "Senior, hands-on partnership"],
  },
];

export default function Pricing() {
  const { currency, detected, price, ready } = useCurrency();

  const jsonLd = [
    breadcrumbSchema([
      { name: "Home", path: "" },
      { name: "Pricing", path: "/pricing" },
    ]),
    faqSchema(PRICING_FAQS),
  ];

  return (
    <div>
      <Seo
        title="Pricing & Packages — Freelance Web, SEO & AI | Rajeev Freelancer"
        description="Transparent freelance pricing for web development, SEO, AI automation and WhatsApp marketing — shown in your local currency. Start with a free consultation."
        path="/pricing"
        jsonLd={jsonLd}
      />
      <section className="mx-auto max-w-[1400px] px-5 md:px-10 pt-32 md:pt-40 pb-8">
        <p className="overline">/ Pricing & Packages</p>
        <h1 className="mt-6 max-w-4xl font-heading font-extrabold tracking-tighter text-5xl sm:text-6xl lg:text-[5rem] leading-[0.9]">
          <MaskLines lines={["Clear pricing.", <>No <span className="text-shimmer">surprises.</span></>]} />
        </h1>
        <p className="mt-8 max-w-2xl text-lg text-ink/70 leading-relaxed">
          Fixed-scope packages, priced in your local currency{detected ? ` (detected: ${detected})` : ""}. Every engagement starts with a free consultation and a written proposal.
        </p>
        <p className="mt-2 font-mono text-xs uppercase tracking-widest text-brand">Live rates · shown in {currency}</p>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 md:px-10 pb-20">
        <div className="grid lg:grid-cols-3 gap-4">
          {TIERS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08}>
              <motion.div
                whileHover={{ y: -6 }}
                className={`relative flex h-full flex-col rounded-3xl border p-8 ${t.featured ? "border-brand bg-ink text-white shadow-2xl shadow-brand/20" : "border-line bg-white"}`}
                data-testid={`pricing-tier-${t.name.toLowerCase()}`}
              >
                {t.featured && (
                  <span className="absolute -top-3 left-8 inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-xs font-medium text-white"><Sparkles className="h-3.5 w-3.5" /> Most popular</span>
                )}
                <p className={`font-mono text-xs uppercase tracking-[0.2em] ${t.featured ? "text-white/60" : "text-muted-foreground"}`}>{t.name}</p>
                <div className="mt-5 flex items-end gap-1">
                  <span className={`font-mono text-sm ${t.featured ? "text-white/60" : "text-muted-foreground"}`}>from</span>
                  <span className="font-heading text-5xl font-extrabold tracking-tighter">{price(t.inr)}</span>
                </div>
                <p className={`mt-1 text-xs ${t.featured ? "text-white/50" : "text-muted-foreground"}`}>per {t.cadence}</p>
                <p className={`mt-5 text-sm leading-relaxed ${t.featured ? "text-white/75" : "text-ink/65"}`}>{t.tagline}</p>
                <ul className="mt-7 space-y-3 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${t.featured ? "text-brand" : "text-brand"}`} />
                      <span className={t.featured ? "text-white/85" : "text-ink/75"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/contact"
                  data-testid={`pricing-cta-${t.name.toLowerCase()}`}
                  className={`mt-8 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 font-medium transition-colors duration-300 ${t.featured ? "bg-white text-ink hover:bg-brand hover:text-white" : "bg-ink text-white hover:bg-brand"}`}
                >
                  Get started <ArrowUpRight className="h-4 w-4" />
                </Link>
              </motion.div>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">Prices are indicative, anchored in INR and shown live in your local currency at current exchange rates. Final quotes are fixed in your currency after a free consultation.</p>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[900px] px-5 md:px-10 py-20 md:py-28" data-testid="pricing-faq">
        <Reveal><h2 className="font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl">Pricing questions</h2></Reveal>
        <div className="mt-10 divide-y divide-line">
          {PRICING_FAQS.map((f, i) => (
            <Reveal key={f.q} delay={i * 0.05}>
              <details className="group py-5" data-testid={`pricing-faq-item-${i}`}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-heading text-lg font-semibold tracking-tight">
                  {f.q}
                  <span className="ml-4 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/10 text-brand transition-transform duration-300 group-open:rotate-45">+</span>
                </summary>
                <p className="mt-4 text-ink/65 leading-relaxed">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-white border-y border-line">
        <div className="mx-auto max-w-[1400px] px-5 md:px-10 py-20 grid lg:grid-cols-2 gap-14 items-start">
          <div>
            <Reveal><h2 className="font-heading font-extrabold tracking-tighter text-4xl sm:text-5xl leading-[0.95]">Need something custom?</h2></Reveal>
            <Reveal delay={0.05}><p className="mt-6 max-w-md text-ink/70 leading-relaxed">Most projects are scoped bespoke. Tell me what you're building and I'll send a fixed-price proposal in your currency — usually within the hour.</p></Reveal>
            <Reveal delay={0.1}><a href={waLink()} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 font-medium text-white hover:bg-ink transition-colors">Ask on WhatsApp <ArrowUpRight className="h-4 w-4" /></a></Reveal>
          </div>
          <Reveal delay={0.1}><ContactForm compact /></Reveal>
        </div>
      </section>
    </div>
  );
}
