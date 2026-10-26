import Link from "@/components/CanonicalLink";

import Seo from "@/components/Seo";
import { SERVICES, waLink } from "@/data/site";
import { breadcrumbSchema, canonicalBase } from "@/lib/siteConfig";
import CATALOG from "@/seo/catalog.json";
import REGIONS from "@/seo/live-region-data.json";

const MARKETS = { us: { country: "usa", language: "en-US" }, uk: { country: "uk", language: "en-GB" }, de: { country: "germany", language: "de-DE" } };
// These production regional URLs coexist with the site's service and country guides.
export default function RegionalLanding({ region }) {
  const market = MARKETS[region];
  const country = CATALOG.countries.find(item => item.slug === market.country);
  const copy = REGIONS[region] || REGIONS[`/${region}`] || {};
  const path = `/${region}`;
  const language = copy.language || copy.lang || market.language;
  const h1 = copy.h1 || `Freelance services for ${country?.name || region.toUpperCase()}`;
  const intro = Array.isArray(copy.intro) ? copy.intro : copy.intro ? [copy.intro] : [];
  const jsonLd = [
    { "@context": "https://schema.org", "@type": "WebPage", "@id": `${canonicalBase()}${path}#webpage`, url: `${canonicalBase()}${path}`, name: h1, inLanguage: language, isPartOf: { "@id": `${canonicalBase()}/#website` } },
    breadcrumbSchema([{ name: "Home", path: "/" }, { name: country?.name || region.toUpperCase(), path }]),
  ];
  return <div>
    <Seo title={copy.title || `${h1} | Rajeev Freelancer`} description={copy.description || `Freelance website, app, software, SEO and marketing services for businesses in ${country?.name || region.toUpperCase()}.`} path={path} language={language} jsonLd={jsonLd} />
    <section className="mx-auto max-w-[1400px] px-5 md:px-10 pt-32 md:pt-40 pb-16">
      <Link to="/locations" className="overline link-underline">/ {country?.name || region.toUpperCase()}</Link>
      <h1 className="mt-6 max-w-5xl font-heading font-extrabold tracking-tighter text-4xl sm:text-5xl lg:text-6xl leading-[0.95]">{h1}</h1>
      {intro.map((paragraph, index) => <p key={index} className="mt-6 max-w-3xl text-lg text-ink/70 leading-relaxed">{paragraph}</p>)}
      <div className="mt-9 flex flex-wrap gap-3"><Link to="/contact" className="rounded-full bg-brand px-7 py-3.5 font-medium text-white hover:bg-ink">{copy.cta || "Get a free consultation"}</Link><a href={waLink()} target="_blank" rel="noopener noreferrer" className="rounded-full border border-line px-7 py-3.5 font-medium hover:border-ink">WhatsApp</a></div>
    </section>
    <section className="mx-auto max-w-[1400px] px-5 md:px-10 pb-24">
      <h2 className="font-heading text-2xl font-bold">{copy.servicesHeading || "Services and locations"}</h2>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{SERVICES.map(service => <div key={service.slug} className="rounded-2xl border border-line p-6"><Link className="font-heading text-lg font-bold hover:text-brand" to={`/${service.slug}`}>{service.name}</Link><p className="mt-3 text-sm text-ink/60">{service.tagline}</p><ul className="mt-4 flex flex-wrap gap-x-3 gap-y-2">{(country?.cities || []).map(city => <li key={city.loc_slug}><Link className="text-sm text-brand underline underline-offset-4" to={`/${service.slug}/${city.loc_slug}`}>{city.city}</Link></li>)}</ul></div>)}</div>
      {country && <Link to={`/locations/${country.slug}`} className="mt-8 inline-block text-sm text-brand underline underline-offset-4">{country.name} — country guide</Link>}
    </section>
  </div>;
}
