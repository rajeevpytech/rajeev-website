import { serviceForSlug } from "@/seo/serviceAliases";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Radar, Share2, ChevronDown, Clock } from "lucide-react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { getSiteConfig, canonicalBase } from "@/lib/siteConfig";

const INDEXNOW_REASONS = {
  not_enabled: "Manual notifications are disabled on the server.",
  invalid_or_missing_key: "A valid ownership key is required before submitting.",
  provide_1_to_100_urls: "Submit between 1 and 100 eligible URLs.",
  batch_contains_ineligible_urls: "The batch contains ineligible URLs; no notification was sent.",
  no_eligible_urls: "No eligible URLs were supplied.",
  page_not_public_indexable_or_reviewed: "Page is missing, private, noindex or awaiting review.",
  noncanonical_url: "Use the page's preferred canonical URL.",
  canonical_https_host_required: "Use the canonical HTTPS domain or a relative path.",
  private_path_not_allowed: "Private and administrator paths cannot be submitted.",
  query_or_fragment_not_allowed: "Remove query strings and page fragments.",
  canonical_path_required: "Use the canonical path without a trailing slash.",
  queue_storage_unavailable: "The submission could not be recorded; no notification was sent.",
  ownership_verification_failed: "Ownership verification failed. Check the key file before retrying.",
  host_or_key_rejected: "The host or ownership key was rejected.",
  rate_limited: "The service rate limit was reached. Review the result before trying again.",
  submission_request_failed: "The notification request failed; acceptance is unconfirmed.",
  upstream_error: "The notification was not accepted by the service.",
};
export function indexNowResultText(result) {
  if (result?.accepted === true) return result.validation_pending ? "Notification accepted; ownership validation pending. Indexing is not confirmed." : "Notification accepted. Crawling and indexing are not confirmed.";
  return INDEXNOW_REASONS[result?.reason] || (result?.state === "queued" ? "Notification queued; acceptance is not confirmed." : "Notification not accepted. Review the result before retrying.");
}
function useIndexNow() {
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [latest, setLatest] = useState(null);
  const [paths, setPaths] = useState("/\n/services\n/contact");
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const load = async () => { try { const { data } = await api.get("/admin/indexnow"); setState(data); setError(""); } catch { setError("IndexNow availability could not be loaded."); } };
  useEffect(() => { load(); }, []);
  const toggle = async enabled => {
    if (state?.configuration_source !== "legacy_stored" || !state?.configured || saving || submitting) return;
    setSaving(true);
    try {
      const { data } = await api.put("/admin/indexnow", { enabled: Boolean(enabled) });
      setState(data);
      setError("");
      toast.success(enabled ? "Retained IndexNow configuration enabled" : "Retained IndexNow configuration disabled");
    } catch (err) { toast.error(formatApiErrorDetail(err.response?.data?.detail) || "The stored configuration could not be updated."); }
    finally { setSaving(false); }
  };
  const submit = async () => {
    if (!state?.enabled || !state?.configured || submitting || saving) return;
    const list = paths.split("\n").map(path => path.trim()).filter(Boolean);
    if (!list.length || list.length > (state.max_urls || 100)) return toast.error(`Enter between 1 and ${state.max_urls || 100} URLs.`);
    setSubmitting(true);
    try {
      const { data } = await api.post("/admin/indexnow/submit", { paths: list });
      setLatest(data);
      if (data.accepted) toast.success(indexNowResultText(data)); else toast.error(indexNowResultText(data));
      await load();
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail && typeof detail === "object" && !Array.isArray(detail)) { setLatest(detail); toast.error(indexNowResultText(detail)); }
      else toast.error(formatApiErrorDetail(detail) || "Notification request failed.");
    } finally { setSubmitting(false); }
  };
  return { state, error, latest, paths, setPaths, submit, submitting, saving, toggle, load };
}

const field = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";

function fmtTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleString();
  } catch { return iso; }
}

