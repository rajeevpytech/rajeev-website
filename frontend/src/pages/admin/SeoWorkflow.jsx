import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, ChevronDown, ExternalLink, ListChecks, Loader2, RefreshCw } from "lucide-react";
import { api, formatApiErrorDetail } from "@/lib/api";
import ServiceAreaExpansion from "@/pages/admin/ServiceAreaExpansion";

const BASE = "/admin/seo-workflow";
const FIELD = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";
const BUTTON = "inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium hover:border-ink disabled:opacity-50";
const PRIMARY = "inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-ink disabled:opacity-50";
const METRICS = [["organic_clicks", "Organic clicks"], ["impressions", "Search impressions"], ["indexed_pages", "Indexed pages"], ["qualified_leads", "Qualified leads"], ["ai_impressions", "AI impressions"]];
const LABELS = { pending: "To do", in_progress: "In progress", done: "Done", planned: "Planned", queued: "Queued", draft: "Draft", published: "Published", recorded: "Evidence recorded", owner_confirmed: "Owner confirmed", rejected: "Rejected", existing_reference: "Read-only reference" };
const BADGES = { done: "bg-emerald-50 text-emerald-700", published: "bg-emerald-50 text-emerald-700", owner_confirmed: "bg-blue-50 text-blue-700", in_progress: "bg-blue-50 text-blue-700", queued: "bg-blue-50 text-blue-700", draft: "bg-amber-50 text-amber-700", rejected: "bg-rose-50 text-rose-700" };

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function date(value) {
  if (!value) return "Not scheduled";
  const d = new Date(String(value).length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function safeUrl(value) {
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : null; } catch { return null; }
}
export function evidenceUrls(text) {
  const values = [...new Set(String(text || "").split(/\r?\n/).map(value => value.trim()).filter(Boolean))];
  if (values.some(value => !safeUrl(value))) throw new Error("Use complete http or https evidence links, one per line.");
  return values;
}
export function metricPayload(draft) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date || "")) throw new Error("Choose the reporting date.");
  const parsedDate = new Date(`${draft.date}T12:00:00Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== draft.date) throw new Error("Choose a valid reporting date.");
  if (draft.date > today()) throw new Error("Measured results cannot be dated in the future.");
  const payload = { date: draft.date, source_url: draft.source_url?.trim() || "", notes: draft.notes?.trim() || "" };
  let entered = false;
  for (const [key] of METRICS) {
    const raw = draft[key];
    if (raw === "" || raw == null) continue;
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value < 0) throw new Error("Metrics must be whole numbers of zero or more. Leave unknown values blank.");
    payload[key] = value; entered = true;
  }
  if (!entered) throw new Error("Enter at least one measured value.");
  if (payload.source_url && !safeUrl(payload.source_url)) throw new Error("Use a complete http or https report link.");
  return payload;
}
export function isReadOnlyTopic(topic) {
  return topic?.queue_eligible === false || topic?.new_post_eligible === false || ["refresh_candidate", "review_existing"].includes(topic?.intent_action) || (topic?.existing_content_read_only === true && (topic.existing_target_slugs || []).length > 0);
}
function ExistingArticleLinks({ topic }) {
  return <div className="mt-3 rounded-lg bg-paper p-3 text-xs text-ink/65"><p className="font-semibold">Existing article reference (read-only)</p><p className="mt-1">This reference stays out of the new article queue. Existing titles, descriptions and article content remain unchanged.</p>{topic.review_reason && <p className="mt-2">{topic.review_reason}</p>}<ul className="mt-2 space-y-2">{(topic.existing_target_slugs || []).map(slug => <li key={slug}><EvidenceLink url={slug.startsWith("/") ? slug : `/blog/${slug}`} allowRelative>Open existing article: {slug}</EvidenceLink></li>)}</ul></div>;
}
function Badge({ status }) {
  return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${BADGES[status] || "bg-slate-100 text-slate-600"}`}>{LABELS[status] || status || "Planned"}</span>;
}
function EvidenceLink({ url, children, allowRelative = false }) {
  const href = allowRelative && typeof url === "string" && /^\/(?!\/)/.test(url) ? url : safeUrl(url);
  return href ? <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-brand underline underline-offset-4">{children || url}<ExternalLink className="h-3 w-3 shrink-0" /></a> : <span>{children || url}</span>;
}

