# RajivFreelancer.com — PRD

## Original Problem Statement
Award-worthy portfolio site for Rajiv — 12+ years freelance engineer & marketer, ex-IOG/Accenture/Google. Bold editorial art direction (Awwwards-level), kinetic hero with masked line-by-line reveal, Lenis smooth scroll, framer-motion micro-interactions, numbered manifesto chapters, editorial marquee, parallax hero, contact form + WhatsApp + Calendly CTAs, MongoDB-backed leads, Resend email notifications.

## Architecture
- Frontend: React (JS/JSX) + Tailwind + Framer Motion + Lenis + react-fast-marquee + Sonner
- Backend: FastAPI + Motor (MongoDB) + Emergent Resend email proxy
- Fonts: Playfair Display (serif), JetBrains Mono, Manrope
- Accent: Electric Chartreuse #D4FF00 on Void Black #050505

## Implemented (Dec 2025)
- Kinetic Hero with masked reveal, parallax portrait + background
- Editorial marquee (react-fast-marquee, serif italic)
- 4-chapter numbered manifesto
- Services grid (Web / Software / Marketing / SEO)
- Bento portfolio grid with hover zoom + metric badges (from /api/content)
- Animated stats counter
- Vertical experience timeline (IOG → Accenture → Google → Independent)
- Testimonials grid
- Upwork + PeoplePerHour badges section
- Blog / field notes
- Contact form → POST /api/leads → Mongo + Resend email
- Footer with massive "RAJIV." signature
- Grain overlay, Lenis smooth scroll, glass nav

## API
- GET  /api/            → health
- GET  /api/content     → projects, testimonials, stats, experience
- POST /api/leads       → create lead + email notify
- GET  /api/leads       → list leads

## Backlog / Next
- P1: Real project screenshots + copy from Rajiv
- P1: Real WhatsApp number + Calendly URL
- P2: Blog post detail pages (MongoDB-backed CMS)
- P2: SEO — sitemap.xml, JSON-LD Person schema, OG image
- P2: Rate-limit /api/leads
