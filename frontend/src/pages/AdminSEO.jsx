import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Lock, Save, Trash2, LogOut, Search, Check, ExternalLink } from "lucide-react";
import { invalidateOverrides } from "@/hooks/useSEO";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Curated list of routes for the editor
const PAGES = [
    { path: "/", label: "Home", suggested: { title: "Senior Freelance Engineer & Marketer" } },
    { path: "/about", label: "About", suggested: { title: "About Rajeev — 12+ Years Senior Freelance" } },
    { path: "/journey", label: "Career Journey", suggested: { title: "Career Journey" } },
    { path: "/services", label: "Services", suggested: { title: "Services — Web, Software, Marketing, SEO" } },
    { path: "/services/web-development", label: "Web Development", suggested: { title: "Freelance Web Development" } },
    { path: "/services/software-engineering", label: "Software Engineering", suggested: { title: "Freelance Software Engineering" } },
    { path: "/services/digital-marketing", label: "Digital Marketing", suggested: { title: "Freelance Digital Marketing" } },
    { path: "/services/seo-consulting", label: "SEO Consulting", suggested: { title: "Freelance SEO Consultant" } },
    { path: "/work", label: "Case Studies", suggested: { title: "Case Studies & Portfolio" } },
    { path: "/blog", label: "Journal / Blog", suggested: { title: "Field Notes — Blog" } },
    { path: "/contact", label: "Contact", suggested: { title: "Contact Rajeev" } },
    { path: "/faq", label: "FAQ", suggested: { title: "FAQ — Working with Rajeev" } },
    { path: "/freelancer-in/gurgaon", label: "Freelancer in Gurgaon", suggested: { title: "Freelance Engineer & Marketer in Gurgaon" } },
    { path: "/freelancer-in/delhi", label: "Freelancer in Delhi", suggested: { title: "Freelance Engineer & Marketer in Delhi" } },
    { path: "/freelancer-in/bengaluru", label: "Freelancer in Bengaluru", suggested: {} },
    { path: "/freelancer-in/mumbai", label: "Freelancer in Mumbai", suggested: {} },
    { path: "/freelancer-in/london", label: "Freelancer in London", suggested: {} },
    { path: "/freelancer-in/new-york", label: "Freelancer in New York", suggested: {} },
    { path: "/freelancer-in/dubai", label: "Freelancer in Dubai", suggested: {} },
    { path: "/freelancer-in/singapore", label: "Freelancer in Singapore", suggested: {} },
    { path: "/freelancer-in/sydney", label: "Freelancer in Sydney", suggested: {} },
];

const empty = { title: "", description: "", keywords: "", og_image: "", noindex: false };

