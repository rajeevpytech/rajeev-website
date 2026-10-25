import React from 'react';
import { renderToString } from 'react-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';
import { AuthProvider } from '../context/AuthContext';
import { SettingsProvider } from '../context/SettingsContext';
import { SITE_DEFAULTS, setSiteConfig, canonicalBase } from '../lib/siteConfig';
import { SERVICES } from '../data/site';
import CATALOG from '../seo/catalog.json';
import LIVE_SETTINGS from '../seo/live-site-settings.json';
import HOME_PORTFOLIO from '../seo/home-portfolio.json';
import { LIVE_SERVICES } from '../seo/serviceAliases';

export { SERVICES, CATALOG, SITE_DEFAULTS };
export function routes() {
  return [
    ...['/', '/about', '/services', '/work', '/locations', '/service-areas', '/project-brief', '/delhi-ncr', '/contact', '/pricing', '/free-quote', '/hi', '/ar', '/es', '/fr', '/us', '/uk', '/de'].map(path => ({path,group:'pages',index:true})),
    ...SERVICES.map(s => ({path:`/${s.slug}`,group:'services',index:true})),
    ...LIVE_SERVICES.map(s => ({path:`/${s.slug}`,group:'services',index:true})),
    ...CATALOG.countries.map(c => ({path:`/locations/${c.slug}`,group:'countries',index:true})),
    {path:'/404',group:'none',index:false},
    {path:'/admin',group:'none',index:false},
  ];
}
export function render(path, settings = LIVE_SETTINGS) {
  const mergedSettings = setSiteConfig(settings);
  globalThis.__RF_BOOTSTRAP__ = {path,settings:mergedSettings,data:{locations:CATALOG, ...(path === '/' ? {homePortfolio:HOME_PORTFOLIO} : {}), ...(path === '/work' ? {portfolio:HOME_PORTFOLIO} : {})},renderedBy:'react'};
  const helmetContext = {};
  const queryClient = new QueryClient({defaultOptions:{queries:{retry:false}}});
  let html = renderToString(
    <HelmetProvider context={helmetContext}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider><SettingsProvider><App ssrPath={path} /></SettingsProvider></AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
  const h = helmetContext.helmet;
  // React 19 hoists title/meta/link resources. JSON-LD scripts must remain in
  // their rendered body positions because the client dispatcher hydrates those nodes.
  const native = [];
  html = html.replace(/<title\b[^>]*>[\s\S]*?<\/title>|<meta\b[^>]*\/?>|<link\b[^>]*\/?>/g, tag => { native.push(tag); return ''; });
  const legacy = [h?.title, h?.meta, h?.link, h?.script].filter(Boolean).map(x=>x.toString()).join('\n');
  const head = legacy || native.join('\n');
  const lang = ({'/us':'en-US','/uk':'en-GB','/de':'de-DE'})[path] || (['hi','ar','es','fr'].includes(path.slice(1)) ? path.slice(1) : 'en');
  return {html,head,htmlAttributes:`lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}"`,bootstrap:globalThis.__RF_BOOTSTRAP__,origin:canonicalBase()};
}
