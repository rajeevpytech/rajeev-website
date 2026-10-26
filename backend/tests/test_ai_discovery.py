"""Provider access preferences, private rules and global discovery controls."""
import json
import subprocess
from pathlib import Path

from ai_discovery import POLICY, SEARCH_AGENTS, crawler_allowed, robots_text
from test_seo_edgecases import env, blog

ROOT = Path(__file__).resolve().parents[2]


def test_search_agents_can_read_public_html_and_content_but_not_private_routes():
    robots = robots_text('https://rajeevfreelancer.com')
    for agent in [*SEARCH_AGENTS, *POLICY['userDirectedAgents'], 'Googlebot']:
        for path in ['/', '/freelancer-seo-expert/delhi-india', '/blog/example', '/api/blog/example', '/api/blog?category=SEO', '/api/page/freelancer-seo-expert/delhi-india', '/api/sitemaps/content.xml', '/static/main.js']:
            assert crawler_allowed(robots, agent, path), (agent, path)
        for path in ['/admin', '/api/admin/seo-workflow', '/api/auth/me', '/api/leads', '/api/unlisted-future-private-route', '/api/blog-private', '/private/report', '/internal/task']:
            assert not crawler_allowed(robots, agent, path), (agent, path)


def test_named_training_agents_remain_blocked_independently_from_search():
    robots = robots_text('https://rajeevfreelancer.com')
    for agent in POLICY['trainingAgentsBlocked']:
        for path in ['/', '/blog/example', '/api/blog/example', '/static/main.js']:
            assert not crawler_allowed(robots, agent, path), (agent, path)
    assert crawler_allowed(robots, 'OAI-SearchBot/1.4', '/blog/example')
    assert crawler_allowed(robots, 'Claude-SearchBot', '/blog/example')


def test_frontend_and_backend_generate_identical_robots_preferences():
    program = "import {robotsText} from './crawler-policy.mjs';process.stdout.write(robotsText('https://rajeevfreelancer.com'));"
    generated = subprocess.check_output(['node', '--input-type=module', '-e', program], cwd=ROOT / 'frontend/scripts', text=True)
    assert generated == robots_text('https://rajeevfreelancer.com')
    assert (ROOT / 'frontend/public/robots.txt').read_text() == generated


def test_global_noindex_suppresses_feed_sitemap_and_optional_discovery_links(env):
    env['settings']['seo']['robots_index'] = False
    env['db'].blog_posts.rows = [blog('published')]
    client = env['client']
    assert '<item>' not in client.get('/feed.xml').text
    assert '<url><loc>' not in client.get('/sitemap.xml').text
    for path in ['/sitemap.xml', '/api/sitemaps/content.xml', '/feed.xml']:
        assert client.get(path).headers.get('x-robots-tag') == 'noindex, follow'
    llms = client.get('/llms.txt')
    assert '](' not in llms.text
    assert llms.headers['x-robots-tag'] == 'noindex, follow'
    page = client.get('/website-designer/old-market')
    assert 'content="noindex, follow"' in page.text
    for agent in SEARCH_AGENTS:
        assert crawler_allowed(client.get('/robots.txt').text, agent, '/website-designer/old-market')


def test_llm_navigation_lists_preferred_service_paths_once(env):
    response = env['client'].get('/llms.txt')
    assert response.status_code == 200
    assert 'sitemap.xml' in response.text
    assert 'feed.xml' in response.text
    assert 'guarantee' not in response.text.lower()


def test_audit_does_not_treat_head_identity_or_link_attributes_as_visible_facts():
    import importlib.util
    import sys
    sys.path.insert(0, str(ROOT / 'scripts'))
    spec = importlib.util.spec_from_file_location('ai_audit_test_module', ROOT / 'scripts/audit_ai_discovery.py')
    audit = importlib.util.module_from_spec(spec); spec.loader.exec_module(audit)
    settings = {'seo': {'site_name': 'Rajeev Freelancer'}, 'contact': {'phone': '+919711623561', 'email': 'hello@rajeevfreelancer.com'}, 'business': {}}
    text = 'This page explains the project scope and the delivery plan, with clear review points, customer responsibilities, implementation steps and acceptance checks before a launch is scheduled.'
    source = '<html><head><title>Rajeev Freelancer</title><meta name="description" content="A service guide"><meta name="robots" content="noindex, follow"></head><body><h1>Service guide</h1><p>' + text + '</p><a href="mailto:hello@rajeevfreelancer.com">Email</a></body></html>'
    result = audit.inspect_html(source, '/guide', settings, robots_text('https://rajeevfreelancer.com'))
    assert not result['entityVisible']
    assert not result['emailVisible']
    assert not result['technicalErrors']
    assert result['editorialEvidenceReview']


def test_audit_flags_unverified_rating_and_office_schema_and_faq_parity():
    import importlib.util
    import sys
    sys.path.insert(0, str(ROOT / 'scripts'))
    spec = importlib.util.spec_from_file_location('ai_audit_schema_test_module', ROOT / 'scripts/audit_ai_discovery.py')
    audit = importlib.util.module_from_spec(spec); spec.loader.exec_module(audit)
    settings = {'seo': {'site_name': 'Rajeev Freelancer'}, 'contact': {}, 'business': {'reviews_verified': False, 'customer_facing_office_verified': False}}
    nodes = [{'@type': 'LocalBusiness'}, {'@type': 'AggregateRating'}, {'@type': 'Question', 'name': 'What is included?', 'acceptedAnswer': {'@type': 'Answer', 'text': 'An answer absent from the HTML.'}}]
    source = '<html><head><title>Service guide</title><meta name="description" content="A guide"><meta name="robots" content="noindex, follow"><script type="application/ld+json">' + json.dumps(nodes) + '</script></head><body><h1>Rajeev Freelancer service guide</h1><p>What is included? This public service guide describes project planning, deliverables, client responsibilities, testing, review checkpoints, account ownership, deployment preparation and the handover process.</p></body></html>'
    result = audit.inspect_html(source, '/guide', settings, robots_text('https://rajeevfreelancer.com'))
    assert 'Unverified review/rating schema' in result['technicalErrors']
    assert 'Unverified customer-facing local-office schema' in result['technicalErrors']
    assert any('FAQ' in note for note in result['editorialEvidenceReview'])


def test_bing_public_verification_is_exact_xml_and_head_even_when_global_noindex(env):
    expected = (ROOT / 'frontend/public/BingSiteAuth.xml').read_bytes()
    assert b'496A7FAEAD118A4F42F194382CE25FB2' in expected
    env['settings']['seo']['robots_index'] = False
    response = env['client'].get('/BingSiteAuth.xml')
    assert response.status_code == 200
    assert response.content == expected
    assert response.headers['content-type'].startswith('application/xml')
    assert b'<html' not in response.content.lower()
    head = env['client'].head('/BingSiteAuth.xml')
    assert head.status_code == 200
    assert head.headers['content-type'].startswith('application/xml')
    assert head.headers['content-length'] == str(len(expected))
    assert not head.content
