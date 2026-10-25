import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Loader2, LineChart, ChevronDown, Plus, Trash2, Pencil, GripVertical, Eye } from "lucide-react";
import { api, formatApiErrorDetail } from "@/lib/api";
import ImageUpload from "@/pages/admin/ImageUpload";
import { GalleryEditor, IndustrySelect, Label, ServiceSelect, useProjectTaxonomy } from "@/pages/admin/ProjectFields";

const CATS = ["SEO", "AI", "Web", "Marketing", "App"];
const field = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";
const EMPTY = {
  title: "", slug: "", category: "Web", tag: "", metric: "", metricLabel: "",
  industry: "", region: "", duration: "", year: "", cover: "", og: "", excerpt: "",
  client_name: "", website_url: "", gallery: [],
  challenge: "", approach: "", results: "", services: [], stack: "",
  chartLabel: "", chartBefore: "", chartAfter: "", chartSuffix: "", chartPrefix: "", chartHigher: true,
  quoteText: "", quoteName: "", quoteRole: "", published: false, order: 100,
};

// approach textarea format: "Heading | text" per line. results: "value | label" per line.
function parsePairs(text, keys) {
  return (text || "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const [a, ...rest] = l.split("|");
    return { [keys[0]]: (a || "").trim(), [keys[1]]: rest.join("|").trim() };
  });
}
const joinPairs = (arr, keys) => (arr || []).map((o) => `${o[keys[0]] || ""} | ${o[keys[1]] || ""}`).join("\n");

