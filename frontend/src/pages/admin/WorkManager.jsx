import { useCallback, useEffect, useState } from "react";
import { BriefcaseBusiness, ChevronDown, ExternalLink, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "@/lib/api";
import ImageUpload from "@/pages/admin/ImageUpload";
import { field, GalleryEditor, IndustrySelect, Label, lines, ServiceSelect, token, useProjectTaxonomy } from "@/pages/admin/ProjectFields";

const EMPTY = { title: "", client_name: "", slug: "", industry: "", services: [], summary: "", website_url: "", image_url: "", image_alt: "", gallery: [], technology: "", overview: "", scope: "", process: "", delivery: "", handover: "", featured: false, display_order: 100, published: false };
const message = (error) => formatApiErrorDetail(error.response?.data?.detail) || "The request could not be completed.";

function editForm(project) {
  const story = project.story || {};
  return { ...EMPTY, ...project, industry: token(project.industry || project.category), gallery: Array.isArray(project.gallery) ? project.gallery : [], services: (project.services || []).map(token), image_url: project.image_url || project.screenshot?.url || "", image_alt: project.image_alt || project.screenshot?.alt || "", technology: (project.technology || []).join(", "), overview: story.overview || "", ...Object.fromEntries(["scope", "process", "delivery", "handover"].map((key) => [key, (story[key] || []).join("\n")])) };
}

export default function WorkManager() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const taxonomy = useProjectTaxonomy();
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const change = (key) => (event) => set(key, event.target.type === "checkbox" ? event.target.checked : event.target.value);
  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get("/admin/portfolio"); setItems(data.items || []); setError(""); }
    catch (failure) { setError(message(failure)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { if (open) load(); }, [open, load]);

  const save = async (published) => {
    if (!form.title.trim()) { setError("Add a project title before saving."); return; }
    if (!form.industry) { setError("Select the project industry."); return; }
    if (!form.services.length) { setError("Select at least one service we delivered."); return; }
    if (published && !form.summary.trim()) { setError("Add a project summary before publishing."); return; }
    setSaving(true); setError("");
    const payload = {
      title: form.title.trim(), client_name: form.client_name.trim(), ...(!editing.id && form.slug ? { slug: form.slug.trim() } : {}), industry: form.industry, services: form.services,
      summary: form.summary.trim(), website_url: form.website_url.trim(), image_url: form.image_url.trim(), image_alt: form.image_alt.trim(), gallery: form.gallery.filter((row) => row.url.trim()),
      technology: form.technology.split(",").map((item) => item.trim()).filter(Boolean),
      story: { overview: form.overview.trim(), ...Object.fromEntries(["scope", "process", "delivery", "handover"].map((key) => [key, lines(form[key])])) },
      featured: form.featured, display_order: Number(form.display_order) || 0, published,
    };
    try {
      if (editing.id) await api.put(`/admin/portfolio/${encodeURIComponent(editing.id)}`, payload);
      else await api.post("/admin/portfolio", payload);
      toast.success(published ? "Project published to Work" : "Project saved as draft");
      setEditing(null); await load();
    } catch (failure) { setError(message(failure)); toast.error("Project could not be saved"); }
    finally { setSaving(false); }
  };
  const remove = async (project) => {
    if (!window.confirm(`Remove “${project.title}” from Work?`)) return;
    try { await api.delete(`/admin/portfolio/${encodeURIComponent(project.id)}`); toast.success("Project removed"); await load(); }
    catch (failure) { setError(message(failure)); }
  };

  return <section id="admin-work" className="mt-8 scroll-mt-6 rounded-2xl border border-line bg-white p-5 sm:p-6" data-testid="work-manager">
    <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} className="flex w-full items-center justify-between gap-3" data-testid="work-manager-toggle"><span className="flex items-center gap-2 font-heading font-bold"><BriefcaseBusiness className="h-4 w-4 text-brand" /> Work / Project submissions</span><ChevronDown className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`} /></button>
    {open && <div className="mt-6">
      <p className="mb-5 text-sm text-muted-foreground">Add the work we delivered: select the industry and services, add photos and content, then publish. Published projects appear automatically in the Work section.</p>
      {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}{!editing && <button type="button" onClick={load} className="ml-3 underline">Try again</button>}</div>}
      {!editing ? <>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{items.length} projects · {items.filter((item) => item.published).length} published</p><button type="button" data-testid="work-new" onClick={() => { setForm({ ...EMPTY }); setEditing({}); setError(""); }} className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white"><Plus className="h-4 w-4" /> Submit project</button></div>
        {loading && <p className="mt-4 flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading projects…</p>}
        <div className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line">{items.map((project) => <div key={project.id} className="flex items-center justify-between gap-3 px-4 py-4" data-testid={`work-row-${project.slug}`}><div className="min-w-0"><p className="truncate text-sm font-semibold">{project.title}</p><p className="mt-1 text-xs text-muted-foreground">{project.industry?.name || project.category?.name || token(project.industry)} · {project.published ? "Published" : "Draft"}{project.featured ? " · Featured" : ""}</p><p className="mt-1 break-all text-xs text-muted-foreground">/work/{project.slug}</p></div><div className="flex shrink-0 gap-1.5">{project.published && <a href={`/work/${project.slug}`} target="_blank" rel="noreferrer" aria-label={`Open ${project.title}`} className="rounded-lg border border-line p-2"><ExternalLink className="h-4 w-4" /></a>}<button type="button" aria-label={`Edit ${project.title}`} onClick={() => { setForm(editForm(project)); setEditing({ id: project.id }); setError(""); }} className="rounded-lg border border-line p-2"><Pencil className="h-4 w-4" /></button><button type="button" aria-label={`Remove ${project.title}`} onClick={() => remove(project)} className="rounded-lg border border-line p-2 text-red-600"><Trash2 className="h-4 w-4" /></button></div></div>)}</div>
        {!loading && !error && !items.length && <p className="mt-4 text-sm text-muted-foreground">No projects yet. Submit your first completed project.</p>}
      </> : <div className="space-y-5" data-testid="work-editor">
        {taxonomy.error && <p role="alert" className="text-sm text-red-600">{taxonomy.error}</p>}
        <div className="grid gap-4 sm:grid-cols-2"><Label text="Project title *"><input className={field} data-testid="work-title" value={form.title} onChange={change("title")} placeholder="Hotel website redesign" /></Label><Label text="Client / company name"><input className={field} value={form.client_name} onChange={change("client_name")} /></Label><IndustrySelect value={form.industry} options={taxonomy.industries} onChange={(value) => set("industry", value)} required id="work-industry" /><Label text="Live website or application URL" hint="Leave blank for private applications."><input type="url" className={field} value={form.website_url} onChange={change("website_url")} placeholder="https://" /></Label><Label text="Page URL slug" hint={editing.id ? "The published URL stays fixed when you edit." : "Optional. Generated from the title when blank."}><input className={field} value={form.slug} onChange={change("slug")} disabled={!!editing.id} /></Label><Label text="Display order"><input type="number" className={field} value={form.display_order} onChange={change("display_order")} /></Label></div>
        <ServiceSelect value={form.services} options={taxonomy.services} onChange={(value) => set("services", value)} id="work-services" />
        <Label text="Project summary *" hint="Describe what we built, redesigned or delivered for this client."><textarea className={field} rows={3} data-testid="work-summary" value={form.summary} onChange={change("summary")} placeholder="We redesigned the hotel's website with mobile booking enquiries and a clear room gallery." /></Label>
        <div className="grid gap-4 sm:grid-cols-2"><ImageUpload label="Project cover screenshot" value={form.image_url} onChange={(value) => set("image_url", value)} testid="work-cover-upload" /><div className="space-y-4"><Label text="Cover image description (alt text)"><input className={field} value={form.image_alt} onChange={change("image_alt")} /></Label><Label text="Technology / tools" hint="Separate with commas."><input className={field} value={form.technology} onChange={change("technology")} placeholder="React, FastAPI, MongoDB" /></Label></div></div>
        <GalleryEditor value={form.gallery} onChange={(value) => set("gallery", value)} id="work-gallery" />
        <div className="rounded-xl border border-line p-4"><h3 className="font-semibold">The project story</h3><p className="mt-1 text-xs text-muted-foreground">Tell the story in completed-work language. Only add measured results you can support.</p><div className="mt-4 space-y-4"><Label text="Overview"><textarea className={field} rows={3} value={form.overview} onChange={change("overview")} /></Label><div className="grid gap-4 sm:grid-cols-2">{[["scope", "What we delivered"], ["process", "How we completed the work"], ["delivery", "Features and outcomes"], ["handover", "Launch, handover and ongoing support"]].map(([key, title]) => <Label key={key} text={title} hint="One point per line."><textarea className={field} rows={4} value={form[key]} onChange={change(key)} /></Label>)}</div></div></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={change("featured")} className="h-4 w-4 accent-[#0055FF]" /> Feature this project on the homepage</label>
        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-5"><button type="button" disabled={saving} onClick={() => { setEditing(null); setError(""); }} className="rounded-full border border-line px-5 py-2.5 text-sm">Cancel</button><button type="button" data-testid="work-save-draft" disabled={saving} onClick={() => save(false)} className="rounded-full border border-line px-5 py-2.5 text-sm disabled:opacity-50">Save draft</button><button type="button" data-testid="work-publish" disabled={saving} onClick={() => save(true)} className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{form.published ? "Save & keep published" : "Publish to Work"}</button></div>
      </div>}
    </div>}
  </section>;
}