function SocialPreview() {
  const cfg = getSiteConfig();
  const base = canonicalBase();
  const [path, setPath] = useState("/");
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({ title: cfg.seo.default_title, description: cfg.seo.default_description, image: cfg.seo.og_image });

  const resolve = async () => {
    setLoading(true);
    try {
      const clean = "/" + path.replace(/^\/+/, "").replace(/\/+$/, "");
      const segs = clean.split("/").filter(Boolean);
      const c = getSiteConfig();
      let next = { title: c.seo.default_title, description: c.seo.default_description, image: c.seo.og_image };
      if (segs.length === 2 && Boolean(serviceForSlug(segs[0]))) {
        const { data } = await api.get(`/page/${segs[0]}/${segs[1]}`);
        next = { title: data.content.title, description: data.content.meta_description, image: c.seo.og_image };
      } else if (segs.length === 1 && Boolean(serviceForSlug(segs[0]))) {
        const svc = serviceForSlug(segs[0]);
        next = { title: `${svc.name} — Hire Rajeev Worldwide | ${c.seo.site_name}`, description: svc.tagline, image: c.seo.og_image };
      }
      setMeta(next);
    } catch {
      toast.error("Could not resolve that path");
    } finally {
      setLoading(false);
    }
  };

  const host = base.replace(/^https?:\/\//, "");
  const url = `${base}${path.startsWith("/") ? path : "/" + path}`;

  return (
    <div className="mt-8">
      <p className="flex items-center gap-2 text-sm font-heading font-bold text-ink/80"><Share2 className="h-4 w-4 text-brand" /> Social share preview</p>
      <p className="mt-1 text-xs text-muted-foreground">See how a page looks when shared. Try a city page like <code>/freelance-seo-expert/dubai-uae</code>.</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <input data-testid="preview-path" value={path} onChange={(e) => setPath(e.target.value)} placeholder="/path" className={`${field} max-w-md`} />
        <button data-testid="preview-resolve" onClick={resolve} disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-ink transition-colors disabled:opacity-50">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Preview
        </button>
      </div>

      <div className="mt-6 grid md:grid-cols-3 gap-5" data-testid="preview-cards">
        {/* LinkedIn */}
        <div className="rounded-xl border border-line overflow-hidden bg-white">
          <div className="px-3 py-2 text-[11px] font-mono uppercase tracking-wide text-muted-foreground border-b border-line">LinkedIn</div>
          <img src={meta.image} alt="" className="w-full aspect-[1.91/1] object-cover bg-paper" />
          <div className="p-3">
            <p className="text-[11px] uppercase text-muted-foreground">{host}</p>
            <p className="mt-1 font-semibold text-sm leading-snug line-clamp-2">{meta.title}</p>
          </div>
        </div>
        {/* X / Twitter */}
        <div className="rounded-xl border border-line overflow-hidden bg-white">
          <div className="px-3 py-2 text-[11px] font-mono uppercase tracking-wide text-muted-foreground border-b border-line">X (Twitter)</div>
          <div className="rounded-2xl border border-line m-3 overflow-hidden">
            <img src={meta.image} alt="" className="w-full aspect-[1.91/1] object-cover bg-paper" />
            <div className="p-3">
              <p className="text-[11px] text-muted-foreground">{host}</p>
              <p className="mt-1 font-semibold text-sm leading-snug line-clamp-1">{meta.title}</p>
              <p className="mt-1 text-xs text-ink/60 line-clamp-2">{meta.description}</p>
            </div>
          </div>
        </div>
        {/* WhatsApp */}
        <div className="rounded-xl border border-line overflow-hidden bg-[#e5ddd5]">
          <div className="px-3 py-2 text-[11px] font-mono uppercase tracking-wide text-muted-foreground border-b border-line bg-white">WhatsApp</div>
          <div className="p-3">
            <div className="rounded-lg overflow-hidden bg-white shadow-sm max-w-[85%]">
              <img src={meta.image} alt="" className="w-full aspect-[1.91/1] object-cover bg-paper" />
              <div className="p-2.5">
                <p className="font-semibold text-[13px] leading-snug line-clamp-2">{meta.title}</p>
                <p className="mt-1 text-[11px] text-ink/55 line-clamp-2">{meta.description}</p>
                <p className="mt-1 text-[11px] text-ink/40">{host}</p>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-ink/50 break-all">{url}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LocationPageReview() {
  const [path, setPath] = useState("/freelance-website-developer/laxmi-nagar-india");
  const [page, setPage] = useState(null);
  const [loaded, setLoaded] = useState(null);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const parsePath = () => {
    const raw = path.trim();
    if (!/^\/[a-z0-9-]+\/[a-z0-9-]+\/?$/.test(raw)) {
      throw new Error("Enter a relative service/city path without a domain, query or fragment.");
    }
    const [service, location] = raw.split("/").filter(Boolean);
    if (!serviceForSlug(service)) throw new Error("Choose one of the website's service URL paths.");
    return { service, location, path: `/${service}/${location}` };
  };

  const load = async () => {
    setPage(null);
    setLoaded(null);
    setChecked(false);
    setLoading(true);
    try {
      const target = parsePath();
      const { data } = await api.get(`/page/${target.service}/${target.location}`);
      if (!data?.content) throw new Error("The page has no preview content.");
      setPage(data);
      setLoaded(target);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message || "Could not load that location page");
    } finally { setLoading(false); }
  };

  const review = async (reviewed) => {
    if (!loaded || !page || saving || !page.is_new_location) return;
    if (reviewed && !checked) return toast.error("Check the page content and business details before approving.");
    setSaving(true);
    try {
      await api.put(`/admin/seo-review/${loaded.service}/${loaded.location}`, { reviewed });
      const { data } = await api.get(`/page/${loaded.service}/${loaded.location}`);
      setPage(data);
      setChecked(false);
      toast.success(reviewed ? "Location page approved for indexing" : "Location page returned to review");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Could not save the review status");
    } finally { setSaving(false); }
  };

  const content = page?.content || {};
  const isNew = page?.is_new_location === true;
  const approved = page?.seo_reviewed === true;
  const intro = Array.isArray(content.intro) ? content.intro : content.intro ? [content.intro] : [];
  const cfg = getSiteConfig();

  return (
    <section className="mt-8" data-testid="location-review-panel">
      <h3 className="font-heading font-bold text-sm text-ink/80">Location page review</h3>
      <p className="mt-1 text-xs text-muted-foreground">Load a service/city page to inspect its current copy. Review approval changes indexing eligibility for newly added locations; it does not edit titles, descriptions or existing URLs.</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label htmlFor="location-review-path" className="w-full max-w-xl text-xs font-medium text-ink/70">
          Relative page path
          <input id="location-review-path" data-testid="location-review-path" value={path} onChange={(event) => { setPath(event.target.value); setPage(null); setLoaded(null); setChecked(false); }} disabled={loading || saving} className={`${field} mt-1`} />
        </label>
        <button type="button" data-testid="location-review-load" onClick={load} disabled={loading || saving} className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-ink disabled:opacity-50">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Load preview
        </button>
      </div>
      {page && loaded && (
        <div className="mt-5 space-y-5 rounded-xl border border-line bg-paper/40 p-5" data-testid="location-review-preview">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold" role="status" aria-live="polite" data-testid="location-review-status">{isNew ? approved ? "New location — approved for indexing" : "New location — awaiting review; noindex and excluded from the sitemap" : "Existing location — indexing eligibility preserved"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{loaded.path}</p>
            </div>
            <a data-testid="location-review-public-link" href={`${canonicalBase()}${loaded.path}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand underline underline-offset-4">Open public page ↗</a>
          </div>
          <dl className="space-y-3 text-sm">
            <div><dt className="font-semibold">Current title</dt><dd data-testid="location-review-title" className="mt-1 text-ink/70">{content.title}</dd></div>
            <div><dt className="font-semibold">Current meta description</dt><dd data-testid="location-review-description" className="mt-1 text-ink/70">{content.meta_description}</dd></div>
            <div><dt className="font-semibold">Page heading</dt><dd className="mt-1 text-ink/70">{content.h1}</dd></div>
            <div><dt className="font-semibold">Introduction</dt><dd className="mt-1 space-y-2 text-ink/70">{intro.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</dd></div>
            <div><dt className="font-semibold">Local context</dt><dd className="mt-1 text-ink/70">{content.local_context || "No local context supplied."}</dd></div>
            <div><dt className="font-semibold">Business contact</dt><dd className="mt-1 text-ink/70">{cfg.contact.name} · {cfg.contact.phone} · {cfg.contact.email}</dd></div>
          </dl>
          {Array.isArray(content.faqs) && content.faqs.length > 0 && <details className="rounded-lg border border-line bg-white p-4" open>
            <summary className="cursor-pointer text-sm font-semibold">Questions and answers ({content.faqs.length})</summary>
            <dl className="mt-3 space-y-4 text-sm">{content.faqs.map((faq, index) => <div key={index}><dt className="font-semibold">{faq.q}</dt><dd className="mt-1 text-ink/70">{faq.a}</dd></div>)}</dl>
          </details>}
          {isNew ? <div className="border-t border-line pt-4">
            <label className="flex items-start gap-2 text-sm text-ink/80"><input data-testid="location-review-checked" type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} disabled={saving} className="mt-1 h-4 w-4 shrink-0 accent-[#0055FF]" /> I checked the content, contact details and remote service coverage. The page gives useful, accurate local information and does not claim an office in this location.</label>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" data-testid="location-review-approve" onClick={() => review(true)} disabled={!checked || saving || approved} className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-ink disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Approve for indexing</button>
              <button type="button" data-testid="location-review-revoke" onClick={() => review(false)} disabled={saving || !approved} className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-medium hover:border-ink disabled:opacity-50">Return to review</button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Approval makes this new page eligible for the sitemap. Notification behavior follows the IndexNow configuration above. Search engines decide whether to index or rank a page.</p>
          </div> : <p className="border-t border-line pt-4 text-xs text-muted-foreground">This review switch is limited to newly added locations. Existing page titles, descriptions, URLs and indexing eligibility remain unchanged.</p>}
        </div>
      )}
    </section>
  );
}

function IndexNowPanel({ state, error, latest, paths, setPaths, submit, submitting, saving, toggle, load }) {
  const result = latest || state?.last_ping;
  const automatic = typeof state?.automatic_notifications === "boolean" ? state.automatic_notifications : state?.mode === "validated_automatic_and_manual";
  const retained = state?.configuration_source === "legacy_stored";
  return <div data-testid="indexnow-manual-panel">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="flex items-center gap-2 text-sm font-heading font-bold text-ink/80"><Radar className="h-4 w-4 text-brand" /> IndexNow — {automatic ? "automatic & manual notifications" : "manual notifications"}</p><span data-testid="indexnow-enabled" className="rounded-full bg-paper px-3 py-1 text-xs font-medium" role="status">{state ? state.enabled ? automatic ? "Automatic & manual enabled" : "Manual requests enabled" : state.configured ? "Disabled" : "Not configured" : error ? "Unavailable" : "Checking availability"}</span></div>
    <p data-testid="indexnow-notification-mode" className="mt-2 text-xs leading-relaxed text-muted-foreground">{automatic ? "Automatic notifications are enabled for eligible page changes. You can also submit selected URLs below." : state?.enabled ? "Manual notifications are available below. Automatic notifications are off." : "Notifications are disabled until a valid configuration is enabled."}</p>
    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">IndexNow notifies participating search engines; it does not submit URLs to Google or confirm crawling or indexing.</p>
    {retained && <div className="mt-3 rounded-lg border border-line bg-paper/50 p-3"><p className="text-xs text-ink/65">Your existing stored configuration is retained. Changing its enabled status keeps the ownership key.</p>{state.configured && <label className="mt-2 inline-flex items-center gap-2 text-sm font-medium"><input type="checkbox" data-testid="indexnow-legacy-toggle" checked={!!state.enabled} onChange={event => toggle(event.target.checked)} disabled={saving || submitting} className="h-4 w-4 accent-[#0055FF]" /> Enable retained IndexNow configuration {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}</label>}</div>}
    {state && !retained && <p data-testid="indexnow-server-control" className="mt-2 text-xs text-muted-foreground">Configuration is controlled by server settings. This dashboard does not change its enabled status or ownership key.</p>}
    {state && !state.configured && <p className="mt-2 text-xs text-amber-700">A valid ownership key is required before notifications become available.</p>}
    {state?.key_file_url && <p className="mt-2 text-xs text-muted-foreground">Ownership key file: <a href={state.key_file_url} target="_blank" rel="noopener noreferrer" className="break-all text-brand underline">{state.key_file_url}</a></p>}
    {error && <p role="alert" className="mt-2 text-xs text-rose-700">{error} <button type="button" onClick={load} className="font-medium underline">Retry</button></p>}
    <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] items-end"><label className="flex flex-col gap-1 text-xs font-medium text-ink/70">Public canonical paths — one per line<textarea data-testid="indexnow-paths" rows={3} value={paths} onChange={event => setPaths(event.target.value)} className={field} /></label><button type="button" data-testid="indexnow-submit" onClick={submit} disabled={submitting || saving || !state?.enabled || !state?.configured} className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-ink disabled:opacity-50">{submitting && <Loader2 className="h-4 w-4 animate-spin" />} Submit notification</button></div>
    <p className="mt-2 text-xs text-muted-foreground">Up to {state?.max_urls || 100} public, reviewed, indexable URLs per request. Use each page's preferred canonical URL without a query string or fragment.</p>
    {result ? <div data-testid="indexnow-status" className="mt-4 rounded-xl border border-line bg-paper/60 p-4"><p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Latest submission</p><p data-testid="indexnow-last-result" className={`mt-2 text-sm font-medium ${result.accepted ? "text-emerald-700" : "text-amber-700"}`}>{indexNowResultText(result)}</p><p className="mt-1 text-xs text-muted-foreground">{result.submitted ?? result.count ?? 0} URL(s) submitted{result.status ? ` · HTTP ${result.status}` : ""}{result.created_at ? ` · ${fmtTime(result.created_at)}` : ""}</p>{Array.isArray(result.rejected) && result.rejected.length > 0 && <ul className="mt-3 space-y-1 text-xs text-rose-700">{result.rejected.map((item, index) => <li key={index}>Line {item.position + 1}: {INDEXNOW_REASONS[item.reason] || "This URL was rejected. Check its canonical form and eligibility."}</li>)}</ul>}{result.persistence_warning && <p className="mt-2 text-xs text-amber-700">The result could not be saved to history. Review it before sending another request.</p>}</div> : <p data-testid="indexnow-status-empty" className="mt-4 text-xs text-muted-foreground">No notifications recorded yet.</p>}
    {state?.history?.length > 0 && <details className="mt-4"><summary className="cursor-pointer text-xs font-medium text-brand">Submission history ({state.history.length})</summary><ul data-testid="indexnow-history" className="mt-3 space-y-3">{state.history.map((item, index) => <li key={item.id || index} className="rounded-lg border border-line p-3 text-xs"><p className="font-medium">{indexNowResultText(item)}</p><p className="mt-1 text-muted-foreground">{fmtTime(item.created_at)} · {item.submitted ?? item.count ?? 0} URL(s){item.status ? ` · HTTP ${item.status}` : ""}</p><p className="mt-1 break-all text-ink/50">{(item.urls || []).join(", ")}</p></li>)}</ul></details>}
  </div>;
}

export default function SeoTools() {
  const [open, setOpen] = useState(false);
  const indexNow = useIndexNow();

  return (
    <div data-testid="seo-tools" className="mt-8 rounded-2xl border border-line bg-white p-6">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between" data-testid="seo-tools-toggle">
        <span className="flex items-center gap-2 font-heading font-bold"><Radar className="h-4 w-4 text-brand" /> SEO tools — IndexNow &amp; social preview</span>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-6">
          <IndexNowPanel {...indexNow} />

          <div className="my-6 h-px bg-line" />
          <LocationPageReview />
          <div className="my-6 h-px bg-line" />
          <SocialPreview />
        </div>
      )}
    </div>
  );
}
