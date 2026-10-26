// Pure, local project-planning helpers. No API, storage, pricing or ranking calls.
export const SERVICE_OPTIONS = [
  { id: 'web', label: 'Website', detail: 'Business site, store or landing page' },
  { id: 'app', label: 'Mobile app', detail: 'Android, iOS or a cross-platform app' },
  { id: 'software', label: 'Business software', detail: 'CRM, portal or an internal workflow' },
  { id: 'ai', label: 'AI automation', detail: 'Approved answers and repeatable tasks' },
  { id: 'seo', label: 'SEO & discovery', detail: 'Technical checks and useful content' },
];
export const FEATURE_OPTIONS = [
  { id: 'forms', label: 'Enquiry forms' }, { id: 'payments', label: 'Payments / checkout' },
  { id: 'booking', label: 'Bookings' }, { id: 'accounts', label: 'Sign-in & accounts' },
  { id: 'admin', label: 'Admin / CMS' }, { id: 'multilingual', label: 'Multiple languages' },
  { id: 'uploads', label: 'File uploads' }, { id: 'search', label: 'Search & filters' },
  { id: 'notifications', label: 'Email / messaging' }, { id: 'analytics', label: 'Analytics' },
  { id: 'migration', label: 'Existing data migration' }, { id: 'offline', label: 'Offline use' },
];
export const REVIEW_OPTIONS = [
  { id: 'accessibility', label: 'Keyboard, labels & screen-reader checks' },
  { id: 'privacy', label: 'Privacy, consent & retention review' },
  { id: 'security', label: 'Permissions & security review' },
  { id: 'performance', label: 'Mobile layout & performance checks' },
  { id: 'backup', label: 'Backup & restore planning' },
  { id: 'translation', label: 'Language & translation review' },
];
export const CONTENT_OPTIONS = [
  ['client', 'I will supply the content'], ['team', 'Please scope content preparation'],
  ['shared', 'We will share responsibility'], ['decide', 'To decide during discovery'],
];
const FEATURE_CHECKS = {
  forms: 'Test valid and invalid form submissions, confirmation states, consent and delivery to the agreed team.',
  payments: 'Test the agreed provider in a sandbox: successful, failed and cancelled payments, receipts and refund responsibilities.',
  booking: 'Test availability, time zones, confirmations, rescheduling and cancellation rules.',
  accounts: 'Test sign-in, account recovery and permissions for every agreed user role.',
  admin: 'Test content editing, publishing permissions and preservation of existing page URLs and metadata.',
  multilingual: 'Review translations, fonts, language switching and the URLs for genuine translated versions.',
  uploads: 'Test file types, size limits, access permissions and clear upload failure states.',
  search: 'Test search, filters, pagination, empty results and the ability to clear a filter.',
  notifications: 'Test recipient mapping, consent, opt-outs, failed delivery and human follow-up responsibilities.',
  analytics: 'Agree the conversion events and consent approach, then verify the events using test activity.',
  migration: 'Approve sample data mapping, backups, validation and rollback before migrating existing records.',
  offline: 'Test offline access, local data handling, reconnection and conflicting changes on representative devices.',
};
const SERVICE_CHECKS = {
  web: 'Check the agreed pages, navigation and enquiry journey on mobile, tablet and desktop.',
  app: 'Review device permissions, supported devices, store-account ownership and the release process.',
  software: 'Test the agreed workflows, role permissions, reporting and validation with representative test data.',
  ai: 'Test approved source material, unknown questions, incorrect answers, usage limits and human escalation.',
  seo: 'Compare existing and launch URLs, titles, descriptions, canonicals, redirects and sitemap eligibility.',
};
const REVIEW_CHECKS = {
  accessibility: 'Agree an accessibility target and review keyboard access, visible focus, labels, contrast and error messages.',
  privacy: 'Agree data collection, consent, retention and provider access; have the appropriate adviser review final notices.',
  security: 'Review account permissions, sensitive data handling, session controls and the agreed security checks.',
  performance: 'Review mobile layouts and agreed loading-performance targets using representative pages and devices.',
  backup: 'Agree backup ownership, retention, restore steps and a recovery test.',
  translation: 'Assign a reviewer for each language and approve terminology, spelling and right-to-left layouts where needed.',
};

