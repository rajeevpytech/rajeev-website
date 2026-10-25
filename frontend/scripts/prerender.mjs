#!/usr/bin/env node
// Public HTML is identical for visitors and crawlers. Dynamic editorial/location
// pages are served by FastAPI; the static catalog is generated from backend/data.py.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { robotsText } from './crawler-policy.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'build');
const temp = path.join(root, 'node_modules/.cache/rf-ssr');
fs.mkdirSync(temp,{recursive:true});
const templatePath = path.join(out,'index.html');
if(!fs.existsSync(templatePath)) throw new Error('Run the frontend production build first.');
let template = fs.readFileSync(templatePath,'utf8');
const cache = path.join(temp,'template.html');
if (/<div id="root"><\/div>/.test(template)) fs.writeFileSync(cache,template);
else if(fs.existsSync(cache)) template=fs.readFileSync(cache,'utf8');
if (!/<div id="root"><\/div>/.test(template)) throw new Error('Pristine CRA root template unavailable.');
await build({entryPoints:[path.join(root,'src/ssr/entry-server.jsx')],outfile:path.join(temp,'server.cjs'),bundle:true,platform:'node',format:'cjs',target:'node18',jsx:'automatic',loader:{'.js':'jsx','.css':'empty'},alias:{'@':path.join(root,'src')},define:{'process.env.NODE_ENV':'"production"','process.env.REACT_APP_BACKEND_URL':JSON.stringify(process.env.REACT_APP_BACKEND_URL || '')},logLevel:'warning'});
const ssr=createRequire(import.meta.url)(path.join(temp,'server.cjs'));
const safeJson=x=>JSON.stringify(x).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const entries=[];
let origin='';
for(const route of ssr.routes()) {
  const r=ssr.render(route.path);origin=r.origin;
  const html=template.replace(/<html\b[^>]*>/,`<html ${r.htmlAttributes}>`).replace(/<title>[\s\S]*?<\/title>/,r.head).replace('<div id="root"></div>',`<div id="root">${r.html}</div><script>window.__RF_BOOTSTRAP__=${safeJson(r.bootstrap)}</script>`);
  const file=route.path==='/404'?path.join(out,'404.html'):path.join(out,route.path.slice(1),'index.html');
  fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,html);
  const title=html.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]||'';
  const description=html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/)?.[1]||'';
  const canonical=html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/)?.[1] || null;
  const noindex=/name="robots"[^>]*content="[^"]*noindex/.test(html);
  if(!title || !description) throw new Error(`Missing page metadata: ${route.path}`);
  if(route.path!='/admin' && !/<h1\b/.test(html)) throw new Error(`Missing H1: ${route.path}`);
  if((html.match(/rel="canonical"/g)||[]).length>1) throw new Error(`Duplicate canonical: ${route.path}`);
  entries.push({...route,index:route.index && !noindex,canonical,title,description,hasH1:/<h1\b/.test(html),hasBreadcrumbs:/BreadcrumbList/.test(html),hasFaqs:/FAQPage/.test(html),internalLinkCount:[...html.matchAll(/href="\/(?!\/)/g)].length});
}
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const maps=[];
fs.mkdirSync(path.join(out,'sitemaps'),{recursive:true});
for(const group of [...new Set(entries.filter(r=>r.index && r.canonical===origin+r.path).map(r=>r.group))]) {
 const list=entries.filter(r=>r.index && r.canonical===origin+r.path && r.group===group);
 const name=`sitemaps/${group}.xml`;
 fs.writeFileSync(path.join(out,name),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${list.map(r=>`<url><loc>${esc(origin+r.path)}</loc></url>`).join('\n')}\n</urlset>\n`);
 maps.push({name,count:list.length});
}
// Backend /sitemap.xml combines these static shards with current live content.
fs.writeFileSync(path.join(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${maps.map(m=>`<sitemap><loc>${origin}/${m.name}</loc></sitemap>`).join('\n')}\n<sitemap><loc>${origin}/api/sitemaps/content.xml</loc></sitemap>\n</sitemapindex>\n`);
fs.writeFileSync(path.join(out,'seo-manifest.json'),JSON.stringify({origin,generatedAt:new Date().toISOString(),pages:entries,sitemaps:maps},null,2));
fs.writeFileSync(path.join(out,'robots.txt'),robotsText(origin));
console.log(`[prerender] ${entries.length} HTML pages, ${entries.filter(p=>p.index).length} indexable. Canonical ${origin}.`);
