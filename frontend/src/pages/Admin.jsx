import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, LogOut, Lock, Users, TrendingUp, Trophy, FileText, Download, Sparkles, Globe, Mail, Trash2 } from "lucide-react";
import Seo from "@/components/Seo";
import { useAuth } from "@/context/AuthContext";
import { api, formatApiErrorDetail } from "@/lib/api";
import SiteSettings from "@/pages/admin/SiteSettings";
import ApiSettings from "@/pages/admin/ApiSettings";
import Notifications from "@/pages/admin/Notifications";
import SeoTools from "@/pages/admin/SeoTools";
import SeoWorkflow from "@/pages/admin/SeoWorkflow";
import BlogManager from "@/pages/admin/BlogManager";
import CaseStudyManager from "@/pages/admin/CaseStudyManager";
import WorkManager from "@/pages/admin/WorkManager";
import LeadMap from "@/pages/admin/LeadMap";

const STATUS = ["new", "contacted", "won", "lost"];
const STATUS_COLOR = { new: "bg-brand/10 text-brand", contacted: "bg-amber-100 text-amber-700", won: "bg-green-100 text-green-700", lost: "bg-red-100 text-red-600" };

function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back, Rajeev.");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const field = "w-full rounded-lg border border-line bg-white px-4 py-3.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";

  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <form onSubmit={submit} data-testid="admin-login-form" className="w-full max-w-sm rounded-2xl border border-line bg-white p-8">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand"><Lock className="h-5 w-5" /></span>
        <h1 className="mt-5 font-heading text-2xl font-extrabold tracking-tight">Admin login</h1>
        <p className="mt-1 text-sm text-muted-foreground">Leads dashboard</p>
        <div className="mt-6 space-y-3">
          <input data-testid="admin-email" type="email" className={field} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input data-testid="admin-password" type="password" className={field} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button data-testid="admin-login-submit" disabled={loading} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 font-medium text-white hover:bg-ink transition-colors disabled:opacity-60">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
        </button>
      </form>
    </div>
  );
}

