import Link from "@/components/CanonicalLink";
import { bootstrapData } from "@/seo/bootstrap";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowUpRight, ArrowLeft, Loader2, CalendarDays, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Seo from "@/components/Seo";
import { Reveal } from "@/components/Reveal";
import NotFound from "@/pages/NotFound";
import { api } from "@/lib/api";
import { canonicalBase, getSiteConfig, breadcrumbSchema, faqSchema } from "@/lib/siteConfig";

const MD = {
  h2: (p) => <h2 className="mt-12 font-heading text-2xl md:text-3xl font-bold tracking-tight text-ink" {...p} />,
  h3: (p) => <h3 className="mt-8 font-heading text-xl font-bold tracking-tight text-ink" {...p} />,
  h4: (p) => <h4 className="mt-6 font-heading text-lg font-bold text-ink" {...p} />,
  p: (p) => <p className="leading-relaxed" {...p} />,
  ul: (p) => <ul className="list-disc pl-6 space-y-2" {...p} />,
  ol: (p) => <ol className="list-decimal pl-6 space-y-2" {...p} />,
  a: ({ href = "", ...rest }) => href.startsWith("/") ? <Link to={href} className="text-brand underline underline-offset-4 hover:text-ink" {...rest} /> : <a href={href} rel="noopener noreferrer" className="text-brand underline underline-offset-4 hover:text-ink" {...rest} />,
  strong: (p) => <strong className="font-semibold text-ink" {...p} />,
  blockquote: (p) => <blockquote className="border-l-4 border-brand/40 pl-5 italic text-ink/70" {...p} />,
  img: () => null,
};

