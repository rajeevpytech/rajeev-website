import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, KeyRound, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { api, formatApiErrorDetail } from "@/lib/api";

const BASE = "/admin/api-settings";
const TARGETS = [["text", "Text and article generation"], ["image", "Article cover images"]];
const FIELD = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:bg-paper disabled:text-ink/50";
const BUTTON = "inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium hover:border-ink disabled:opacity-50";
const PRIMARY = "inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-ink disabled:opacity-50";
const KEY_SOURCES = { saved: "Saved encrypted key", environment: "Server-provided key", none: "No key configured" };

export function apiSettingsDraft(settings) {
  return Object.fromEntries(TARGETS.map(([target]) => [target, { provider: settings?.[target]?.provider || "emergent", model: settings?.[target]?.model || "", api_key: "", clear_key: false }]));
}
export function apiSettingsPending(settings, draft) {
  return TARGETS.some(([target]) => draft[target]?.provider !== settings?.[target]?.provider || draft[target]?.model !== settings?.[target]?.model || Boolean(draft[target]?.api_key) || draft[target]?.clear_key === true);
}
export function apiSettingsPayload(settings, draft) {
  if (!settings?.storage?.available) throw new Error("Set up protected server storage before saving API settings.");
  const payload = { expected_revision: settings.revision };
  for (const [target] of TARGETS) {
    const current = draft[target] || {};
    const provider = settings.providers?.[target]?.[current.provider];
    const allowed = (provider?.models || []).map(model => typeof model === "string" ? model : model.id || model.model || model.value);
    if (!provider || !current.model || !allowed.includes(current.model)) throw new Error("Choose a supported provider and model for each purpose.");
    const key = String(current.api_key || "").trim();
    if (current.clear_key && key) throw new Error("Choose either a replacement key or removal of the saved key.");
    payload[target] = { provider: current.provider, model: current.model, api_key: key, clear_key: current.clear_key === true };
  }
  return payload;
}
function SetupGuide({ guide }) {
  if (Array.isArray(guide)) return <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed">{guide.filter(item => typeof item === "string").map((item, index) => <li key={index}>{item}</li>)}</ol>;
  return <p className="mt-2 text-xs leading-relaxed">{typeof guide === "string" && guide ? guide : "Ask the site administrator to configure stable protection for saved API keys, then reload this panel."}</p>;
}
function modelOptions(provider, current) {
  const options = (provider?.models || []).map(model => typeof model === "string" ? { value: model, label: model } : { value: model.id || model.model || model.value, label: model.label || model.name || model.id || model.model || model.value }).filter(model => model.value);
  if (current && !options.some(model => model.value === current)) options.unshift({ value: current, label: `${current} (current configured model)` });
  return options;
}

