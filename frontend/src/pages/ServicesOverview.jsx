import Link from "@/components/CanonicalLink";

import { ArrowUpRight, Bot, TrendingUp, Search, Code, Terminal, MessageCircle, TrendingUp as TrendUp } from "lucide-react";
import Seo from "@/components/Seo";
import { Reveal, MaskLines } from "@/components/Reveal";
import ContactForm from "@/components/ContactForm";
import { SERVICES, FEATURED_CITIES, waLink } from "@/data/site";
import { CASE_STUDIES } from "@/data/caseStudies";
import { faqSchema, breadcrumbSchema } from "@/lib/siteConfig";

const ICONS = { Bot, TrendingUp, Search, Code, Terminal, MessageCircle };

const SERVICE_FAQS = [
  { q: "What services does Rajeev offer as a freelancer?", a: "Web and mobile development, custom software, SEO and GEO (AI-search optimization), digital marketing, AI automation and chatbots, and WhatsApp/SMS marketing — all delivered personally, senior-only." },
  { q: "Can I hire Rajeev for a one-off project or ongoing work?", a: "Both. Engagements range from fixed-scope projects (a website, an automation, an SEO sprint) to ongoing monthly retainers for growth, marketing and support." },
  { q: "Which service is right for my business?", a: "If you need to be found, start with SEO + GEO. If you need to convert, start with web development. If you need to save time, start with AI automation. A free consultation maps the fastest path to ROI for your situation." },
  { q: "Do you work with clients outside India?", a: "Yes — Rajeev works remotely with founders and teams in 27+ countries, with fast, time-zone-aware communication over WhatsApp and scheduled calls." },
  { q: "How do you combine SEO, GEO and AI in one engagement?", a: "Technical SEO and structured content make you rank in Google; entity-rich, Q&A-formatted content makes AI engines cite you; and AI automation handles the follow-up so more of that traffic converts. They compound when built together." },
];

export default function ServicesOverview() {
  const jsonLd = [
    breadcrumbSchema([
      { name: "Home", path: "" },
      { name: "Services", path: "/services" },
    ]),
    faqSchema(SERVICE_FAQS),
  ];
  return (
    <div>
      <Seo
        title="Services — Web, Software, SEO, AI & WhatsApp Marketing | Rajeev Freelancer"
        description="Explore Rajeev's freelance services: website development, custom software, SEO, digital marketing, AI automation and WhatsApp marketing — delivered senior-only, worldwide."
        path="/services"
        jsonLd={jsonLd}
      />
      <section className="mx-auto max-w-[1400px] px-5 md:px-10 pt-32 md:pt-40 pb-14">
        <p className="overline">/ Services</p>
        <h1 className="mt-6 max-w-4xl font-heading font-extrabold tracking-tighter text-5xl sm:text-6xl lg:text-[5rem] leading-[0.9]">
          <MaskLines lines={["Premium services,", "obsessively", "crafted."]} />
        </h1>
        <p className="mt-8 max-w-2xl text-lg text-ink/70 leading-relaxed">
          Every engagement is treated as a flagship — designed end-to-end for outcome, not just output. Pick a service to explore it, or jump straight to your city.
        </p>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 md:px-10 pb-20">
        <div className="grid md:grid-cols-2 gap-4">
          {SERVICES.map((s, i) => {
            const Icon = ICONS[s.icon] || Code;
            return (
              <Reveal key={s.slug} delay={(i % 2) * 0.08}>
                <Link to={`/${s.slug}`} data-testid={`service-overview-${s.slug}`} className="group flex h-full items-start gap-6 rounded-2xl border border-line bg-white p-8 hover:border-ink hover:-translate-y-1 transition-[transform,border-color] duration-300">
                  <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand group-hover:bg-brand group-hover:text-white transition-colors duration-300">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-heading text-2xl font-bold tracking-tight">{s.name}</h2>
                      <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-brand transition-colors" />
                    </div>
                    <p className="mt-2 text-ink/65 leading-relaxed">{s.tagline}</p>
                    <p className="mt-4 font-mono text-xs uppercase tracking-widest text-brand">Available in {FEATURED_CITIES.length}+ cities →</p>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="bg-white border-y border-line">
        <div className="mx-auto max-w-[1400px] px-5 md:px-10 py-20 grid lg:grid-cols-2 gap-14 items-start">
          <div>
            <Reveal><p className="overline">/ Not sure which one?</p></Reveal>
            <Reveal delay={0.05}><h2 className="mt-5 font-heading font-extrabold tracking-tighter text-4xl sm:text-5xl leading-[0.95]">That's usually a good time to talk.</h2></Reveal>
            <Reveal delay={0.1}><a href={waLink()} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 font-medium text-white hover:bg-brand transition-colors">Get a quote on WhatsApp <ArrowUpRight className="h-4 w-4" /></a></Reveal>
          </div>
          <Reveal delay={0.1}><ContactForm compact /></Reveal>
        </div>
      </section>

      {/* CASE STUDIES — concrete, quotable proof */}
      <section className="mx-auto max-w-[1400px] px-5 md:px-10 py-20 md:py-28" data-testid="case-studies">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Reveal><p className="overline flex items-center gap-2"><TrendUp className="h-3.5 w-3.5 text-brand" /> / Proof, in numbers</p></Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-5 max-w-3xl font-heading font-extrabold tracking-tighter text-4xl sm:text-5xl leading-[0.95]">Results, not adjectives.</h2>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <Link to="/case-studies" data-testid="all-case-studies-link" className="inline-flex items-center gap-1.5 text-sm font-medium link-underline">All case studies <ArrowUpRight className="h-4 w-4" /></Link>
          </Reveal>
        </div>
        <div className="mt-14 grid md:grid-cols-3 gap-4">
          {CASE_STUDIES.map((cs, i) => (
            <Reveal key={cs.slug} delay={i * 0.08}>
              <Link to={`/case-studies/${cs.slug}`} data-testid={`services-case-${cs.slug}`} className="group flex h-full flex-col rounded-2xl border border-line bg-paper p-8 hover:-translate-y-1 hover:border-ink transition-[transform,border-color] duration-300">
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-brand">{cs.tag}</span>
                <p className="mt-6 font-heading text-5xl font-extrabold tracking-tighter text-ink">{cs.metric}</p>
                <p className="mt-1 text-sm text-ink/60">{cs.metricLabel}</p>
                <p className="mt-5 flex-1 text-ink/70 leading-relaxed line-clamp-3">{cs.excerpt}</p>
                <span className="mt-6 inline-flex items-center gap-1.5 border-t border-line pt-4 text-sm font-medium text-ink group-hover:text-brand transition-colors">Read the case study <ArrowUpRight className="h-4 w-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" /></span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-paper border-t border-line" data-testid="services-faq">
        <div className="mx-auto max-w-[900px] px-5 md:px-10 py-20 md:py-28">
          <Reveal><h2 className="font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl">Services FAQ</h2></Reveal>
          <div className="mt-10 divide-y divide-line">
            {SERVICE_FAQS.map((f, i) => (
              <Reveal key={f.q} delay={i * 0.05}>
                <details className="group py-5" data-testid={`services-faq-item-${i}`}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-heading text-lg font-semibold tracking-tight">
                    {f.q}
                    <span className="ml-4 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/10 text-brand transition-transform duration-300 group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-4 text-ink/65 leading-relaxed">{f.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
