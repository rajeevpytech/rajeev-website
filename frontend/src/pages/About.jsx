import Link from "@/components/CanonicalLink";

import { ArrowUpRight, Check, Award, Briefcase, Globe2 } from "lucide-react";
import Seo from "@/components/Seo";
import { Reveal, MaskLines } from "@/components/Reveal";
import Counter from "@/components/Counter";
import { visibleStats, waLink } from "@/data/site";
import { breadcrumbSchema, faqSchema } from "@/lib/siteConfig";

const ABOUT_IMG = "https://customer-assets-gfyr7b9c.emergentagent.net/job_rajeev-seo-hub/artifacts/whqtfhxo_image.png";

const EXPERTISE = [
  { icon: Briefcase, title: "12+ years, senior roles", text: "Production engineering and growth at IOG, Accenture and Google before going independent — applied directly to your project, not delegated to juniors." },
  { icon: Award, title: "Full-stack + growth", text: "Rare combination of deep engineering (React, Python, Rust, WordPress) and revenue-focused marketing (SEO, GEO, paid, AI automation) under one roof." },
  { icon: Globe2, title: "27+ countries served", text: "Remote-first delivery across time zones with fast, WhatsApp-based communication and transparent reporting on every engagement." },
];

const TIMELINE = [
  { year: "2013", title: "Started in production engineering", text: "Began building and shipping software professionally — the foundation of a hands-on, craft-first approach." },
  { year: "2016–2020", title: "IOG · Accenture · Google", text: "Senior engineering and consulting roles on large-scale systems and growth programmes for global teams." },
  { year: "2020", title: "Went independent", text: "Started taking a small number of senior-only engagements a year, delivered personally end-to-end." },
  { year: "2024–2026", title: "AI & GEO focus", text: "Doubled down on AI automation and Generative Engine Optimization — helping clients get found by both Google and AI answer engines." },
];

const ABOUT_FAQS = [
  { q: "What makes Rajeev different from an agency?", a: "You work directly with a senior specialist who does the work himself — no account managers, no offshore relays. Twelve years of judgement is in the room on every call and deliverable." },
  { q: "Is Rajeev available for long-term work?", a: "Yes — engagements range from fixed-scope projects to ongoing retainers for SEO, GEO, marketing and automation. A free consultation defines the right fit." },
  { q: "What technologies does Rajeev work with?", a: "React, Python, Rust, WordPress and modern web/software stacks, plus SEO, GEO, paid media, AI automation and WhatsApp/SMS marketing tooling." },
];

const BELIEFS = [
  { n: "01", title: "The craft, first.", text: "I write software the way a joiner cuts joinery — deliberately, and to last. If it works but reads badly, it isn't done." },
  { n: "02", title: "Growth is a system.", text: "After a decade in engineering and marketing, I've stopped believing in silver-bullet channels. Distribution is instrumentation, positioning and patience that compounds." },
  { n: "03", title: "Senior, or nothing.", text: "I take a small number of engagements a year and do the work myself. No account managers, no offshore relays — twelve years of judgement in the room." },
  { n: "04", title: "Kind, direct, on time.", text: "I show up early, tell the truth about scope, and I'm easy to work with. Everything else is theatre." },
];

