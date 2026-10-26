#!/usr/bin/env python3
"""Regression contract captured from the user-supplied original ZIP on 25 October 2026.

Uses only Python's standard library. It neither imports the backend nor modifies pages.
Run after building: python3 scripts/test_metadata_preservation.py
"""
import ast
import html
import json
import re
import sys
from pathlib import Path
from html.parser import HTMLParser


def js_value(source, start):
    """Read one quoted JSX value or balanced JS expression without evaluating it."""
    while start < len(source) and source[start].isspace():
        start += 1
    opener = source[start]
    if opener in '\"\'`':
        quote, pos = opener, start + 1
        while pos < len(source):
            if source[pos] == '\\':
                pos += 2
            elif source[pos] == quote:
                return source[start:pos + 1]
            else:
                pos += 1
    if opener not in '{[':
        raise ValueError('Expected quoted or balanced value')
    pairs = {'{': '}', '[': ']', '(': ')'}
    stack, quote, pos = [pairs[opener]], None, start + 1
    while pos < len(source):
        char = source[pos]
        if quote:
            if char == '\\':
                pos += 2
                continue
            if char == quote:
                quote = None
        elif char in '\"\'`':
            quote = char
        elif char in pairs:
            stack.append(pairs[char])
        elif char == stack[-1]:
            stack.pop()
            if not stack:
                return source[start:pos + 1]
        pos += 1
    raise ValueError('Unterminated source value')


def seo_props(source):
    out = []
    for start in re.finditer(r'<Seo\b', source):
        pos, brace, quote = start.end(), 0, None
        while pos < len(source):
            char = source[pos]
            if quote:
                if char == '\\':
                    pos += 2
                    continue
                if char == quote:
                    quote = None
            elif char in '\"\'`':
                quote = char
            elif char == '{':
                brace += 1
            elif char == '}':
                brace -= 1
            elif char == '>' and brace == 0:
                break
            pos += 1
        tag, props = source[start.start():pos + 1], {}
        for key in ('title', 'description', 'path'):
            match = re.search(r'\b' + key + r'\s*=\s*', tag)
            if match:
                props[key] = js_value(tag, match.end())
        if 'title' in props or 'description' in props:
            out.append(props)
    return out


def js_defaults(source):
    values = {}
    for key in ('default_title', 'default_description'):
        match = re.search(r'\b' + key + r'\s*:\s*', source)
        values[key] = js_value(source, match.end())
    return values


def fallback_meta(source):
    tree = ast.parse(source)
    function = next(n for n in tree.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.name == '_fallback_content')
    result = next(n.value for n in function.body if isinstance(n, ast.Return))
    return {key.value: ast.dump(value, include_attributes=False) for key, value in zip(result.keys, result.values) if isinstance(key, ast.Constant) and key.value in ('title', 'meta_description')}


def python_defaults(source):
    tree = ast.parse(source)
    node = next(n for n in tree.body if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'DEFAULT_SITE' for t in n.targets))
    values = ast.literal_eval(node.value)['seo']
    return {k: values[k] for k in ('default_title', 'default_description')}


def service_copy(source):
    values = {}
    for match in re.finditer(r'^  \"([^\"]+)\":\s*\{', source, re.M):
        block = source[match.end():]
        item = {}
        for key in ('hero', 'sub'):
            found = re.search(r'^    ' + key + r'\s*:\s*', block, re.M)
            if found:
                item[key] = js_value(block, found.end())
        if item:
            values[match[1]] = item
    return values


class HeadParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.titles, self.descriptions, self.canonicals, self.social = [], [], [], {}
        self._title = None
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'title':
            self._title = ''
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonicals.append(attrs.get('href'))
        if tag == 'meta':
            if attrs.get('name') == 'description':
                self.descriptions.append(attrs.get('content'))
            key = attrs.get('property') or attrs.get('name') or ''
            if key.startswith(('og:', 'twitter:')):
                self.social.setdefault(key, []).append(attrs.get('content'))
    def handle_endtag(self, tag):
        if tag == 'title' and self._title is not None:
            self.titles.append(self._title)
            self._title = None
    def handle_data(self, value):
        if self._title is not None:
            self._title += value

