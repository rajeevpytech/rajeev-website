import { getSiteConfig } from "@/lib/siteConfig";
// Site-wide constants. Services kept in sync with backend/data.py
export const CONTACT = {
  get whatsapp() { return getSiteConfig().contact.whatsapp; },
  get whatsappDisplay() { return getSiteConfig().contact.whatsapp_display; },
  get email() { return getSiteConfig().contact.email; },
  get phone() { return getSiteConfig().contact.phone; },
  get name() { return getSiteConfig().contact.name; },
};

export const waLink = (text) =>
  `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(text || "Hi Rajeev, I'd like to discuss a project. Are you available for a quick chat?")}`;

// Google Business Profile (share link -> "Rajeev Freelancer - Website and App Development")
export const GOOGLE_PROFILE = "https://share.google/ddhGdf8R7JkjaWji3";
export function googleProfileUrl() {
  const value = String(getSiteConfig().business.google_profile_url || GOOGLE_PROFILE);
  try { const u = new URL(value); return u.protocol === "https:" && (u.hostname === "share.google" || /(^|\.)google\.[a-z.]+$/.test(u.hostname) || u.hostname === "g.page" || u.hostname === "maps.app.goo.gl") ? value : GOOGLE_PROFILE; }
  catch { return GOOGLE_PROFILE; }
}

export const SERVICES = [
  { slug: "freelance-ai-consultant", name: "Freelance AI Consultant", short: "AI Consulting", tagline: "AI automation, bots, agents & workflow integrations", icon: "Bot" },
  { slug: "freelance-digital-marketing-consultant", name: "Freelance Digital Marketing Consultant", short: "Digital Marketing", tagline: "Paid, organic & lifecycle growth engineered around revenue", icon: "TrendingUp" },
  { slug: "freelance-seo-expert", name: "Freelance SEO Expert", short: "SEO Consulting", tagline: "Technical + content SEO that compounds into rankings", icon: "Search" },
  { slug: "freelance-website-developer", name: "Freelance Website Developer", short: "Website Development", tagline: "WordPress & custom web apps built for speed and conversion", icon: "Code" },
  { slug: "freelance-app-developer", name: "Freelance App Developer", short: "App Development", tagline: "iOS, Android & cross-platform mobile apps built to scale", icon: "Smartphone" },
  { slug: "freelance-software-developer", name: "Freelance Software Developer", short: "Software Development", tagline: "Custom applications & production-grade software engineering", icon: "Terminal" },
  { slug: "whatsapp-marketing-freelancer", name: "WhatsApp Marketing Freelancer", short: "WhatsApp Marketing", tagline: "Campaigns, auto-replies, chatbots & lead nurturing", icon: "MessageCircle" },
  { slug: "sms-marketing-freelancer", name: "SMS Marketing Freelancer", short: "SMS Marketing", tagline: "Bulk SMS campaigns, OTP flows & automated journeys", icon: "Smartphone" },
];

// Delhi NCR focus areas (loc_slug matches backend CITY_MAP: <city>-india). Used by the
// dedicated /delhi-ncr local SEO hub for strong internal linking to every NCR location page.
export const NCR_AREAS = [
  { city: "Delhi", slug: "delhi-india" },
  { city: "Gurgaon", slug: "gurgaon-india" },
  { city: "Noida", slug: "noida-india" },
  { city: "Greater Noida", slug: "greater-noida-india" },
  { city: "Faridabad", slug: "faridabad-india" },
  { city: "Ghaziabad", slug: "ghaziabad-india" },
  { city: "Dwarka", slug: "dwarka-india" },
  { city: "Rohini", slug: "rohini-india" },
  { city: "Saket", slug: "saket-india" },
  { city: "Nehru Place", slug: "nehru-place-india" },
  { city: "Janakpuri", slug: "janakpuri-india" },
  { city: "Pitampura", slug: "pitampura-india" },
  { city: "Lajpat Nagar", slug: "lajpat-nagar-india" },
  { city: "Karol Bagh", slug: "karol-bagh-india" },
  { city: "Okhla", slug: "okhla-india" },
  { city: "Vasant Kunj", slug: "vasant-kunj-india" },
  { city: "Rajouri Garden", slug: "rajouri-garden-india" },
  { city: "Mayur Vihar", slug: "mayur-vihar-india" },
  { city: "Netaji Subhash Place", slug: "netaji-subhash-place-india" },
  { city: "Manesar", slug: "manesar-india" },
  { city: "Sohna", slug: "sohna-india" },
  { city: "Bahadurgarh", slug: "bahadurgarh-india" },
  { city: "Sonipat", slug: "sonipat-india" },
  { city: "Bhiwadi", slug: "bhiwadi-india" },
  { city: "Palwal", slug: "palwal-india" },
  { city: "Meerut", slug: "meerut-india" },
];

