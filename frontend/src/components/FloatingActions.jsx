import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Phone, MessageSquarePlus, X, CalendarClock, Loader2, CheckCircle2, PhoneCall } from "lucide-react";
import ContactForm from "@/components/ContactForm";
import { api, formatApiErrorDetail } from "@/lib/api";
import { CONTACT, waLink, SERVICES } from "@/data/site";

const WaIcon = (props) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" {...props}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
  </svg>
);

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const field = "w-full rounded-lg border border-line bg-white px-4 py-3.5 text-sm outline-none transition-colors duration-200 focus:border-brand focus:ring-2 focus:ring-brand/15 placeholder:text-muted-foreground/70";
const SLOTS = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

function Modal({ title, subtitle, onClose, children, testid }) {
  return (
    <motion.div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-testid={testid}>
      <motion.div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative z-10 w-full max-w-md"
        initial={{ y: 40, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.98 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-white">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">{subtitle}</p>
            <p className="font-heading text-xl font-bold">{title}</p>
          </div>
          <button onClick={onClose} data-testid="modal-close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto rounded-2xl">{children}</div>
      </motion.div>
    </motion.div>
  );
}

function CallScheduler({ prefillService, location, onClose }) {
  const routeLoc = useLocation();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "your timezone";
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ name: "", phone: "", email: "", date: today, time: "10:00" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.name || (!f.phone && !f.email)) { toast.error("Add your name and a phone or email."); return; }
    setLoading(true);
    try {
      await api.post("/leads", {
        name: f.name, email: f.email, phone: f.phone,
        service: prefillService || "Call booking",
        budget: "",
        message: `📞 Call requested: ${f.date} at ${f.time} (${tz})`,
        source_path: routeLoc.pathname, location,
      });
      setDone(true);
      toast.success("Call requested! Rajeev will confirm shortly.");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Could not book. Try WhatsApp.");
    } finally { setLoading(false); }
  };

  if (done) return (
    <div className="rounded-2xl border border-line bg-white p-10 text-center" data-testid="call-success">
      <CheckCircle2 className="mx-auto h-12 w-12 text-brand" />
      <h3 className="mt-4 font-heading text-2xl font-bold">Call requested.</h3>
      <p className="mt-2 text-muted-foreground">You'll get a confirmation on WhatsApp, usually within the hour.</p>
    </div>
  );

  return (
    <form onSubmit={submit} data-testid="call-scheduler" className="rounded-2xl border border-line bg-white p-6 md:p-7">
      <a href={`tel:${CONTACT.phone}`} data-testid="call-now-btn"
        className="mb-5 flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 font-medium text-white hover:bg-brand transition-colors">
        <PhoneCall className="h-4 w-4" /> Call now · {CONTACT.whatsappDisplay}
      </a>
      <p className="text-center text-xs text-muted-foreground mb-4">— or pick a time that suits you —</p>
      <div className="grid grid-cols-2 gap-3">
        <input data-testid="call-name" className={field} placeholder="Full name" value={f.name} onChange={set("name")} />
        <input data-testid="call-phone" className={field} placeholder="Phone / WhatsApp" value={f.phone} onChange={set("phone")} />
        <input data-testid="call-email" type="email" className={`${field} col-span-2`} placeholder="Email (optional)" value={f.email} onChange={set("email")} />
        <input data-testid="call-date" type="date" min={today} className={field} value={f.date} onChange={set("date")} />
        <select data-testid="call-time" className={field} value={f.time} onChange={set("time")}>
          {SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Detected timezone: <span className="font-medium text-ink">{tz}</span></p>
      <button type="submit" data-testid="call-submit" disabled={loading}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 font-medium text-white hover:bg-ink transition-colors disabled:opacity-60">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
        {loading ? "Booking…" : "Request this time slot"}
      </button>
    </form>
  );
}

export default function FloatingActions() {
  const { pathname } = useLocation();
  const [modal, setModal] = useState(null); // 'inquiry' | 'call' | null

  useEffect(() => { document.body.style.overflow = modal ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [modal]);
  useEffect(() => { setModal(null); }, [pathname]);

  // Prefill from the current route (service hub / location page)
  const parts = pathname.split("/").filter(Boolean);
  const svc = parts[0] ? SERVICES.find((s) => s.slug === parts[0]) : null;
  const prefillService = svc ? svc.name : "";
  const prettyLoc = svc && parts[1] ? parts[1].split("-").map(cap).join(" ") : "";

  const spring = { type: "spring", stiffness: 220, damping: 18 };

  return (
    <>
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
        <motion.button type="button" onClick={() => setModal("inquiry")} data-testid="floating-inquiry-btn"
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...spring, delay: 0.35 }}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2.5 rounded-full bg-brand text-white pl-4 pr-5 py-3 shadow-lg shadow-brand/30" aria-label="Send an inquiry">
          <MessageSquarePlus className="h-5 w-5" /><span className="text-sm font-semibold">Inquiry</span>
        </motion.button>

        <div className="flex items-center gap-3">
          <motion.button type="button" onClick={() => setModal("call")} data-testid="floating-call-btn"
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...spring, delay: 0.25 }}
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-lg shadow-black/20" aria-label="Call or schedule a call" title="Call Rajeev">
            <Phone className="h-6 w-6" />
          </motion.button>

          <motion.a href={waLink()} target="_blank" rel="noopener noreferrer" data-testid="floating-whatsapp"
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...spring, delay: 0.15 }}
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30" aria-label="Chat on WhatsApp" title="Chat on WhatsApp">
            <WaIcon className="h-6 w-6" />
          </motion.a>
        </div>
      </div>

      <AnimatePresence>
        {modal === "inquiry" && (
          <Modal testid="inquiry-modal" title="Send an inquiry" subtitle={prefillService ? `Re: ${svc.short}${prettyLoc ? ` · ${prettyLoc}` : ""}` : "Free · No obligation"} onClose={() => setModal(null)}>
            <ContactForm compact defaultService={prefillService} location={prettyLoc} />
          </Modal>
        )}
        {modal === "call" && (
          <Modal testid="call-modal" title="Book a call" subtitle="Talk to Rajeev directly" onClose={() => setModal(null)}>
            <CallScheduler prefillService={prefillService ? `Call · ${svc.short}` : "Call booking"} location={prettyLoc} onClose={() => setModal(null)} />
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}
