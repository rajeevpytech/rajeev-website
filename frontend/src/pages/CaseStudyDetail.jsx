import Link from "@/components/CanonicalLink";
import { bootstrapData } from "@/seo/bootstrap";
import { useParams } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { ArrowUpRight, ArrowLeft, Check, Star, Download, Loader2, Linkedin, Twitter, Link2, MessageCircle } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { jsPDF } from "jspdf";
import Seo from "@/components/Seo";
import { Reveal } from "@/components/Reveal";
import Counter from "@/components/Counter";
import NotFound from "@/pages/NotFound";
import { fetchCaseStudy } from "@/data/caseStudies";
import { SERVICES, waLink } from "@/data/site";
import { externalWebsite, previewWebsite, projectLabel } from "@/lib/portfolio";
import { canonicalBase, getSiteConfig, breadcrumbSchema } from "@/lib/siteConfig";

// Animated before/after bar chart.
function BeforeAfterChart({ chart }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const max = Math.max(chart.before, chart.after, 1);
  const fmt = (n) => `${chart.prefix || ""}${n.toLocaleString()}${chart.suffix || ""}`;
  const rows = [
    { label: "Before", value: chart.before, tone: "bg-ink/25" },
    { label: "After", value: chart.after, tone: "bg-brand" },
  ];
  return (
    <div ref={ref} className="rounded-3xl border border-line bg-white p-8" data-testid="case-study-chart">
      <p className="overline">/ Before → after</p>
      <p className="mt-3 font-heading text-lg font-bold tracking-tight">{chart.label}</p>
      <div className="mt-8 space-y-5">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-mono uppercase tracking-widest text-ink/50">{r.label}</span>
              <span className="font-heading font-bold tabular-nums">{fmt(r.value)}</span>
            </div>
            <div className="h-4 w-full overflow-hidden rounded-full bg-paper">
              <motion.div
                className={`h-full rounded-full ${r.tone}`}
                initial={{ width: 0 }}
                animate={inView ? { width: `${Math.max((r.value / max) * 100, 4)}%` } : { width: 0 }}
                transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: r.label === "After" ? 0.15 : 0 }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-6 font-mono text-xs text-ink/45">{chart.higherIsBetter ? "Higher is better." : "Lower is better."}</p>
    </div>
  );
}

// Split a metric like "3×", "+52%", "<1s", "24/7", "0" into an animatable number + prefix/suffix.
function parseMetric(m) {
  const match = String(m).match(/^([^\d.-]*)(-?\d+(?:\.\d+)?)(.*)$/);
  if (!match) return { prefix: "", num: null, suffix: m, decimals: 0 };
  const [, prefix, num, suffix] = match;
  return { prefix, num: parseFloat(num), suffix, decimals: num.includes(".") ? 1 : 0 };
}

