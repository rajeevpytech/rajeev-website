import Marquee from "react-fast-marquee";

const SHOTS = [
  { src: "https://images.unsplash.com/photo-1783540108072-7e4e4007856e?crop=entropy&cs=srgb&fm=jpg&q=80&w=900", label: "Custom web apps" },
  { src: "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?crop=entropy&cs=srgb&fm=jpg&q=80&w=900", label: "SEO & analytics" },
  { src: "https://images.unsplash.com/photo-1758691737124-05c5bffe46f0?crop=entropy&cs=srgb&fm=jpg&q=80&w=900", label: "Consulting" },
  { src: "https://images.unsplash.com/photo-1637502875124-eb4a9843a2fa?crop=entropy&cs=srgb&fm=jpg&q=80&w=900", label: "Web design" },
  { src: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?crop=entropy&cs=srgb&fm=jpg&q=80&w=900", label: "Personal attention" },
  { src: "https://images.unsplash.com/photo-1608222351212-18fe0ec7b13b?crop=entropy&cs=srgb&fm=jpg&q=80&w=900", label: "Automation" },
];

export default function ImageMarquee() {
  return (
    <div data-testid="image-marquee" className="py-4 overflow-hidden">
      <Marquee speed={38} gradient={false} autoFill pauseOnHover>
        {SHOTS.map((s, i) => (
          <figure key={i} className="group relative mr-4 h-56 w-80 shrink-0 overflow-hidden rounded-2xl border border-line">
            <img src={s.src} alt={s.label} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <figcaption className="absolute bottom-3 left-3 rounded-full bg-white/85 backdrop-blur px-3 py-1 text-xs font-mono uppercase tracking-wide text-ink">
              {s.label}
            </figcaption>
          </figure>
        ))}
      </Marquee>
    </div>
  );
}