export default function CaseStudyManager() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const dragIndex = useRef(null);
  const taxonomy = useProjectTaxonomy();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get("/admin/case-studies"); setItems(data.items || []); setError(""); }
    catch (err) { setError(formatApiErrorDetail(err.response?.data?.detail) || "Could not load case studies"); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (open) load(); }, [open]);

  const reorder = async (from, to) => {
    if (from == null || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
    try { await api.put("/admin/case-studies/reorder", { ids: next.map((x) => x.id) }); toast.success("Order saved"); }
    catch { toast.error("Could not save order"); load(); }
  };

  const startNew = () => { setForm({ ...EMPTY }); setEditing({}); setError(""); setShowPreview(false); };
  const startEdit = (c) => {
    const ch = c.chart || {};
    setForm({
      ...EMPTY, ...c,
      approach: joinPairs(c.approach, ["h", "t"]),
      results: joinPairs(c.results, ["value", "label"]),
      services: c.services || [],
      stack: (c.stack || []).join(", "),
      chartLabel: ch.label || "", chartBefore: ch.before ?? "", chartAfter: ch.after ?? "",
      chartSuffix: ch.suffix || "", chartPrefix: ch.prefix || "", chartHigher: ch.higherIsBetter !== false,
      quoteText: c.quote?.text || "", quoteName: c.quote?.name || "", quoteRole: c.quote?.role || "",
    });
    setEditing({ id: c.id }); setError(""); setShowPreview(false);
  };

  const save = async (published = form.published) => {
    if (!form.title.trim()) { setError("Title is required"); return; }
    setSaving(true); setError("");
    const payload = {
      title: form.title, ...(!editing.id && form.slug ? { slug: form.slug } : {}), category: form.category, tag: form.tag,
      client_name: form.client_name || "", website_url: form.website_url || "", gallery: (form.gallery || []).filter((row) => row.url.trim()),
      metric: form.metric, metricLabel: form.metricLabel, industry: form.industry, region: form.region,
      duration: form.duration, year: String(form.year), cover: form.cover, og: form.og, excerpt: form.excerpt,
      challenge: form.challenge, published, order: Number(form.order) || 0,
      approach: parsePairs(form.approach, ["h", "t"]),
      results: parsePairs(form.results, ["value", "label"]),
      services: form.services,
      stack: form.stack.split(",").map((s) => s.trim()).filter(Boolean),
      quote: { text: form.quoteText, name: form.quoteName, role: form.quoteRole },
      chart: form.chartLabel ? {
        label: form.chartLabel, before: Number(form.chartBefore) || 0, after: Number(form.chartAfter) || 0,
        suffix: form.chartSuffix, prefix: form.chartPrefix, higherIsBetter: !!form.chartHigher,
      } : null,
    };
    try {
      if (editing.id) await api.put(`/admin/case-studies/${editing.id}`, payload);
      else await api.post("/admin/case-studies", payload);
      toast.success(published ? "Case study published" : "Case study saved as draft");
      setEditing(null); load();
    } catch (err) {
      const detail = formatApiErrorDetail(err.response?.data?.detail) || "Save failed";
      setError(detail); toast.error(detail);
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this case study?")) return;
    try { await api.delete(`/admin/case-studies/${id}`); toast.success("Deleted"); load(); }
    catch { toast.error("Delete failed"); }
  };

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  return (
    <div data-testid="case-study-manager" className="mt-8 rounded-2xl border border-line bg-white p-6">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between" data-testid="case-manager-toggle">
        <span className="flex items-center gap-2 font-heading font-bold"><LineChart className="h-4 w-4 text-brand" /> Case studies</span>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-6">
          <p className="mb-4 text-sm text-muted-foreground">Publish the story of work we completed: the challenge, what we delivered and the results. Published entries appear automatically in Case Studies.</p>
          {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {loading && <p className="mb-4 flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading case studies…</p>}
          {!editing ? (
            <>
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">{items.length} case study(ies)</p>
                <button data-testid="case-new" onClick={startNew} className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-ink transition-colors"><Plus className="h-4 w-4" /> New case study</button>
              </div>
              <div className="mt-4 divide-y divide-line border border-line rounded-xl">
                {items.map((c, idx) => (
                  <div key={c.id} data-testid={`case-row-${c.slug}`}
                    draggable onDragStart={() => { dragIndex.current = idx; }}
                    onDragOver={(e) => e.preventDefault()} onDrop={() => reorder(dragIndex.current, idx)}
                    className="flex items-center justify-between gap-3 px-4 py-3 bg-white">
                    <div className="flex items-center gap-2 min-w-0">
                      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-ink/30" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate"><span className="text-brand font-bold">{c.metric}</span> · {c.title}</p>
                        <p className="text-xs text-muted-foreground">{c.category} · /{c.slug} · {c.published ? "published" : "draft"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" aria-label={`Edit ${c.title}`} onClick={() => startEdit(c)} data-testid={`case-edit-${c.slug}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line hover:border-ink"><Pencil className="h-4 w-4" /></button>
                      <button type="button" aria-label={`Delete ${c.title}`} onClick={() => remove(c.id)} data-testid={`case-delete-${c.slug}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-red-600 hover:border-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5"><GripVertical className="h-3.5 w-3.5" /> Drag rows to reorder how they appear on the site.</p>
            </>
          ) : (
            <div className="space-y-3">
              {taxonomy.error && <p role="alert" className="text-sm text-red-600">{taxonomy.error}</p>}
              <div className="grid sm:grid-cols-2 gap-3">
                <Label text="Title"><input aria-label="Case study title" data-testid="case-field-title" className={field} placeholder="Title" value={form.title} onChange={setF("title")} /></Label>
                <Label text="Page URL slug" hint={editing.id ? "The existing URL stays fixed when you edit." : "Generated from title when blank."}><input className={field} value={form.slug} disabled={!!editing.id} onChange={setF("slug")} /></Label>
                <Label text="Primary service category"><select className={field} value={form.category} onChange={setF("category")}>{CATS.map((c) => <option key={c} value={c}>{c}</option>)}</select></Label>
                <Label text="Tag (e.g. SEO · GEO)"><input className={field} placeholder="Tag (e.g. SEO · GEO)" value={form.tag} onChange={setF("tag")} /></Label>
                <Label text="Metric (e.g. 3×, +52%)"><input data-testid="case-field-metric" className={field} placeholder="Metric (e.g. 3×, +52%)" value={form.metric} onChange={setF("metric")} /></Label>
                <Label text="Metric label"><input className={field} placeholder="Metric label" value={form.metricLabel} onChange={setF("metricLabel")} /></Label>
                <IndustrySelect value={form.industry} options={taxonomy.industries} onChange={(value) => setForm((current) => ({ ...current, industry: value }))} id="case-industry" />
                <Label text="Region"><input className={field} placeholder="Region" value={form.region} onChange={setF("region")} /></Label>
                <Label text="Duration"><input className={field} placeholder="Duration" value={form.duration} onChange={setF("duration")} /></Label>
                <Label text="Year"><input className={field} placeholder="Year" value={form.year} onChange={setF("year")} /></Label>
                <Label text="Client / company name"><input className={field} value={form.client_name} onChange={setF("client_name")} /></Label>
                <Label text="Live website or application URL"><input type="url" className={field} value={form.website_url} onChange={setF("website_url")} placeholder="https://" /></Label>
                <Label text="Stack / tags (comma)"><input className={field} placeholder="Stack / tags (comma)" value={form.stack} onChange={setF("stack")} /></Label>
              </div>
              <ServiceSelect value={form.services} options={taxonomy.services} onChange={(value) => setForm((current) => ({ ...current, services: value }))} id="case-services" />
              <div className="grid sm:grid-cols-2 gap-3">
                <ImageUpload testid="case-cover-upload" label="Cover image" value={form.cover} onChange={(v) => setForm((f) => ({ ...f, cover: v }))} />
                <ImageUpload testid="case-og-upload" label="OG share image" value={form.og} onChange={(v) => setForm((f) => ({ ...f, og: v }))} />
              </div>
              <GalleryEditor value={form.gallery || []} onChange={(value) => setForm((current) => ({ ...current, gallery: value }))} id="case-gallery" />
              <p className="text-xs text-muted-foreground">Describe what we built, redesigned or delivered. Add metrics and testimonials only when the client has approved them or you have supporting records.</p>
              <textarea aria-label="Excerpt / summary" className={field} rows={2} placeholder="Excerpt / summary" value={form.excerpt} onChange={setF("excerpt")} />
              <textarea aria-label="The challenge" className={field} rows={3} placeholder="The challenge" value={form.challenge} onChange={setF("challenge")} />
              <textarea aria-label="Our approach: heading and description per line" data-testid="case-field-approach" className={field} rows={4} placeholder="Approach — one per line as: Heading | description" value={form.approach} onChange={setF("approach")} />
              <textarea aria-label="Results: value and label per line" data-testid="case-field-results" className={field} rows={4} placeholder="Results — one per line as: value | label" value={form.results} onChange={setF("results")} />
              <div className="grid sm:grid-cols-2 gap-3">
                <Label text="Quote text"><input className={field} placeholder="Quote text" value={form.quoteText} onChange={setF("quoteText")} /></Label>
                <Label text="Quote author"><input className={field} placeholder="Quote author" value={form.quoteName} onChange={setF("quoteName")} /></Label>
                <Label text="Quote role"><input className={field} placeholder="Quote role" value={form.quoteRole} onChange={setF("quoteRole")} /></Label>
                <Label text="Sort order"><input className={field} type="number" placeholder="Sort order" value={form.order} onChange={setF("order")} /></Label>
              </div>
              <div className="rounded-xl border border-line p-3">
                <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground mb-2">Before / after chart (optional)</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Label text="Chart label"><input className={`${field} sm:col-span-3`} placeholder="Chart label" value={form.chartLabel} onChange={setF("chartLabel")} /></Label>
                  <Label text="Before"><input className={field} type="number" placeholder="Before" value={form.chartBefore} onChange={setF("chartBefore")} /></Label>
                  <Label text="After"><input className={field} type="number" placeholder="After" value={form.chartAfter} onChange={setF("chartAfter")} /></Label>
                  <Label text="Suffix (e.g. %)"><input className={field} placeholder="Suffix (e.g. %)" value={form.chartSuffix} onChange={setF("chartSuffix")} /></Label>
                  <Label text="Prefix (e.g. $)"><input className={field} placeholder="Prefix (e.g. $)" value={form.chartPrefix} onChange={setF("chartPrefix")} /></Label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.chartHigher} onChange={setF("chartHigher")} className="h-4 w-4 accent-[#0055FF]" /> Higher is better</label>
                </div>
              </div>
              {showPreview && (
                <div data-testid="case-preview" className="rounded-2xl border border-brand/30 bg-paper p-4">
                  <p className="mb-3 text-xs font-mono uppercase tracking-wide text-brand">Live preview — as visitors will see it</p>
                  <div className="overflow-hidden rounded-2xl border border-line bg-white max-w-sm">
                    <div className="relative aspect-[16/10] bg-ink/5">
                      {form.cover && <img src={form.cover} alt="cover" className="h-full w-full object-cover" />}
                      {form.tag && <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest">{form.tag}</span>}
                    </div>
                    <div className="p-5">
                      <p className="font-heading text-4xl font-extrabold tracking-tighter text-brand">{form.metric || "—"}</p>
                      <p className="text-xs text-ink/55">{form.metricLabel}</p>
                      <h3 className="mt-3 font-heading text-lg font-bold tracking-tight leading-snug">{form.title || "Untitled case study"}</h3>
                      <p className="mt-2 text-sm text-ink/60 line-clamp-3">{form.excerpt}</p>
                    </div>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Save a draft to keep it private, or publish it to the public Case Studies section.</p>
              <div className="flex flex-wrap gap-2 justify-end">
                <button type="button" onClick={() => setShowPreview((v) => !v)} data-testid="case-preview-toggle" className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2 text-sm hover:border-ink"><Eye className="h-4 w-4" /> {showPreview ? "Hide preview" : "Preview"}</button>
                <button type="button" disabled={saving} onClick={() => { setEditing(null); setError(""); }} className="rounded-full border border-line px-5 py-2 text-sm hover:border-ink">Cancel</button>
                <button type="button" data-testid="case-save-draft" disabled={saving} onClick={() => save(false)} className="rounded-full border border-line px-5 py-2 text-sm disabled:opacity-50">Save draft</button>
                <button type="button" data-testid="case-save" onClick={() => save(true)} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2 text-sm font-medium text-white hover:bg-ink transition-colors disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />} {form.published ? "Save & keep published" : "Publish case study"}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