// Build a clean one-page PDF of the case study (no screenshots, no CORS issues).
function downloadCaseStudyPdf(cs, cfg, base) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 18, CW = W - 2 * M;
  const BRAND = [0, 85, 255], INK = [24, 24, 24], GRAY = [110, 110, 110], LINE = [224, 224, 224];
  let y = 20;
  const ensure = (h) => { if (y + h > H - 20) { doc.addPage(); y = 20; } };
  const heading = (t) => { ensure(12); doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...BRAND); doc.text(t.toUpperCase(), M, y); y += 6; };
  const para = (t) => { doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(...GRAY); const lines = doc.splitTextToSize(t, CW); ensure(lines.length * 5 + 2); doc.text(lines, M, y); y += lines.length * 5 + 5; };

  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...INK); doc.text("RAJEEV FREELANCER", M, y);
  doc.setTextColor(...BRAND); doc.setFontSize(8.5); doc.text("CASE STUDY", W - M, y, { align: "right" });
  y += 4; doc.setDrawColor(...LINE); doc.line(M, y, W - M, y); y += 13;

  doc.setFont("helvetica", "bold"); doc.setFontSize(38); doc.setTextColor(...BRAND); doc.text(String(cs.metric), M, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(...GRAY); doc.text(cs.metricLabel, M, y + 7);
  y += 17;

  doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(...INK);
  const tl = doc.splitTextToSize(cs.title, CW); doc.text(tl, M, y); y += tl.length * 7 + 3;

  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...GRAY);
  doc.text(`${cs.industry}   .   ${cs.region}   .   ${cs.duration}   .   ${cs.year}`, M, y); y += 10;

  para(cs.excerpt);

  heading("The numbers");
  const colW = CW / 2, rowH = 15;
  (cs.results || []).forEach((r, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * colW, yy = y + row * rowH;
    doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...INK); doc.text(String(r.value), x, yy + 2);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...GRAY); doc.text(doc.splitTextToSize(r.label, colW - 6), x, yy + 7);
  });
  y += Math.ceil((cs.results || []).length / 2) * rowH + 5;

  heading("The challenge"); para(cs.challenge);

  heading("The approach");
  (cs.approach || []).forEach((a, i) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(...INK);
    ensure(6); doc.text(`${i + 1}. ${a.h}`, M, y); y += 5;
    para(a.t);
  });

  if (cs.quote?.text) {
  ensure(24);
  doc.setDrawColor(...BRAND); doc.setLineWidth(0.8); doc.line(M, y, M, y + 12); doc.setLineWidth(0.2);
  doc.setFont("helvetica", "italic"); doc.setFontSize(11); doc.setTextColor(...INK);
  const q = doc.splitTextToSize(`"${cs.quote.text}"`, CW - 8); doc.text(q, M + 5, y + 4); y += q.length * 5 + 3;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...GRAY);
  doc.text(`${cs.quote.name} - ${cs.quote.role}`, M + 5, y + 2); y += 10;

  }

  const fy = H - 14; doc.setDrawColor(...LINE); doc.line(M, fy - 4, W - M, fy - 4);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GRAY);
  doc.text(`${cfg.contact.email}   .   ${base.replace(/^https?:\/\//, "")}`, M, fy);
  doc.text("Rajeev Freelancer", W - M, fy, { align: "right" });

  doc.save(`rajeev-case-study-${cs.slug}.pdf`);
}

