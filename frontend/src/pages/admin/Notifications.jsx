import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, BellRing, ChevronDown, Mail, MessageCircle, CheckCircle2, XCircle, AlertTriangle, Save } from "lucide-react";
import { api, formatApiErrorDetail } from "@/lib/api";

const field = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";

function Badge({ ok, warn, children, testId }) {
  const Icon = ok ? CheckCircle2 : warn ? AlertTriangle : XCircle;
  const cls = ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : warn ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-rose-50 text-rose-700 border-rose-200";
  return <span data-testid={testId} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${cls}`}><Icon className="h-3.5 w-3.5" /> {children}</span>;
}

function ResultLine({ label, res }) {
  if (!res) return null;
  const ok = res.status === "sent";
  const warn = res.status === "skipped" || res.status === "partial";
  const detail = res.error || res.reason || (res.results || []).filter((r) => !r.ok).map((r) => `${r.to}: ${r.error}`).join("; ");
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs" data-testid={`notif-result-${label.toLowerCase()}`}>
      <span className="font-medium w-20">{label}</span>
      <Badge ok={ok} warn={warn}>{res.status}</Badge>
      {detail && <span className="text-muted-foreground break-all">{detail}</span>}
    </div>
  );
}

function Row({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

function EmailForm({ cfg, status, onSaved }) {
  const [f, setF] = useState({ smtp_user: cfg.smtp_user || "", smtp_password: "", owner_emails: (cfg.owner_emails || status.owner_emails || []).join(", ") });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/admin/notifications/config", { email: { provider: "gmail", ...f } });
      toast.success("Email settings saved");
      setF((p) => ({ ...p, smtp_password: "" }));
      onSaved(data);
    } catch (err) { toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Save failed"); }
    finally { setSaving(false); }
  };
  return (
    <div className="rounded-xl border border-line p-4" data-testid="notif-email-card">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold"><Mail className="h-4 w-4 text-brand" /> Email alerts (Gmail SMTP)</p>
        <Badge ok={status.configured} testId="notif-email-badge">{status.configured ? "Configured" : "Not configured"}</Badge>
      </div>
      <div className="mt-3 space-y-3">
        <Row label="Sending Gmail address"><input data-testid="notif-smtp-user" className={field} value={f.smtp_user} onChange={(e) => setF({ ...f, smtp_user: e.target.value })} placeholder="er.freelancer07@gmail.com" /></Row>
        <Row label="Google App Password" hint={cfg.smtp_password_set ? `Saved (${cfg.smtp_password}). Leave blank to keep.` : "Google Account → Security → 2-Step Verification → App passwords → Mail"}>
          <input data-testid="notif-smtp-password" type="password" className={field} value={f.smtp_password} onChange={(e) => setF({ ...f, smtp_password: e.target.value })} placeholder={cfg.smtp_password_set ? "•••••••• (unchanged)" : "16-character app password"} />
        </Row>
        <Row label="Send alerts to (comma-separated)"><input data-testid="notif-owner-emails" className={field} value={f.owner_emails} onChange={(e) => setF({ ...f, owner_emails: e.target.value })} /></Row>
        {status.last_error && <p className="text-xs text-rose-600 break-all" data-testid="notif-email-error">Last error: {status.last_error}</p>}
        <button data-testid="notif-save-email" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-ink transition-colors disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save email settings
        </button>
      </div>
    </div>
  );
}

function WhatsAppForm({ cfg, status, onSaved }) {
  const [f, setF] = useState({ phone_number_id: cfg.phone_number_id || "", access_token: "", recipients: (cfg.recipients || status.recipients || []).join(", "), template_name: cfg.template_name || "", template_language: cfg.template_language || "en_US" });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/admin/notifications/config", { whatsapp: f });
      toast.success("WhatsApp settings saved");
      setF((p) => ({ ...p, access_token: "" }));
      onSaved(data);
    } catch (err) { toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Save failed"); }
    finally { setSaving(false); }
  };
  return (
    <div className="rounded-xl border border-line p-4" data-testid="notif-whatsapp-card">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold"><MessageCircle className="h-4 w-4 text-[#25D366]" /> WhatsApp alerts (Meta Cloud API)</p>
        <Badge ok={status.configured} testId="notif-whatsapp-badge">{status.configured ? "Configured" : "Not configured"}</Badge>
      </div>
      <div className="mt-3 space-y-3">
        <Row label="Phone number ID" hint="Meta for Developers → your app → WhatsApp → API Setup"><input data-testid="notif-wa-phone-id" className={field} value={f.phone_number_id} onChange={(e) => setF({ ...f, phone_number_id: e.target.value })} placeholder="123456789012345" /></Row>
        <Row label="Access token" hint={cfg.access_token_set ? `Saved (${cfg.access_token}). Leave blank to keep.` : "Permanent System User token (Business Settings → System Users) or the temporary API Setup token"}>
          <input data-testid="notif-wa-token" type="password" className={field} value={f.access_token} onChange={(e) => setF({ ...f, access_token: e.target.value })} placeholder={cfg.access_token_set ? "•••••••• (unchanged)" : "EAAG..."} />
        </Row>
        <Row label="Your WhatsApp number(s)" hint="With country code, e.g. +919711623561. In test mode add it to the allowed 'To' list in API Setup."><input data-testid="notif-wa-recipients" className={field} value={f.recipients} onChange={(e) => setF({ ...f, recipients: e.target.value })} placeholder="+919711623561" /></Row>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2"><Row label="Approved template name" hint="UTILITY template with 7 variables: Name, Phone, Email, Service, Budget, Location, Message. Blank = plain text (24h window only)."><input data-testid="notif-wa-template" className={field} value={f.template_name} onChange={(e) => setF({ ...f, template_name: e.target.value })} placeholder="new_lead_alert" /></Row></div>
          <Row label="Language"><input data-testid="notif-wa-lang" className={field} value={f.template_language} onChange={(e) => setF({ ...f, template_language: e.target.value })} /></Row>
        </div>
        <button data-testid="notif-save-whatsapp" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-ink transition-colors disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save WhatsApp settings
        </button>
      </div>
    </div>
  );
}

export default function Notifications() {
  const [open, setOpen] = useState(true);
  const [status, setStatus] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const load = () => Promise.all([api.get("/admin/notifications/status"), api.get("/admin/notifications/config")])
    .then(([s, c]) => { setStatus(s.data); setCfg(c.data); }).catch(() => {});
  useEffect(() => { load(); }, []);

  const onSaved = (data) => {
    setCfg({ email: data.email, whatsapp: data.whatsapp });
    setStatus((p) => ({ ...p, ...data.status }));
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data } = await api.post("/admin/notifications/test");
      setTestResult(data);
      if (data.email?.status === "sent" || data.whatsapp?.status === "sent") toast.success("Test alert sent — check your inbox / WhatsApp");
      else toast.error("Nothing was delivered — see details below");
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Test failed");
    } finally {
      setTesting(false);
    }
  };

  const last = status?.last_lead_notify;

  return (
    <div data-testid="notifications-panel" className="mt-8 rounded-2xl border border-line bg-white p-6">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between" data-testid="notifications-toggle">
        <span className="flex items-center gap-2 font-heading font-bold"><BellRing className="h-4 w-4 text-brand" /> Lead alerts — Email &amp; WhatsApp delivery</span>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && status && cfg && (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <EmailForm key={JSON.stringify(cfg.email)} cfg={cfg.email} status={status.email} onSaved={onSaved} />
          <WhatsAppForm key={JSON.stringify(cfg.whatsapp)} cfg={cfg.whatsapp} status={status.whatsapp} onSaved={onSaved} />
          <div className="md:col-span-2 flex flex-wrap items-start gap-4 border-t border-line pt-4">
            <button data-testid="notif-send-test" onClick={runTest} disabled={testing} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-brand transition-colors disabled:opacity-50">
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />} Send test alert
            </button>
            <div className="space-y-1.5 flex-1 min-w-[240px]">
              {testResult && (<><p className="text-xs font-medium">Test result</p><ResultLine label="Email" res={testResult.email} /><ResultLine label="WhatsApp" res={testResult.whatsapp} /></>)}
              {!testResult && last && (
                <>
                  <p className="text-xs font-medium" data-testid="notif-last-lead">Last lead alert — {last.name} · {new Date(last.created_at).toLocaleString()}</p>
                  <ResultLine label="Email" res={last.notify?.email} />
                  <ResultLine label="WhatsApp" res={last.notify?.whatsapp} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