export default function AdminSEO() {
    const [token, setToken] = useState(() => localStorage.getItem("admin_token") || "");
    const [authed, setAuthed] = useState(false);
    const [loginToken, setLoginToken] = useState("");
    const [overrides, setOverrides] = useState({});
    const [selected, setSelected] = useState(PAGES[0].path);
    const [form, setForm] = useState(empty);
    const [saving, setSaving] = useState(false);
    const [q, setQ] = useState("");

    // Auto-login if token present
    useEffect(() => {
        if (!token) return;
        axios.post(`${API}/admin/login`, { token })
            .then(() => setAuthed(true))
            .catch(() => { localStorage.removeItem("admin_token"); setToken(""); });
    }, [token]);

    // Load overrides once authed
    useEffect(() => {
        if (!authed) return;
        axios.get(`${API}/seo/overrides`).then((r) => {
            const map = {};
            (r.data || []).forEach((o) => { if (o?.path) map[o.path] = o; });
            setOverrides(map);
        });
    }, [authed]);

    // Populate form when selection changes
    useEffect(() => {
        const o = overrides[selected] || {};
        setForm({ ...empty, ...o });
    }, [selected, overrides]);

    const doLogin = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API}/admin/login`, { token: loginToken });
            localStorage.setItem("admin_token", loginToken);
            setToken(loginToken); setAuthed(true);
            toast.success("Signed in.");
        } catch { toast.error("Invalid token."); }
    };

    const logout = () => {
        localStorage.removeItem("admin_token");
        setToken(""); setAuthed(false); setLoginToken("");
    };

    const save = async () => {
        setSaving(true);
        try {
            const payload = { path: selected, ...form };
            const r = await axios.post(`${API}/seo/overrides`, payload, { headers: { "X-Admin-Token": token } });
            setOverrides((m) => ({ ...m, [selected]: r.data }));
            invalidateOverrides();
            toast.success("Saved — refresh the page to see it live.");
        } catch { toast.error("Save failed. Check token."); }
        finally { setSaving(false); }
    };

    const clear = async () => {
        if (!window.confirm(`Clear SEO override for ${selected}?`)) return;
        try {
            await axios.delete(`${API}/seo/overrides`, { params: { path: selected }, headers: { "X-Admin-Token": token } });
            setOverrides((m) => { const c = { ...m }; delete c[selected]; return c; });
            setForm(empty); invalidateOverrides();
            toast.success("Cleared.");
        } catch { toast.error("Delete failed."); }
    };

    // Login screen
    if (!authed) {
        return (
            <section className="min-h-screen flex items-center justify-center px-6">
                <div className="w-full max-w-md frame rounded-2xl p-8 md:p-10">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-11 h-11 rounded-full border border-acid/30 bg-acid/10 flex items-center justify-center text-acid">
                            <Lock size={18} />
                        </div>
                        <div>
                            <p className="eyebrow">/ Private</p>
                            <h1 className="font-serif text-bone text-3xl mt-1">SEO Admin</h1>
                        </div>
                    </div>
                    <form onSubmit={doLogin} className="space-y-4">
                        <label>
                            <span className="field-label">Admin token</span>
                            <input
                                type="password" autoFocus data-testid="admin-token"
                                value={loginToken} onChange={(e) => setLoginToken(e.target.value)}
                                placeholder="Paste your admin token"
                                className="field-input"
                            />
                        </label>
                        <button type="submit" data-testid="admin-login" className="btn-acid w-full justify-center">
                            Sign in <Check size={14} strokeWidth={2.4} />
                        </button>
                    </form>
                </div>
            </section>
        );
    }

    const filtered = PAGES.filter((p) => p.path.toLowerCase().includes(q.toLowerCase()) || p.label.toLowerCase().includes(q.toLowerCase()));
    const active = PAGES.find((p) => p.path === selected) || PAGES[0];

    return (
        <section className="min-h-screen pt-28 pb-16 spotlight" data-testid="admin-seo">
            <div className="max-w-[1440px] mx-auto px-5 md:px-10">
                <header className="flex flex-wrap items-center justify-between gap-4 mb-10">
                    <div>
                        <p className="eyebrow">/ Private admin</p>
                        <h1 className="font-serif text-bone text-4xl md:text-5xl mt-2 leading-tight">SEO Manager</h1>
                        <p className="text-ash mt-2">Override title, description, keywords and OG image per page. Live on the site instantly.</p>
                    </div>
                    <button onClick={logout} className="btn-ghost !py-2.5 !px-4 !text-[12px]"><LogOut size={13} /> Sign out</button>
                </header>

                <div className="grid grid-cols-12 gap-6 md:gap-10">
                    {/* Pages list */}
                    <aside className="col-span-12 md:col-span-4 lg:col-span-3">
                        <div className="relative mb-4">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ash" />
                            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pages…" className="field-input !pl-9" />
                        </div>
                        <div className="frame rounded-2xl overflow-hidden">
                            {filtered.map((p) => {
                                const has = !!overrides[p.path];
                                const isActive = selected === p.path;
                                return (
                                    <button
                                        key={p.path}
                                        onClick={() => setSelected(p.path)}
                                        className={`w-full text-left px-4 py-3 flex items-center justify-between gap-2 border-b border-acid/10 last:border-0 transition-colors ${isActive ? "bg-acid/10 text-acid" : "hover:bg-acid/5 text-bone"}`}
                                    >
                                        <div className="min-w-0">
                                            <p className="font-serif text-base truncate">{p.label}</p>
                                            <p className="font-mono text-[10px] tracking-wider text-ash truncate">{p.path}</p>
                                        </div>
                                        {has && <span className="w-2 h-2 rounded-full bg-acid shrink-0" title="Override set" />}
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    {/* Editor */}
                    <div className="col-span-12 md:col-span-8 lg:col-span-9">
                        <div className="frame rounded-2xl p-6 md:p-8">
                            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-6">
                                <div>
                                    <p className="eyebrow">Editing</p>
                                    <p className="font-serif text-bone text-2xl md:text-3xl mt-1">{active.label}</p>
                                    <p className="font-mono text-xs text-ash mt-1">{active.path}</p>
                                </div>
                                <a href={active.path} target="_blank" rel="noreferrer" className="btn-ghost !py-2 !px-3 !text-[11px]">
                                    Preview <ExternalLink size={12} />
                                </a>
                            </div>

                            <div className="space-y-5">
                                <label className="block">
                                    <span className="field-label">Title <span className="text-ash">(≤ 60 chars ideal)</span> — {form.title?.length || 0}</span>
                                    <input data-testid="seo-title" value={form.title || ""} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="field-input" placeholder={active.suggested?.title || "e.g. Freelance Web Development in Gurgaon"} />
                                </label>
                                <label className="block">
                                    <span className="field-label">Meta description <span className="text-ash">(≤ 160 chars ideal)</span> — {form.description?.length || 0}</span>
                                    <textarea data-testid="seo-description" rows={3} value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="field-input resize-none" placeholder="A short, keyword-rich summary that appears in Google results." />
                                </label>
                                <label className="block">
                                    <span className="field-label">Keywords <span className="text-ash">(comma-separated)</span></span>
                                    <input data-testid="seo-keywords" value={form.keywords || ""} onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))} className="field-input" placeholder="freelance developer gurgaon, hire freelancer india, …" />
                                </label>
                                <label className="block">
                                    <span className="field-label">OpenGraph image URL <span className="text-ash">(1200×630)</span></span>
                                    <input data-testid="seo-og" value={form.og_image || ""} onChange={(e) => setForm((f) => ({ ...f, og_image: e.target.value }))} className="field-input" placeholder="https://…/og.jpg" />
                                </label>
                                <label className="flex items-center gap-3">
                                    <input type="checkbox" checked={!!form.noindex} onChange={(e) => setForm((f) => ({ ...f, noindex: e.target.checked }))} className="w-4 h-4 accent-[#D4AF37]" />
                                    <span className="text-ash text-sm">Set <code className="text-acid">noindex,nofollow</code> — hide this page from search engines</span>
                                </label>

                                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-acid/10">
                                    <button data-testid="seo-save" onClick={save} disabled={saving} className="btn-acid disabled:opacity-60">
                                        {saving ? "Saving…" : "Save & publish"} <Save size={13} strokeWidth={2.4} />
                                    </button>
                                    <button onClick={clear} className="btn-ghost">
                                        <Trash2 size={13} /> Reset to default
                                    </button>
                                    <p className="text-ash text-xs ml-auto">Changes go live immediately.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
