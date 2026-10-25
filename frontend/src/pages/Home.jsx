import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowRight, Bot, Check, Code2, ExternalLink, Layers3, MapPin, MessageCircle, Smartphone } from "lucide-react";
import Link from "@/components/CanonicalLink";
import Seo from "@/components/Seo";
import ContactForm from "@/components/ContactForm";
import { WorkCard } from "@/components/WorkCard";
import { api } from "@/lib/api";
import { CONTACT, waLink } from "@/data/site";
import { faqSchema, localBusinessSchema } from "@/lib/siteConfig";
import { bootstrapData } from "@/seo/bootstrap";
import HOME_PORTFOLIO from "@/seo/home-portfolio.json";

const PORTRAIT = "https://customer-assets-gfyr7b9c.emergentagent.net/job_rajeev-seo-hub/artifacts/whqtfhxo_image.png";
const HOME_FAQS = [
  { q: "What can you help me build?", a: "Business websites, ecommerce experiences, mobile apps, custom software and AI workflow integrations. SEO, digital marketing and messaging services are also available. We can discuss a new project or a clearly scoped improvement to an existing system." },
  { q: "Can I see relevant examples before we start?", a: "Yes. Explore the work collection for project previews, live website links and the information available about each project. Tell me which type of business or application is closest to your brief so we can discuss the relevant scope." },
  { q: "How are the cost and timeline decided?", a: "They depend on the pages, features, integrations, content and review requirements. Share your brief first; scope, milestones, responsibilities and handover requirements can then be agreed in a proposal before the work starts." },
  { q: "Do you work with clients outside India?", a: "Yes. I am based in Gurgaon, India and work remotely with clients worldwide. We can agree suitable meeting times, feedback channels and a delivery plan for your project." },
  { q: "Can AI automation work with my existing tools?", a: "We first check the task, the data involved and the integrations your tools support. A suitable solution may use an API, a workflow integration or a custom interface. Any AI output that needs human review should have that review built into the workflow." },
  { q: "What should I send with an enquiry?", a: "Describe your business, the problem you want to solve, the main pages or features, and any existing website or software. A target launch date and budget range are useful if you have them. The project brief builder can help you organise those details." },
];

const SERVICES = [
  { number: "01", icon: Code2, title: "Websites that feel like your business.", description: "A clear, considered experience for the people who need to find you, understand your offer and get in touch.", scope: ["Business websites & landing pages", "Ecommerce & content-managed sites", "Responsive interfaces & enquiry flows"], label: "Website development", path: "/freelance-website-developer" },
  { number: "02", icon: Smartphone, title: "Apps built around the way you work.", description: "Useful interfaces and connected systems for customers, teams and the everyday work behind your business.", scope: ["Mobile apps & web applications", "Customer portals & business dashboards", "Custom software & API integrations"], label: "Apps & software", path: "/freelance-app-developer" },
  { number: "03", icon: Bot, title: "Automation with a practical purpose.", description: "Start with a real task, connect the right tools and keep people in control where judgement matters.", scope: ["AI assistants & workflow integrations", "Lead routing & business notifications", "Human review & clear handover"], label: "AI automation", path: "/freelance-ai-consultant" },
];

const PROCESS = [
  { number: "01", title: "Define the right brief", text: "We discuss your goals, users and existing tools. The proposal sets out the scope, responsibilities and milestones before work begins.", deliverable: "Scope & project plan" },
  { number: "02", title: "Make the work visible", text: "Designs, working screens or prototypes give you something concrete to review. Feedback stays connected to the agreed scope.", deliverable: "Design & working previews" },
  { number: "03", title: "Review the details", text: "We check the agreed journeys, content, forms and integrations, and work through feedback before the release.", deliverable: "Review & release checks" },
  { number: "04", title: "Hand over with clarity", text: "Access, documentation and any agreed support are part of the handover discussion, so ownership and next steps are clear.", deliverable: "Access & handover notes" },
];