export default function CaseStudyDetail() {
  const { slug } = useParams();
  const [cs, setCs] = useState(() => bootstrapData("caseStudy") || null);
  const [loadedSlug, setLoadedSlug] = useState(slug);
  const [loading, setLoading] = useState(() => !bootstrapData("caseStudy"));
  const [allCases, setAllCases] = useState(() => bootstrapData("cases")?.items || []);
  useEffect(() => {
    let mounted = true;
    const initial = bootstrapData("caseStudy");
    setCs(initial?.slug === slug ? initial : null);
    setLoadedSlug(slug);
    setLoading(!initial || initial.slug !== slug);
    fetchCaseStudy(slug).then((d) => {
      if (mounted) {
        setCs(d || null); // A public 404 must never revive a bundled example.
        setLoadedSlug(slug);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [slug]);
  useEffect(() => { import("@/data/caseStudies").then((m) => m.fetchCaseStudies().then(setAllCases)); }, []);

  if (loadedSlug !== slug || (loading && !cs)) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>;
  if (!cs) return <NotFound />;

  const base = canonicalBase();
  const cfg = getSiteConfig();
  const serviceMeta = (s) => SERVICES.find((x) => x.slug === s);
  const liveWebsite = externalWebsite(cs.website_url);
  const gallery = (cs.gallery || []).filter(image => previewWebsite(image?.url));
  const others = allCases.filter((c) => c.slug !== slug).slice(0, 2);
  const shareUrl = `${base}/case-studies/${cs.slug}`;
  const shareText = `${cs.title} — ${cs.metric} ${cs.metricLabel} | Rajeev Freelancer`;
  const shareLinks = [
    { label: "LinkedIn", icon: Linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}` },
    { label: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}` },
    { label: "X", icon: Twitter, href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}` },
  ];
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl); toast.success("Link copied"); }
    catch { toast.error("Could not copy link"); }
  };

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: cs.title,
      description: cs.excerpt,
      image: cs.og || cs.cover,
      articleSection: cs.tag,
      about: cs.industry,
      datePublished: /^\d{4}$/.test(cs.year || "") ? `${cs.year}-01-01` : undefined,
      mainEntityOfPage: { "@type": "WebPage", "@id": `${base}/case-studies/${cs.slug}` },
      author: { "@type": "Person", "@id": `${base}/#rajeev`, name: cfg.business.founder_name, url: base },
      publisher: { "@id": `${base}/#organization`, name: cfg.seo.site_name },
    },
    breadcrumbSchema([
      { name: "Home", path: "" },
      { name: "Case Studies", path: "/case-studies" },
      { name: cs.title, path: `/case-studies/${cs.slug}` },
    ]),
  ];

  return (
    <div>
      <Seo title={`${cs.title} — Case Study | ${cfg.seo.site_name}`} description={cs.excerpt} path={`/case-studies/${cs.slug}`} image={cs.og || cs.cover} type="article" jsonLd={jsonLd} />

      {/* HERO */}
      <section className="mx-auto max-w-[1000px] px-5 md:px-10 pt-32 md:pt-40 pb-10">
        <div className="flex items-center justify-between gap-4">
          <Link to="/case-studies" className="inline-flex items-center gap-1.5 text-sm font-medium link-underline"><ArrowLeft className="h-4 w-4" /> All case studies</Link>
          <button
            type="button"
            onClick={() => downloadCaseStudyPdf(cs, cfg, base)}
            data-testid="download-pdf-btn"
            className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-5 py-2.5 text-sm font-medium hover:border-ink hover:bg-ink hover:text-white transition-colors"
          >
            <Download className="h-4 w-4" /> Download PDF
          </button>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-widest text-ink/50">
          <span className="rounded-full bg-brand/10 px-3 py-1 text-brand">{cs.tag}</span>
          <span>{projectLabel(cs.industry)}</span><span>·</span><span>{cs.region}</span><span>·</span><span>{cs.duration}</span>
        </div>
        <h1 className="mt-6 font-heading font-extrabold tracking-tighter text-4xl sm:text-5xl lg:text-6xl leading-[0.95]">{cs.title}</h1>
        <p className="mt-6 whitespace-pre-line text-lg text-ink/70 leading-relaxed">{cs.excerpt}</p>
        {liveWebsite && <a href={liveWebsite} target="_blank" rel="noopener noreferrer" data-testid="case-study-live-link" className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-ink">Open live project <ArrowUpRight className="h-4 w-4" /></a>}
        <div className="mt-7 flex flex-wrap items-center gap-2" data-testid="case-share">
          <span className="mr-1 text-xs font-mono uppercase tracking-widest text-ink/40">Share</span>
          {shareLinks.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" data-testid={`share-${s.label.toLowerCase()}`} aria-label={`Share on ${s.label}`} title={`Share on ${s.label}`}
               className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line hover:border-ink hover:bg-ink hover:text-white transition-colors">
              <s.icon className="h-4 w-4" />
            </a>
          ))}
          <button type="button" onClick={copyLink} data-testid="share-copy" aria-label="Copy link" title="Copy link"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line hover:border-ink hover:bg-ink hover:text-white transition-colors">
            <Link2 className="h-4 w-4" />
          </button>
        </div>
      </section>

      {cs.cover && <section className="mx-auto max-w-[1200px] px-5 md:px-10 pb-4">
        <div className="overflow-hidden rounded-3xl border border-line">
          <img src={cs.cover} alt={cs.title} decoding="async" fetchPriority="high" className="w-full aspect-[16/10] object-cover object-top" />
        </div>
      </section>}

      {gallery.length > 0 && <section className="mx-auto max-w-[1200px] px-5 py-10 md:px-10" aria-labelledby="case-study-gallery-heading"><h2 id="case-study-gallery-heading" className="font-heading text-2xl font-bold tracking-tight">A closer look at the work.</h2><div className="mt-6 grid gap-6 md:grid-cols-2">{gallery.map((image, index) => <figure key={`${image.url}-${index}`}><a href={previewWebsite(image.url)} target="_blank" rel="noopener noreferrer" aria-label={`Open ${image.alt || cs.title}`}><img src={previewWebsite(image.url)} alt={image.alt || `${cs.title} project image`} loading="lazy" decoding="async" width="1440" height="900" className="aspect-[16/10] w-full rounded-2xl border border-line object-cover object-top" /></a>{image.caption && <figcaption className="mt-3 text-sm text-ink/60">{image.caption}</figcaption>}</figure>)}</div></section>}

      {/* RESULTS */}
      {cs.results?.length > 0 && <section className="mx-auto max-w-[1000px] px-5 md:px-10 py-16" data-testid="case-study-results">
        <div className="rounded-3xl bg-ink text-white p-8 md:p-12">
          <p className="overline text-white/50">/ The numbers</p>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            {cs.results.map((r) => {
              const { prefix, num, suffix, decimals } = parseMetric(r.value);
              return (
                <div key={r.label}>
                  <p className="font-heading text-4xl md:text-5xl font-extrabold tracking-tighter">
                    {num === null ? r.value : <>{prefix}<Counter value={num} suffix={suffix} decimals={decimals} /></>}
                  </p>
                  <p className="mt-2 text-xs text-white/50 uppercase tracking-wide font-mono">{r.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>}

      {/* NARRATIVE */}
      <section className="mx-auto max-w-[820px] px-5 md:px-10 pb-8">
        {cs.chart && Number.isFinite(cs.chart.before) && Number.isFinite(cs.chart.after) && (
          <Reveal>
            <div className="mb-12"><BeforeAfterChart chart={cs.chart} /></div>
          </Reveal>
        )}
        <Reveal>
          <h2 className="font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl">The challenge</h2>
          <p className="mt-5 text-ink/75 leading-relaxed text-lg">{cs.challenge}</p>
        </Reveal>

        <Reveal>
          <h2 className="mt-16 font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl">The approach</h2>
        </Reveal>
        <div className="mt-8 space-y-4">
          {(cs.approach || []).map((a, i) => (
            <Reveal key={a.h} delay={i * 0.06}>
              <div className="flex gap-5 rounded-2xl border border-line bg-white p-6">
                <span className="font-mono text-sm text-brand mt-1">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="font-heading text-lg font-bold tracking-tight">{a.h}</h3>
                  <p className="mt-2 text-ink/65 leading-relaxed">{a.t}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* QUOTE */}
        {cs.quote?.text && <Reveal>
          <figure className="mt-16 rounded-3xl border border-line bg-paper p-8 md:p-10">
            <div className="flex gap-0.5">{[...Array(5)].map((_, j) => <Star key={j} className="h-4 w-4 fill-coral text-coral" />)}</div>
            <blockquote className="mt-5 font-heading text-2xl md:text-3xl font-medium leading-snug tracking-tight">"{cs.quote.text}"</blockquote>
            <figcaption className="mt-6 text-sm text-ink/60"><strong className="text-ink">{cs.quote.name}</strong> — {cs.quote.role}</figcaption>
          </figure>
        </Reveal>}

        {/* SERVICES USED */}
        <div className="mt-14">
          <p className="overline">/ Services used</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {(cs.services || []).map((s) => {
              const m = serviceMeta(s);
              if (!m) return <span key={s} className="inline-flex items-center rounded-full border border-line bg-white px-5 py-2.5 text-sm font-medium">{projectLabel(s)}</span>;
              return (
                <Link key={s} to={`/${s}`} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-medium hover:border-ink transition-colors">
                  {m.short} <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              );
            })}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {(cs.stack || []).map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5 rounded-md bg-ink/[0.04] px-3 py-1.5 text-xs font-mono text-ink/70"><Check className="h-3 w-3 text-brand" /> {t}</span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-3xl bg-brand text-white p-8 md:p-10 text-center">
          <h2 className="font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl">Have a similar project in mind?</h2>
          <p className="mt-4 text-white/80 max-w-lg mx-auto">Tell us about your goals. We will discuss the right scope, a delivery plan and the next steps.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/contact" className="inline-flex items-center gap-2 rounded-full bg-white text-brand px-7 py-3.5 font-medium hover:bg-ink hover:text-white transition-colors">Get your free quote <ArrowUpRight className="h-4 w-4" /></Link>
            <a href={waLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/40 px-7 py-3.5 font-medium hover:border-white transition-colors">WhatsApp now</a>
          </div>
        </div>
      </section>

      {/* MORE */}
      {others.length > 0 && (
        <section className="bg-paper border-t border-line">
          <div className="mx-auto max-w-[1400px] px-5 md:px-10 py-16">
            <p className="overline">/ More case studies</p>
            <div className="mt-8 grid md:grid-cols-2 gap-4">
              {others.map((c) => (
                <Link key={c.slug} to={`/case-studies/${c.slug}`} className="group flex items-center gap-6 rounded-2xl border border-line bg-white p-5 hover:border-ink transition-colors">
                  <img src={c.cover} alt={c.title} className="h-20 w-28 shrink-0 rounded-xl object-cover" loading="lazy" />
                  <div>
                    <p className="font-heading text-2xl font-extrabold tracking-tighter text-brand">{c.metric}</p>
                    <h3 className="mt-1 font-heading font-bold tracking-tight leading-snug group-hover:text-brand transition-colors">{c.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
