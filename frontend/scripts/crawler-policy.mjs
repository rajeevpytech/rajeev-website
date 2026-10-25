// Keep the generated static robots file identical to FastAPI's policy.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const policy=JSON.parse(fs.readFileSync(fileURLToPath(new URL('../../backend/ai-crawler-policy.json',import.meta.url)),'utf8'));
export function robotsText(origin,indexingEnabled=true){
 const lines=['# Public search access is separate from model-training permission.','# robots.txt is a crawler preference; private resources still require authentication.','# Public noindex pages stay crawlable so their noindex directives can be observed.'];
 if(!indexingEnabled)lines.push('# Global indexing is disabled: HTML emits noindex; sitemap/feed/LLM discovery entries are suppressed.');
 const group=agents=>{lines.push(...agents.map(a=>`User-agent: ${a}`),...policy.privateDisallow.map(p=>`Disallow: ${p}`),...policy.publicApiAllow.map(p=>`Allow: ${p}`),`Disallow: ${policy.defaultApiDisallow}`,'Allow: /','');};
 group(['*']);group(policy.searchAgents);group(policy.userDirectedAgents);
 lines.push(...policy.trainingAgentsBlocked.map(a=>`User-agent: ${a}`),'Disallow: /','',`Sitemap: ${origin.replace(/\/$/,'')}/sitemap.xml`,'');
 return lines.join('\n');
}
