// Rich, unique landing-page content per service (built for AdWords quality score + SEO).
// Shared process; unique intro / benefits / deliverables / outcomes / FAQs per service.

export const SERVICE_IMAGES = {
  "freelance-ai-consultant": "https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "freelance-digital-marketing-consultant": "https://images.pexels.com/photos/106344/pexels-photo-106344.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "freelance-seo-expert": "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
  "freelance-website-developer": "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
  "freelance-app-developer": "https://images.pexels.com/photos/4132538/pexels-photo-4132538.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "freelance-software-developer": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
  "whatsapp-marketing-freelancer": "https://images.pexels.com/photos/46924/pexels-photo-46924.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "sms-marketing-freelancer": "https://images.pexels.com/photos/9898392/pexels-photo-9898392.jpeg?auto=compress&cs=tinysrgb&w=1200",
};

// Sample testimonials — replace with your real client reviews anytime.
export const TESTIMONIALS = [
  { name: "Aarav Mehta", role: "Founder, D2C brand", rating: 5, text: "Rajeev tripled our organic traffic in five months. Clear communication, senior-level work, and actual revenue impact — not just reports." },
  { name: "Sophie Laurent", role: "Marketing Lead, SaaS", rating: 5, text: "The AI support assistant he built cut our first-response time by 80%. It only answers from our docs, so quality stayed high." },
  { name: "Omar Al-Farsi", role: "Owner, services company", rating: 5, text: "Fast, responsive and genuinely knowledgeable. Our WhatsApp leads convert far better since he automated the follow-ups." },
  { name: "Neha Kapoor", role: "Co-founder, e-commerce", rating: 5, text: "Our new site loads instantly and converts noticeably better. Rajeev clearly cares about results, not just looks." },
  { name: "James O'Connor", role: "Director, agency", rating: 5, text: "We bring Rajeev in for the hard technical SEO. He fixes what others can't and explains everything plainly." },
  { name: "Priya Nair", role: "CEO, local business", rating: 5, text: "Predictable, high-quality leads every week now. Working directly with a senior freelancer beat every agency we tried." },
];

// Shared process; unique intro / benefits / deliverables / outcomes / FAQs per service.

export const SERVICE_PROCESS = [
  { step: "01", title: "Discovery call", text: "A quick, no-pressure call to understand your goals, market and constraints." },
  { step: "02", title: "Clear proposal", text: "A fixed-scope plan with timelines, deliverables and transparent pricing." },
  { step: "03", title: "Build & iterate", text: "Senior-only execution with regular WhatsApp updates — no juniors, no hand-offs." },
  { step: "04", title: "Launch & grow", text: "We ship, measure real results, and keep optimising what moves the needle." },
];

