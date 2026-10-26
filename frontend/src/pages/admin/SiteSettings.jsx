import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Settings, Search, Phone, Share2, Building2, ChevronDown, BarChart3, MessageCircle, Megaphone } from "lucide-react";
import { api, formatApiErrorDetail } from "@/lib/api";

const GROUPS = [
  {
    key: "seo",
    label: "SEO defaults",
    icon: Search,
    fields: [
      { name: "site_name", label: "Site name" },
      { name: "default_title", label: "Default title" },
      { name: "default_description", label: "Default description", textarea: true },
      { name: "og_image", label: "OG / share image URL" },
      { name: "canonical_domain", label: "Canonical domain (https://…)" },
      { name: "twitter_handle", label: "Twitter/X handle (@…)" },
      { name: "google_verification", label: "Google Search Console verification code (content value only)" },
      { name: "robots_index", label: "Allow search engines to index", bool: true },
    ],
  },
  {
    key: "contact",
    label: "Contact",
    icon: Phone,
    fields: [
      { name: "name", label: "Display name" },
      { name: "email", label: "Email" },
      { name: "phone", label: "Phone (+countrycode…)" },
      { name: "whatsapp", label: "WhatsApp number (digits only)" },
      { name: "whatsapp_display", label: "WhatsApp display" },
    ],
  },
  {
    key: "social",
    label: "Social links",
    icon: Share2,
    fields: [
      { name: "linkedin", label: "LinkedIn URL" },
      { name: "github", label: "GitHub URL" },
      { name: "twitter", label: "Twitter/X URL" },
      { name: "instagram", label: "Instagram URL" },
      { name: "youtube", label: "YouTube URL" },
      { name: "facebook", label: "Facebook URL" },
    ],
  },
  {
    key: "business",
    label: "Business & local SEO",
    icon: Building2,
    fields: [
      { name: "logo", label: "Logo URL" },
      { name: "rating", label: "Rating (e.g. 4.9)" },
      { name: "reviews_count", label: "Reviews count" },
      { name: "reviews_verified", label: "Rating and review count checked against the current Google profile", bool: true },
      { name: "testimonials_verified", label: "Client testimonials are genuine and approved for publication", bool: true },
      { name: "google_profile_url", label: "Exact Google Business Profile share URL" },
      { name: "customer_facing_office_verified", label: "This address is a staffed office that receives customers", bool: true },
      { name: "founding_year", label: "Founding year" },
      { name: "founder_name", label: "Founder name" },
      { name: "address", label: "Address / city" },
      { name: "google_maps_url", label: "Google Maps link" },
      { name: "map_embed_url", label: "Google Maps embed URL (…&output=embed)" },
    ],
  },
  {
    key: "tracking",
    label: "Conversion tracking (Google Ads / GA4)",
    icon: BarChart3,
    fields: [
      { name: "ga4_id", label: "GA4 Measurement ID (G-XXXXXXX)" },
      { name: "ads_id", label: "Google Ads ID (AW-XXXXXXXXX)" },
      { name: "ads_conversion_label", label: "Ads conversion label" },
    ],
  },
  {
    key: "marketing",
    label: "Launch offers & popup",
    icon: Megaphone,
    fields: [
      { name: "offers_enabled", label: "Show the launch-offers section + pricing", bool: true },
      { name: "popup_enabled", label: "Show the exit-intent offer popup", bool: true },
      { name: "offers_end_date", label: "Auto-turn-off date (offers hide after this day)", date: true },
    ],
  },
];

const field = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";

export default function SiteSettings() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    api.get("/admin/settings/site").then(({ data }) => setForm(data)).catch(() => toast.error("Failed to load site settings"));
  }, []);

  const set = (group, name, value) => setForm((f) => ({ ...f, [group]: { ...f[group], [name]: value } }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { seo: form.seo, contact: form.contact, social: form.social, business: form.business, tracking: form.tracking, notifications: form.notifications, marketing: form.marketing };
      const { data } = await api.put("/admin/settings/site", payload);
      setForm(data);
      toast.success("Site settings saved");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  if (!form) return null;

  return (
    <div data-testid="site-settings" className="mt-8 rounded-2xl border border-line bg-white p-6">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between" data-testid="site-settings-toggle">
        <span className="flex items-center gap-2 font-heading font-bold"><Settings className="h-4 w-4 text-brand" /> Site settings (SEO, contact, social, business)</span>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-6 space-y-8">
          {GROUPS.map((g) => (
            <div key={g.key}>
              <p className="flex items-center gap-2 text-sm font-heading font-bold text-ink/80"><g.icon className="h-4 w-4 text-brand" /> {g.label}</p>
              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                {g.fields.map((f) => (
                  <label key={f.name} className={`flex flex-col gap-1 text-xs font-mono uppercase tracking-wide text-muted-foreground ${f.textarea ? "sm:col-span-2" : ""}`}>
                    {f.label}
                    {f.bool ? (
                      <span className="mt-1 inline-flex items-center gap-2 normal-case tracking-normal text-ink">
                        <input type="checkbox" data-testid={`settings-${g.key}-${f.name}`} checked={!!form[g.key]?.[f.name]} onChange={(e) => set(g.key, f.name, e.target.checked)} className="h-4 w-4 accent-[#0055FF]" />
                        <span className="text-sm">{form[g.key]?.[f.name] ? "Yes" : "No"}</span>
                      </span>
                    ) : f.textarea ? (
                      <textarea data-testid={`settings-${g.key}-${f.name}`} rows={2} value={form[g.key]?.[f.name] || ""} onChange={(e) => set(g.key, f.name, e.target.value)} className={field} />
                    ) : f.date ? (
                      <input type="date" data-testid={`settings-${g.key}-${f.name}`} value={form[g.key]?.[f.name] || ""} onChange={(e) => set(g.key, f.name, e.target.value)} className={field} />
                    ) : (
                      <input data-testid={`settings-${g.key}-${f.name}`} value={form[g.key]?.[f.name] || ""} onChange={(e) => set(g.key, f.name, e.target.value)} className={field} />
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <button data-testid="site-settings-save" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-ink transition-colors disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
