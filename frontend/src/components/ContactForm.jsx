import { useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { SERVICES } from "@/data/site";
import { trackConversion } from "@/lib/siteConfig";

const field =
  "w-full rounded-lg border border-line bg-white px-4 py-3.5 text-sm outline-none transition-colors duration-200 focus:border-brand focus:ring-2 focus:ring-brand/15 placeholder:text-muted-foreground/70";

export default function ContactForm({ defaultService = "", location = "", countrySlug = "", compact = false }) {
  const routeLoc = useLocation();
  const [form, setForm] = useState({ name: "", email: "", phone: "", service: defaultService, message: "" });
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error("Please add your name and email.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/leads", { ...form, source_path: routeLoc.pathname, location, budget });
      setDone(true);
      trackConversion({ service: form.service || "unspecified" });
      toast.success("Thanks! Rajeev usually replies within the hour.");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Could not send. Try WhatsApp instead.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        data-testid="contact-success"
        className="rounded-2xl border border-line bg-white p-10 text-center"
      >
        <CheckCircle2 className="mx-auto h-12 w-12 text-brand" />
        <h3 className="mt-4 font-heading text-2xl font-bold">Message received.</h3>
        <p className="mt-2 text-muted-foreground">Your project details are in. Expect a reply within ~30 minutes during business hours.</p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} data-testid="contact-form" className="rounded-2xl border border-line bg-white p-6 md:p-8">
      {!compact && (
        <div className="mb-6">
          <p className="overline text-brand">Free · No obligation</p>
          <h3 className="mt-2 font-heading text-2xl md:text-3xl font-extrabold tracking-tight">Tell me about your project</h3>
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-3.5">
        <input data-testid="contact-name" className={field} placeholder="Full name" value={form.name} onChange={set("name")} />
        <input data-testid="contact-phone" className={field} placeholder="Phone / WhatsApp" value={form.phone} onChange={set("phone")} />
        <input data-testid="contact-email" type="email" className={`${field} sm:col-span-2`} placeholder="Email address" value={form.email} onChange={set("email")} />
        <select data-testid="contact-service" className={field} value={form.service} onChange={set("service")}>
          <option value="">Select a service</option>
          {SERVICES.map((s) => <option key={s.slug} value={s.name}>{s.short}</option>)}
          <option value="AI Automation">AI Automation</option>
          <option value="Others">Others</option>
        </select>
        <input data-testid="contact-budget" className={field} placeholder="Budget (optional)" value={budget} onChange={(e) => setBudget(e.target.value)} />
        <textarea data-testid="contact-message" rows={compact ? 3 : 4} className={`${field} sm:col-span-2 resize-none`} placeholder="Project details (optional)" value={form.message} onChange={set("message")} />
      </div>
      <button
        type="submit"
        data-testid="contact-submit"
        disabled={loading}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 font-medium text-white transition-colors duration-300 hover:bg-ink disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {loading ? "Sending…" : "Get my free quote"}
      </button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        By submitting, you agree to be contacted via email or WhatsApp.
      </p>
    </form>
  );
}