# Original values, retained as a readable self-contained baseline.
BASELINE = {'pages': {'frontend/src/pages/About.jsx': [{'title': '"About Rajeev — Senior Freelance Engineer & '
                                                      'Consultant | Rajeev Freelancer"',
                                             'description': '"12+ years in production. Ex-IOG, '
                                                            'Accenture and Google. Six years '
                                                            'independent. Meet Rajeev, a senior '
                                                            'freelance engineer & AI/digital marketing '
                                                            'consultant available worldwide."',
                                             'path': '"/about"'}],
           'frontend/src/pages/Admin.jsx': [{'title': '"Admin | Rajeev Freelancer"',
                                             'description': '"Admin dashboard"',
                                             'path': '"/admin"'}],
           'frontend/src/pages/BlogIndex.jsx': [{'title': '"Insights, Case Studies & Articles | Rajeev '
                                                          'Freelancer"',
                                                 'description': '"Practical articles and case studies '
                                                                'on SEO, GEO, AI automation, web '
                                                                'development and growth — written by '
                                                                'Rajeev, a senior freelance '
                                                                'consultant."',
                                                 'path': '"/blog"'}],
           'frontend/src/pages/BlogPost.jsx': [{'title': '{`${seo.title || post.title} | '
                                                         '${cfg.seo.site_name}`}',
                                                'description': '{seo.description || post.excerpt}',
                                                'path': '{`/blog/${post.slug}`}'}],
           'frontend/src/pages/CaseStudies.jsx': [{'title': '"Case Studies — Real Results with Numbers '
                                                            '| Rajeev Freelancer"',
                                                   'description': '"See how Rajeev delivered 3× organic '
                                                                  'traffic, 80% faster support and +52% '
                                                                  'conversion. Real freelance web, SEO, '
                                                                  'AI and automation case studies with '
                                                                  'the numbers."',
                                                   'path': '"/case-studies"'}],
           'frontend/src/pages/CaseStudyDetail.jsx': [{'title': '{`${cs.title} — Case Study | '
                                                                '${cfg.seo.site_name}`}',
                                                       'description': '{cs.excerpt}',
                                                       'path': '{`/case-studies/${cs.slug}`}'}],
           'frontend/src/pages/CityHub.jsx': [{'title': '{`Freelance Web, App, SEO & Marketing Services '
                                                        'in ${hub.display} | Rajeev`}',
                                               'description': '{`Senior freelance web & app developer, '
                                                              'SEO expert and digital marketer in '
                                                              '${hub.display}. Websites from ₹4,999, '
                                                              'same-day delivery. Free quote. Serving '
                                                              '${hub.region}.`}',
                                               'path': '{path}'}],
           'frontend/src/pages/Contact.jsx': [{'title': '"Contact & Book a Free Consultation | Rajeev '
                                                        'Freelancer"',
                                               'description': '"Book a free consultation with Rajeev — '
                                                              'senior freelance engineer & AI/digital '
                                                              'marketing consultant. WhatsApp, email or '
                                                              'the form. Average response under 30 '
                                                              'minutes."',
                                               'path': '"/contact"'}],
           'frontend/src/pages/CountryPage.jsx': [{'title': '{`Freelance Web, SEO, AI & Marketing '
                                                            'Services in ${country.name} | Rajeev '
                                                            'Freelancer`}',
                                                   'description': '{`Hire Rajeev for freelance web '
                                                                  'development, SEO, AI automation and '
                                                                  'digital marketing across '
                                                                  '${country.name}. Senior-only, '
                                                                  'remote, fast WhatsApp support.`}',
                                                   'path': '{`/locations/${country.slug}`}'}],
           'frontend/src/pages/DelhiNCR.jsx': [{'title': '"Freelance Web, App, SEO & Marketing Services '
                                                         'in Delhi NCR | Rajeev"',
                                                'description': '"Senior freelance web & app developer, '
                                                               'SEO expert and digital marketer serving '
                                                               'Delhi, Gurgaon, Noida, Faridabad & '
                                                               'Ghaziabad. Websites from ₹4,999, '
                                                               'same-day delivery. Free quote."',
                                                'path': '{path}'}],
           'frontend/src/pages/Home.jsx': [{'title': '"Rajeev Freelancer — Freelance Web, App, SEO & AI '
                                                     'Marketing Expert | Delhi NCR & Worldwide"',
                                            'description': '"Hire Rajeev — a senior freelance web & app '
                                                           'developer, SEO expert and '
                                                           'AI/digital-marketing consultant with 12+ '
                                                           "years' experience. Based in Gurgaon, "
                                                           'serving Delhi NCR, Noida, Faridabad & '
                                                           'clients worldwide. Websites from ₹4,999, '
                                                           'same-day delivery. Free quote."',
                                            'path': '"/"'}],
           'frontend/src/pages/Landing.jsx': [{'title': '"Free Quote: Website, App Development & '
                                                        'Digital Marketing Expert | Rajeev Freelancer"',
                                               'description': '"Get a free fixed-price quote for '
                                                              'website development, mobile app '
                                                              'development, SEO & digital marketing. '
                                                              'Senior freelancer in Gurgaon / Delhi NCR '
                                                              'serving India, Dubai, UK, USA & more. '
                                                              'Reply within 30 minutes."',
                                               'path': '{PATH}'}],
           'frontend/src/pages/LocationPage.jsx': [{'title': '{content.title}',
                                                    'description': '{content.meta_description}',
                                                    'path': '{path}'}],
           'frontend/src/pages/LocationsIndex.jsx': [{'title': '"Locations — A Freelance Consultant For '
                                                               'Your City | Rajeev Freelancer"',
                                                      'description': '"Rajeev serves businesses in '
                                                                     'cities across Asia, Europe, the '
                                                                     'Middle East, Africa and the '
                                                                     'Americas. Find local web, SEO, AI '
                                                                     'and marketing help in your city."',
                                                      'path': '"/locations"'}],
           'frontend/src/pages/NotFound.jsx': [{'title': '"Page not found | Rajeev Freelancer"',
                                                'description': '"The page you\'re looking for doesn\'t '
                                                               'exist."',
                                                'path': '"/404"'}],
           'frontend/src/pages/Pricing.jsx': [{'title': '"Pricing & Packages — Freelance Web, SEO & AI '
                                                        '| Rajeev Freelancer"',
                                               'description': '"Transparent freelance pricing for web '
                                                              'development, SEO, AI automation and '
                                                              'WhatsApp marketing — shown in your local '
                                                              'currency. Start with a free '
                                                              'consultation."',
                                               'path': '"/pricing"'}],
           'frontend/src/pages/ServiceHub.jsx': [{'title': '{`${service.name} — Hire Rajeev Worldwide | '
                                                           'Rajeev Freelancer`}',
                                                  'description': '{`${heroLine} ${subLine}`.slice(0, '
                                                                 '158)}',
                                                  'path': '{`/${service.slug}`}'}],
           'frontend/src/pages/ServicesOverview.jsx': [{'title': '"Services — Web, Software, SEO, AI & '
                                                                 'WhatsApp Marketing | Rajeev '
                                                                 'Freelancer"',
                                                        'description': '"Explore Rajeev\'s freelance '
                                                                       'services: website development, '
                                                                       'custom software, SEO, digital '
                                                                       'marketing, AI automation and '
                                                                       'WhatsApp marketing — delivered '
                                                                       'senior-only, worldwide."',
                                                        'path': '"/services"'}]},
 'frontend_defaults': {'default_title': '"Rajeev Freelancer — Senior Freelance Engineer & AI/Digital '
                                        'Marketing Consultant"',
                       'default_description': '"Hire Rajeev — a senior freelance engineer & AI/digital '
                                              "marketing consultant with 12+ years' experience. Web "
                                              'development, software, SEO, AI automation & WhatsApp '
                                              'marketing. Available worldwide."'},
 'backend_defaults': {'default_title': 'Rajeev Freelancer — Senior Freelance Engineer & AI/Digital '
                                       'Marketing Consultant',
                      'default_description': 'Hire Rajeev — a senior freelance engineer & AI/digital '
                                             "marketing consultant with 12+ years' experience. Web "
                                             'development, software, SEO, AI automation & WhatsApp '
                                             'marketing. Available worldwide.'},
 'location_template': {'title': "JoinedStr(values=[Constant(value='Best '), "
                                "FormattedValue(value=Subscript(value=Name(id='service', ctx=Load()), "
                                "slice=Constant(value='name'), ctx=Load()), conversion=-1), "
                                "Constant(value=' in '), FormattedValue(value=Name(id='city', "
                                "ctx=Load()), conversion=-1), Constant(value=' for Your Business | "
                                "Rajeev Freelancer')])",
                       'meta_description': "Subscript(value=JoinedStr(values=[Constant(value='Looking "
                                           "for the best '), FormattedValue(value=Name(id='kw', "
                                           "ctx=Load()), conversion=-1), Constant(value=' in '), "
                                           "FormattedValue(value=Name(id='city', ctx=Load()), "
                                           "conversion=-1), Constant(value=', '), "
                                           "FormattedValue(value=Name(id='country', ctx=Load()), "
                                           "conversion=-1), Constant(value='? Rajeev helps you get more "
                                           'traffic, leads and sales. Book a free consultation '
                                           "today.')]), slice=Slice(upper=Constant(value=158)), "
                                           'ctx=Load())'},
 'service_copy': {'freelance-ai-consultant': {'hero': '"Put AI to work in your business — without the '
                                                      'hype."',
                                              'sub': '"I design and ship practical AI: chatbots, agents '
                                                     'and automations that qualify leads, answer '
                                                     'customers and remove hours of repetitive work '
                                                     'every week."'},
                  'freelance-digital-marketing-consultant': {'hero': '"Marketing engineered around '
                                                                     'revenue, not vanity metrics."',
                                                             'sub': '"Paid, organic and lifecycle '
                                                                    'growth that ties every rupee or '
                                                                    'dollar back to leads and sales — '
                                                                    'run by one senior consultant, '
                                                                    'accountable to you."'},
                  'freelance-seo-expert': {'hero': '"Rank on Google — and get cited by AI."',
                                           'sub': '"Technical + content SEO that compounds into durable '
                                                  "rankings, plus GEO so ChatGPT, Gemini and Google's "
                                                  'AI Overviews recommend you by name."'},
                  'freelance-website-developer': {'hero': '"Websites built for speed, ranking and '
                                                          'conversion."',
                                                  'sub': '"WordPress or custom web apps that load fast, '
                                                         'look sharp and turn visitors into enquiries — '
                                                         'engineered, not just designed."'},
                  'freelance-app-developer': {'hero': '"Mobile apps your customers actually want to '
                                                      'use."',
                                              'sub': '"iOS, Android and cross-platform apps — designed, '
                                                     'built and shipped by a senior engineer, from idea '
                                                     'to the app stores."'},
                  'freelance-software-developer': {'hero': '"Custom software that fits your business '
                                                           'exactly."',
                                                   'sub': '"Production-grade applications, internal '
                                                          'tools and integrations — engineered by a '
                                                          'senior developer who has shipped at scale."'},
                  'whatsapp-marketing-freelancer': {'hero': '"Turn WhatsApp into your fastest sales '
                                                            'channel."',
                                                    'sub': '"Campaigns, auto-replies, chatbots and lead '
                                                           'nurturing that reply in seconds and win '
                                                           'more projects while you sleep."'},
                  'sms-marketing-freelancer': {'hero': '"SMS campaigns that actually get read and '
                                                       'clicked."',
                                               'sub': '"Bulk SMS, OTP flows and automated journeys with '
                                                      'the deliverability and timing that turn texts '
                                                      'into sales."'}}}


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Verify the original Rajeev website title/description contract and built HTML head uniqueness.")
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--build-dir', type=Path, default=None)
    args = parser.parse_args()
    root = args.root.resolve()
    failures = []
    # Public live snapshots are newer than the uploaded ZIP. Source declarations
    # must stay unchanged; emitted current routes retain the captured live copy.
    live_meta_path = root/'frontend/src/seo/live-route-meta.json'
    live_meta = json.loads(live_meta_path.read_text()) if live_meta_path.exists() else {}
    def check(label, expected, actual):
        if expected != actual:
            failures.append(f"{label} changed.\n  Expected: {expected!r}\n  Actual:   {actual!r}")
    for relative, expected in BASELINE['pages'].items():
        path = root / relative
        if not path.exists():
            failures.append(f"Existing page source missing: {relative}")
            continue
        actual = seo_props(path.read_text())
        # Duplicate loading/main branches are allowed when they use the same preserved metadata.
        pairs = lambda items: {(p.get('title'), p.get('description')) for p in items}
        check(relative + ' Seo props', pairs(expected), pairs(actual))
    check('Frontend SEO defaults', BASELINE['frontend_defaults'], js_defaults((root/'frontend/src/lib/siteConfig.js').read_text()))
    server = (root/'backend/server.py').read_text()
    check('Backend SEO defaults', BASELINE['backend_defaults'], python_defaults(server))
    check('Existing location title/description template', BASELINE['location_template'], fallback_meta(server))
    current_copy = service_copy((root/'frontend/src/data/serviceContent.js').read_text())
    for slug, expected in BASELINE['service_copy'].items():
        check('Service description source ' + slug, expected, current_copy.get(slug))
    # Database-backed pages must pass saved text through exactly as the React Seo component does.
    # A long string with meaningful punctuation catches silent slicing, stripping and whitespace rewrites.
    public_source = root/'backend/public_seo.py'
    if public_source.exists():
        import importlib.util
        sys.path.insert(0, str(root/'backend'))
        spec = importlib.util.spec_from_file_location('metadata_public_seo', public_source)
        public = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(public)
        text = 'Saved & approved "description": ' + 'original detail ' * 30 + '  final wording'
        settings = {'seo': {'site_name': 'Rajeev Freelancer'}, 'contact': {}, 'business': {}}
        post = {'slug': 'metadata-check', 'title': 'Original post', 'excerpt': text, 'seo': {'title': 'Saved post title', 'description': text}}
        case = {'slug': 'metadata-check', 'title': 'Saved case title', 'excerpt': text}
        location = {'service': {'slug': 'freelance-seo-expert', 'name': 'Freelance SEO Expert'}, 'location': {'loc_slug': 'delhi-india', 'city': 'Delhi'}, 'content': {'title': 'Saved Delhi title', 'meta_description': text}}
        documents = [
            ('Blog stored SEO', public.post_html(post, settings), 'Saved post title | Rajeev Freelancer'),
            ('Case excerpt', public.case_html(case, settings), 'Saved case title — Case Study | Rajeev Freelancer'),
            ('Location stored SEO', public.location_html(location, settings), 'Saved Delhi title'),
        ]
        for label, document, expected_title in documents:
            parsed = HeadParser(); parsed.feed(document)
            check(label + ' title', [expected_title], parsed.titles)
            check(label + ' description', [text], parsed.descriptions)
    build = args.build_dir or root/'frontend/build'
    checked = 0
    if build.exists():
        for path in build.rglob('*.html'):
            parsed = HeadParser(); parsed.feed(path.read_text())
            checked += 1
            if len(parsed.titles) != 1 or len(parsed.descriptions) != 1:
                failures.append(f"{path.relative_to(build)}: expected exactly one title and description, found {len(parsed.titles)}/{len(parsed.descriptions)}")
            if len(parsed.canonicals) > 1:
                failures.append(f"{path.relative_to(build)}: duplicate canonical")
            for key, values in parsed.social.items():
                if len(values) > 1:
                    failures.append(f"{path.relative_to(build)}: duplicate {key}")
        # Static literal routes are compared against the supplied ZIP, after HTML entity decoding.
        for relative, props_list in BASELINE['pages'].items():
            for props in props_list:
                values = {}
                for key in ('title', 'description', 'path'):
                    token = props.get(key, '')
                    if token[:1] in ('\"', "'") and token[-1:] == token[:1]:
                        values[key] = html.unescape(token[1:-1])
                if len(values) != 3:
                    continue
                route = values['path']; path = build / route.lstrip('/') / 'index.html'
                if route == '/404': path = build/'404.html'
                if not path.exists():
                    continue  # Some editorial paths are served dynamically by FastAPI.
                parsed = HeadParser(); parsed.feed(path.read_text())
                expected = live_meta.get(route, values)
                check('Built title ' + route, [expected['title']], parsed.titles)
                check('Built description ' + route, [expected['description']], parsed.descriptions)
    live_checked = 0
    if build.exists():
        for route, expected in live_meta.items():
            path = build/route.lstrip('/')/'index.html'
            if path.is_file():
                parsed = HeadParser(); parsed.feed(path.read_text())
            elif public_source.exists():
                # Dynamic editorial index pages use the same live metadata override.
                parsed = HeadParser(); parsed.feed(public.html_document(settings=settings, path=route, title='QA fallback', description='QA fallback', body='<p>Local validation fixture.</p>'))
            else:
                failures.append('Missing route for captured live metadata: ' + route)
                continue
            check('Captured live title ' + route, [expected['title']], parsed.titles)
            check('Captured live description ' + route, [expected['description']], parsed.descriptions)
            live_checked += 1
    if failures:
        print('FAIL: metadata preservation')
        print('\n'.join(failures))
        return 1
    count = sum(len(x) for x in BASELINE['pages'].values())
    print(f'PASS: {count} original Seo declarations, SEO defaults, service copy and location metadata templates preserved; {live_checked} captured live metadata snapshots retained; {checked} built HTML heads checked.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