export function WorkflowSummary({ data }) {
  const tasks = data.tasks || [];
  const topics = data.blog_topics || [];
  const evidence = tasks.flatMap(task => task.evidence || []);
  const due = tasks.filter(task => task.status !== "done" && task.due_date && task.due_date.slice(0, 10) <= today()).length;
  const cards = [
    ["Tasks due", due], ["Tasks completed", tasks.filter(task => task.status === "done").length],
    ["New plan articles published", topics.filter(topic => topic.status === "published" && !isReadOnlyTopic(topic)).length],
    ["Placements confirmed by owner", evidence.filter(item => item.kind === "live_placement" && item.status === "owner_confirmed").length],
  ];
  return <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="seo-workflow-summary">{cards.map(([label, value]) => <div key={label} className="rounded-xl border border-line bg-paper/50 p-4"><p className="font-heading text-2xl font-extrabold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>)}</div>;
}

function TaskCard({ task, busy, onSave, onEvidence, onReview }) {
  const [draft, setDraft] = useState({ status: task.status || "pending", notes: task.notes || "", links: (task.evidence_urls || []).join("\n") });
  const [entry, setEntry] = useState({ url: "", kind: "live_placement", note: "" });
  useEffect(() => { setDraft({ status: task.status || "pending", notes: task.notes || "", links: (task.evidence_urls || []).join("\n") }); }, [task]);
  const save = () => {
    try {
      const urls = evidenceUrls(draft.links);
      if (task.kind === "offpage" && draft.status === "done" && !urls.length && !(task.evidence || []).length) throw new Error("Add an evidence link before completing this off-page task.");
      onSave(task.id, { status: draft.status, notes: draft.notes, evidence_urls: urls });
    } catch (err) { toast.error(err.message); }
  };
  const addEvidence = async event => {
    event.preventDefault();
    if (!safeUrl(entry.url)) return toast.error("Use a complete http or https evidence link.");
    const saved = await onEvidence(task.id, { ...entry, url: entry.url.trim() });
    if (saved) setEntry({ url: "", kind: "live_placement", note: "" });
  };
  return <details className="rounded-xl border border-line bg-white" data-testid={`workflow-task-${task.id}`}>
    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4"><span><span className="block text-sm font-semibold">{task.title}</span><span className="mt-1 block text-xs text-muted-foreground">Week {task.week} · {task.kind} · Due {date(task.due_date)}</span></span><Badge status={task.status} /></summary>
    <div className="space-y-4 border-t border-line p-4">
      {task.description && <p className="text-sm leading-relaxed text-ink/70">{task.description}</p>}
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <label className="text-xs font-medium text-ink/70">Task status<select aria-label={`Status: ${task.title}`} value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value })} disabled={busy} className={`${FIELD} mt-1`}><option value="pending">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></select></label>
        <label className="text-xs font-medium text-ink/70">Work notes<textarea value={draft.notes} onChange={event => setDraft({ ...draft, notes: event.target.value })} disabled={busy} rows={2} className={`${FIELD} mt-1`} /></label>
      </div>
      <label className="block text-xs font-medium text-ink/70">Evidence links — one per line<textarea value={draft.links} onChange={event => setDraft({ ...draft, links: event.target.value })} disabled={busy} rows={2} className={`${FIELD} mt-1`} placeholder="https://…" /></label>
      <button type="button" onClick={save} disabled={busy} className={PRIMARY}>Save task</button>
      {(task.evidence || []).length > 0 && <div className="space-y-3 border-t border-line pt-4">{task.evidence.map(item => <div key={item.id} className="rounded-lg bg-paper/60 p-3 text-xs"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{(item.kind || "source").replaceAll("_", " ")}</span><Badge status={item.status} /></div><p className="mt-2"><EvidenceLink url={item.url} /></p>{item.note && <p className="mt-2 text-ink/60">{item.note}</p>}<div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={busy || item.status === "owner_confirmed"} onClick={() => onReview(task.id, item.id, "owner_confirmed")} className="font-medium text-brand disabled:opacity-50">Confirm after review</button><button type="button" disabled={busy || item.status === "rejected"} onClick={() => onReview(task.id, item.id, "rejected")} className="font-medium text-rose-600 disabled:opacity-50">Reject</button>{item.status !== "recorded" && <button type="button" disabled={busy} onClick={() => onReview(task.id, item.id, "recorded")} className="font-medium text-ink/60">Return to recorded</button>}</div></div>)}</div>}
      {task.kind === "offpage" && <form onSubmit={addEvidence} className="space-y-3 rounded-lg border border-line bg-paper/40 p-4"><h4 className="text-sm font-semibold">Add off-page evidence</h4><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium text-ink/70">Link<input type="url" required value={entry.url} onChange={event => setEntry({ ...entry, url: event.target.value })} className={`${FIELD} mt-1`} /></label><label className="text-xs font-medium text-ink/70">Evidence type<select value={entry.kind} onChange={event => setEntry({ ...entry, kind: event.target.value })} className={`${FIELD} mt-1`}><option value="live_placement">Live placement</option><option value="opportunity">Opportunity</option><option value="submission">Submission</option><option value="source">Research source</option><option value="report">Report</option></select></label></div><label className="block text-xs font-medium text-ink/70">Note<input value={entry.note} onChange={event => setEntry({ ...entry, note: event.target.value })} className={`${FIELD} mt-1`} /></label><button disabled={busy} className={BUTTON}>Record evidence</button></form>}
    </div>
  </details>;
}