// Marketing launch offers — punchy price + delivery highlights that drive enquiries.
// Prices are localized: INR inside India, USD everywhere else.
export const OFFERS = [
  { icon: "Code", title: "Business Website", slug: "freelance-website-developer", inr: "4,999", usd: "99", unit: "", delivery: "Same-day delivery", tag: "Launch today" },
  { icon: "Smartphone", title: "Mobile App", slug: "freelance-app-developer", inr: "9,999", usd: "399", unit: "", delivery: "Ready in 1 week", tag: "iOS & Android" },
  { icon: "Search", title: "SEO That Ranks", slug: "freelance-seo-expert", inr: "6,999", usd: "129", unit: "/mo", delivery: "Results in 90 days", tag: "Google + AI search" },
  { icon: "Bot", title: "AI Chatbot", slug: "freelance-ai-consultant", inr: "7,999", usd: "149", unit: "", delivery: "Live in 3 days", tag: "24/7 auto-replies" },
  { icon: "MessageCircle", title: "WhatsApp Marketing", slug: "whatsapp-marketing-freelancer", inr: "2,999", usd: "59", unit: "", delivery: "Go live in 24 hrs", tag: "Bulk + automation" },
  { icon: "TrendingUp", title: "Google Ads", slug: "freelance-digital-marketing-consultant", inr: "9,999", usd: "199", unit: "/mo", delivery: "Leads from week 1", tag: "Fully managed" },
];

// Returns { sym, amt, unit } for an offer based on visitor region.
export function offerPrice(o, inIndia) {
  return inIndia
    ? { sym: "₹", amt: o.inr, unit: o.unit }
    : { sym: "$", amt: o.usd, unit: o.unit };
}

// Optional auto-turn-off date for offers (YYYY-MM-DD or full ISO). Returns ms timestamp or null.
export function offerEndTs(marketing) {
  const d = (marketing?.offers_end_date || "").trim();
  if (!d) return null;
  const iso = d.length <= 10 ? `${d}T23:59:59` : d;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

// True once the scheduled end date has passed.
export function offerEnded(marketing) {
  const e = offerEndTs(marketing);
  return e != null && Date.now() >= e;
}

export const FEATURED_CITIES = [
  { city: "Delhi", loc_slug: "delhi-india", country: "India" },
  { city: "Dubai", loc_slug: "dubai-uae", country: "UAE" },
  { city: "London", loc_slug: "london-uk", country: "UK" },
  { city: "New York", loc_slug: "new-york-usa", country: "USA" },
  { city: "Singapore", loc_slug: "singapore-singapore", country: "Singapore" },
  { city: "Sydney", loc_slug: "sydney-australia", country: "Australia" },
  { city: "Toronto", loc_slug: "toronto-canada", country: "Canada" },
  { city: "Bangalore", loc_slug: "bangalore-india", country: "India" },
];

export const STATS = [
  { value: 12, suffix: "+", label: "Years in production" },
  { value: 180, suffix: "+", label: "Projects delivered" },
  { value: 27, suffix: "", label: "Countries served" },
  { value: 4.9, suffix: "/5", label: "Client rating", decimals: 1 },
];

// Currency-aware budget presets (localized by visitor / page location)
export const CURRENCIES = {
  USD: { symbol: "$", budgets: ["$1k – $3k", "$3k – $10k", "$10k – $25k", "$25k+"] },
  INR: { symbol: "₹", budgets: ["₹25K – ₹1L", "₹1L – ₹3L", "₹3L – ₹8L", "₹8L+"] },
  GBP: { symbol: "£", budgets: ["£800 – £2.5k", "£2.5k – £8k", "£8k – £20k", "£20k+"] },
  EUR: { symbol: "€", budgets: ["€1k – €3k", "€3k – €9k", "€9k – €22k", "€22k+"] },
  AED: { symbol: "AED", budgets: ["AED 4k – 12k", "AED 12k – 40k", "AED 40k – 90k", "AED 90k+"] },
  SGD: { symbol: "S$", budgets: ["S$1.5k – 4k", "S$4k – 13k", "S$13k – 32k", "S$32k+"] },
  AUD: { symbol: "A$", budgets: ["A$1.5k – 4k", "A$4k – 15k", "A$15k – 35k", "A$35k+"] },
  CAD: { symbol: "C$", budgets: ["C$1.5k – 4k", "C$4k – 13k", "C$13k – 32k", "C$32k+"] },
};

// Map our country slug -> currency (for location pages)
export const COUNTRY_CURRENCY = {
  india: "INR", usa: "USD", uk: "GBP", canada: "CAD", australia: "AUD", uae: "AED",
  singapore: "SGD", germany: "EUR", france: "EUR", netherlands: "EUR", spain: "EUR",
  italy: "EUR", ireland: "EUR", portugal: "EUR", belgium: "EUR", "new-zealand": "AUD",
};

// ISO2 country code -> currency (for IP geo detection)
export const ISO_CURRENCY = {
  IN: "INR", US: "USD", GB: "GBP", CA: "CAD", AU: "AUD", AE: "AED", SG: "SGD", NZ: "AUD",
  DE: "EUR", FR: "EUR", NL: "EUR", ES: "EUR", IT: "EUR", IE: "EUR", PT: "EUR", BE: "EUR",
  AT: "EUR", FI: "EUR", GR: "EUR", LU: "EUR",
};

export function visibleStats() {
  const biz = getSiteConfig().business;
  return STATS.filter(s => s.label !== "Client rating" || biz.reviews_verified === true).map(s => s.label === "Client rating" ? { ...s, value: Number(biz.rating) || s.value } : s);
}