function safeWebsite(value) {
  try { const u = new URL(value); return ["https:", "http:"].includes(u.protocol) ? u.href : null; } catch { return null; }
}

function HeroProject({ project }) {
  if (!project) return (
    <div className="rounded-[1.75rem] border border-ink/10 bg-white p-8 md:p-12">
      <Layers3 className="h-10 w-10 text-brand" aria-hidden="true" />
      <p className="mt-16 font-heading text-3xl font-bold tracking-tight">Good work starts with a clear brief.</p>
      <p className="mt-4 leading-relaxed text-ink/60">Explore the work collection, then tell me what you want to build.</p>
      <Link to="/work" className="mt-7 inline-flex items-center gap-2 font-semibold text-brand">Explore the work <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
    </div>
  );
  const screenshot = project.screenshot;
  const website = safeWebsite(project.website_url);
  let host = "Project preview";
  if (website) host = new URL(website).hostname.replace(/^www\./, "");
  return (
    <div className="relative">
      <div className="absolute -inset-5 -z-10 rounded-[3rem] bg-brand/[0.06] blur-2xl" aria-hidden="true" />
      <div className="overflow-hidden rounded-[1.5rem] border border-ink/10 bg-white shadow-[0_24px_70px_-35px_rgba(15,30,55,0.35)]">
        <div className="flex items-center gap-3 border-b border-ink/10 bg-[#f2f4f7] px-5 py-3.5">
          <span className="flex gap-1.5" aria-hidden="true"><i className="h-2 w-2 rounded-full bg-ink/15" /><i className="h-2 w-2 rounded-full bg-ink/15" /><i className="h-2 w-2 rounded-full bg-ink/15" /></span>
          <span className="min-w-0 flex-1 truncate text-center font-mono text-[10px] tracking-wide text-ink/50">{host}</span>
          <ExternalLink className="h-3 w-3 text-ink/35" aria-hidden="true" />
        </div>
        <Link to={`/work/${project.slug}`} className="group block bg-[#edf1f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-brand" aria-label={`View ${project.title} project`}>
          {screenshot?.url ? <img src={screenshot.url} alt={screenshot.alt || `${project.title} website preview`} width={screenshot.width || 1440} height={screenshot.height || 1000} fetchPriority="high" decoding="async" className="aspect-[16/10] w-full object-cover object-top motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-[1.02]" /> : <div className="flex aspect-[16/10] items-center justify-center p-10 text-center font-heading text-4xl font-bold text-ink/50">{project.title}</div>}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 md:p-6">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand">Featured work · {project.category?.name || "Project"}</p><h2 className="mt-1.5 font-heading text-xl font-bold tracking-tight">{project.title}</h2></div>
          <Link to={`/work/${project.slug}`} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 text-ink transition-colors hover:border-brand hover:bg-brand hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand" aria-label={`Read about ${project.title}`}><ArrowUpRight className="h-5 w-5" aria-hidden="true" /></Link>
        </div>
      </div>
      {website && <a href={website} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-ink/60 underline-offset-4 hover:text-brand hover:underline">Explore the live website <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></a>}
    </div>
  );
}

export default function Home() {
  const [portfolio, setPortfolio] = useState(() => bootstrapData("homePortfolio") || HOME_PORTFOLIO);
  useEffect(() => {
    const controller = new AbortController();
    api.get("/portfolio", { params: { page: 1, page_size: 6 }, signal: controller.signal })
      .then(({ data }) => { if (Array.isArray(data.items)) setPortfolio(data); })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  const projects = (portfolio?.items || []).slice(0, 6);
  const categories = (portfolio?.categories || []).filter(category => category.count > 0);

  return (
    <div className="bg-paper text-ink" data-testid="home-portfolio-redesign">
      <Seo
        title="Rajeev Freelancer — Freelance Web, App, SEO & AI Marketing Expert | Delhi NCR & Worldwide"
        description="Hire Rajeev — a senior freelance web & app developer, SEO expert and AI/digital-marketing consultant with 12+ years' experience. Based in Gurgaon, serving Delhi NCR, Noida, Faridabad & clients worldwide. Websites from ₹4,999, same-day delivery. Free quote."
        path="/"
        alternates={[
          { lang: "en", path: "/" },
          { lang: "hi", path: "/hi" },
          { lang: "ar", path: "/ar" },
          { lang: "es", path: "/es" },
          { lang: "fr", path: "/fr" },
        ]}
        jsonLd={[
          faqSchema(HOME_FAQS),
          localBusinessSchema({ city: "Gurgaon", country: "India", path: "/", name: "Freelance web & app development, SEO, GEO and digital marketing based in Gurgaon, serving all of Delhi NCR and clients worldwide.", areaServed: ["Delhi", "Gurgaon", "Noida", "Greater Noida", "Faridabad", "Ghaziabad"] }),
        ]}
      />

      <section className="relative overflow-hidden border-b border-ink/10 pt-32 pb-14 md:pt-40 md:pb-20">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[44%] bg-[#eef3fb] lg:block" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-[1400px] items-center gap-14 px-5 md:px-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-6">
            <p className="inline-flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink/55 sm:text-xs"><span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" /> Independent developer · Gurgaon, India</p>
            <h1 className="mt-7 font-heading text-[12vw] font-extrabold leading-[0.98] tracking-[-0.055em] sm:text-[4.5rem] lg:text-[clamp(3.5rem,5.1vw,5.1rem)]"><span className="block">Websites. Apps.</span><span className="block text-brand">AI Automation.</span></h1>
            <p className="mt-7 max-w-lg text-base leading-relaxed text-ink/65 md:text-lg">I'm Rajeev. I build business websites, mobile apps and practical AI workflows, with a clear scope and direct communication from first conversation to handover.</p>
            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
              <a href="#start-project" data-testid="hero-quote-btn" className="inline-flex items-center gap-3 rounded-full bg-brand px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">Discuss your project <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a>
              <Link to="/work" data-testid="hero-work-btn" className="inline-flex items-center gap-2 border-b border-ink/30 py-2 text-sm font-semibold transition-colors hover:border-brand hover:text-brand">Explore the work <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
            <div className="mt-10 flex items-center gap-3.5 border-t border-ink/10 pt-6 md:mt-12">
              <img src={PORTRAIT} alt="Rajeev" width="96" height="96" className="h-12 w-12 rounded-full border border-ink/10 object-cover" />
              <div><p className="text-sm font-semibold">A person you can talk to.</p><a href={waLink()} target="_blank" rel="noopener noreferrer" data-testid="hero-whatsapp-btn" className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-ink/55 hover:text-brand">Chat directly with Rajeev <ArrowUpRight className="h-3 w-3" aria-hidden="true" /></a></div>
            </div>
          </div>
          <div data-rf-home-featured="true" className="lg:col-span-6 lg:pl-5"><HeroProject project={projects[0]} /></div>
        </div>
      </section>

      <section id="selected-work" className="mx-auto max-w-[1400px] px-5 py-16 md:px-10 md:py-24" aria-labelledby="home-work-heading">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand">01 / The work</p><h2 id="home-work-heading" className="mt-4 font-heading text-4xl font-bold leading-tight tracking-[-0.04em] md:text-5xl">Real projects.<br className="sm:hidden" /> Open for a closer look.</h2></div>
          <Link to="/work" className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:text-brand">View the full collection <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
        <p className="mt-5 max-w-2xl leading-relaxed text-ink/60">Explore the websites, applications and business tools in the portfolio. See what we delivered, explore project stories and open the live websites and applications.</p>
        <div data-rf-home-industries="true">{categories.length > 0 && <div className="mt-7 flex flex-wrap gap-2" aria-label="Browse work by industry">{categories.map(category => <Link key={category.slug} to={`/work?category=${encodeURIComponent(category.slug)}`} className="rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-medium text-ink/65 transition-colors hover:border-brand hover:text-brand">{category.name}<span className="ml-2 text-ink/35">{category.count}</span></Link>)}</div>}</div>
        <div data-rf-home-projects="true">{projects.length > 0 ? <div className="mt-9 grid gap-x-7 gap-y-10 md:grid-cols-2 lg:grid-cols-3">{projects.map(project => <WorkCard key={project.slug} project={project} />)}</div> : <div className="mt-9 rounded-2xl border border-ink/10 bg-white p-8"><p className="text-ink/65">The work collection is available on the portfolio page.</p><Link to="/work" className="mt-4 inline-flex items-center gap-2 font-semibold text-brand">Open the portfolio <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>}</div>
      </section>

      <section className="bg-[#10243b] text-white" aria-labelledby="home-services-heading">
        <div className="mx-auto max-w-[1400px] px-5 py-16 md:px-10 md:py-24">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-16"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#97b9ff]">02 / What I can help with</p><h2 id="home-services-heading" className="mt-4 max-w-xl font-heading text-4xl font-bold leading-[1.08] tracking-[-0.04em] md:text-5xl">The right build for<br />your next step.</h2></div><p className="max-w-lg self-end leading-relaxed text-white/65">A new website, a useful application or a workflow that connects your tools. Start with the business need, then agree the scope that makes sense.</p></div>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">{SERVICES.map(service => <article key={service.number} className="flex flex-col rounded-2xl border border-white/15 bg-white/[0.035] p-6 md:p-7"><div className="flex items-center justify-between"><service.icon className="h-7 w-7 text-[#97b9ff]" aria-hidden="true" /><span className="font-mono text-[11px] text-white/35">{service.number}</span></div><h3 className="mt-8 font-heading text-2xl font-bold leading-tight tracking-tight">{service.title}</h3><p className="mt-4 text-sm leading-relaxed text-white/65">{service.description}</p><ul className="my-7 space-y-3">{service.scope.map(item => <li key={item} className="flex gap-2.5 text-xs leading-relaxed text-white/80"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#97b9ff]" aria-hidden="true" />{item}</li>)}</ul><Link to={service.path} className="mt-auto flex items-center justify-between border-t border-white/15 pt-5 text-sm font-semibold text-white hover:text-[#97b9ff]">{service.label}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link></article>)}</div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/15 pt-7 text-xs text-white/60"><span>Need help reaching the right audience?</span><Link to="/freelance-seo-expert" className="text-white hover:text-[#97b9ff]">SEO & AI search visibility ↗</Link><Link to="/freelance-digital-marketing-consultant" className="text-white hover:text-[#97b9ff]">Digital marketing ↗</Link><Link to="/whatsapp-marketing-freelancer" className="text-white hover:text-[#97b9ff]">WhatsApp workflows ↗</Link></div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1400px] gap-12 px-5 py-16 md:px-10 md:py-24 lg:grid-cols-12 lg:gap-20" aria-labelledby="home-process-heading">
        <div className="lg:col-span-5"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand">03 / Working together</p><h2 id="home-process-heading" className="mt-4 font-heading text-4xl font-bold leading-[1.08] tracking-[-0.04em] md:text-5xl">A clear process.<br />No guessing<br className="hidden lg:block" /> what's next.</h2><p className="mt-6 max-w-md leading-relaxed text-ink/60">The project plan should be as understandable as the finished product. These are the milestones we can use to keep decisions, feedback and handover clear.</p><Link to="/project-brief" className="mt-7 inline-flex items-center gap-2 border-b border-ink/20 py-2 text-sm font-semibold hover:text-brand">Organise your project brief <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link></div>
        <ol className="lg:col-span-7">{PROCESS.map(step => <li key={step.number} className="grid grid-cols-[2rem_1fr] gap-4 border-t border-ink/15 py-7 first:pt-0 first:border-t-0 sm:grid-cols-[3rem_1fr] sm:gap-6"><span className="mt-1 font-mono text-xs text-brand">{step.number}</span><div><h3 className="font-heading text-2xl font-bold tracking-tight">{step.title}</h3><p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/60">{step.text}</p><span className="mt-4 inline-block rounded-full bg-brand/[0.06] px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-brand">{step.deliverable}</span></div></li>)}</ol>
      </section>

      <section className="border-y border-ink/10 bg-white" aria-labelledby="home-location-heading"><div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-8 px-5 py-10 md:px-10"><div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/[0.06]"><MapPin className="h-5 w-5 text-brand" aria-hidden="true" /></span><div><h2 id="home-location-heading" className="font-heading text-xl font-bold tracking-tight">Based in Gurgaon. Working remotely.</h2><p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink/60">Available for projects across Delhi NCR and remote collaboration with teams worldwide.</p></div></div><div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold"><Link to="/delhi-ncr" className="hover:text-brand">Delhi NCR <ArrowUpRight className="ml-1 inline h-3.5 w-3.5" aria-hidden="true" /></Link><Link to="/service-areas" className="hover:text-brand">Worldwide service areas <ArrowUpRight className="ml-1 inline h-3.5 w-3.5" aria-hidden="true" /></Link></div></div></section>

      <section className="mx-auto grid max-w-[1400px] gap-10 px-5 py-16 md:px-10 md:py-24 lg:grid-cols-12 lg:gap-20" aria-labelledby="home-faq-heading"><div className="lg:col-span-4"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand">04 / Before we begin</p><h2 id="home-faq-heading" className="mt-4 font-heading text-4xl font-bold tracking-[-0.04em] md:text-5xl">Good questions.<br />Clear answers.</h2><p className="mt-5 text-sm leading-relaxed text-ink/60">Have something more specific in mind? Send me a short brief.</p></div><div className="lg:col-span-8">{HOME_FAQS.map(faq => <details key={faq.q} className="group border-b border-ink/15 first:border-t"><summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-base font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden">{faq.q}<span className="text-xl font-normal text-brand group-open:hidden" aria-hidden="true">+</span><span className="hidden text-xl font-normal text-brand group-open:block" aria-hidden="true">−</span></summary><p className="max-w-2xl pb-6 text-sm leading-relaxed text-ink/65">{faq.a}</p></details>)}</div></section>

      <section id="start-project" className="scroll-mt-24 border-t border-ink/10 bg-[#edf3fc]" aria-labelledby="home-contact-heading"><div className="mx-auto grid max-w-[1400px] items-start gap-12 px-5 py-16 md:px-10 md:py-24 lg:grid-cols-2 lg:gap-20"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand">05 / Let's make a start</p><h2 id="home-contact-heading" className="mt-4 max-w-lg font-heading text-4xl font-bold leading-[1.08] tracking-[-0.04em] md:text-5xl">Tell me what<br />you want to build.</h2><p className="mt-6 max-w-md leading-relaxed text-ink/65">A few lines about your business, your idea and what you need help with are enough to start the conversation.</p><div className="mt-9 space-y-4"><a href={waLink()} target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-3 text-sm font-semibold hover:text-brand"><MessageCircle className="h-5 w-5 text-brand" aria-hidden="true" /> WhatsApp · {CONTACT.whatsappDisplay}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></a><a href={`mailto:${CONTACT.email}`} className="block w-fit text-sm text-ink/65 underline decoration-ink/20 underline-offset-4 hover:text-brand">{CONTACT.email}</a></div><div className="mt-10 flex items-center gap-4 border-t border-ink/10 pt-7"><img src={PORTRAIT} alt="Rajeev, your project contact" width="112" height="112" loading="lazy" decoding="async" className="h-14 w-14 rounded-full border border-ink/10 object-cover" /><div><p className="font-heading text-lg font-bold">Rajeev</p><p className="mt-0.5 text-xs text-ink/55">Freelance development & AI automation · India</p></div></div></div><ContactForm /></div></section>
    </div>
  );
}
