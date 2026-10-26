import Marquee from "react-fast-marquee";

const ITEMS = [
  "Web Development", "AI Automation", "SEO", "WordPress", "Custom Software",
  "WhatsApp Marketing", "Google Ads", "React", "Python", "Growth Engineering",
];

export default function SkillMarquee() {
  return (
    <div data-testid="skill-marquee" className="border-y border-line bg-white py-6 overflow-hidden">
      <Marquee speed={40} gradient={false} autoFill>
        {ITEMS.map((item, i) => (
          <div key={i} className="flex items-center gap-24 pr-24">
            <span className="font-heading font-bold text-2xl md:text-4xl tracking-tight text-ink/85 whitespace-nowrap">
              {item}
            </span>
            <span className="h-2 w-2 rounded-full bg-brand" />
          </div>
        ))}
      </Marquee>
    </div>
  );
}
