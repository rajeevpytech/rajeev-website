import Link from "@/components/CanonicalLink";

import Marquee from "react-fast-marquee";
import { Zap, Clock, ArrowUpRight, Code, Smartphone, Search, Bot, MessageCircle, TrendingUp } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import OfferCountdown from "@/components/OfferCountdown";
import { OFFERS, offerPrice, offerEnded, offerEndTs, waLink } from "@/data/site";
import { useOfferRegion } from "@/hooks/useOfferRegion";
import { useSiteSettings } from "@/context/SettingsContext";

const ICONS = { Code, Smartphone, Search, Bot, MessageCircle, TrendingUp };

export default function OffersStrip() {
  const settings = useSiteSettings();
  const { inIndia } = useOfferRegion();
  const sym = inIndia ? "₹" : "$";
  const ticker = [
    `Website from ${sym}${inIndia ? "4,999" : "99"} — same-day delivery`,
    `Mobile app from ${sym}${inIndia ? "9,999" : "399"} — ready in 1 week`,
    `SEO that ranks in 90 days — from ${sym}${inIndia ? "6,999" : "129"}/mo`,
    `AI chatbot live in 3 days — from ${sym}${inIndia ? "7,999" : "149"}`,
    `WhatsApp marketing from ${sym}${inIndia ? "2,999" : "59"} — go live in 24 hrs`,
    "Google Ads managed — leads from week 1",
  ];
  if (settings?.marketing?.offers_enabled === false || offerEnded(settings?.marketing)) return null;
  const endTs = offerEndTs(settings?.marketing);
  return (
    <section className="bg-ink text-white" data-testid="offers-strip">
      {/* Scrolling announcement ticker */}
      <div className="border-b border-white/10 bg-brand py-2.5">
        <Marquee speed={44} autoFill gradient={false}>
          {ticker.map((t, i) => (
            <span key={i} className="mx-8 font-mono text-xs md:text-sm uppercase tracking-wide text-white/95">⚡ {t}</span>
          ))}
        </Marquee>
      </div>

      <div className="mx-auto max-w-[1400px] px-5 md:px-10 py-16 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="overline flex items-center gap-2 text-brand"><Zap className="h-3.5 w-3.5 fill-brand" /> / Launch offers</p>
            <h2 className="mt-5 max-w-3xl font-heading font-extrabold tracking-tighter text-4xl sm:text-5xl lg:text-6xl leading-[0.95]">
              Fast delivery. <span className="text-shimmer">Fair pricing.</span>
            </h2>
            <p className="mt-5 max-w-2xl text-white/60 leading-relaxed">
              Transparent starting prices with real delivery timelines — no agency retainers, no surprises. Perfect for <Link to="/delhi-ncr" className="text-white underline decoration-brand/60 underline-offset-4 hover:decoration-white">Delhi&nbsp;NCR</Link> businesses that need to move fast.
            </p>
            <OfferCountdown light className="mt-6" endTs={endTs} />
          </div>
          <a href={waLink("Hi Rajeev, I saw your launch offers and want a quick quote.")} target="_blank" rel="noopener noreferrer" data-testid="offers-whatsapp" className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 font-medium text-white hover:brightness-95 transition">
            <MessageCircle className="h-4 w-4" /> Claim your offer
          </a>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {OFFERS.map((o, i) => {
            const Icon = ICONS[o.icon] || Code;
            const p = offerPrice(o, inIndia);
            return (
              <Reveal key={o.title} delay={(i % 3) * 0.08}>
                <Link
                  to={`/${o.slug}`}
                  data-testid={`offer-card-${o.slug}`}
                  className="group flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-7 hover:bg-white/[0.08] hover:border-brand transition-[background-color,border-color] duration-300"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand/20 text-brand group-hover:bg-brand group-hover:text-white transition-colors">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white/70">{o.tag}</span>
                  </div>
                  <div className="mt-8">
                    <h3 className="font-heading text-xl font-bold tracking-tight">{o.title}</h3>
                    <p className="mt-3 flex items-baseline gap-1">
                      <span className="text-sm text-white/50">Starting</span>
                      <span className="font-heading text-3xl font-extrabold tracking-tighter text-white">{p.sym}{p.amt}</span>
                      {p.unit && <span className="text-sm text-white/50">{p.unit}</span>}
                    </p>
                    <p className="mt-3 flex items-center gap-1.5 text-sm text-brand"><Clock className="h-4 w-4" /> {o.delivery}</p>
                  </div>
                  <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                    Get started <ArrowUpRight className="h-4 w-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
        <p className="mt-8 text-center text-xs text-white/40 font-mono">
          * Starting prices for standard scopes. Final quote shared after a free consultation.
        </p>
      </div>
    </section>
  );
}
