import Link from "@/components/CanonicalLink";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowUpRight, Globe } from "lucide-react";
import { SERVICES, waLink } from "@/data/site";
import { LANGS } from "@/data/i18n";

const NAV = [
  { label: "About", to: "/about" },
  { label: "Services", to: "/services" },
  { label: "Our work", to: "/work" },
  { label: "Case studies", to: "/case-studies" },
  { label: "Pricing", to: "/pricing" },
  { label: "Blog", to: "/blog" },
  { label: "Contact", to: "/contact" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <header
        data-testid="site-nav"
        className={`fixed top-0 inset-x-0 z-50 transition-[background-color,border-color,padding] duration-500 ${
          scrolled ? "bg-white/70 backdrop-blur-xl border-b border-black/5 py-3" : "bg-transparent py-5"
        }`}
      >
        <div className="mx-auto max-w-[1400px] px-5 md:px-10 flex items-center justify-between">
          <Link to="/" data-testid="nav-logo" aria-label="Rajeev Freelancer — home" className="group flex items-center gap-2.5">
            <img
              src="https://customer-assets-gfyr7b9c.emergentagent.net/job_rajeev-seo-hub/artifacts/whqtfhxo_image.png"
              alt="Rajeev Freelancer"
              className="h-10 w-10 rounded-full object-cover border border-line group-hover:border-brand transition-colors duration-300"
            />
            <span className="h-2 w-2 rounded-full bg-brand group-hover:bg-coral transition-colors duration-300" />
          </Link>

          <nav className="hidden md:flex items-center gap-9">
            {NAV.map((n) =>
              n.label === "Services" ? (
                <div key={n.to} className="relative group" data-testid="nav-services-dropdown">
                  <Link to={n.to} data-testid="nav-services" className="inline-flex items-center gap-1 text-sm font-medium link-underline text-ink/80 hover:text-ink">
                    Services <ArrowUpRight className="h-3.5 w-3.5 rotate-90 opacity-60" />
                  </Link>
                  <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-[opacity,visibility] duration-200">
                    <div className="w-[300px] rounded-2xl border border-line bg-white shadow-xl p-2">
                      {SERVICES.map((s) => (
                        <Link key={s.slug} to={`/${s.slug}`} data-testid={`nav-service-${s.slug}`} className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-paper group/item">
                          <span>
                            <span className="block text-sm font-semibold text-ink">{s.short}</span>
                            <span className="block text-xs text-ink/50 line-clamp-1">{s.tagline}</span>
                          </span>
                          <ArrowUpRight className="h-4 w-4 text-ink/30 group-hover/item:text-brand" />
                        </Link>
                      ))}
                      <Link to="/services" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-brand hover:bg-paper">All services →</Link>
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  key={n.to}
                  to={n.to}
                  data-testid={`nav-${n.label.toLowerCase()}`}
                  className="text-sm font-medium link-underline text-ink/80 hover:text-ink"
                >
                  {n.label}
                </Link>
              )
            )}
          </nav>

          <div className="flex items-center gap-3">
            <div className="relative group hidden sm:block" data-testid="nav-lang">
              <button className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-sm text-ink/70 hover:text-ink hover:border-ink transition-colors" aria-label="Language">
                <Globe className="h-4 w-4 text-brand" /> EN
              </button>
              <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-[opacity,visibility] duration-200">
                <div className="min-w-[160px] rounded-xl border border-line bg-white shadow-lg py-1.5">
                  <span className="block px-4 py-2 text-sm text-ink/40">English</span>
                  {Object.values(LANGS).map((l) => (
                    <Link key={l.code} to={`/${l.code}`} data-testid={`nav-lang-${l.code}`} className="block px-4 py-2 text-sm text-ink/80 hover:bg-paper hover:text-ink">{l.label}</Link>
                  ))}
                </div>
              </div>
            </div>
            <a
              href={waLink()}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="nav-cta-whatsapp"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-ink text-white text-sm font-medium pl-4 pr-3 py-2 hover:bg-brand transition-colors duration-300"
            >
              Get a free quote <ArrowUpRight className="h-4 w-4" />
            </a>
            <button
              onClick={() => setOpen((v) => !v)}
              data-testid="nav-menu-toggle"
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-line"
              aria-label="Menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-[60] md:hidden" data-testid="mobile-menu"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)} />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="absolute right-0 top-0 h-full w-[86vw] max-w-[380px] bg-white shadow-2xl flex flex-col rounded-l-3xl overflow-y-auto"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-line">
                <span className="flex items-center gap-2.5">
                  <img src="https://customer-assets-gfyr7b9c.emergentagent.net/job_rajeev-seo-hub/artifacts/whqtfhxo_image.png" alt="Rajeev Freelancer" className="h-9 w-9 rounded-full object-cover border border-line" />
                  <span className="font-heading font-bold tracking-tight">Rajeev Freelancer</span>
                </span>
                <button onClick={() => setOpen(false)} data-testid="mobile-menu-close" aria-label="Close menu"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line hover:border-ink transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex flex-col px-6 py-4">
                {NAV.map((n, i) => (
                  <motion.div key={n.to}
                    initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 + i * 0.05 }}>
                    <Link to={n.to} data-testid={`mobile-nav-${n.label.toLowerCase()}`}
                      className="flex items-center justify-between py-4 border-b border-line/60 font-heading text-2xl font-extrabold tracking-tight text-ink group">
                      {n.label}
                      <ArrowUpRight className="h-5 w-5 text-ink/30 group-hover:text-brand group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-[transform,color]" />
                    </Link>
                  </motion.div>
                ))}
              </nav>

              <div className="px-6 pb-4">
                <p className="mt-2 mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-ink/40">Services</p>
                <div className="grid grid-cols-2 gap-2">
                  {SERVICES.map((s) => (
                    <Link key={s.slug} to={`/${s.slug}`} data-testid={`mobile-service-${s.slug}`}
                      className="rounded-xl border border-line px-3 py-2.5 text-xs font-semibold text-ink/75 hover:border-ink hover:text-ink transition-colors">
                      {s.short}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-auto border-t border-line px-6 py-5 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {["EN", ...Object.values(LANGS).map((l) => l.label)].map((lab, idx) => (
                    idx === 0
                      ? <span key="en" className="rounded-full bg-brand/10 text-brand px-3 py-1.5 text-xs font-medium">EN</span>
                      : <Link key={Object.values(LANGS)[idx - 1].code} to={`/${Object.values(LANGS)[idx - 1].code}`} className="rounded-full border border-line px-3 py-1.5 text-xs text-ink/70 hover:border-ink">{lab}</Link>
                  ))}
                </div>
                <Link to="/contact" data-testid="mobile-cta-quote"
                  className="flex items-center justify-center gap-2 rounded-full bg-brand text-white py-3.5 font-semibold hover:bg-ink transition-colors">
                  Get a free quote <ArrowUpRight className="h-4 w-4" />
                </Link>
                <a href={waLink()} target="_blank" rel="noopener noreferrer" data-testid="mobile-cta-whatsapp"
                  className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] text-white py-3.5 font-semibold hover:opacity-90 transition-opacity">
                  Chat on WhatsApp
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
