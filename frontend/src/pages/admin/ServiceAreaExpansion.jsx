import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Globe, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { api, formatApiErrorDetail } from "@/lib/api";
import LIVE_SERVICES from "@/seo/live-services.json";

const BASE = "/admin/service-areas";
const DEFAULT_PATH = "/freelancer-ai-consultant/les-escaldes-andorra";
const SERVICES = new Set([...LIVE_SERVICES.map(item => item.slug), "whatsapp-marketing-freelancer", "sms-marketing-freelancer"]);
const CHECK_LABELS = {
  geography_verified: "I checked the place, country and geographic source.",
  remote_delivery_confirmed: "Remote delivery from India is accurate; no local office is implied.",
  content_reviewed: "I reviewed the complete page content for useful, accurate information.",
  business_claims_verified: "Business claims are supported by evidence and do not invent local work or results.",
};
const FIELD = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:bg-paper disabled:text-ink/60";
const BUTTON = "inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium hover:border-ink disabled:opacity-50";
const PRIMARY = "inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-ink disabled:opacity-50";
const CORE_FIELDS = [["title", "Page title"], ["meta_description", "Meta description"], ["h1", "Main heading"], ["service_details", "Service scope"], ["local_context", "Place and planning context"], ["whatsapp_section", "Communication and scheduling"]];
const number = value => typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "—";
const clone = value => JSON.parse(JSON.stringify(value));
function safeSource(value) { try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : null; } catch { return null; } }

