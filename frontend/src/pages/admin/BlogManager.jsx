import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Loader2, Newspaper, ChevronDown, Plus, Trash2, Pencil, GripVertical, Check, Eye } from "lucide-react";
import { api, formatApiErrorDetail } from "@/lib/api";
import ImageUpload from "@/pages/admin/ImageUpload";
import BlogAutopilot from "@/pages/admin/BlogAutopilot";

const CATS = ["Article", "Blog", "Case Study", "SEO", "Web Development", "App Development", "AI Automation", "Digital Marketing", "WhatsApp Marketing", "Guide"];
const field = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";
const EMPTY = { title: "", slug: "", category: "Article", excerpt: "", cover_image: "", cover_alt: "", tags: "", body: "", faqs: "", published: true, featured: false };

export default function BlogManager() {
  const [open, setOpen] = useState(false);
  const [posts, setPosts] = useState([]);
  const [editing, setEditing] = useState(null); // null=none, {}=new, {id}=edit
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const dragIndex = useRef(null);

  const load = () => api.get("/admin/blog").then(({ data }) => setPosts(data.posts)).catch(() => {});
  useEffect(() => { if (open) load(); }, [open]);
  const togglePublish = async (p) => {
    try {
      await api.patch(`/admin/blog/${p.id}/publish`, { published: !p.published });
      toast.success(!p.published ? "Approved & published — now live" : "Moved back to draft");
      load();
    } catch { toast.error("Could not update"); }
  };
  const [selected, setSelected] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const toggleSel = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const bulkPublish = async (published) => {
    if (!selected.size) return;
    setBulkBusy(true);
    try { const { data } = await api.post("/admin/blog/bulk-publish", { ids: [...selected], published }); toast.success(`${data.updated} post(s) ${published ? "published" : "moved to draft"}`); setSelected(new Set()); load(); }
    catch { toast.error("Bulk action failed"); }
    finally { setBulkBusy(false); }
  };

  const reorder = async (from, to) => {
    if (from == null || from === to) return;
    const next = [...posts];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setPosts(next);
    try { await api.put("/admin/blog/reorder", { ids: next.map((x) => x.id) }); toast.success("Order saved"); }
    catch { toast.error("Could not save order"); load(); }
  };

  const startNew = () => { setForm(EMPTY); setEditing({}); };
  const startEdit = (p) => {
    setForm({ ...p, tags: (p.tags || []).join(", "), body: p.body_md || (p.body || []).join("\n\n"), faqs: (p.faqs || []).map((f) => `${f.q}\n${f.a}`).join("\n\n"), cover_alt: p.cover_alt || "" });
    setEditing({ id: p.id });
  };

  const save = async () => {
    if (!form.title) return toast.error("Title is required");
    setSaving(true);
    const payload = {
      title: form.title, slug: form.slug || undefined, category: form.category,
      excerpt: form.excerpt, cover_image: form.cover_image, cover_alt: form.cover_alt, published: form.published, featured: form.featured,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      body_md: form.body,
      body: form.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
      faqs: (form.faqs || "").split(/\n\s*\n/).map((blk) => { const [q, ...a] = blk.trim().split("\n"); return q && a.length ? { q: q.trim(), a: a.join(" ").trim() } : null; }).filter(Boolean),
    };
    try {
      if (editing.id) await api.put(`/admin/blog/${editing.id}`, payload);
      else await api.post("/admin/blog", payload);
      toast.success("Post saved");
      setEditing(null); load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Save failed");
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this post?")) return;
    try { await api.delete(`/admin/blog/${id}`); toast.success("Deleted"); load(); }
    catch { toast.error("Delete failed"); }
  };

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  return (
    <div data-testid="blog-manager" className="mt-8 rounded-2xl border border-line bg-white p-6">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between" data-testid="blog-manager-toggle">
        <span className="flex items-center gap-2 font-heading font-bold"><Newspaper className="h-4 w-4 text-brand" /> Blog &amp; insights</span>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-6">
          {!editing ? (
            <>
              <BlogAutopilot onPostCreated={load} />
              <div className="flex flex-wrap justify-between items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input type="checkbox" data-testid="blog-select-all" checked={posts.length > 0 && selected.size === posts.length} onChange={() => setSelected(selected.size === posts.length ? new Set() : new Set(posts.map((p) => p.id)))} className="h-4 w-4 accent-[#0055FF]" />
                  {selected.size ? `${selected.size} selected` : `${posts.length} post(s)`}
                </label>
                <div className="flex items-center gap-2">
                  {selected.size > 0 && (
                    <>
                      <button data-testid="bulk-publish" onClick={() => bulkPublish(true)} disabled={bulkBusy} className="inline-flex items-center gap-1.5 rounded-full border border-green-500/50 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"><Check className="h-3.5 w-3.5" /> Publish selected</button>
                      <button data-testid="bulk-unpublish" onClick={() => bulkPublish(false)} disabled={bulkBusy} className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"><Eye className="h-3.5 w-3.5" /> Move to draft</button>
                    </>
                  )}
                  <button data-testid="blog-new" onClick={startNew} className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-ink transition-colors"><Plus className="h-4 w-4" /> New post</button>
                </div>
              </div>
              <div className="mt-4 divide-y divide-line border border-line rounded-xl">
                {posts.map((p, idx) => (
                  <div key={p.id} data-testid={`blog-row-${p.slug}`}
                    draggable onDragStart={() => { dragIndex.current = idx; }}
                    onDragOver={(e) => e.preventDefault()} onDrop={() => reorder(dragIndex.current, idx)}
                    className="flex items-center justify-between gap-3 px-4 py-3 bg-white">
                    <div className="flex items-center gap-2 min-w-0">
                      <input type="checkbox" data-testid={`blog-select-${p.slug}`} checked={selected.has(p.id)} onChange={() => toggleSel(p.id)} className="h-4 w-4 shrink-0 accent-[#0055FF]" />
                      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-ink/30" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{p.category} · /{p.slug} · {p.published ? "published" : "draft"}{p.featured ? " · ★ featured" : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => togglePublish(p)} data-testid={`blog-publish-${p.slug}`} title={p.published ? "Unpublish (move to draft)" : "Approve & publish"} className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors ${p.published ? "border-green-500/40 text-green-700 hover:bg-green-50" : "border-amber-500/50 bg-amber-50 text-amber-700 hover:bg-amber-100"}`}>
                        {p.published ? <><Eye className="h-3.5 w-3.5" /> Live</> : <><Check className="h-3.5 w-3.5" /> Publish</>}
                      </button>
                      <button onClick={() => startEdit(p)} data-testid={`blog-edit-${p.slug}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line hover:border-ink"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(p.id)} data-testid={`blog-delete-${p.slug}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-red-600 hover:border-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5"><GripVertical className="h-3.5 w-3.5" /> Drag rows to reorder posts.</p>
            </>
          ) : (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <input data-testid="blog-field-title" className={field} placeholder="Title" value={form.title} onChange={setF("title")} />
                <input data-testid="blog-field-slug" className={field} placeholder="slug (auto if blank)" value={form.slug} onChange={setF("slug")} />
                <select data-testid="blog-field-category" className={field} value={form.category} onChange={setF("category")}>
                  {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input data-testid="blog-field-tags" className={field} placeholder="Tags (comma separated)" value={form.tags} onChange={setF("tags")} />
                <input data-testid="blog-field-excerpt" className={`${field} sm:col-span-2`} placeholder="Excerpt / summary" value={form.excerpt} onChange={setF("excerpt")} />
                <div className="sm:col-span-2">
                  <ImageUpload testid="blog-cover-upload" label="Cover image" value={form.cover_image} onChange={(v) => setForm((f) => ({ ...f, cover_image: v }))} />
                </div>
              </div>
              <input data-testid="blog-field-cover-alt" className={field} placeholder="Cover image alt text (describe the image)" value={form.cover_alt} onChange={setF("cover_alt")} />
              <textarea data-testid="blog-field-body" rows={14} className={`${field} font-mono text-[13px]`} placeholder={"Body in Markdown — ## Heading, ### Sub-heading, - bullet, 1. numbered, **bold**, [link text](/contact). Blank line between paragraphs."} value={form.body} onChange={setF("body")} />
              <textarea data-testid="blog-field-faqs" rows={4} className={field} placeholder={"FAQs (optional) — question on one line, answer on the next; blank line between FAQs"} value={form.faqs} onChange={setF("faqs")} />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.published} onChange={setF("published")} className="h-4 w-4 accent-[#0055FF]" /> Published</label>
              <label className="flex items-center gap-2 text-sm"><input data-testid="blog-field-featured" type="checkbox" checked={form.featured} onChange={setF("featured")} className="h-4 w-4 accent-[#0055FF]" /> Featured (pin to top of blog &amp; homepage)</label>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditing(null)} className="rounded-full border border-line px-5 py-2 text-sm hover:border-ink">Cancel</button>
                <button data-testid="blog-save" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2 text-sm font-medium text-white hover:bg-ink transition-colors disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save post</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
