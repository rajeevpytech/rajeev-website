// Central data-testid registry for the Rajeev Freelancer site
export const NAV = {
    root: "site-nav",
    home: "nav-home",
    work: "nav-work",
    about: "nav-about",
    services: "nav-services",
    experience: "nav-experience",
    contact: "nav-contact",
    hireCta: "nav-hire-cta",
    menuOpen: "nav-menu-open",
    menuClose: "nav-menu-close",
};

export const HERO = {
    root: "hero-section",
    hireCta: "hero-hire-cta",
    callCta: "hero-book-call-cta",
    whatsappCta: "hero-whatsapp-cta",
    scrollHint: "hero-scroll-hint",
};

export const MANIFESTO = {
    root: "manifesto-section",
    chapter: (n) => `manifesto-chapter-${n}`,
};

export const SERVICES = {
    root: "services-section",
    card: (slug) => `service-card-${slug}`,
    quoteCta: "services-quote-cta",
};

export const WORK = {
    root: "work-section",
    card: (slug) => `work-card-${slug}`,
    viewAll: "work-view-all",
};

export const EXPERIENCE = {
    root: "experience-section",
    item: (year) => `experience-item-${year}`,
};

export const STATS = {
    root: "stats-section",
    item: (label) => `stats-item-${label}`,
};

export const TESTIMONIALS = {
    root: "testimonials-section",
    card: (id) => `testimonial-${id}`,
};

export const BADGES = {
    root: "badges-section",
    upwork: "badge-upwork",
    pph: "badge-pph",
};

export const BLOG = {
    root: "blog-section",
    card: (slug) => `blog-card-${slug}`,
};

export const CONTACT = {
    root: "contact-section",
    form: "contact-form",
    name: "contact-name",
    email: "contact-email",
    projectType: "contact-project-type",
    budget: "contact-budget",
    message: "contact-message",
    submit: "contact-submit",
    whatsapp: "contact-whatsapp",
    calendly: "contact-calendly",
    success: "contact-success",
};

export const FOOTER = {
    root: "site-footer",
    linkedin: "footer-linkedin",
    github: "footer-github",
    twitter: "footer-twitter",
    email: "footer-email",
};