function Articles({ data, active, busy, onQueue }) {
  const [week, setWeek] = useState(1);
  const ap = data.autopilot;
  const dueWeek = Math.max(0, Math.min(13, Number(data.summary?.current_week) || 0));
  return <div className="space-y-5">
    <div className="rounded-xl border border-brand/20 bg-brand/[0.03] p-4"><h3 className="text-sm font-semibold">Curated article queue</h3><p className="mt-2 text-xs leading-relaxed text-ink/65">Topics are added once. Queued topics follow your current Blog Autopilot settings; review the schedule and publishing mode before queueing.</p><p className="mt-2 text-xs">Schedule: <strong>{ap ? ap.enabled ? "On" : "Off" : "Unavailable"}</strong> · Mode: <strong>{ap ? ap.auto_publish ? "Publish automatically" : "Save drafts for review" : "Unavailable"}</strong>{ap?.frequency ? ` · ${ap.frequency}` : ""} · <a href="#admin-blog" className="text-brand underline">Open blog controls</a></p>{ap?.provider_diagnostic?.message && <p className="mt-2 text-xs text-ink/65">{ap.provider_diagnostic.message}</p>}<div className="mt-4 flex flex-wrap items-end gap-3"><label className="text-xs font-medium text-ink/70">Queue topics through<select value={week} onChange={event => setWeek(Number(event.target.value))} disabled={!active || busy || !dueWeek} className={`${FIELD} mt-1`}>{Array.from({ length: 13 }, (_, i) => <option key={i} value={i + 1} disabled={i + 1 > dueWeek}>Week {i + 1}</option>)}</select></label><button type="button" data-testid="workflow-queue-topics" onClick={() => onQueue({ upto_week: week })} disabled={!active || busy || !dueWeek || week > dueWeek} className={PRIMARY}>Queue selected weeks</button></div>{!active && <p className="mt-3 text-xs text-amber-700">Start or resume the plan before queueing topics.</p>}{active && !dueWeek && <p className="mt-3 text-xs text-amber-700">Week 1 has not started yet. Topics become available as each plan week begins.</p>}{active && dueWeek > 0 && <p className="mt-3 text-xs text-muted-foreground">Topics through week {dueWeek} are available to queue.</p>}</div>
    <div className="grid gap-3 lg:grid-cols-2">{(data.blog_topics || []).map(topic => <article key={topic.id} className="rounded-xl border border-line bg-white p-4" data-testid={`workflow-topic-${topic.id}`}><div className="flex items-start justify-between gap-3"><h4 className="text-sm font-semibold">{topic.title}</h4><Badge status={isReadOnlyTopic(topic) ? "existing_reference" : topic.status} /></div><p className="mt-1 text-xs text-muted-foreground">Week {topic.week}</p>{topic.brief && <p className="mt-3 text-sm leading-relaxed text-ink/65">{topic.brief}</p>}{isReadOnlyTopic(topic) && <ExistingArticleLinks topic={topic} />}{(topic.source_urls || []).length > 0 && <details className="mt-3 text-xs"><summary className="cursor-pointer text-brand">Research sources</summary><ul className="mt-2 space-y-2">{topic.source_urls.map(url => <li key={url}><EvidenceLink url={url} /></li>)}</ul></details>}<div className="mt-4 flex flex-wrap gap-3">{topic.status === "planned" && !isReadOnlyTopic(topic) && <button type="button" onClick={() => onQueue({ topic_ids: [topic.id] })} disabled={!active || busy || Number(topic.week) > dueWeek} className={BUTTON}>{Number(topic.week) > dueWeek ? `Available in week ${topic.week}` : "Queue topic"}</button>}{topic.status === "published" && topic.post_url && <EvidenceLink url={topic.post_url} allowRelative>Open published article</EvidenceLink>}{topic.status === "draft" && <a href="#admin-blog" className="text-sm font-medium text-brand underline">Review draft in blog controls</a>}</div></article>)}</div>
    {(data.blog_drafts || []).length > 0 && <div className="space-y-3 border-t border-line pt-5"><h3 className="text-sm font-semibold">Prepared drafts for review</h3><p className="text-xs text-muted-foreground">These are prepared article drafts. Published articles are marked from the blog's actual publication status.</p>{data.blog_drafts.map((draft, index) => <details key={draft.id || draft.slug || index} className="rounded-xl border border-line bg-white p-4"><summary className="cursor-pointer text-sm font-semibold">{draft.title || draft.topic || `Prepared draft ${index + 1}`} <span className="ml-2 text-xs font-normal text-amber-700">{isReadOnlyTopic(draft) ? "Read-only research reference" : "Prepared draft"}</span></summary>{isReadOnlyTopic(draft) && <ExistingArticleLinks topic={draft} />}<div className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-ink/70">{draft.body_md || draft.content || draft.body || draft.brief || "Open the blog controls to review this draft."}</div>{(draft.source_urls || []).map(url => <p key={url} className="mt-3 text-xs"><EvidenceLink url={url} /></p>)}</details>)}</div>}
  </div>;
}

function Progress({ metrics, busy, onSave }) {
  const blank = () => ({ date: today(), organic_clicks: "", impressions: "", indexed_pages: "", qualified_leads: "", ai_impressions: "", source_url: "", notes: "" });
  const [draft, setDraft] = useState(blank);
  const submit = async event => { event.preventDefault(); try { if (await onSave(metricPayload(draft))) setDraft(blank()); } catch (err) { toast.error(err.message); } };
  return <div className="space-y-5"><div><h3 className="text-sm font-semibold">Measured progress</h3><p className="mt-1 text-xs text-muted-foreground">Record values from Search Console, analytics or an AI visibility report. Unknown values stay blank; entries below are manually recorded.</p></div><form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-paper/40 p-4" data-testid="workflow-metric-form"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label className="text-xs font-medium text-ink/70">Report date<input type="date" required max={today()} value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} className={`${FIELD} mt-1`} /></label>{METRICS.map(([key, label]) => <label key={key} className="text-xs font-medium text-ink/70">{label}<input type="number" min="0" step="1" value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} placeholder="Unknown" className={`${FIELD} mt-1`} /></label>)}</div><label className="block text-xs font-medium text-ink/70">Source report link<input type="url" value={draft.source_url} onChange={event => setDraft({ ...draft, source_url: event.target.value })} className={`${FIELD} mt-1`} placeholder="https://…" /></label><label className="block text-xs font-medium text-ink/70">Notes<textarea rows={2} value={draft.notes} onChange={event => setDraft({ ...draft, notes: event.target.value })} className={`${FIELD} mt-1`} /></label><button disabled={busy} className={PRIMARY}>Save measured values</button></form><div className="overflow-x-auto rounded-xl border border-line"><table className="w-full text-left text-xs"><thead className="bg-paper"><tr><th scope="col" className="px-3 py-3">Date</th>{METRICS.map(([key, label]) => <th scope="col" key={key} className="px-3 py-3">{label}</th>)}<th scope="col" className="px-3 py-3">Evidence</th></tr></thead><tbody>{metrics.length ? [...metrics].sort((a, b) => String(b.date).localeCompare(String(a.date))).map((metric, index) => <tr key={metric.id || `${metric.date}-${index}`} className="border-t border-line"><td className="px-3 py-3 whitespace-nowrap">{date(metric.date)}</td>{METRICS.map(([key]) => <td key={key} className="px-3 py-3">{metric[key] == null ? "—" : Number(metric[key]).toLocaleString()}</td>)}<td className="max-w-xs px-3 py-3">{metric.source_url && <EvidenceLink url={metric.source_url}>Report</EvidenceLink>}{metric.notes && <p className="mt-1 text-ink/60">{metric.notes}</p>}</td></tr>) : <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">No measurements recorded yet.</td></tr>}</tbody></table></div></div>;
}

export default function SeoWorkflow() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [tab, setTab] = useState("tasks");
  const [week, setWeek] = useState("all");
  const [startDate, setStartDate] = useState(today);
  const load = async () => { try { const response = await api.get(BASE); setData(response.data); setError(""); return response.data; } catch (err) { setError(formatApiErrorDetail(err.response?.data?.detail) || "The plan could not be loaded."); return null; } };
  useEffect(() => { load(); }, []);
  const action = async (key, work, message) => { if (busy) return false; setBusy(key); try { await work(); await load(); toast.success(message); return true; } catch (err) { toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message || "The update could not be saved."); return false; } finally { setBusy(""); } };
  const plan = data?.plan || {};
  const active = plan.status === "active";
  const started = ["active", "paused", "completed"].includes(plan.status);
  const tasks = (data?.tasks || []).filter(task => (tab !== "offpage" || task.kind === "offpage") && (week === "all" || Number(task.week) === Number(week)));
  return <section id="seo-workflow" data-testid="seo-workflow" className="mt-8 scroll-mt-6 rounded-2xl border border-line bg-white p-6">
    <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="seo-workflow-content" className="flex w-full items-center justify-between gap-3 text-left"><span className="flex items-center gap-2 font-heading font-bold"><CalendarDays className="h-4 w-4 text-brand" /> 90-day SEO &amp; content plan <span className="ml-1 rounded-full bg-paper px-2 py-1 text-[11px] font-sans font-medium capitalize text-ink/60">{plan.status ? plan.status.replaceAll("_", " ") : "Loading"}</span></span><ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} /></button>
    {open && <div id="seo-workflow-content" className="mt-5">
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700" role="alert">{error}<button type="button" onClick={load} className="ml-3 font-semibold underline">Retry</button></div>}
      {!data && !error && <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading plan…</p>}
      {data && <>
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm leading-relaxed text-ink/70">A 13-week work plan for technical SEO, helpful articles, local visibility and earned links. Work is marked complete by its actual task status and evidence.</p>{plan.start_date && <p className="mt-2 text-xs text-muted-foreground">{date(plan.start_date)} — {date(plan.end_date)} · 90 days</p>}</div><button type="button" onClick={load} disabled={!!busy} className={BUTTON}><RefreshCw className="h-3.5 w-3.5" /> Refresh</button></div>
        {plan.status === "not_started" && <div className="mt-5 rounded-xl border border-brand/20 bg-brand/[0.03] p-4"><h3 className="text-sm font-semibold">Start the plan when you are ready</h3><p className="mt-2 text-xs leading-relaxed text-ink/65">This starts task tracking. Article queueing and publishing remain under your separate blog controls.</p><div className="mt-4 flex flex-wrap items-end gap-3"><label className="text-xs font-medium text-ink/70">Start date<input data-testid="workflow-start-date" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className={`${FIELD} mt-1`} /></label><button type="button" data-testid="workflow-activate" onClick={() => action("activate", () => api.post(`${BASE}/activate`, { start_date: startDate, queue_topics: false }), "90-day plan started")} disabled={!!busy || !startDate} className={PRIMARY}>{busy === "activate" && <Loader2 className="h-4 w-4 animate-spin" />} Start 90-day plan</button></div></div>}
        {["active", "paused"].includes(plan.status) && <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" onClick={() => action("plan-status", () => api.patch(`${BASE}/settings`, { status: active ? "paused" : "active" }), active ? "Plan tracking paused" : "Plan tracking resumed")} disabled={!!busy} className={BUTTON}>{active ? "Pause plan tracking" : "Resume plan tracking"}</button><p className="text-xs text-muted-foreground">Blog publishing uses its own schedule.</p></div>}
        <WorkflowSummary data={data} />
        <ServiceAreaExpansion />
        {!started && <p className="mt-3 text-xs text-amber-700">Start the plan to record task updates, evidence and measured results.</p>}
        <p className="mt-3 text-xs text-muted-foreground">Placement evidence is recorded or confirmed by the owner; this dashboard does not claim a live backlink check.</p>
        <div role="tablist" aria-label="SEO plan sections" className="mt-6 flex flex-wrap gap-2 border-b border-line pb-4">{[["tasks", "Weekly tasks"], ["articles", "Articles"], ["offpage", "Off-page evidence"], ["progress", "Measured progress"]].map(([key, label]) => <button type="button" role="tab" aria-selected={tab === key} key={key} onClick={() => setTab(key)} className={`rounded-full px-4 py-2 text-sm font-medium ${tab === key ? "bg-ink text-white" : "bg-paper text-ink/65 hover:text-ink"}`}>{label}</button>)}</div>
        <div className="mt-5" role="tabpanel">
          {["tasks", "offpage"].includes(tab) && <><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-xs font-medium text-ink/70"><ListChecks className="h-4 w-4 text-brand" /> Week<select value={week} onChange={event => setWeek(event.target.value)} className={`${FIELD} w-auto`}><option value="all">All 13 weeks</option>{Array.from({ length: 13 }, (_, i) => <option key={i} value={i + 1}>Week {i + 1}</option>)}</select></label><span className="text-xs text-muted-foreground">{tasks.length} tasks</span></div>{tab === "offpage" && <p className="mb-4 text-xs leading-relaxed text-muted-foreground">Track opportunities, submissions and live placements separately. Owner confirmation records a manual review; it does not turn a planned link into a verified backlink.</p>}<div className="space-y-3">{tasks.map(task => <TaskCard key={task.id} task={task} busy={!!busy || !started} onSave={(id, patch) => action(`task-${id}`, () => api.patch(`${BASE}/tasks/${encodeURIComponent(id)}`, patch), "Task updated")} onEvidence={(id, entry) => action(`evidence-${id}`, () => api.post(`${BASE}/tasks/${encodeURIComponent(id)}/evidence`, entry), "Evidence recorded")} onReview={(id, evidenceId, status) => action(`evidence-${id}`, () => api.patch(`${BASE}/tasks/${encodeURIComponent(id)}/evidence/${encodeURIComponent(evidenceId)}`, { status }), "Evidence review saved")} />)}{!tasks.length && <p className="rounded-xl border border-line p-5 text-sm text-muted-foreground">No tasks in this selection.</p>}</div></>}
          {tab === "articles" && <Articles data={data} active={active} busy={!!busy} onQueue={patch => action("queue-topics", () => api.post(`${BASE}/queue-topics`, patch), "Article topic queue updated")} />}
          {tab === "progress" && <Progress metrics={data.metrics || []} busy={!!busy || !started} onSave={payload => action("metrics", () => api.post(`${BASE}/metrics`, payload), "Measured values recorded")} />}
        </div>
      </>}
    </div>}
  </section>;
}