export function parseServiceAreaPath(value) {
  let path = String(value || "").trim();
  try { path = decodeURI(path); } catch { throw new Error("The location path could not be read."); }
  if (!path.startsWith("/") || /[?#]/.test(path)) throw new Error("Enter a relative service/location path without a query or fragment.");
  const parts = path.replace(/\/$/, "").split("/");
  if (parts.length !== 3 || !SERVICES.has(parts[1]) || !/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(parts[2])) throw new Error("Use a canonical service and a location from the additional catalog.");
  return { service: parts[1], location: parts[2], path: `/${parts[1]}/${parts[2]}` };
}

export function newAreaReviewPayload(preview, content, checks, notes, reviewed) {
  if (!preview || preview.pre_existing_record) throw new Error("This existing page is read-only and cannot be changed here.");
  if (!content || CORE_FIELDS.some(([key]) => typeof content[key] !== "string" || !content[key].trim()) || !Array.isArray(content.intro) || !content.intro.length || content.intro.some(item => typeof item !== "string" || !item.trim())) throw new Error("Complete the page copy before saving.");
  for (const [key, fields] of [["why_choose", ["title", "text"]], ["process", ["title", "text"]], ["faqs", ["q", "a"]]]) {
    if (!Array.isArray(content[key]) || content[key].some(row => !row || fields.some(field => typeof row[field] !== "string" || !row[field].trim()))) throw new Error("Complete the project details and questions before saving.");
  }
  const required = preview.required_checks?.length ? preview.required_checks : Object.keys(CHECK_LABELS);
  if (reviewed && (required.some(key => checks[key] !== true) || String(notes || "").trim().length < 20)) throw new Error("Approval needs all review checks and an evidence note of at least 20 characters.");
  return { reviewed: Boolean(reviewed), content: clone(content), checks: Object.fromEntries(required.map(key => [key, checks[key] === true])), evidence_notes: String(notes || "").trim(), expected_revision: preview.expected_revision };
}

export default function ServiceAreaExpansion() {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState("");
  const [path, setPath] = useState(DEFAULT_PATH);
  const [target, setTarget] = useState(null);
  const [preview, setPreview] = useState(null);
  const [content, setContent] = useState(null);
  const [introText, setIntroText] = useState("");
  const [checks, setChecks] = useState({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);

  const loadStats = async () => { try { const { data } = await api.get(`${BASE}/status`); setStats(data); setStatsError(""); } catch (err) { setStatsError(formatApiErrorDetail(err.response?.data?.detail) || "Catalog totals could not be loaded."); } };
  useEffect(() => { loadStats(); }, []);
  const readPreview = async chosen => {
    const { data } = await api.get(`${BASE}/page/${encodeURIComponent(chosen.service)}/${encodeURIComponent(chosen.location)}`);
    if (!data?.page?.content) throw new Error("No page copy is available for this location.");
    setPreview(data); setContent(clone(data.page.content)); setIntroText((data.page.content.intro || []).join("\n\n")); setTarget(chosen); setChecks({}); setNotes(data.page.review_evidence_notes || ""); setConflict(false);
    return data;
  };
  const loadPreview = async event => {
    event?.preventDefault();
    setLoading(true); setError(""); setPreview(null); setContent(null); setTarget(null); setConflict(false);
    try { await readPreview(parseServiceAreaPath(path)); }
    catch (err) { setError(formatApiErrorDetail(err.response?.data?.detail) || err.message || "The new page could not be loaded."); }
    finally { setLoading(false); }
  };
  const edit = (key, value) => { setContent(previous => ({ ...previous, [key]: value })); setChecks({}); };
  const save = async reviewed => {
    if (loading || saving || conflict || !target) return;
    let payload;
    try { payload = newAreaReviewPayload(preview, content, checks, notes, reviewed); }
    catch (err) { return toast.error(err.message); }
    setSaving(true); setError("");
    try {
      await api.put(`${BASE}/page/${encodeURIComponent(target.service)}/${encodeURIComponent(target.location)}`, payload);
      toast.success(reviewed ? "New page approved for indexing eligibility" : "New page saved as a draft");
      await readPreview(target); await loadStats();
    } catch (err) {
      const message = formatApiErrorDetail(err.response?.data?.detail) || err.message || "The new page could not be saved.";
      if (err.response?.status === 409) setConflict(true);
      setError(message + (err.response?.status === 409 ? " Reload the preview before taking another action." : ""));
      toast.error(message);
    } finally { setSaving(false); }
  };

  const locked = loading || saving || conflict || preview?.pre_existing_record === true;
  const required = preview?.required_checks?.length ? preview.required_checks : Object.keys(CHECK_LABELS);
  const ready = content && !locked && required.every(key => checks[key] === true) && notes.trim().length >= 20;
  const source = safeSource(preview?.page?.location?.source_url);
  const cards = [["Locations in sourced catalog", stats?.total_location_count], ["Additional locations", stats?.additional_location_count], ["Total service URLs", stats?.candidate_url_count], ["New candidate URLs", stats?.additional_candidate_url_count], ["Approved new pages", stats?.approved_url_count], ["Saved new drafts", stats?.saved_draft_url_count]];

  return <section className="mt-6 rounded-xl border border-brand/20 bg-brand/[0.025] p-5" data-testid="service-area-expansion-admin">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 font-heading font-bold"><Globe className="h-4 w-4 text-brand" /> New service-area pages</h3><p className="mt-2 max-w-3xl text-xs leading-relaxed text-ink/65">Explore the additional geographic catalog and review individual new pages. Existing pages and their titles, descriptions and content are read-only in this workflow.</p></div><button type="button" onClick={loadStats} disabled={loading || saving} className={BUTTON}><RefreshCw className="h-3.5 w-3.5" /> Refresh totals</button></div>
    <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">{cards.map(([label, value]) => <div key={label} className="rounded-lg border border-line bg-white p-3"><p className="font-heading text-xl font-extrabold">{number(value)}</p><p className="mt-1 text-[11px] text-muted-foreground">{label}</p></div>)}</div>
    {statsError && <p className="mt-3 text-xs text-rose-700" role="alert">{statsError}</p>}
    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Catalog capacity is separate from saved pages. Approval controls eligibility for indexing; it does not confirm that a search engine has indexed the page.</p>
    <div className="mt-4 flex flex-wrap gap-4"><a href="/service-areas" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-brand underline">Open public directory <ExternalLink className="h-3.5 w-3.5" /></a><button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="service-area-new-page-review" className="text-sm font-medium text-brand underline">{open ? "Hide" : "Review"} an individual new page</button></div>
    {open && <div id="service-area-new-page-review" className="mt-5 border-t border-line pt-5">
      <form onSubmit={loadPreview} className="flex flex-wrap items-end gap-3"><label className="w-full max-w-xl text-xs font-medium text-ink/70">New service/location path<input data-testid="new-area-path" value={path} onChange={event => { setPath(event.target.value); setPreview(null); setContent(null); setTarget(null); setChecks({}); setConflict(false); setError(""); }} disabled={loading || saving} className={FIELD} /></label><button data-testid="new-area-preview" disabled={loading || saving} className={PRIMARY}>{loading && <Loader2 className="h-4 w-4 animate-spin" />} Load preview</button></form>
      {error && <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}{conflict && <button type="button" onClick={loadPreview} disabled={saving || loading} className="ml-2 font-semibold underline">Reload preview</button>}</div>}
      {preview && content && <div className="mt-5 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-line bg-white p-4"><div><p className="text-sm font-semibold">{preview.pre_existing_record ? "Existing page — read-only" : preview.page.seo_reviewed ? "Approved new page" : "New page preview"}</p><p className="mt-1 text-xs text-muted-foreground">{preview.page.location?.city}, {preview.page.location?.country} · Remote delivery from India</p>{preview.pre_existing_record && <p className="mt-2 text-xs text-amber-700">An existing page already owns this address. Its copy cannot be changed or approved here.</p>}</div>{target && <a href={target.path} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand underline">Open page <ExternalLink className="h-3 w-3" /></a>}</div>
        {source && <p className="text-xs text-muted-foreground">Geographic source: <a href={source} target="_blank" rel="noopener noreferrer" className="break-all text-brand underline">{source}</a></p>}
        <div className="grid gap-4 md:grid-cols-2">{CORE_FIELDS.map(([key, label]) => <label key={key} className={`text-xs font-medium text-ink/70 ${["service_details", "local_context", "whatsapp_section"].includes(key) ? "md:col-span-2" : ""}`}>{label}<textarea value={content[key] || ""} onChange={event => edit(key, event.target.value)} disabled={locked} rows={["title", "h1"].includes(key) ? 2 : 3} className={FIELD} /></label>)}<label className="text-xs font-medium text-ink/70 md:col-span-2">Introduction — blank line between paragraphs<textarea value={introText} onChange={event => { setIntroText(event.target.value); edit("intro", event.target.value.split(/\n\s*\n/).map(value => value.trim()).filter(Boolean)); }} disabled={locked} rows={5} className={FIELD} /></label></div>
        {["why_choose", "process"].map(key => <details key={key} className="rounded-lg border border-line bg-white p-4"><summary className="cursor-pointer text-sm font-semibold">{key === "why_choose" ? "Project planning details" : "Delivery and handover steps"}</summary><ol className="mt-3 space-y-3">{(content[key] || []).map((row, index) => <li key={index} className="text-sm"><p className="font-medium">{row.step ? `${row.step}. ` : ""}{row.title}</p><p className="mt-1 leading-relaxed text-ink/65">{row.text}</p></li>)}</ol></details>)}
        {Array.isArray(content.faqs) && <details className="rounded-lg border border-line bg-white p-4" open><summary className="cursor-pointer text-sm font-semibold">Questions and answers</summary><div className="mt-4 space-y-4">{content.faqs.map((faq, index) => <div key={index} className="grid gap-2"><label className="text-xs font-medium text-ink/70">Question {index + 1}<input value={faq.q || ""} onChange={event => edit("faqs", content.faqs.map((item, i) => i === index ? { ...item, q: event.target.value } : item))} disabled={locked} className={FIELD} /></label><label className="text-xs font-medium text-ink/70">Answer<textarea value={faq.a || ""} onChange={event => edit("faqs", content.faqs.map((item, i) => i === index ? { ...item, a: event.target.value } : item))} disabled={locked} rows={3} className={FIELD} /></label></div>)}</div></details>}
        <div className="rounded-lg border border-line bg-white p-4"><h4 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-brand" /> Review this new page</h4><div className="mt-3 space-y-3">{required.map(key => <label key={key} className="flex items-start gap-2 text-sm text-ink/75"><input type="checkbox" data-testid={`new-area-check-${key}`} checked={checks[key] === true} onChange={event => setChecks(previous => ({ ...previous, [key]: event.target.checked }))} disabled={locked} className="mt-0.5 h-4 w-4 shrink-0 accent-[#0055FF]" />{CHECK_LABELS[key] || key.replaceAll("_", " ")}</label>)}</div><label className="mt-4 block text-xs font-medium text-ink/70">Review evidence and reasoning — at least 20 characters<textarea data-testid="new-area-evidence-notes" value={notes} onChange={event => setNotes(event.target.value)} disabled={locked} rows={3} className={FIELD} /></label><div className="mt-4 flex flex-wrap gap-3"><button type="button" data-testid="new-area-approve" onClick={() => save(true)} disabled={!ready} className={PRIMARY}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Approve this new page</button><button type="button" data-testid="new-area-save-draft" onClick={() => save(false)} disabled={locked} className={BUTTON}>{preview.page.seo_reviewed ? "Return this new page to draft" : "Save this new page as a draft"}</button></div><p className="mt-3 text-xs text-muted-foreground">Each action applies only to the displayed new page. Reloading a changed page protects work saved by another reviewer.</p></div>
      </div>}
    </div>}
  </section>;
}
