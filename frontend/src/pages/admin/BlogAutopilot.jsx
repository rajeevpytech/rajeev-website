import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, Zap, CheckCircle2, XCircle, Clock, AlertTriangle, ExternalLink, History, ListChecks } from "lucide-react";
import { api, formatApiErrorDetail } from "@/lib/api";

const field = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";
const TZS = ["Asia/Kolkata", "Asia/Dubai", "Europe/London", "Asia/Singapore", "Australia/Sydney", "America/New_York", "America/Los_Angeles", "UTC"];
const STATUS = {
  success: ["Live", "bg-emerald-50 text-emerald-700 border-emerald-200", CheckCircle2],
  draft: ["Draft", "bg-amber-50 text-amber-700 border-amber-200", AlertTriangle],
  failed: ["Failed", "bg-rose-50 text-rose-700 border-rose-200", XCircle],
  retrying: ["Retrying", "bg-amber-50 text-amber-700 border-amber-200", Clock],
  skipped: ["Skipped", "bg-slate-50 text-slate-600 border-slate-200", Clock],
  claimed: ["Running", "bg-blue-50 text-blue-700 border-blue-200", Loader2],
  generating: ["Running", "bg-blue-50 text-blue-700 border-blue-200", Loader2],
};

function Status({ s }) {
  const [label, cls, Icon] = STATUS[s] || ["—", "bg-slate-50 text-slate-600 border-slate-200", Clock];
  return <span data-testid={`run-status-${s}`} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}><Icon className={`h-3 w-3 ${s === "claimed" || s === "generating" ? "animate-spin" : ""}`} /> {label}</span>;
}

const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : "—");

