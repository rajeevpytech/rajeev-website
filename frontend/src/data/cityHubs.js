// Dedicated local SEO hub pages per key city (like /delhi-ncr but tighter targeting).
// Area slugs match backend CITY_MAP (<locality>-india) so links hit real programmatic pages.

export const CITY_HUBS = {
  gurgaon: {
    slug: "gurgaon",
    name: "Gurgaon",
    display: "Gurgaon (Gurugram)",
    region: "Delhi NCR, Haryana",
    citySlug: "gurgaon-india",
    heroLead: "for Gurgaon businesses.",
    intro:
      "A senior freelance web & app developer, SEO expert and digital marketer based in Gurgaon — serving Cyber City, Udyog Vihar, Golf Course Road, Sohna Road, Manesar and all of Gurugram. Websites from ₹4,999 with same-day delivery, direct and senior-only.",
    areas: [
      { city: "Gurgaon", slug: "gurgaon-india" },
      { city: "Manesar", slug: "manesar-india" },
      { city: "Sohna", slug: "sohna-india" },
      { city: "Bhiwadi", slug: "bhiwadi-india" },
      { city: "Dwarka", slug: "dwarka-india" },
      { city: "Bahadurgarh", slug: "bahadurgarh-india" },
    ],
    faqs: [
      { q: "Who is the best freelance web developer in Gurgaon?", a: "Rajeev is a senior freelance engineer and consultant with 12+ years of experience (ex-IOG, Accenture, Google), based in Gurgaon. You work with him directly — no agency, no juniors — on websites, apps, SEO and marketing." },
      { q: "How much does a website cost in Gurgaon?", a: "Business websites start at ₹4,999 with same-day delivery. Mobile apps start at ₹9,999 and are usually ready within a week. Every project starts with a free consultation and a fixed-scope quote." },
      { q: "Do you offer SEO services in Gurgaon?", a: "Yes — technical SEO, local SEO and GEO (AI-search optimisation) so Gurgaon businesses rank on Google and get cited in AI answers. Plans from ₹6,999/month with results targeted in 90 days." },
      { q: "Can we meet in person in Gurgaon?", a: "Most work is delivered remotely with fast WhatsApp communication, but being based in Gurgaon, in-person or video meetings can be arranged for local clients when needed." },
    ],
    reviews: [
      { name: "Ankit Sharma", role: "D2C founder · Cyber City, Gurgaon", rating: 5, quote: "Rebuilt our website and ran Google Ads — leads doubled in a month. Fast and always reachable on WhatsApp." },
      { name: "Neha Gupta", role: "Boutique owner · Sohna Road", rating: 5, quote: "Ranked us for our locality in Gurgaon within a few months. Genuinely understands local SEO." },
      { name: "Vikram Singh", role: "Startup CTO · Udyog Vihar", rating: 5, quote: "Built our MVP app on time and the support since has been excellent. Senior-level work, fair pricing." },
    ],
  },
  noida: {
    slug: "noida",
    name: "Noida",
    display: "Noida & Greater Noida",
    region: "Delhi NCR, Uttar Pradesh",
    citySlug: "noida-india",
    heroLead: "for Noida businesses.",
    intro:
      "A senior freelance web & app developer, SEO expert and digital marketer serving Noida, Greater Noida, Ghaziabad and the wider NCR — covering Sector 18, Film City, Noida Extension and beyond. Websites from ₹4,999 with same-day delivery, direct and senior-only.",
    areas: [
      { city: "Noida", slug: "noida-india" },
      { city: "Greater Noida", slug: "greater-noida-india" },
      { city: "Ghaziabad", slug: "ghaziabad-india" },
      { city: "Mayur Vihar", slug: "mayur-vihar-india" },
      { city: "Meerut", slug: "meerut-india" },
      { city: "Faridabad", slug: "faridabad-india" },
    ],
    faqs: [
      { q: "Who is the best freelance web developer in Noida?", a: "Rajeev is a senior freelance engineer and consultant with 12+ years of experience (ex-IOG, Accenture, Google), serving Noida and Greater Noida directly — websites, apps, SEO and marketing with no agency middlemen." },
      { q: "How fast can you build a website in Noida?", a: "Business websites start at ₹4,999 with same-day delivery. Apps start at ₹9,999 and are usually ready within a week. Every project begins with a free consultation and a fixed-scope quote." },
      { q: "Do you do SEO for Noida businesses?", a: "Yes — technical, local and AI-search (GEO) SEO so Noida and Greater Noida businesses rank on Google and appear in AI answers. Plans from ₹6,999/month, results targeted in 90 days." },
      { q: "Can we meet locally in Noida?", a: "Work is mostly remote with fast WhatsApp communication, but video or in-person meetings for Noida, Greater Noida and Ghaziabad can be arranged when needed." },
    ],
    reviews: [
      { name: "Rohit Mehra", role: "Ecommerce founder · Sector 63, Noida", rating: 5, quote: "Our store speed and rankings jumped after Rajeev's SEO work. Clear reporting over WhatsApp every week." },
      { name: "Sana Khan", role: "Clinic owner · Greater Noida", rating: 5, quote: "Got us onto page one for our area in a few months. Professional and easy to work with." },
      { name: "Amit Yadav", role: "SaaS founder · Film City, Noida", rating: 5, quote: "Delivered our web app on schedule with production-grade quality. Highly recommend." },
    ],
  },
  delhi: {
    slug: "delhi",
    name: "Delhi",
    display: "Delhi",
    region: "Delhi NCR",
    citySlug: "delhi-india",
    heroLead: "for Delhi businesses.",
    intro:
      "A senior freelance web & app developer, SEO expert and digital marketer serving all of Delhi — from Dwarka, Rohini and Pitampura to Saket, Nehru Place, Lajpat Nagar and Karol Bagh. Websites from ₹4,999 with same-day delivery, direct and senior-only.",
    areas: [
      { city: "Dwarka", slug: "dwarka-india" },
      { city: "Rohini", slug: "rohini-india" },
      { city: "Saket", slug: "saket-india" },
      { city: "Nehru Place", slug: "nehru-place-india" },
      { city: "Janakpuri", slug: "janakpuri-india" },
      { city: "Pitampura", slug: "pitampura-india" },
      { city: "Lajpat Nagar", slug: "lajpat-nagar-india" },
      { city: "Karol Bagh", slug: "karol-bagh-india" },
      { city: "Okhla", slug: "okhla-india" },
    ],
    faqs: [
      { q: "Who is the best freelance web developer in Delhi?", a: "Rajeev is a senior freelance engineer and consultant with 12+ years of experience (ex-IOG, Accenture, Google), serving all of Delhi directly — websites, apps, SEO and marketing with no agency and no juniors." },
      { q: "How much does a website cost in Delhi?", a: "Business websites start at ₹4,999 with same-day delivery. Apps start at ₹9,999 and are usually ready within a week. Every project starts with a free consultation and a fixed-scope quote." },
      { q: "Do you provide SEO services in Delhi?", a: "Yes — technical SEO, local SEO and GEO (AI-search) so Delhi businesses rank on Google and get cited in AI answers. Plans from ₹6,999/month with results targeted in 90 days." },
      { q: "Which parts of Delhi do you cover?", a: "All of Delhi, including Dwarka, Rohini, Pitampura, Saket, Nehru Place, Lajpat Nagar, Karol Bagh, Okhla, Vasant Kunj and Rajouri Garden — plus the wider NCR." },
    ],
    reviews: [
      { name: "Deepak Aggarwal", role: "Retailer · Karol Bagh, Delhi", rating: 5, quote: "New website plus Google Ads brought a steady stream of enquiries. Rajeev is quick and reliable." },
      { name: "Meera Iyer", role: "Consultant · Saket, Delhi", rating: 5, quote: "Ranked my services for South Delhi searches within months. Really knows local SEO." },
      { name: "Arjun Kapoor", role: "Founder · Nehru Place, Delhi", rating: 5, quote: "Built a custom platform that loads in under a second. Senior engineering, fair pricing." },
    ],
  },
};

export const CITY_HUB_SLUGS = Object.keys(CITY_HUBS);
