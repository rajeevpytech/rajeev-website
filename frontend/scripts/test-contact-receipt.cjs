const path = require('node:path'), assert = require('node:assert/strict'), fs = require('node:fs');
const root = path.resolve(__dirname, '..'), deps = path.join(root, 'node_modules');
const { JSDOM } = require(path.join(deps, 'jsdom'));
const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://rajeevfreelancer.com/contact' });
Object.assign(global, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, IS_REACT_ACT_ENVIRONMENT: true });
const React = require(path.join(deps, 'react')), { createRoot } = require(path.join(deps, 'react-dom/client')), { MemoryRouter } = require(path.join(deps, 'react-router-dom/dist/index.js'));
let response = { data: { ok: false } }, sent = [], events = [];
global.__contactApi = { post: async (...args) => { sent.push(args); if (response instanceof Error) throw response; return response; } };
global.__contactEvents = events;
global.__contactToast = { success() {}, error() {} };
(async () => {
  const file = path.join(root, '.qa/contact.cjs'); fs.mkdirSync(path.dirname(file), { recursive: true });
  await require(path.join(deps, 'esbuild')).build({ entryPoints: [path.join(root, 'src/components/ContactForm.jsx')], outfile: file, bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react', 'react-dom', 'react-router-dom'], alias: { '@': path.join(root, 'src') }, plugins: [{ name: 'test-boundaries', setup(b) {
    b.onResolve({ filter: /^(?:@\/lib\/api|@\/lib\/siteConfig|sonner|framer-motion)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path === '@/lib/api' ? 'export const api=globalThis.__contactApi; export function formatApiErrorDetail(x){return x;}' : args.path === '@/lib/siteConfig' ? 'export const trackConversion=(meta)=>globalThis.__contactEvents.push(meta); export function getSiteConfig(){return {contact:{}};}' : args.path === 'sonner' ? 'export const toast=globalThis.__contactToast;' : 'import React from "react"; export const motion={div:({initial,animate,...props})=>React.createElement("div",props)};' }));
  } }] });
  const ContactForm = require(file).default, app = createRoot(document.getElementById('root'));
  const settle = () => new Promise(resolve => setImmediate(resolve));
  await React.act(async () => app.render(React.createElement(MemoryRouter, { initialEntries: ['/contact'] }, React.createElement(ContactForm))));
  const setInput = async (testId, value) => React.act(async () => {
    const input = document.querySelector(`[data-testid="${testId}"]`);
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await setInput('contact-name', 'Test visitor'); await setInput('contact-email', 'visitor@example.test');
  const submit = () => React.act(async () => { document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settle(); });
  await submit(); assert.equal(events.length, 0); assert.equal(document.querySelector('[data-testid="contact-success"]'), null);
  response = new Error('Storage failed'); await submit(); assert.equal(events.length, 0);
  response = { data: { ok: true, id: 'test-receipt' } }; await submit();
  assert.equal(events.length, 1); assert.deepEqual(events[0], { service: 'other' });
  assert.ok(document.querySelector('[data-testid="contact-success"]'));
  assert.equal(sent.length, 3); assert.equal(sent[2][1].source_path, '/contact');
  await React.act(async () => app.unmount());
  console.log('PASS: rejected/unconfirmed submissions never count as leads; a confirmed stored receipt counts once; personal form fields are excluded from conversion metadata.');
})().catch(error => { console.error(error); process.exitCode = 1; });
