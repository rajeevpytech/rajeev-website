export const WORK_TITLE = "Website Portfolio & Project Work | Rajeev Freelancer";
export const WORK_DESCRIPTION = "Explore websites, applications, SEO and automation projects delivered by Rajeev and PyTech Digital. View live work and discuss a similar project.";

export function projectLabel(value = "") {
  const known = { seo: "SEO", crm: "CRM", saas: "SaaS", "ai-automation": "AI Automation", "google-ads": "Google Ads", "social-media": "Social Media", "ecommerce": "Ecommerce" };
  return known[value] || String(value).replace(/^freelance-/, "").replace(/-/g, " ").replace(/\b\w/g, char => char.toUpperCase());
}

export function externalWebsite(value) {
  if (typeof value !== "string" || !value.trim() || /[\r\n\0\\]/.test(value)) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function previewWebsite(value) {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !/[\r\n\0\\]/.test(value)) return value;
  return externalWebsite(value);
}

export const safeProjectUrl = externalWebsite;
export function projectImage(project = {}) {
  return previewWebsite(project.screenshot?.url || project.preview_image || project.screenshot_url || project.image_url || project.image);
}

export function readableHost(value) {
  try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return "Project preview"; }
}
function text(value) { return typeof value === "string" ? value.trim() : ""; }
export function portfolioProject(value = {}) {
  const industry = typeof value.industry === "object" && value.industry !== null ? value.industry : {};
  const category = typeof value.category === "object" && value.category !== null ? value.category : {};
  return {
    ...value,
    slug: text(value.slug),
    title: text(value.title) || text(value.name) || "Project",
    summary: text(value.summary) || text(value.description),
    category_name: text(industry.name) || text(value.category_name) || text(category.name) || text(value.industry) || text(value.category) || "Business",
    category_slug: text(industry.slug) || text(value.category_slug) || text(category.slug) || (typeof value.category === "string" ? value.category.toLowerCase().replace(/\s+/g, "-") : ""),
    live_url: externalWebsite(value.live_url || value.url || value.website_url),
    preview_image: projectImage(value),
    preview_alt: text(value.screenshot?.alt) || text(value.preview_alt) || text(value.image_alt) || `${text(value.title) || text(value.name) || "Project"} preview`,
    source_url: externalWebsite(value.source_url),
    services: (Array.isArray(value.services) ? value.services : []).map(service => typeof service === "string" ? { name: service.replace(/-/g, " "), slug: service } : service).filter(service => text(service?.name)),
    gallery: (Array.isArray(value.gallery) ? value.gallery : []).map(image => ({url: previewWebsite(image?.url), alt: text(image?.alt) || `${text(value.title) || "Project"} screenshot`, caption: text(image?.caption)})).filter(image => image.url),
  };
}

export function storyItems(value) {
  const items = Array.isArray(value) ? value : value ? [value] : [];
  return items.map(item => typeof item === "string"
    ? { title: "", text: item }
    : { title: text(item?.title || item?.heading || item?.name), text: text(item?.text || item?.description || item?.detail) })
    .filter(item => item.title || item.text);
}
export function workPagination(value = {}, itemCount = 0) {
  const page = Math.max(1, Number(value.page) || 1);
  const pageSize = Math.max(1, Number(value.page_size || value.pageSize) || 12);
  const total = Math.max(0, Number(value.total ?? value.total_items ?? value.total_projects ?? itemCount) || 0);
  return { page, pageSize, total, pages: Math.max(1, Number(value.total_pages || value.pages) || Math.ceil(total / pageSize)) };
}