export const SERVICE_CONTENT = {
  "freelance-ai-consultant": {
    hero: "Put AI to work in your business — without the hype.",
    sub: "I design and ship practical AI: chatbots, agents and automations that qualify leads, answer customers and remove hours of repetitive work every week.",
    benefits: [
      { title: "Real ROI, not experiments", text: "Automations aimed at revenue and saved hours — measured, not theoretical." },
      { title: "Grounded & safe", text: "Assistants answer from your own data, with a human in the loop where it matters." },
      { title: "Built to scale", text: "Clean, maintainable integrations that grow with you — no throwaway prototypes." },
    ],
    deliverables: ["Lead-qualification & support chatbots", "Custom AI agents & workflow automation", "RAG assistants grounded in your docs", "Integrations with your CRM, WhatsApp & tools"],
    outcomes: ["Hours saved every week", "Faster response to every enquiry", "Lower cost per lead handled"],
    faqs: [
      { q: "Which AI models do you use?", a: "Whatever fits the job and budget — OpenAI, Gemini or Claude — chosen for accuracy, speed and cost, not hype." },
      { q: "Will the AI make things up?", a: "I ground assistants in your own content and keep a human in the loop for anything customer-facing, so answers stay accurate." },
      { q: "Can you integrate with my existing tools?", a: "Yes — CRMs, WhatsApp, email, spreadsheets and custom APIs are all fair game." },
      { q: "How fast can we launch?", a: "A focused first automation is usually live within one to two weeks." },
    ],
  },
  "freelance-digital-marketing-consultant": {
    hero: "Marketing engineered around revenue, not vanity metrics.",
    sub: "Paid, organic and lifecycle growth that ties every rupee or dollar back to leads and sales — run by one senior consultant, accountable to you.",
    benefits: [
      { title: "Revenue-first strategy", text: "Channels and campaigns chosen by what actually drives sales for your business." },
      { title: "One senior owner", text: "The person who plans it runs it — no junior account handlers." },
      { title: "Full-funnel thinking", text: "Ads, SEO, content and lifecycle working together, not in silos." },
    ],
    deliverables: ["Google & Meta Ads that convert", "SEO & content strategy", "Landing pages built to sell", "Analytics, tracking & reporting you can trust"],
    outcomes: ["Lower cost per acquisition", "More qualified leads", "Clear attribution on spend"],
    faqs: [
      { q: "Do you manage ad spend directly?", a: "Yes — I build, run and optimise campaigns, and report on exactly what each channel returns." },
      { q: "What's the minimum budget that makes sense?", a: "It varies by market, but I'll tell you honestly if a budget is too small to work before we start." },
      { q: "Do you handle both paid and organic?", a: "Yes — the best results come from paid and organic reinforcing each other." },
      { q: "How do you report results?", a: "Simple, honest dashboards tied to leads and revenue — not screenshots of impressions." },
    ],
  },
  "freelance-seo-expert": {
    hero: "Rank on Google — and get cited by AI.",
    sub: "Technical + content SEO that compounds into durable rankings, plus GEO so ChatGPT, Gemini and Google's AI Overviews recommend you by name.",
    benefits: [
      { title: "Technical foundation", text: "Core Web Vitals, crawlability and schema fixed first, so everything else works." },
      { title: "Content that ranks", text: "Genuinely useful pages targeting the high-intent searches your buyers make." },
      { title: "SEO + GEO", text: "Structured, entity-rich content that wins classic search and AI answers alike." },
    ],
    deliverables: ["Full technical SEO audit & fixes", "Keyword & content strategy", "On-page & schema optimisation", "Local & location-page SEO"],
    outcomes: ["Higher rankings that hold", "More organic, high-intent traffic", "Visibility inside AI answers"],
    faqs: [
      { q: "How long until I see results?", a: "Technical wins can show in weeks; content-driven rankings typically compound over three to six months." },
      { q: "Do you guarantee #1 rankings?", a: "Nobody credible guarantees positions. I guarantee sound, white-hat work that reliably improves visibility." },
      { q: "What is GEO?", a: "Generative Engine Optimization — making your content easy for AI models to quote confidently, the new layer on top of SEO." },
      { q: "Do you do local SEO?", a: "Yes — Google Business Profile, local pages and structured data for businesses serving specific areas." },
    ],
  },
  "freelance-website-developer": {
    hero: "Websites built for speed, ranking and conversion.",
    sub: "WordPress or custom web apps that load fast, look sharp and turn visitors into enquiries — engineered, not just designed.",
    benefits: [
      { title: "Fast by default", text: "Optimised for Core Web Vitals so you rank better and convert more on mobile." },
      { title: "Conversion-first", text: "Every page has a clear job and an obvious next step for the visitor." },
      { title: "Built to last", text: "Clean, maintainable code you actually own — no messy page-builder debt." },
    ],
    deliverables: ["WordPress & headless builds", "Custom React / Next.js web apps", "Landing pages for ad campaigns", "Speed, SEO & accessibility optimisation"],
    outcomes: ["Faster load times", "Higher conversion rates", "A site that ranks and scales"],
    faqs: [
      { q: "WordPress or custom?", a: "Whatever suits your needs — WordPress for content-led sites, custom React/Next.js when you need more." },
      { q: "Will it be fast on mobile?", a: "Yes — mobile performance and Core Web Vitals are part of every build, not an afterthought." },
      { q: "Can you redesign my existing site?", a: "Absolutely — I can rebuild or improve what you have without losing your SEO." },
      { q: "Do you handle hosting?", a: "I'll set up fast, reliable hosting and hand over full ownership and documentation." },
    ],
  },
  "freelance-app-developer": {
    hero: "Mobile apps your customers actually want to use.",
    sub: "iOS, Android and cross-platform apps — designed, built and shipped by a senior engineer, from idea to the app stores.",
    benefits: [
      { title: "One codebase, both stores", text: "Cross-platform builds (React Native/Flutter) that reach iOS and Android faster and cheaper." },
      { title: "Fast & polished", text: "Smooth, native-feeling apps with the performance and UX users expect." },
      { title: "Shipped, not stuck", text: "From prototype to App Store and Play Store — including submission and review." },
    ],
    deliverables: ["iOS & Android apps", "Cross-platform (React Native / Flutter)", "Backend, APIs & push notifications", "App Store & Play Store submission"],
    outcomes: ["Faster time to launch", "Lower build cost across platforms", "Higher app-store ratings"],
    faqs: [
      { q: "Native or cross-platform?", a: "Usually cross-platform (React Native/Flutter) for speed and cost, and fully native when a project truly needs it." },
      { q: "Do you handle App Store submission?", a: "Yes — I take care of builds, store listings and the review process for both Apple and Google." },
      { q: "Can you build the backend too?", a: "Yes — APIs, authentication, push notifications and integrations are all part of what I deliver." },
      { q: "Can you continue an existing app?", a: "Absolutely — I regularly take over, fix and extend existing mobile apps." },
    ],
  },
  "freelance-software-developer": {
    hero: "Custom software that fits your business exactly.",
    sub: "Production-grade applications, internal tools and integrations — engineered by a senior developer who has shipped at scale.",
    benefits: [
      { title: "Senior engineering", text: "12+ years shipping real software — architecture, not just features." },
      { title: "Right-sized solutions", text: "The minimum complexity needed to solve your problem well, no over-engineering." },
      { title: "Yours to own", text: "Clean, documented code and full handover — never locked to a vendor." },
    ],
    deliverables: ["Web & internal business apps", "APIs & third-party integrations", "Automation & data pipelines", "Cloud deployment & maintenance"],
    outcomes: ["Processes that run themselves", "Fewer manual errors", "Software that scales with you"],
    faqs: [
      { q: "What stack do you work in?", a: "Primarily modern JavaScript/TypeScript, React and Python — chosen to fit the problem." },
      { q: "Can you take over an existing codebase?", a: "Yes — I regularly pick up, fix and extend existing projects." },
      { q: "Do you sign NDAs?", a: "Of course. Your idea and data are treated as strictly confidential." },
      { q: "Will I own the code?", a: "Fully — you get the source, documentation and a clean handover." },
    ],
  },
  "whatsapp-marketing-freelancer": {
    hero: "Turn WhatsApp into your fastest sales channel.",
    sub: "Campaigns, auto-replies, chatbots and lead nurturing that reply in seconds and win more projects while you sleep.",
    benefits: [
      { title: "Instant responses", text: "Auto-acknowledge every enquiry so no lead ever goes cold." },
      { title: "Automated nurturing", text: "Flows that qualify, follow up and book calls without manual effort." },
      { title: "Personal at scale", text: "Feels one-to-one, runs like a system — with a human where it counts." },
    ],
    deliverables: ["WhatsApp Business API setup", "Chatbots & automated flows", "Broadcast & drip campaigns", "CRM & lead-capture integration"],
    outcomes: ["Faster first response", "Higher reply & close rates", "More projects from the same leads"],
    faqs: [
      { q: "Do you use the official WhatsApp API?", a: "Yes — compliant, reliable setups using the official Business API, not grey-market tools." },
      { q: "Can it qualify leads automatically?", a: "Yes — flows can ask the right questions and route hot leads straight to you." },
      { q: "Will messages feel robotic?", a: "No — I write natural, on-brand copy and keep a human in the loop for real conversations." },
      { q: "Can you integrate my CRM?", a: "Yes — leads and conversations can sync straight into your CRM or spreadsheet." },
    ],
  },
  "sms-marketing-freelancer": {
    hero: "SMS campaigns that actually get read and clicked.",
    sub: "Bulk SMS, OTP flows and automated journeys with the deliverability and timing that turn texts into sales.",
    benefits: [
      { title: "High open rates", text: "SMS is opened in minutes — used well, it's one of the highest-ROI channels." },
      { title: "Automated journeys", text: "Triggered messages for onboarding, reminders, offers and re-engagement." },
      { title: "Reliable delivery", text: "Proper sender setup and compliance so your messages actually land." },
    ],
    deliverables: ["Bulk SMS campaign setup", "OTP & transactional flows", "Automated drip journeys", "Analytics & deliverability tuning"],
    outcomes: ["More opens and clicks", "Fewer no-shows and drop-offs", "Repeat sales from existing customers"],
    faqs: [
      { q: "Is bulk SMS compliant?", a: "Yes — I set up compliant sender IDs, opt-ins and unsubscribe handling for your region." },
      { q: "Can you do OTP / transactional SMS?", a: "Yes — reliable, low-latency flows for verification and order updates." },
      { q: "Which providers do you use?", a: "The best fit for your country and volume — I'll recommend based on deliverability and cost." },
      { q: "Can SMS work with my other channels?", a: "Yes — SMS pairs powerfully with WhatsApp and email in a single journey." },
    ],
  },
};
