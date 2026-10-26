"""Shared AI-search crawler policy; no provider request or external mutation."""
import json
import re
from pathlib import Path
from urllib.parse import urlsplit

POLICY = json.loads(Path(__file__).with_name('ai-crawler-policy.json').read_text())
SEARCH_AGENTS = tuple(POLICY['searchAgents'])


def robots_text(origin, indexing_enabled=True):
    lines = [
        '# Public search access is separate from model-training permission.',
        '# robots.txt is a crawler preference; private resources still require authentication.',
        '# Public noindex pages stay crawlable so their noindex directives can be observed.',
    ]
    if not indexing_enabled:
        lines.append('# Global indexing is disabled: HTML emits noindex; sitemap/feed/LLM discovery entries are suppressed.')
    def group(agents):
        lines.extend('User-agent: ' + agent for agent in agents)
        lines.extend('Disallow: ' + path for path in POLICY['privateDisallow'])
        lines.extend('Allow: ' + path for path in POLICY['publicApiAllow'])
        lines.extend(['Disallow: ' + POLICY['defaultApiDisallow'], 'Allow: /', ''])
    group(['*'])
    group(POLICY['searchAgents'])
    group(POLICY['userDirectedAgents'])
    lines.extend('User-agent: ' + agent for agent in POLICY['trainingAgentsBlocked'])
    lines.extend(['Disallow: /', '', 'Sitemap: ' + str(origin).rstrip('/') + '/sitemap.xml', ''])
    return '\n'.join(lines)


def crawler_allowed(robots, user_agent, url):
    """Read-only RFC-style longest-rule audit; not an authorization mechanism."""
    groups, agents, rules = [], [], []
    def flush():
        if agents:
            groups.append((list(agents), list(rules)))
        agents.clear(); rules.clear()
    for raw in robots.splitlines():
        line = raw.split('#', 1)[0].strip()
        if not line:
            if rules: flush()
            continue
        if ':' not in line: continue
        key, value = (part.strip() for part in line.split(':', 1))
        key = key.lower()
        if key == 'user-agent':
            if rules: flush()
            agents.append(value.lower())
        elif key in {'allow', 'disallow'} and agents:
            rules.append((key == 'allow', value))
    flush()
    ua = user_agent.lower()
    candidates = [(max((len(a) for a in names if a != '*' and a in ua), default=0), entries) for names, entries in groups if '*' in names or any(a in ua for a in names)]
    if not candidates: return True
    best_agent_length = max(length for length, _ in candidates)
    selected = [rule for length, entries in candidates if length == best_agent_length for rule in entries]
    parsed = urlsplit(url)
    target = parsed.path or '/'
    if parsed.query: target += '?' + parsed.query
    matches = []
    for allow, pattern in selected:
        if not pattern: continue
        anchored = pattern.endswith('$')
        text = pattern[:-1] if anchored else pattern
        expression = '^' + re.escape(text).replace(r'\*', '.*') + ('$' if anchored else '')
        if re.search(expression, target): matches.append((len(text.replace('*', '')), allow))
    if not matches: return True
    longest = max(length for length, _ in matches)
    return any(allow for length, allow in matches if length == longest)