export default function ApiSettings() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(null);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [conflict, setConflict] = useState(false);
  const [results, setResults] = useState({});

  const safeError = (err, fallback) => {
    const detail = err.response?.data?.detail;
    let message = typeof detail === "string" ? detail : detail?.message || detail?.msg || (detail?.guide && typeof detail.guide === "string" ? detail.guide : "") || (detail ? formatApiErrorDetail(detail) : "") || fallback;
    for (const [target] of TARGETS) { const raw = draft?.[target]?.api_key; for (const key of new Set([raw, raw?.trim()].filter(Boolean))) message = String(message).split(key).join("[redacted]"); }
    return message;
  };
  const load = useCallback(async () => {
    try {
      const { data } = await api.get(BASE);
      setSettings(data); setDraft(apiSettingsDraft(data)); setResults({}); setConflict(false); setError("");
    } catch { setError("API settings could not be loaded. Please retry or reload the dashboard."); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const change = (target, patch) => {
    setDraft(previous => ({ ...previous, [target]: { ...previous[target], ...patch } }));
    setResults(previous => ({ ...previous, [target]: null }));
  };
  const changeProvider = (target, provider) => change(target, { provider, model: settings.providers?.[target]?.[provider]?.default_model || modelOptions(settings.providers?.[target]?.[provider], "")[0]?.value || "", api_key: "", clear_key: false });
  const save = async event => {
    event.preventDefault();
    if (busy || conflict) return;
    let payload;
    try { payload = apiSettingsPayload(settings, draft); } catch (err) { return toast.error(err.message); }
    setBusy("save"); setError("");
    try {
      const { data } = await api.put(BASE, payload);
      setSettings(data); setDraft(apiSettingsDraft(data)); setResults({}); setConflict(false);
      toast.success("API settings saved");
    } catch (err) {
      const message = safeError(err, "API settings could not be saved.");
      if (err.response?.status === 409) setConflict(true);
      setError(message); toast.error(message);
    } finally { setBusy(""); }
  };
  const pending = Boolean(settings && draft && apiSettingsPending(settings, draft));
  const test = async target => {
    if (busy || conflict || pending || !settings?.[target]?.key_configured) return;
    setBusy(`test-${target}`); setError("");
    try {
      const { data } = await api.post(`${BASE}/test`, { target });
      setResults(previous => ({ ...previous, [target]: { ok: data.ok === true, code: data.code, message: data.message || "The server returned no check details.", provider: data.provider, model: data.model, generation_tested: data.generation_tested === true } }));
    } catch (err) { setResults(previous => ({ ...previous, [target]: { ok: false, message: safeError(err, "The check could not be completed."), generation_tested: false } })); }
    finally { setBusy(""); }
  };
  const editDisabled = Boolean(busy || conflict || !settings?.storage?.available);
  const protection = settings?.storage?.available;

  return <section id="api-settings" data-testid="api-settings" className="mt-8 scroll-mt-6 rounded-2xl border border-line bg-white p-6">
    <div className="flex items-start justify-between gap-3"><button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="api-settings-panel" className="flex flex-1 items-center justify-between gap-3 text-left"><span className="flex flex-wrap items-center gap-2 font-heading font-bold"><KeyRound className="h-4 w-4 text-brand" /> API settings <span className="rounded-full bg-paper px-2 py-1 text-[11px] font-sans font-medium text-ink/60">{settings ? protection ? "Protected storage ready" : "Storage setup needed" : error ? "Unavailable" : "Loading"}</span></span><ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} /></button><button type="button" onClick={load} disabled={!!busy} aria-label="Reload API settings" className="rounded-full border border-line p-2 hover:border-ink disabled:opacity-50"><RefreshCw className="h-4 w-4" /></button></div>
    {open && <div id="api-settings-panel" className="mt-5">
      <p className="max-w-4xl text-sm leading-relaxed text-ink/70">Choose separate providers for article text and cover images. Keys saved here are encrypted. Leave a key field blank to retain that selected provider's saved key.</p>
      {error && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}{conflict && <p className="mt-2">The settings changed during editing. Reload the current settings before saving again.</p>}<button type="button" onClick={load} disabled={!!busy} className="mt-2 font-semibold underline">Reload settings</button></div>}
      {!settings && !error && <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading provider settings…</p>}
      {settings && draft && <>
        {protection && <details className="mt-4 rounded-xl border border-line bg-paper/40 p-4"><summary className="cursor-pointer text-xs font-semibold text-ink/70">Saved key protection</summary><p className="mt-2 text-xs text-ink/65">{settings.storage?.protection_source === "dedicated" ? "A dedicated server protection key is configured." : "Protection uses the configured stable server secret."}</p><SetupGuide guide={settings.storage?.guide} /></details>}
        {!protection && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900" data-testid="api-storage-guide"><h3 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4" /> Set up protected storage before saving keys</h3><SetupGuide guide={settings.storage?.guide} /></div>}
        <form onSubmit={save} className="mt-5 space-y-5" autoComplete="off">
          <div className="grid gap-5 lg:grid-cols-2">{TARGETS.map(([target, label]) => {
            const current = settings[target] || {};
            const providers = settings.providers?.[target] || {};
            const provider = providers[draft[target].provider];
            const result = results[target];
            const sameProvider = draft[target].provider === current.provider;
            const testLabel = current.provider === "google" ? "Check model access" : target === "image" ? "Check image readiness" : "Test text connection";
            return <section key={target} className="rounded-xl border border-line bg-paper/35 p-5" data-testid={`api-target-${target}`}>
              <h3 className="font-heading font-bold">{label}</h3><div className="mt-3 rounded-lg bg-white p-3 text-xs text-ink/65" data-testid={`api-status-${target}`}><p><strong className="font-semibold text-ink">{current.key_configured ? "Key configured" : "No key configured"}</strong> · {KEY_SOURCES[current.key_source] || "Configuration status unavailable"}</p><p className="mt-1 break-all">Current configuration: {providers[current.provider]?.label || current.provider || "—"} · {current.model || "—"}</p></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium text-ink/70">Provider<select data-testid={`api-provider-${target}`} value={draft[target].provider} onChange={event => changeProvider(target, event.target.value)} disabled={editDisabled} className={FIELD}>{Object.entries(providers).map(([value, item]) => <option key={value} value={value}>{item.label || value}</option>)}</select></label><label className="text-xs font-medium text-ink/70">Model<select data-testid={`api-model-${target}`} value={draft[target].model} onChange={event => change(target, { model: event.target.value })} disabled={editDisabled} className={FIELD}>{modelOptions(provider, draft[target].model).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div>
              <label className="mt-4 block text-xs font-medium text-ink/70">Replacement API key — optional<input data-testid={`api-key-${target}`} name={`${target}-provider-key`} type="password" autoComplete="new-password" spellCheck={false} value={draft[target].api_key} onChange={event => change(target, { api_key: event.target.value, clear_key: false })} disabled={editDisabled || draft[target].clear_key} placeholder="Leave blank to keep this provider's saved key" className={FIELD} /></label>
              {sameProvider && current.saved_key_configured && <label className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-ink/65"><input data-testid={`api-clear-${target}`} type="checkbox" checked={draft[target].clear_key} onChange={event => change(target, { clear_key: event.target.checked, api_key: "" })} disabled={editDisabled} className="mt-0.5 h-4 w-4 shrink-0 accent-[#0055FF]" /> Remove this provider's saved key. A server-provided key may remain active.</label>}
              {!sameProvider && <p className="mt-3 text-xs text-ink/60">Provider keys stay separate. Changing the provider does not copy a key from another provider.</p>}
              <div className="mt-4 border-t border-line pt-4"><button type="button" data-testid={`api-test-${target}`} onClick={() => test(target)} disabled={!!busy || conflict || pending || !current.key_configured} className={BUTTON}>{busy === `test-${target}` && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{testLabel}</button><p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{pending ? "Save pending changes before testing." : current.provider === "google" ? "Checks access to the configured model; it does not generate text or an image." : target === "image" ? "Checks whether the saved image key is configured; it does not contact Emergent or generate an image." : "Sends a small text request using the current configuration and may consume API quota."}</p></div>
              {result && <div data-testid={`api-test-result-${target}`} role="status" className={`mt-4 rounded-lg border p-3 text-xs ${result.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}><p className="font-semibold">{result.ok ? result.generation_tested ? "Generation check passed" : result.code === "readiness_only" ? "Key configuration present" : result.code === "model_access_ok" ? "Model access checked" : "Configuration check passed" : "Check could not be completed"}</p><p className="mt-1 leading-relaxed">{result.message}</p>{!result.generation_tested && <p className="mt-2">Generation was not tested.</p>}</div>}
            </section>;
          })}</div>
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4"><button data-testid="api-settings-save" disabled={editDisabled} className={PRIMARY}>{busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />} Save API settings</button><p className="text-xs text-muted-foreground">Saving updates configuration only. Provider checks run when you press a check or test button.</p></div>
        </form>
      </>}
    </div>}
  </section>;
}
