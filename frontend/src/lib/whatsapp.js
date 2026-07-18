// Central WhatsApp helper — used everywhere so CTAs open a prefilled chat.
export const WA_PHONE = "919711623561";
export const WA_DISPLAY = "+91 97116 23561";

export function waUrl(message = "Hi Rajeev, I'd like to talk about a project.") {
    return `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(message)}`;
}

// Prebuilt messages per intent
export const WA_MESSAGES = {
    general: "Hi Rajeev, I'd like to talk about a project.",
    hire: "Hi Rajeev, I'm looking to hire you for a project. Are you available for a quick chat?",
    quote: "Hi Rajeev, I'd like a quote for a project.",
    consultation: "Hi Rajeev, I'd like to book the free 30-minute consultation.",
    call: "Hi Rajeev, I'd like to book a call. What times work this week?",
    service: (title) => `Hi Rajeev, I'm interested in your ${title} services. Can we talk?`,
    caseStudy: (title) => `Hi Rajeev, I saw your case study on "${title}" and I'd like to talk about a similar project.`,
    blog: (title) => `Hi Rajeev, I read your post "${title}" and I'd like to talk.`,
    location: (city) => `Hi Rajeev, I'm based in ${city} and I'd like to talk about a project.`,
};