export function emptyBrief() {
  return { projectName: '', services: [], goal: '', currentUrl: '', audience: '', countries: '', languages: '',
    pages: '', features: [], customFeatures: '', roles: '', integrationPlan: '', integrations: '',
    contentOwner: '', timeline: '', budget: '', reviewChecks: [], notes: '' };
}
export function cleanText(value, maximum = 4000) {
  return String(value ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, maximum).trim();
}
function selection(value, options) {
  const chosen = new Set(Array.isArray(value) ? value : []);
  return options.filter(option => chosen.has(option.id)).map(option => option.id);
}
export function normalizeBrief(value = {}) {
  const result = emptyBrief();
  for (const key of Object.keys(result)) if (!Array.isArray(result[key])) result[key] = cleanText(value[key]);
  result.services = selection(value.services, SERVICE_OPTIONS);
  result.features = selection(value.features, FEATURE_OPTIONS);
  result.reviewChecks = selection(value.reviewChecks, REVIEW_OPTIONS);
  if (!['', 'none', 'list', 'decide'].includes(result.integrationPlan)) result.integrationPlan = '';
  if (!CONTENT_OPTIONS.some(([id]) => id === result.contentOwner)) result.contentOwner = '';
  return result;
}
export function validateBrief(value) {
  const data = normalizeBrief(value), errors = {};
  if (!data.services.length) errors.services = 'Choose at least one type of project.';
  if (data.goal.length < 10) errors.goal = 'Describe the main goal in at least 10 characters.';
  if (data.currentUrl) {
    try {
      const url = new URL(data.currentUrl);
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error('invalid');
    } catch { errors.currentUrl = 'Enter a full http:// or https:// website URL without credentials, or leave this blank.'; }
  }
  if ((data.features.includes('accounts') || data.features.includes('admin')) && !data.roles)
    errors.roles = 'List the user roles, or write “To decide” if you need help defining them.';
  if (data.integrationPlan === 'list' && !data.integrations)
    errors.integrations = 'Name the systems to connect, or choose “To decide”.';
  return errors;
}
export function completionSections(value) {
  const data = normalizeBrief(value);
  return [
    { id: 'direction', label: 'Project direction', complete: data.services.length > 0 && data.goal.length >= 10, rule: 'A project type and a goal of at least 10 characters.' },
    { id: 'audience', label: 'Audience & markets', complete: !!(data.audience && data.countries && data.languages), rule: 'Audience, target countries and content languages.' },
    { id: 'scope', label: 'Pages & features', complete: !!(data.pages || data.features.length || data.customFeatures) && (!(data.features.includes('accounts') || data.features.includes('admin')) || !!data.roles), rule: 'Pages or features; roles too when accounts or admin are selected.' },
    { id: 'responsibilities', label: 'Connections & content', complete: !!data.contentOwner && !!data.integrationPlan && (data.integrationPlan !== 'list' || !!data.integrations), rule: 'A content owner and an integration choice, including “To decide”.' },
    { id: 'delivery', label: 'Timing & budget', complete: !!data.timeline, rule: 'A desired timeline. Your budget is optional.' },
    { id: 'checks', label: 'Review requirements', complete: data.reviewChecks.length > 0, rule: 'At least one review topic selected.' },
  ];
}
export function acceptanceChecklist(value) {
  const data = normalizeBrief(value);
  return [...new Set([
    'Agree the deliverables, exclusions and acceptance examples before work starts.',
    ...data.services.map(id => SERVICE_CHECKS[id]),
    ...data.features.map(id => FEATURE_CHECKS[id]),
    ...data.reviewChecks.map(id => REVIEW_CHECKS[id]),
    'Review working milestones with test data and record approval or the changes still required.',
  ])];
}
export function handoverChecklist(value) {
  const data = normalizeBrief(value);
  const items = [
    'Source repository, design files and documentation for the agreed deliverables.',
    'Ownership and access for hosting, domains and third-party accounts; agree a secure credential handover separately.',
    'Launch steps, operating notes, named owners and an agreed post-launch support scope.',
    'A record of acceptance checks, known limitations and any work deferred to a later phase.',
  ];
  if (data.features.includes('admin')) items.push('A walkthrough of content editing, user permissions and publishing.');
  if (data.features.includes('migration')) items.push('Migration results, source backups, field mapping and rollback notes.');
  if (data.services.includes('ai')) items.push('Approved knowledge sources, escalation instructions, provider ownership and agreed usage limits.');
  if (data.services.includes('seo')) items.push('Before-and-after URL inventory and access to the agreed measurement accounts.');
  return items;
}
export function escapeMarkdown(value) {
  return cleanText(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/[\\`*_{}[\]()#+.!|~-]/g, '\\$&').replace(/\n/g, '\n  ');
}
const labels = (ids, options) => options.filter(option => ids.includes(option.id)).map(option => option.label).join(', ');
export function briefDocument(value, format = 'markdown') {
  const data = normalizeBrief(value), markdown = format === 'markdown';
  const safe = input => markdown ? escapeMarkdown(input || 'To decide') : cleanText(input || 'To decide');
  const heading = text => markdown ? `## ${text}` : text.toUpperCase();
  const line = (label, text) => markdown ? `- **${label}:** ${safe(text)}` : `${label}: ${safe(text)}`;
  const list = items => items.map(item => `- ${safe(item)}`).join('\n');
  const completed = completionSections(data).filter(section => section.complete).length;
  const contentOwner = CONTENT_OPTIONS.find(([id]) => id === data.contentOwner)?.[1];
  const integrations = data.integrationPlan === 'none' ? 'No integrations planned' : data.integrationPlan === 'list' ? data.integrations : 'To decide during discovery';
  return [
    markdown ? `# ${safe(data.projectName || 'Project brief')}` : safe(data.projectName || 'Project brief').toUpperCase(),
    'Prepared locally for a project discussion. Details and acceptance checks require agreement.',
    `Planning coverage: ${completed} of 6 sections filled. This counts supplied planning details; it is not a quality, SEO or readiness score.`,
    heading('Project direction'), line('Project type', labels(data.services, SERVICE_OPTIONS)), line('Main goal', data.goal), line('Existing website', data.currentUrl),
    heading('Audience and markets'), line('Audience', data.audience), line('Countries / regions', data.countries), line('Content languages', data.languages),
    heading('Pages, features and roles'), line('Pages / screens', data.pages), line('Selected features', labels(data.features, FEATURE_OPTIONS)), line('Other features', data.customFeatures), line('User roles', data.roles),
    heading('Integrations and responsibilities'), line('Systems to connect', integrations), line('Content responsibility', contentOwner),
    heading('Delivery preferences'), line('Desired timeline', data.timeline), line('Optional budget supplied by the client', data.budget),
    heading('Review topics'), line('Requested checks', labels(data.reviewChecks, REVIEW_OPTIONS)),
    heading('Suggested acceptance checklist'), list(acceptanceChecklist(data)),
    heading('Handover checklist'), list(handoverChecklist(data)),
    heading('Additional notes'), safe(data.notes),
    'This brief contains planning details, not a price estimate or a promise of results.',
  ].join('\n\n') + '\n';
}
export function briefFilename(value, format = 'markdown') {
  const title = cleanText(value?.projectName || 'project-brief').normalize('NFKD').replace(/[^a-zA-Z0-9 -]/g, '').trim().replace(/\s+/g, '-').slice(0, 70) || 'project-brief';
  return `${title.toLowerCase()}.${format === 'markdown' ? 'md' : 'txt'}`;
}
