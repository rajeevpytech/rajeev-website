import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Clock, MessageCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { waLink } from "@/data/site";
import { offerEnded, offerEndTs } from "@/data/site";
import { useOfferRegion } from "@/hooks/useOfferRegion";
import OfferCountdown from "@/components/OfferCountdown";
import { useSiteSettings } from "@/context/SettingsContext";

const SEEN_KEY = "rf_offer_seen";

export default function ExitIntentOffer() {
  const settings = useSiteSettings();
  const popupEnabled = settings?.marketing?.popup_enabled !== false && !offerEnded(settings?.marketing);
  const { inIndia } = useOfferRegion();
  const priceLabel = inIndia ? "₹4,999" : "$99";
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });

  const trigger = useCallback(() => {
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return;
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch { /* privacy mode */ }
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!popupEnabled) return;
    let seen = false;
    try { seen = !!sessionStorage.getItem(SEEN_KEY); } catch { /* ignore */ }
    if (seen) return;

    // A timed overlay interrupts reading on mobile. Only react to a desktop exit.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const onLeave = (e) => { if (e.clientY <= 0) trigger(); };
    document.addEventListener("mouseout", onLeave);
    return () => { document.removeEventListener("mouseout", onLeave); };
  }, [trigger, popupEnabled]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    setLoading(true);
    try {
      await api.post("/leads", {
        name: form.name.trim(),
        phone: form.phone.trim(),
        service: `Website — Same-day ${priceLabel} offer`,
        message: `Requested the ${priceLabel} same-day website offer via exit popup.`,
        source_path: typeof window !== "undefined" ? window.location.pathname : "",
        location: "Delhi NCR",
      });
      setSent(true);
    } catch { /* fail silently, still show WhatsApp fallback */ setSent(true); }
    setLoading(false);
  };

  return (
    <AnimatePresence>
      {open && (        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          data-testid="exit-offer-overlay"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-line bg-paper shadow-2xl"
            data-testid="exit-offer-modal"
          >
            <button onClick={() => setOpen(false)} aria-label="Close" data-testid="exit-offer-close" className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/80 text-ink hover:bg-white transition">
              <X className="h-4 w-4" />
            </button>

            <div className="bg-brand px-7 pt-8 pb-6 text-white">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 font-mono text-[11px] uppercase tracking-widest"><Zap className="h-3.5 w-3.5" /> Limited launch offer</p>
              <h3 className="mt-4 font-heading text-3xl font-extrabold tracking-tighter leading-[0.95]">Get a website today<br />from just {priceLabel}</h3>
              <p className="mt-3 flex items-center gap-1.5 text-sm text-white/90"><Clock className="h-4 w-4" /> Same-day delivery · Delhi NCR & worldwide</p>
              <OfferCountdown light className="mt-4" />
            </div>

            {sent ? (
              <div className="px-7 py-10 text-center" data-testid="exit-offer-success">
                <CheckCircle2 className="mx-auto h-12 w-12 text-brand" />
                <p className="mt-4 font-heading text-xl font-bold">You're in! 🎉</p>
                <p className="mt-2 text-ink/65">Rajeev will reach out shortly. For an instant reply, message on WhatsApp.</p>
                <a href={waLink(`Hi Rajeev, I want the ${priceLabel} same-day website offer.`)} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 font-medium text-white hover:brightness-95 transition"><MessageCircle className="h-4 w-4" /> Chat on WhatsApp</a>
              </div>
            ) : (
              <form onSubmit={submit} className="px-7 py-7" data-testid="exit-offer-form">
                <p className="text-sm text-ink/65">Drop your details and get a fixed-scope quote within the hour — no obligation.</p>
                <div className="mt-5 space-y-3">
                  <input
                    data-testid="exit-offer-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your name"
                    required
                    className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-brand"
                  />
                  <input
                    data-testid="exit-offer-phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="WhatsApp / phone number"
                    required
                    className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-brand"
                  />
                </div>
                <button type="submit" disabled={loading} data-testid="exit-offer-submit" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 font-medium text-white hover:bg-brand transition-colors disabled:opacity-60">
                  {loading ? "Sending…" : <>Claim my {priceLabel} offer <ArrowRight className="h-4 w-4" /></>}
                </button>
                <a href={waLink(`Hi Rajeev, I want the ${priceLabel} same-day website offer.`)} target="_blank" rel="noopener noreferrer" className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-line px-6 py-3 text-sm font-medium hover:border-ink transition-colors">
                  <MessageCircle className="h-4 w-4 text-[#25D366]" /> Or message on WhatsApp
                </a>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
