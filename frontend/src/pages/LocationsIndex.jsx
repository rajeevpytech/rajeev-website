import Link from "@/components/CanonicalLink";
import CATALOG from "@/seo/catalog.json";
import { useEffect, useState } from "react";

import { MapPin, Loader2 } from "lucide-react";
import Seo from "@/components/Seo";
import { Reveal, MaskLines } from "@/components/Reveal";
import { api } from "@/lib/api";

export default function LocationsIndex() {
  const [countries, setCountries] = useState(CATALOG.countries);
  const [total, setTotal] = useState(CATALOG.total_cities);

  useEffect(() => {
    api.get("/locations").then(({ data }) => { setCountries(data.countries); setTotal(data.total_cities); }).catch(() => {});
  }, []);

  const byRegion = {};
  (countries || []).forEach((c) => { (byRegion[c.region] = byRegion[c.region] || []).push(c); });

  return (
    <div>
      <Seo
        title="Locations — A Freelance Consultant For Your City | Rajeev Freelancer"
        description="Rajeev serves businesses in cities across Asia, Europe, the Middle East, Africa and the Americas. Find local web, SEO, AI and marketing help in your city."
        path="/locations"
      />
      <section className="mx-auto max-w-[1400px] px-5 md:px-10 pt-32 md:pt-40 pb-14">
        <p className="overline">/ Locations</p>
        <h1 className="mt-6 max-w-4xl font-heading font-extrabold tracking-tighter text-5xl sm:text-6xl lg:text-[5rem] leading-[0.9]">
          <MaskLines lines={["A freelancer", "for your city."]} />
        </h1>
        <p className="mt-8 max-w-2xl text-lg text-ink/70 leading-relaxed">Remote-first, senior-only help across {total || "300"}+ cities worldwide. Pick a country to see the cities served.</p>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 md:px-10 pb-24">
        {!countries ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (
          Object.entries(byRegion).map(([region, list]) => (
            <div key={region} className="mb-14">
              <Reveal><h2 className="font-heading text-2xl font-bold tracking-tight border-b border-line pb-3">{region}</h2></Reveal>
              <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {list.map((c, i) => (
                  <Reveal key={c.slug} delay={(i % 4) * 0.04}>
                    <Link to={`/locations/${c.slug}`} className="group flex items-center justify-between rounded-xl border border-line bg-white px-5 py-4 hover:border-ink hover:-translate-y-0.5 transition-[transform,border-color]">
                      <span className="flex items-center gap-2 font-medium"><MapPin className="h-4 w-4 text-brand" />{c.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{c.cities.length}</span>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </div>
          ))
        )}
      <p className="mt-12 text-xs text-ink/50">Additional geographic names: <a className="underline" href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer">GeoNames</a>, licensed under <a className="underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. Location pages describe remote service coverage.</p>
      </section>
    </div>
  );
}
