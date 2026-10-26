import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import ImageUpload from "@/pages/admin/ImageUpload";

export const field = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";
export const token = (value) => typeof value === "object" && value ? value.slug || value.name || "" : value || "";
export const lines = (value) => (value || "").split("\n").map((item) => item.trim()).filter(Boolean);

export function useProjectTaxonomy() {
  const [taxonomy, setTaxonomy] = useState({ industries: [], services: [] });
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api.get("/portfolio/taxonomy").then(({ data }) => {
      if (active) { setTaxonomy(data); setError(""); }
    }).catch(() => { if (active) setError("Industry and service options could not load. Reload this page to try again."); });
    return () => { active = false; };
  }, []);
  return { ...taxonomy, error };
}

export function Label({ text, children, hint }) {
  return <label className="block min-w-0"><span className="mb-1.5 block text-xs font-semibold text-ink/75">{text}</span>{children}{hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}</label>;
}

export function IndustrySelect({ value, options = [], onChange, id = "project-industry", required = false }) {
  const current = token(value);
  const known = options.some((option) => option.slug === current);
  return <Label text="Industry"><select id={id} data-testid={id} className={field} value={current} required={required} onChange={(event) => onChange(event.target.value)}>
    <option value="">Select an industry</option>
    {current && !known && <option value={current}>{typeof value === "object" ? value.name || current : current} (existing)</option>}
    {options.map((option) => <option key={option.slug} value={option.slug}>{option.name}</option>)}
  </select></Label>;
}

export function ServiceSelect({ value = [], options = [], onChange, id = "project-services" }) {
  const selected = value.map(token).filter(Boolean);
  const unknown = selected.filter((item) => !options.some((option) => option.slug === item));
  const choices = [...options, ...unknown.map((slug) => ({ slug, name: slug }))];
  return <fieldset className="rounded-xl border border-line p-4" data-testid={id}><legend className="px-1 text-xs font-semibold text-ink/75">Services we delivered</legend>
    <p className="mb-3 text-xs text-muted-foreground">Select every service completed for this project. Industry and services are separate.</p>
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{choices.map((option) => <label key={option.slug} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#0055FF]" checked={selected.includes(option.slug)} onChange={(event) => onChange(event.target.checked ? [...selected, option.slug] : selected.filter((item) => item !== option.slug))} />{option.name}</label>)}</div>
    {!choices.length && <p className="text-sm text-muted-foreground">Loading service options…</p>}
  </fieldset>;
}

export function GalleryEditor({ value = [], onChange, id = "project-gallery" }) {
  const update = (index, key, next) => onChange(value.map((row, position) => position === index ? { ...row, [key]: next } : row));
  return <div className="rounded-xl border border-line p-4" data-testid={id}>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold">Project photos & screenshots</p><p className="mt-1 text-xs text-muted-foreground">Add screenshots, descriptive alt text and captions. Public previews use a consistent 16:10 frame.</p></div><button type="button" onClick={() => onChange([...value, { url: "", alt: "", caption: "" }])} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-medium"><Plus className="h-3.5 w-3.5" /> Add photo</button></div>
    <div className="mt-4 space-y-4">{value.map((row, index) => <div key={index} className="rounded-xl bg-paper p-3"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold">Photo {index + 1}</p><button type="button" aria-label={`Remove photo ${index + 1}`} onClick={() => onChange(value.filter((_, position) => position !== index))} className="inline-flex items-center gap-1 text-xs text-red-600"><Trash2 className="h-3.5 w-3.5" /> Remove</button></div><ImageUpload label={`Photo ${index + 1}`} value={row.url} onChange={(next) => update(index, "url", next)} testid={`${id}-${index}`} /><div className="mt-3 grid gap-3 sm:grid-cols-2"><Label text="Image description (alt text)"><input className={field} value={row.alt || ""} onChange={(event) => update(index, "alt", event.target.value)} /></Label><Label text="Caption"><input className={field} value={row.caption || ""} onChange={(event) => update(index, "caption", event.target.value)} /></Label></div></div>)}</div>
  </div>;
}