function Dashboard() {
  const { user, logout } = useAuth();
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [warm, setWarm] = useState(null);
  const [digest, setDigest] = useState(null);
  const [savingDigest, setSavingDigest] = useState(false);

  const load = () => {
    Promise.all([api.get("/leads"), api.get("/admin/stats")])
      .then(([l, s]) => { setLeads(l.data.leads); setStats(s.data); })
      .catch(() => toast.error("Failed to load"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  useEffect(() => {
    api.get("/admin/digest/settings").then(({ data }) => setDigest(data)).catch(() => {});
  }, []);

  const saveDigest = async () => {
    setSavingDigest(true);
    try {
      await api.put("/admin/digest/settings", { hour: digest.hour, tz: digest.tz, enabled: digest.enabled });
      toast.success(digest.enabled ? `Digest set for ${String(digest.hour).padStart(2, "0")}:00 ${digest.tz}` : "Daily digest turned off");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Could not save digest settings");
    } finally {
      setSavingDigest(false);
    }
  };

  // Poll warm-up status while a run is active
  useEffect(() => {
    if (!warm?.running) return;
    const t = setInterval(async () => {
      try {
        const { data } = await api.get("/admin/pregenerate/status");
        setWarm(data);
        if (!data.running) {
          clearInterval(t);
          toast.success(`Warm-up done — ${data.generated} generated, ${data.skipped} already cached`);
          load();
        }
      } catch { clearInterval(t); }
    }, 2000);
    return () => clearInterval(t);
  }, [warm?.running]);

  const startWarmup = async (all = false) => {
    try {
      const { data } = await api.post("/admin/pregenerate", { all });
      toast.info(`Warming ${data.total} pages across ${data.cities} ${all ? "" : "top "}cities…`);
      setWarm({ running: true, total: data.total, done: 0, generated: 0, skipped: 0, failed: 0 });
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Could not start warm-up");
    }
  };

  const [digestSending, setDigestSending] = useState(false);
  const sendDigest = async () => {
    setDigestSending(true);
    try {
      const { data } = await api.post("/admin/digest/send");
      toast.success(`Digest sent — ${data.leads_in_period} lead(s) in the last 24h`);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Could not send digest");
    } finally {
      setDigestSending(false);
    }
  };

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/leads/${id}`, { status });
      setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status } : l)));
      load();
    } catch { toast.error("Update failed"); }
  };

  const removeLead = async (id) => {
    if (!window.confirm("Delete this lead permanently? This cannot be undone.")) return;
    try {
      await api.delete(`/leads/${id}`);
      setLeads((ls) => ls.filter((l) => l.id !== id));
      toast.success("Lead deleted");
      load();
    } catch { toast.error("Delete failed"); }
  };

  const exportCsv = () => {
    const headers = ["Name", "Email", "Phone", "Service", "Budget", "Location", "Status", "Source", "Message", "Created"];
    const esc = (c) => `"${String(c ?? "").replace(/"/g, '""')}"`;
    const rows = leads.map((l) => [l.name, l.email, l.phone, l.service, l.budget, l.location, l.status, l.source_path, l.message, l.created_at].map(esc).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `rajeev-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${leads.length} leads`);
  };

  const cards = stats ? [
    { label: "Total leads", value: stats.total_leads, icon: Users },
    { label: "New", value: stats.new_leads, icon: TrendingUp },
    { label: "Won", value: stats.won_leads, icon: Trophy },
    { label: "Pages generated", value: stats.generated_pages, icon: FileText },
  ] : [];

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white">
        <div className="mx-auto max-w-[1400px] px-5 md:px-10 py-5 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl font-extrabold tracking-tight">Leads Dashboard</h1>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href="#seo-workflow" className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-ink">90-day SEO plan</a>
            <button data-testid="admin-warmup" onClick={() => startWarmup(false)} disabled={warm?.running} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-ink transition-colors disabled:opacity-50">
              {warm?.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-brand" />}
              {warm?.running ? `Warming ${warm.done}/${warm.total}` : "Warm top cities"}
            </button>
            <button data-testid="admin-warmup-all" onClick={() => startWarmup(true)} disabled={warm?.running} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-ink transition-colors disabled:opacity-50">
              <Globe className="h-4 w-4 text-brand" /> Warm all cities
            </button>
            <button data-testid="admin-send-digest" onClick={sendDigest} disabled={digestSending} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-ink transition-colors disabled:opacity-50">
              {digestSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4 text-brand" />} Send digest
            </button>
            <button data-testid="admin-export-csv" onClick={exportCsv} disabled={!leads.length} className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-ink transition-colors disabled:opacity-50"><Download className="h-4 w-4" /> Export CSV</button>
            <button data-testid="admin-logout" onClick={logout} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm hover:border-ink transition-colors"><LogOut className="h-4 w-4" /> Logout</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 md:px-10 py-8">
        {warm?.running && (
          <div data-testid="warmup-banner" className="mb-6 rounded-2xl border border-brand/20 bg-brand/5 p-5">
            <div className="flex items-center justify-between text-sm font-medium">
              <span className="inline-flex items-center gap-2 text-brand"><Sparkles className="h-4 w-4" /> Warming AI pages for top cities…</span>
              <span className="font-mono text-xs text-muted-foreground">{warm.done}/{warm.total} · {warm.generated} new · {warm.skipped} cached</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-brand/10">
              <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${warm.total ? Math.round((warm.done / warm.total) * 100) : 0}%` }} />
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="rounded-2xl border border-line bg-white p-6">
              <c.icon className="h-5 w-5 text-brand" />
              <p className="mt-4 font-heading text-3xl font-extrabold tracking-tight">{c.value}</p>
              <p className="mt-1 text-xs uppercase tracking-wide font-mono text-muted-foreground">{c.label}</p>
            </div>
          ))}
        </div>

        {digest && (
          <div data-testid="digest-settings" className="mt-8 rounded-2xl border border-line bg-white p-6">
            <div className="flex items-center gap-2 font-heading font-bold"><Mail className="h-4 w-4 text-brand" /> Daily lead digest</div>
            <p className="mt-1 text-xs text-muted-foreground">Choose when your once-a-day summary of new leads arrives.</p>
            <div className="mt-4 flex flex-wrap items-end gap-4">
              <label className="flex flex-col gap-1 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                Hour
                <select data-testid="digest-hour" value={digest.hour} onChange={(e) => setDigest({ ...digest, hour: Number(e.target.value) })} className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand">
                  {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                Timezone
                <select data-testid="digest-tz" value={digest.tz} onChange={(e) => setDigest({ ...digest, tz: e.target.value })} className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand">
                  {(digest.common_timezones || [digest.tz]).map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input data-testid="digest-enabled" type="checkbox" checked={digest.enabled} onChange={(e) => setDigest({ ...digest, enabled: e.target.checked })} className="h-4 w-4 accent-[#0055FF]" />
                Enabled
              </label>
              <button data-testid="digest-save" onClick={saveDigest} disabled={savingDigest} className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-ink transition-colors disabled:opacity-50">
                {savingDigest && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </button>
            </div>
          </div>
        )}

        <Notifications />
        <SiteSettings />
        <ApiSettings />
        <SeoWorkflow />
        <SeoTools />
        <section id="admin-blog" className="scroll-mt-6"><BlogManager /></section>
        <WorkManager />
        <CaseStudyManager />
        <LeadMap />

        <div className="mt-8 rounded-2xl border border-line bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-line font-heading font-bold">All leads ({leads.length})</div>
          {loading ? (
            <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>
          ) : leads.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">No leads yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="leads-table">
                <thead className="bg-paper text-left font-mono text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3">Name</th><th className="px-6 py-3">Contact</th><th className="px-6 py-3">Service</th><th className="px-6 py-3">Location</th><th className="px-6 py-3">Budget</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id} className="border-t border-line align-top" data-testid={`lead-row-${l.id}`}>
                      <td className="px-6 py-4">
                        <p className="font-semibold">{l.name}</p>
                        {l.message && <p className="mt-1 max-w-xs text-xs text-muted-foreground line-clamp-2">{l.message}</p>}
                        <p className="mt-1 text-[10px] text-muted-foreground font-mono">{new Date(l.created_at).toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4"><p>{l.email}</p><p className="text-muted-foreground">{l.phone}</p></td>
                      <td className="px-6 py-4">{l.service || "—"}</td>
                      <td className="px-6 py-4">{l.location || "—"}<p className="text-[10px] text-muted-foreground font-mono">{l.source_path}</p></td>
                      <td className="px-6 py-4">{l.budget || "—"}</td>
                      <td className="px-6 py-4">
                        <select value={l.status} onChange={(e) => setStatus(l.id, e.target.value)} data-testid={`lead-status-${l.id}`} className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize outline-none ${STATUS_COLOR[l.status] || ""}`}>
                          {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <button data-testid={`lead-delete-${l.id}`} onClick={() => removeLead(l.id)} aria-label="Delete lead" title="Delete lead" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-red-600 hover:border-red-500 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function Admin() {
  const { user, ready } = useAuth();
  if (!ready) return <><Seo title="Admin | Rajeev Freelancer" description="Admin dashboard" path="/admin" noindex /><div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div></>;
  return (
    <>
      <Seo title="Admin | Rajeev Freelancer" description="Admin dashboard" path="/admin" noindex />
      {user ? <Dashboard /> : <Login />}
    </>
  );
}
