import Link from "@/components/CanonicalLink";
import CATALOG from "@/seo/catalog.json";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, ArrowUpRight } from "lucide-react";
import Seo from "@/components/Seo";
import { Reveal, MaskLines } from "@/components/Reveal";
import NotFound from "@/pages/NotFound";
import { api } from "@/lib/api";
import { SERVICES, waLink } from "@/data/site";

export default function CountryPage() {
  const { countrySlug } = useParams();
  const [country, setCountry] = useState(() => CATALOG.countries.find((c) => c.slug === countrySlug));
  const [error, setError] = useState(() => !CATALOG.countries.some((c) => c.slug === countrySlug));

  useEffect(() => {
    window.scrollTo(0, 0);
    const bundled = CATALOG.countries.find((c) => c.slug === countrySlug);
    setCountry(bundled);
    setError(!bundled);
    let active = true;
    api.get("/locations").then(({ data }) => {
      if (!active) return;
      const c = data.countries.find((x) => x.slug === countrySlug);
      if (c) { setCountry(c); setError(false); }
    }).catch(() => {});
    return () => { active = false; };
  }, [countrySlug]);

  if (error) return <NotFound />;
  if (!country) return <div className="pt-40 pb-32 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>;

  return (
    <div>
      <Seo
        title={`Freelance Web, SEO, AI & Marketing Services in ${country.name} | Rajeev Freelancer`}
        description={`Hire Rajeev for freelance web development, SEO, AI automation and digital marketing across ${country.name}. Senior-only, remote, fast WhatsApp support.`}
        path={`/locations/${country.slug}`}
      />
      <section className="mx-auto max-w-[1400px] px-5 md:px-10 pt-32 md:pt-40 pb-14">
        <Link to="/locations" className="overline link-underline">/ Locations</Link>
        <h1 className="mt-6 font-heading font-extrabold tracking-tighter text-5xl sm:text-6xl lg:text-[4.6rem] leading-[0.9]">
          <MaskLines lines={[`Serving ${country.name}`]} />
        </h1>
        <p className="mt-8 max-w-2xl text-lg text-ink/70 leading-relaxed">Every service, in every major city across {country.name}. Pick a service and city to see localized details, pricing and FAQs.</p>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 md:px-10 pb-24">
        {country.is_new_country && <div className="mb-12 rounded-2xl border border-line bg-white p-6 md:p-8">
          <h2 className="font-heading text-2xl font-bold">Planning a remote project for {country.name}</h2>
          <p className="mt-4 max-w-3xl text-ink/70">Services are delivered remotely from India. This guide helps define the audience, content and delivery plan; it does not represent an office in {country.name}.</p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            {[["Catalog capital", country.capital], ["Currency code", country.currency_code], ["Language examples", (country.language_names || []).slice(0, 4).join(", ")]].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt className="text-xs uppercase tracking-wider text-ink/50">{label}</dt><dd className="mt-2 font-medium">{value}</dd></div>)}
          </dl>
          <ul className="mt-6 list-disc space-y-2 pl-5 text-ink/70"><li>Agree your customers' language, location coverage and primary enquiry channel before drafting pages.</li><li>Confirm local display currency, payment-provider availability and billing arrangements separately in the proposal.</li><li>Choose a review window for your actual time zone and meeting date; countries can span multiple zones.</li><li>Provide genuine business details, photographs and project examples; publish claims only when supported.</li></ul>
          {country.geographic_source_url && <p className="mt-5 text-xs text-ink/50">Country reference: <a className="underline" href={country.geographic_source_url} target="_blank" rel="noopener noreferrer">GeoNames</a>, CC BY 4.0. Confirm current project-specific requirements during discovery.</p>}
        </div>}
        {SERVICES.map((s, si) => (
          <Reveal key={s.slug} delay={(si % 3) * 0.05}>
            <div className="mb-10 border-b border-line pb-8">
              <div className="flex items-center justify-between">
                <Link to={`/${s.slug}`} className="font-heading text-xl md:text-2xl font-bold tracking-tight hover:text-brand transition-colors">{s.name}</Link>
                <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
                {country.cities.map((city) => (
                  <Link key={city.loc_slug} to={`/${s.slug}/${city.loc_slug}`} className="text-sm text-ink/65 hover:text-brand link-underline">{city.city}</Link>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
        <a href={waLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 font-medium text-white hover:bg-ink transition-colors">Get a free quote <ArrowUpRight className="h-4 w-4" /></a>
      </section>
    </div>
  );
}
