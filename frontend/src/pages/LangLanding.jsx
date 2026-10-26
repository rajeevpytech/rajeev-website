import Link from "@/components/CanonicalLink";
import { useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowUpRight, Globe } from "lucide-react";
import { waLink, CONTACT } from "@/data/site";
import { LANGS, TRANSLATIONS } from "@/data/i18n";
import { canonicalBase } from "@/lib/siteConfig";

export default function LangLanding({ lang: propLang }) {
  const { lang: paramLang } = useParams();
  const lang = propLang || paramLang;
  const t = TRANSLATIONS[lang];
  const meta = LANGS[lang];
  const base = canonicalBase();

  useEffect(() => {
    if (meta) {
      document.documentElement.lang = lang;
      document.documentElement.dir = meta.dir;
    }
    return () => { document.documentElement.lang = "en"; document.documentElement.dir = "ltr"; };
  }, [lang, meta]);

  if (!t || !meta) return <Navigate to="/" replace />;

  return (
    <div dir={meta.dir} data-testid={`lang-page-${lang}`} className="min-h-screen bg-paper">
      <Helmet>
        <html lang={lang} dir={meta.dir} />
        <title>{t.seo_title}</title>
        <meta name="description" content={t.seo_desc} />
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <link rel="canonical" href={`${base}/${lang}`} />
        <link rel="alternate" hrefLang="en" href={`${base}/`} />
        {Object.keys(LANGS).map((l) => <link key={l} rel="alternate" hrefLang={l} href={`${base}/${l}`} />)}
        <link rel="alternate" hrefLang="x-default" href={`${base}/`} />
        <meta property="og:site_name" content="Rajeev Freelancer" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${base}/${lang}`} />
        <meta property="og:title" content={t.seo_title} />
        <meta property="og:description" content={t.seo_desc} />
        <meta property="og:locale" content={lang} />
        <meta property="og:image" content="https://customer-assets-gfyr7b9c.emergentagent.net/job_rajeev-seo-hub/artifacts/whqtfhxo_image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t.seo_title} />
        <meta name="twitter:description" content={t.seo_desc} />
        <meta name="twitter:image" content="https://customer-assets-gfyr7b9c.emergentagent.net/job_rajeev-seo-hub/artifacts/whqtfhxo_image.png" />
      </Helmet>

      {/* Simple localized top bar */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto max-w-[1400px] px-5 md:px-10 h-16 flex items-center justify-between">
          <Link to="/" className="font-heading font-extrabold tracking-tight text-lg">Rajeev<span className="text-brand">.</span></Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1 text-sm">
              <Globe className="h-4 w-4 text-brand" />
              {Object.values(LANGS).map((l) => (
                <Link key={l.code} to={`/${l.code}`} data-testid={`lang-switch-${l.code}`} className={`px-2 py-1 rounded ${l.code === lang ? "text-ink font-semibold" : "text-ink/50 hover:text-ink"}`}>{l.label}</Link>
              ))}
            </div>
            <Link to="/" className="text-sm text-ink/60 hover:text-ink">English</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1400px] px-5 md:px-10 pt-20 pb-16">
        <p className="overline flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-brand" /> {t.hero_tag}</p>
        <h1 className="mt-6 max-w-4xl font-heading font-extrabold tracking-tighter text-5xl sm:text-6xl lg:text-7xl leading-[0.95]">{t.hero_title}</h1>
        <p className="mt-6 max-w-2xl text-lg text-ink/70 leading-relaxed">{t.hero_sub}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/contact" className="inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 font-medium text-white hover:bg-ink transition-colors">{t.cta_quote} <ArrowUpRight className="h-4 w-4" /></Link>
          <a href={waLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-line px-7 py-3.5 font-medium hover:border-ink transition-colors">{t.cta_whatsapp}</a>
        </div>
      </section>

      <section className="bg-white border-y border-line">
        <div className="mx-auto max-w-[1400px] px-5 md:px-10 py-16 md:py-24">
          <h2 className="font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl">{t.services_title}</h2>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {t.services.map((s) => (
              <div key={s.name} className="rounded-2xl border border-line p-6 hover:border-ink transition-colors">
                <p className="font-heading text-xl font-bold">{s.name}</p>
                <p className="mt-2 text-sm text-ink/60 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 md:px-10 py-16 md:py-24 grid lg:grid-cols-2 gap-12">
        <div>
          <h2 className="font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl">{t.about_title}</h2>
          <p className="mt-5 text-lg text-ink/70 leading-relaxed">{t.about_text}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-8">
          <h3 className="font-heading text-2xl font-bold">{t.contact_title}</h3>
          <p className="mt-2 text-ink/60">{t.contact_sub}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/contact" className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 font-medium text-white hover:bg-ink transition-colors">{t.cta_quote} <ArrowUpRight className="h-4 w-4" /></Link>
            <a href={waLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 font-medium hover:border-ink transition-colors">{t.cta_whatsapp}</a>
          </div>
          <p className="mt-4 text-sm text-ink/50">{CONTACT.whatsappDisplay} · {CONTACT.email}</p>
        </div>
      </section>

      <footer className="border-t border-line py-10 text-center text-sm text-ink/50">
        © {new Date().getFullYear()} Rajeev Freelancer · <Link to="/" className="link-underline">English site</Link>
      </footer>
    </div>
  );
}