export default function BlogPost() {
  const { slug } = useParams();
  const [data, setData] = useState(() => bootstrapData("blogPost") || null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!bootstrapData("blogPost")) setData(null); setError(false); window.scrollTo(0, 0);
    api.get(`/blog/${slug}`).then(({ data }) => setData(data)).catch(() => setError(true));
  }, [slug]);

  if (error) return <NotFound />;
  if (!data) return <div className="pt-40 pb-32 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>;

  const { post, related } = data;
  const cfg = getSiteConfig();
  const base = canonicalBase();
  const bodyMd = post.body_md || "";
  const wordCount = (bodyMd || (post.body || []).join(" ")).split(/\s+/).filter(Boolean).length;
  const seo = post.seo || {};
  const coverUrl = post.cover_image && post.cover_image.startsWith("/") ? `${process.env.REACT_APP_BACKEND_URL}${post.cover_image}` : post.cover_image;
  const ogImage = seo.og_image || coverUrl;
  const faqs = post.faqs || [];
  const fmtDate = (d) => {
    try { return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); }
    catch { return ""; }
  };
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: seo.description || post.excerpt,
      image: ogImage,
      articleSection: post.category,
      keywords: (post.tags || []).join(", "),
      wordCount,
      inLanguage: cfg.seo.default_locale || "en",
      datePublished: post.published_at || post.created_at,
      dateModified: post.updated_at,
      mainEntityOfPage: { "@type": "WebPage", "@id": `${base}/blog/${post.slug}` },
      url: `${base}/blog/${post.slug}`,
      author: { "@type": "Person", "@id": `${base}/#rajeev`, name: cfg.business.founder_name, url: base },
      publisher: { "@type": "Organization", "@id": `${base}/#organization`, name: cfg.seo.site_name, logo: { "@type": "ImageObject", url: cfg.seo.og_image } },
    },
    ...(faqs.length ? [faqSchema(faqs)] : []),
    breadcrumbSchema([
      { name: "Home", path: "" },
      { name: "Blog", path: "/blog" },
      { name: post.title, path: `/blog/${post.slug}` },
    ]),
  ];

  return (
    <div>
      <Seo title={`${seo.title || post.title} | ${cfg.seo.site_name}`} description={seo.description || post.excerpt} path={`/blog/${post.slug}`} image={ogImage} type="article" jsonLd={jsonLd} noindex={seo.robots ? seo.robots.includes("noindex") : false} />

      <article className="mx-auto max-w-3xl px-5 md:px-10 pt-32 md:pt-40 pb-20">
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm font-medium link-underline"><ArrowLeft className="h-4 w-4" /> All insights</Link>
        <span className="mt-8 block font-mono text-xs uppercase tracking-wide text-brand">{post.category}</span>
        <h1 className="mt-3 font-heading font-extrabold tracking-tighter text-4xl sm:text-5xl leading-[0.95]">{post.title}</h1>
        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-ink/60" data-testid="blog-byline">
          <span className="flex items-center gap-2">
            <img src={cfg.business.logo} alt={cfg.business.founder_name} className="h-8 w-8 rounded-full object-cover border border-line" />
            <span>By <strong className="text-ink font-semibold">{cfg.business.founder_name}</strong></span>
          </span>
          <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> <time dateTime={post.published_at || post.created_at}>{fmtDate(post.published_at || post.created_at)}</time></span>
          {post.updated_at && post.updated_at.slice(0, 10) !== (post.published_at || post.created_at || "").slice(0, 10) && <span className="flex items-center gap-1.5 text-xs" data-testid="blog-updated"><RefreshCw className="h-3.5 w-3.5" /> Updated <time dateTime={post.updated_at}>{fmtDate(post.updated_at)}</time></span>}
          {wordCount > 0 && <span className="font-mono text-xs">· {Math.max(1, Math.round(wordCount / 200))} min read</span>}
        </div>
        <p className="mt-5 text-lg text-ink/70 leading-relaxed">{post.excerpt}</p>
        {coverUrl && <img src={coverUrl} srcSet={post.cover_srcset ? post.cover_srcset.split(", ").map((s) => `${process.env.REACT_APP_BACKEND_URL}${s}`).join(", ") : undefined} sizes="(max-width: 768px) 100vw, 768px" alt={seo.image_alt || post.cover_alt || post.title} width="1200" height="675" decoding="async" fetchPriority="high" className="mt-8 w-full rounded-2xl border border-line object-cover aspect-[16/9]" />}
        <div className="mt-10 space-y-5 text-lg text-ink/80 leading-relaxed" data-testid="blog-body">
          {bodyMd ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD} skipHtml>{bodyMd}</ReactMarkdown> : (post.body || []).map((p, i) => <p key={i}>{p}</p>)}
        </div>
        {faqs.length > 0 && (
          <section className="mt-12" data-testid="blog-faqs">
            <h2 className="font-heading text-2xl md:text-3xl font-bold tracking-tight">Frequently asked questions</h2>
            <div className="mt-5 divide-y divide-line rounded-2xl border border-line bg-white">
              {faqs.map((f) => <div key={f.q} className="px-6 py-5"><h3 className="font-semibold">{f.q}</h3><p className="mt-2 text-ink/70 leading-relaxed">{f.a}</p></div>)}
            </div>
          </section>
        )}
        {(post.tags || []).length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2">
            {post.tags.map((t) => <span key={t} className="rounded-full border border-line px-3 py-1 text-xs font-mono text-muted-foreground">#{t}</span>)}
          </div>
        )}
        <div className="mt-12 rounded-2xl border border-line bg-paper p-8 text-center">
          <p className="font-heading text-2xl font-bold tracking-tight">Have a project like this?</p>
          <Link to="/contact" className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 font-medium text-white hover:bg-ink transition-colors">Get a free quote <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
      </article>

      {related?.length > 0 && (
        <section className="bg-white border-t border-line">
          <div className="mx-auto max-w-[1400px] px-5 md:px-10 py-16">
            <p className="overline">/ Keep reading</p>
            <div className="mt-8 grid sm:grid-cols-3 gap-5">
              {related.map((p, i) => (
                <Reveal key={p.slug} delay={i * 0.06}>
                  <Link to={`/blog/${p.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-paper hover:border-ink transition-colors">
                    <div className="aspect-[16/10] overflow-hidden"><img src={p.cover_image && p.cover_image.startsWith("/") ? `${process.env.REACT_APP_BACKEND_URL}${p.cover_image}` : p.cover_image} alt={p.title} loading="lazy" decoding="async" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>
                    <div className="p-5"><span className="font-mono text-[11px] uppercase text-brand">{p.category}</span><h3 className="mt-2 font-heading text-lg font-bold leading-snug">{p.title}</h3></div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
