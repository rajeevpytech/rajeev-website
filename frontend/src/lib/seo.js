// Central SEO constants
export const SITE = {
    name: "Rajeev Freelancer",
    domain: "https://rajeevfreelancer.com",
    tagline: "Design. Build. Market. Scale.",
    description:
        "Rajeev is a senior freelance engineer & digital marketer with 12+ years of experience shipping web apps, mobile apps, brand identity, and growth marketing for founders and Fortune 500 teams worldwide.",
    twitter: "@rajeevfreelancer",
    ogImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200&h=630",
    author: "Rajeev",
    keywords: [
        "freelance web developer",
        "freelance software engineer",
        "freelance digital marketer",
        "seo consultant",
        "hire freelancer india",
        "mern stack developer",
        "next.js freelancer",
        "growth marketing consultant",
        "freelance branding",
        "shopify developer",
        "freelance app developer",
        "senior freelance developer",
    ],
    contact: {
        email: "hello@rajeevfreelancer.com",
        phone: "+91-97116-23561",
        whatsapp: "+919711623561",
        city: "Bengaluru",
        country: "IN",
    },
};

// Assembles a full URL from a path
export const url = (path = "") => `${SITE.domain}${path.startsWith("/") ? path : "/" + path}`;
