import { MapPin, Star, ArrowUpRight, Navigation } from "lucide-react";
import { useSiteSettings } from "@/context/SettingsContext";
import { googleProfileUrl } from "@/data/site";

// Local-pack booster: Google Business reviews + directions block, wired to Site Settings.
export const GoogleBusinessCTA = ({ label = "Delhi NCR" }) => {
  const s = useSiteSettings();
  const biz = s?.business || {};
  const rating = biz.reviews_verified ? biz.rating : null;
  const reviews = biz.reviews_verified ? biz.reviews_count : null;
  const mapsUrl = biz.customer_facing_office_verified ? biz.google_maps_url : null;
  const embed = biz.customer_facing_office_verified ? biz.map_embed_url : null;

  return (
    <section className="bg-white border-y border-line" data-testid="google-business-cta">
      <div className="mx-auto max-w-[1400px] px-5 md:px-10 py-16 md:py-24 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <p className="overline flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-brand" /> / On Google</p>
          <h2 className="mt-5 max-w-xl font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl lg:text-5xl leading-[0.95]">
            Find & review us on Google
          </h2>
          {rating && reviews && <div className="mt-6 flex items-center gap-2">
            <div className="flex gap-0.5">{[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-coral text-coral" />)}</div>
            <span className="font-heading text-lg font-bold">{rating}/5</span>
            <span className="text-ink/50 text-sm">· {reviews} reviews</span>
          </div>}
          <p className="mt-5 max-w-md text-ink/70 leading-relaxed">
            Serving {label} and beyond. See our Google Business Profile for reviews, directions and to get in touch quickly.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={googleProfileUrl()} target="_blank" rel="noopener noreferrer" data-testid="gbp-reviews-btn" className="inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 font-medium text-white hover:bg-ink transition-colors duration-300">
              <Star className="h-4 w-4" /> Read &amp; write reviews <ArrowUpRight className="h-4 w-4" />
            </a>
            {mapsUrl && <a href={mapsUrl} target="_blank" rel="noopener noreferrer" data-testid="gbp-directions-btn" className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-7 py-3.5 font-medium hover:border-ink transition-colors duration-300">
              <Navigation className="h-4 w-4" /> Get directions
            </a>}
          </div>
        </div>
        {embed && <div className="overflow-hidden rounded-2xl border border-line">
          <iframe
            src={embed}
            title={`Map — ${label}`}
            className="w-full h-[320px] md:h-[380px]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>}
      </div>
    </section>
  );
};

export default GoogleBusinessCTA;