export default function About() {
  const jsonLd = [
    breadcrumbSchema([
      { name: "Home", path: "" },
      { name: "About", path: "/about" },
    ]),
    faqSchema(ABOUT_FAQS),
  ];
  return (
    <div>
      <Seo
        title="About Rajeev — Senior Freelance Engineer & Consultant | Rajeev Freelancer"
        description="12+ years in production. Ex-IOG, Accenture and Google. Six years independent. Meet Rajeev, a senior freelance engineer & AI/digital marketing consultant available worldwide."
        path="/about"
        jsonLd={jsonLd}
      />
      <section className="mx-auto max-w-[1400px] px-5 md:px-10 pt-32 md:pt-40 pb-16">
        <p className="overline">/ About Rajeev</p>
        <h1 className="mt-6 max-w-4xl font-heading font-extrabold tracking-tighter text-5xl sm:text-6xl lg:text-[5rem] leading-[0.9]">
          <MaskLines lines={["A senior craftsman", "who happens", "to freelance."]} />
        </h1>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 md:px-10 pb-20 grid lg:grid-cols-12 gap-10 items-start">
        <Reveal className="lg:col-span-5">
          <img src={ABOUT_IMG} alt="Rajeev, senior freelance engineer and consultant" decoding="async" fetchPriority="high" className="w-full rounded-2xl border border-line object-cover aspect-[4/5]" />
        </Reveal>
        <Reveal delay={0.1} className="lg:col-span-7">
          <p className="text-xl md:text-2xl font-heading tracking-tight leading-snug">
            Twelve years in production. Roles at IOG, Accenture and Google. Six years independent — and every engagement done personally.
          </p>
          <p className="mt-6 text-ink/70 leading-relaxed">
            I combine deep engineering with growth marketing under one roof: websites and custom software, SEO and paid, and increasingly AI automation that compresses weeks of work into days. I work remotely with founders and teams across 27+ countries, and I keep communication fast — usually over WhatsApp.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-8">
            {visibleStats().map((s) => (
              <div key={s.label}>
                <p className="font-heading text-4xl md:text-5xl font-extrabold tracking-tighter text-brand">
                  <Counter value={s.value} suffix={s.suffix} decimals={s.decimals || 0} />
                </p>
                <p className="mt-2 text-xs uppercase tracking-wide font-mono text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-2">
            {["Full-Stack", "React", "Python", "Rust", "SEO", "Paid", "AI Automation", "WordPress"].map((t) => (
              <span key={t} className="rounded-full border border-line px-4 py-1.5 text-sm font-mono flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-brand" />{t}</span>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="bg-white border-y border-line">
        <div className="mx-auto max-w-[1400px] px-5 md:px-10 py-20 md:py-28">
          <Reveal><p className="overline">/ What I believe about the work</p></Reveal>
          <div className="mt-12 grid md:grid-cols-2 gap-px bg-line border border-line rounded-2xl overflow-hidden">
            {BELIEFS.map((b, i) => (
              <Reveal key={b.n} delay={(i % 2) * 0.1} className="bg-white">
                <div className="h-full p-8 md:p-10 hover:bg-paper transition-colors duration-500">
                  <span className="font-mono text-sm text-brand">{b.n}</span>
                  <h3 className="mt-5 font-heading text-2xl font-bold tracking-tight">{b.title}</h3>
                  <p className="mt-3 text-ink/70 leading-relaxed">{b.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* EXPERTISE / E-E-A-T */}
      <section className="mx-auto max-w-[1400px] px-5 md:px-10 py-20 md:py-28">
        <Reveal><p className="overline">/ Experience & expertise</p></Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-5 max-w-3xl font-heading font-extrabold tracking-tighter text-4xl sm:text-5xl leading-[0.95]">
            Why clients trust the work.
          </h2>
        </Reveal>
        <div className="mt-12 grid md:grid-cols-3 gap-4">
          {EXPERTISE.map((e, i) => (
            <Reveal key={e.title} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-line bg-white p-8 hover:-translate-y-1 hover:border-ink transition-[transform,border-color] duration-300">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand"><e.icon className="h-6 w-6" /></span>
                <h3 className="mt-6 font-heading text-xl font-bold tracking-tight">{e.title}</h3>
                <p className="mt-3 text-ink/65 leading-relaxed">{e.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* TIMELINE */}
      <section className="bg-paper border-y border-line">
        <div className="mx-auto max-w-[900px] px-5 md:px-10 py-20 md:py-28">
          <Reveal><p className="overline">/ The path so far</p></Reveal>
          <div className="mt-12 relative border-l border-line pl-8">
            {TIMELINE.map((t, i) => (
              <Reveal key={t.year} delay={i * 0.06}>
                <div className="relative pb-10 last:pb-0">
                  <span className="absolute -left-[41px] top-1 grid h-4 w-4 place-items-center rounded-full border-2 border-brand bg-paper">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                  </span>
                  <span className="font-mono text-sm text-brand">{t.year}</span>
                  <h3 className="mt-2 font-heading text-xl font-bold tracking-tight">{t.title}</h3>
                  <p className="mt-2 text-ink/65 leading-relaxed">{t.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[900px] px-5 md:px-10 py-20 md:py-28" data-testid="about-faq">
        <Reveal><h2 className="font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl">Common questions</h2></Reveal>
        <div className="mt-10 divide-y divide-line">
          {ABOUT_FAQS.map((f, i) => (
            <Reveal key={f.q} delay={i * 0.05}>
              <details className="group py-5" data-testid={`about-faq-item-${i}`}>
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

      <section className="mx-auto max-w-[1400px] px-5 md:px-10 py-20 md:py-28 text-center">
        <Reveal>
          <h2 className="font-heading font-extrabold tracking-tighter text-4xl sm:text-5xl lg:text-6xl leading-[0.95]">Start the conversation.</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/contact" className="inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 font-medium text-white hover:bg-ink transition-colors">Book a free consultation <ArrowUpRight className="h-4 w-4" /></Link>
            <a href={waLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-7 py-3.5 font-medium hover:border-ink transition-colors">Chat on WhatsApp</a>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
