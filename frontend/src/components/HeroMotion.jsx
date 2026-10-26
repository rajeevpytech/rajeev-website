import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Bot, Code2, Megaphone, Pause, Play } from "lucide-react";
import Link from "@/components/CanonicalLink";
import { portfolioProject } from "@/lib/portfolio";
import "./HeroMotion.css";

export default function HeroMotion({ project }) {
  const stage = useRef(null);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const item = project ? portfolioProject(project) : null;
  const detail = item ? `/work/${encodeURIComponent(item.slug)}` : "/work";
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "80px" });
    if (stage.current) observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);

  return <div ref={stage} className="rf-hero-motion" data-testid="hero-motion" data-paused={paused || !visible}>
    <div className="rf-studio-heading"><span className="rf-studio-dot" /> Ideas, connected.</div>
    <button type="button" className="rf-motion-toggle" onClick={() => setPaused(value => !value)} aria-label={paused ? "Play hero animation" : "Pause hero animation"} aria-pressed={paused}>
      {paused ? <Play size={12} aria-hidden="true" /> : <Pause size={12} aria-hidden="true" />}<span>{paused ? "Play motion" : "Pause motion"}</span>
    </button>
    <div className="rf-studio-art" aria-label="Websites, apps, AI workflows and digital marketing connected in one visual">
      <div className="rf-studio-glow" aria-hidden="true" />
      <svg className="rf-studio-connections" viewBox="0 0 600 520" fill="none" aria-hidden="true">
        <ellipse cx="300" cy="260" rx="255" ry="197" stroke="#b7cbea" strokeDasharray="4 9" />
        <path d="M85 355C30 230 94 113 240 87C420 52 588 166 552 329C535 417 384 456 283 414" stroke="#8baee5" strokeWidth="1.5" />
        <path className="rf-studio-signal" d="M85 355C30 230 94 113 240 87C420 52 588 166 552 329C535 417 384 456 283 414" stroke="#0055ff" strokeWidth="3" strokeLinecap="round" strokeDasharray="22 1100" />
        <circle cx="78" cy="183" r="5" fill="#0055ff" /><circle cx="504" cy="400" r="4" fill="#6b8ec5" />
        <path d="M135 100h14m-7-7v14M435 450h12m-6-6v12" stroke="#85a8d8" strokeWidth="1.5" />
      </svg>

      <div className="rf-studio-browser rf-studio-float">
        <div className="rf-browser-chrome"><span className="rf-window-dots"><i /><i /><i /></span><span>Websites & digital experiences</span><Code2 size={13} aria-hidden="true" /></div>
        <Link to={detail} data-rf-project={item?.slug} data-rf-link-kind="details" className="rf-browser-preview" aria-label={item ? `Explore ${item.title}` : "Explore website projects"}>
          {item?.preview_image ? <img src={item.preview_image} alt={item.preview_alt || `${item.title} website preview`} width="1440" height="900" fetchPriority="high" decoding="async" /> : <div className="rf-browser-placeholder"><Code2 size={34} aria-hidden="true" /><span>Your next digital experience.</span><i /><i /></div>}
        </Link>
        <div className="rf-browser-caption"><span>Designed around your business.</span><ArrowUpRight size={14} aria-hidden="true" /></div>
      </div>

      <div className="rf-studio-marketing rf-studio-float">
        <span className="rf-service-icon"><Megaphone size={19} aria-hidden="true" /></span>
        <div><p className="rf-studio-label">Digital marketing</p><p className="rf-studio-small">Be seen. Start conversations.</p></div>
        <div className="rf-marketing-tags"><span>SEO</span><span>SMO</span><span>Social media</span></div>
      </div>

      <div className="rf-studio-phone rf-studio-float" aria-hidden="true">
        <div className="rf-phone-camera" /><div className="rf-phone-screen"><span className="rf-phone-label">APPS</span><div className="rf-phone-symbol"><span /><span /><span /><span /></div><div className="rf-phone-line" /><div className="rf-phone-line rf-short-line" /><div className="rf-phone-tile"><i /><span /></div><div className="rf-phone-tile"><i /><span /></div><div className="rf-phone-button" /></div>
      </div>

      <div className="rf-studio-automation rf-studio-float">
        <span className="rf-service-icon rf-ai-icon"><Bot size={21} aria-hidden="true" /></span>
        <div><p className="rf-studio-label">AI workflows</p><p className="rf-studio-small">Connect. Route. Respond.</p></div>
        <div className="rf-flow-nodes" aria-hidden="true"><i /><span /><i /><span /><i /></div>
      </div>
      <span className="rf-studio-crm">CRM & connected software</span>
    </div>
    <div className="rf-studio-footer"><span>{item ? `Featured work · ${item.title}` : "Explore the work collection"}</span><Link to={detail} data-rf-project={item?.slug} data-rf-link-kind="details">View project <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
  </div>;
}