export default function BlogAutopilot({ onPostCreated }) {
  const [ap, setAp] = useState(null);
  const [runs, setRuns] = useState([]);
  const [running, setRunning] = useState(null);
  const [draft, setDraft] = useState({ categories: "", excluded_keywords: "", custom_topics: "" });
  const [showHistory, setShowHistory] = useState(false);
  const poll = useRef(null);

  const load = async () => {
    try {
      const [{ data: a }, { data: r }] = await Promise.all([api.get("/admin/blog-autopilot"), api.get("/admin/blog-autopilot/runs?limit=30")]);
      setAp(a); setRuns(r.runs || []);
      setDraft({ categories: (a.categories || []).join(", "), excluded_keywords: (a.excluded_keywords || []).join(", "), custom_topics: (a.custom_topics || []).join("\n") });
    } catch { /* ignore */ }
  };
  useEffect(() => { load(); return () => clearInterval(poll.current); }, []);

  const save = async (patch, msg = "Autopilot updated") => {
    try { const { data } = await api.put("/admin/blog-autopilot", patch); setAp(data); toast.success(msg); }
    catch (err) { toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Could not update autopilot"); }
  };
  const saveLists = () => save({
    categories: draft.categories.split(",").map((s) => s.trim()).filter(Boolean),
    excluded_keywords: draft.excluded_keywords.split(",").map((s) => s.trim()).filter(Boolean),
    custom_topics: draft.custom_topics.split("\n").map((s) => s.trim()).filter(Boolean),
  }, "Topic settings saved");

  const runNow = async () => {
    try {
      const { data } = await api.post("/admin/blog-autopilot/run");
      setRunning({ run_key: data.run_key, status: "claimed" });
      toast.success("Generating — this takes about a minute…");
      clearInterval(poll.current);
      poll.current = setInterval(async () => {
        try {
          const { data: r } = await api.get(`/admin/blog-autopilot/runs/${data.run_key}`);
          setRunning(r);
          if (!["claimed", "generating"].includes(r.status)) {
            clearInterval(poll.current);
            if (r.status === "success") toast.success(`Published: ${r.title}`);
            else if (r.status === "draft") toast.warning(`Saved as draft: ${r.error || "review needed"}`);
            else toast.error(`Generation failed: ${r.error || "unknown error"}`);
            load(); onPostCreated?.();
          }
        } catch { /* keep polling */ }
      }, 4000);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Could not start generation");
    }
  };

  if (!ap) return null;
  const busy = running && ["claimed", "generating"].includes(running.status);

  return (
    <div data-testid="blog-autopilot" className="mb-6 rounded-xl border border-brand/20 bg-brand/[0.03] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-heading font-bold text-sm"><Sparkles className="h-4 w-4 text-brand" /> Blog Autopilot — writes, illustrates &amp; publishes SEO posts automatically</p>
        <label className="flex items-center gap-2 text-sm">
          <input data-testid="autopilot-enabled" type="checkbox" checked={!!ap.enabled} onChange={(e) => save({ enabled: e.target.checked })} className="h-4 w-4 accent-[#0055FF]" />
          {ap.enabled ? "On" : "Off"}
        </label>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Runs on the server even when this dashboard is closed. Times are stored in UTC and shown in your chosen timezone.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-[11px] font-mono uppercase tracking-wide text-muted-foreground">Frequency
          <select data-testid="autopilot-frequency" value={ap.frequency} onChange={(e) => save({ frequency: e.target.value })} className={field}>
            <option value="daily">Daily</option><option value="alternate">Every alternate day</option><option value="manual">Manual only</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-mono uppercase tracking-wide text-muted-foreground">Publishing time
          <input data-testid="autopilot-time" type="time" value={ap.publish_time} onChange={(e) => save({ publish_time: e.target.value })} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-mono uppercase tracking-wide text-muted-foreground">Timezone
          <select data-testid="autopilot-tz" value={ap.tz} onChange={(e) => save({ tz: e.target.value })} className={field}>
            {[...new Set([ap.tz, ...TZS])].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-mono uppercase tracking-wide text-muted-foreground">Publishing mode
          <select data-testid="autopilot-mode" value={ap.auto_publish ? "publish" : "draft"} onChange={(e) => save({ auto_publish: e.target.value === "publish" })} className={field}>
            <option value="publish">Publish automatically</option><option value="draft">Save as draft for review</option>
          </select>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2"><input data-testid="autopilot-cover" type="checkbox" checked={!!ap.generate_cover} onChange={(e) => save({ generate_cover: e.target.checked })} className="h-4 w-4 accent-[#0055FF]" /> Fresh AI cover image per post</label>
        <label className="flex items-center gap-2"><input data-testid="autopilot-dedupe" type="checkbox" checked={!!ap.dedupe} onChange={(e) => save({ dedupe: e.target.checked })} className="h-4 w-4 accent-[#0055FF]" /> Duplicate-topic prevention</label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[11px] font-mono uppercase tracking-wide text-muted-foreground">Topic categories (comma-separated)
          <input data-testid="autopilot-categories" value={draft.categories} onChange={(e) => setDraft({ ...draft, categories: e.target.value })} onBlur={saveLists} className={`${field} font-sans normal-case tracking-normal`} />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-mono uppercase tracking-wide text-muted-foreground">Excluded topics / keywords (comma-separated)
          <input data-testid="autopilot-excluded" value={draft.excluded_keywords} onChange={(e) => setDraft({ ...draft, excluded_keywords: e.target.value })} onBlur={saveLists} placeholder="e.g. crypto, gambling" className={`${field} font-sans normal-case tracking-normal`} />
        </label>
        <label className="sm:col-span-2 flex flex-col gap-1 text-[11px] font-mono uppercase tracking-wide text-muted-foreground">Your topic queue (one per line — used first, each once)
          <textarea data-testid="autopilot-custom-topics" value={draft.custom_topics} onChange={(e) => setDraft({ ...draft, custom_topics: e.target.value })} onBlur={saveLists} rows={2} placeholder={"e.g. WhatsApp automation for restaurants in Gurgaon"} className={`${field} font-sans normal-case tracking-normal`} />
        </label>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <button data-testid="autopilot-save-topics" onClick={saveLists} className="text-xs font-medium text-brand hover:underline">Save topic settings</button>
        <button data-testid="autopilot-run" onClick={runNow} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-brand transition-colors disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} {busy ? `Working… ${running.current_step || ""}` : "Generate post now"}
        </button>
      </div>
      {running && !busy && (
        <div className="mt-3 rounded-lg border border-line bg-white p-3 text-xs" data-testid="autopilot-run-result">
          <Status s={running.status} /> <span className="ml-2 font-medium">{running.title || running.run_key}</span>
          {running.url && <a href={running.url.replace(/^https?:\/\/[^/]+/, "")} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-brand hover:underline">Open post <ExternalLink className="h-3 w-3" /></a>}
          {running.error && <p className="mt-1 text-rose-600 break-all">{running.error}</p>}
        </div>
      )}

      <div className="mt-4 grid gap-x-6 gap-y-1 text-xs text-muted-foreground border-t border-brand/10 pt-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="autopilot-status">
        <span>Next scheduled run: <span className="text-ink/80" data-testid="autopilot-next-run">{ap.next_run_local ? `${ap.next_run_local} (${ap.tz})` : ap.frequency === "manual" ? "manual only" : "off"}</span></span>
        <span>Last successful run: <span className="text-ink/80" data-testid="autopilot-last-success">{fmt(ap.last_success_at)}</span></span>
        <span>Posts generated: <span className="text-ink/80">{ap.generated_count || 0}</span> · Queued topics: <span className="text-ink/80">{ap.queued_topics || 0}</span></span>
        <span>Last error: <span className={ap.last_error ? "text-rose-600" : "text-ink/80"} data-testid="autopilot-last-error">{ap.last_error || "none"}</span></span>
      </div>

      <button onClick={() => setShowHistory((v) => !v)} data-testid="autopilot-history-toggle" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-ink hover:text-brand"><History className="h-3.5 w-3.5" /> {showHistory ? "Hide" : "Show"} generation &amp; publishing history ({runs.length})</button>
      {showHistory && (
        <div className="mt-2 overflow-x-auto rounded-lg border border-line bg-white" data-testid="autopilot-history">
          <table className="w-full text-xs">
            <thead className="bg-paper text-left text-[11px] font-mono uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Run</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Post</th><th className="px-3 py-2">Details</th></tr></thead>
            <tbody className="divide-y divide-line">
              {runs.map((r) => (
                <tr key={r.run_key} data-testid={`autopilot-run-row`}>
                  <td className="px-3 py-2 whitespace-nowrap">{fmt(r.finished_at || r.started_at)}</td>
                  <td className="px-3 py-2"><span className="font-mono text-[11px]">{r.run_key}</span><br /><span className="text-muted-foreground">{r.kind}{r.attempts > 1 ? ` · attempt ${r.attempts}` : ""}</span></td>
                  <td className="px-3 py-2"><Status s={r.status} /></td>
                  <td className="px-3 py-2 max-w-[260px]">{r.slug ? <a href={`/blog/${r.slug}`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">{r.title || r.slug}</a> : "—"}</td>
                  <td className="px-3 py-2 max-w-[320px] break-words">{r.error ? <span className="text-rose-600">{r.error}</span> : r.duration_s ? `${r.duration_s}s` : (r.steps || []).slice(-1)[0]?.step || ""}</td>
                </tr>
              ))}
              {!runs.length && <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground"><ListChecks className="inline h-4 w-4 mr-1" /> No runs yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
