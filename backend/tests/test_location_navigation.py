"""Public server HTML retains useful links before JavaScript executes."""
import copy
import json
import re
from html.parser import HTMLParser
from pathlib import Path

import pytest
from public_seo import location_html
from world_expansion import SERVICE_MAP, catalog, expansion_page_document


class Links(HTMLParser):
    def __init__(self, source):
        super().__init__(); self.navigation = False; self.hrefs = []; self.feed(source)
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'nav' and attrs.get('aria-label') == 'Service and project links': self.navigation = True
        if tag == 'a' and self.navigation: self.hrefs.append(attrs.get('href'))
    def handle_endtag(self, tag):
        if tag == 'nav': self.navigation = False


def document():
    return {'canonical': '/freelancer-seo-expert/example-india', 'service': {'slug': 'freelancer-seo-expert', 'name': 'SEO Consulting'},
            'location': {'city': 'Example', 'country': 'India', 'country_slug': 'india', 'loc_slug': 'example-india'},
            'content': {'title': 'An existing authored title', 'h1': 'An existing authored heading', 'meta_description': 'An existing authored description',
                        'intro': ['Keep this authored paragraph exactly.'], 'faqs': []}, 'seo_noindex': False}


def test_server_navigation_preserves_document_and_editorial_metadata(tmp_path):
    doc = document(); original = copy.deepcopy(doc)
    source = location_html(doc, {}, build_dir=tmp_path)
    assert doc == original
    assert 'An existing authored title</title>' in source
    assert 'content="An existing authored description"' in source
    assert '<h1>An existing authored heading</h1>' in source
    assert '<p>Keep this authored paragraph exactly.</p>' in source
    assert Links(source).hrefs == ['/freelancer-seo-expert', '/locations/india', '/work', '/contact']
    assert 'content="index, follow' in source


@pytest.mark.parametrize('service', list(SERVICE_MAP.values()), ids=lambda s:s['slug'])
def test_expansion_navigation_never_links_to_unapproved_sibling_pages(service, tmp_path):
    location = catalog()['additional']['howrah-india']
    doc = expansion_page_document(service, location)
    source = location_html(doc, {}, build_dir=tmp_path)
    hrefs = Links(source).hrefs
    assert len(hrefs) == 4 and '/contact' in hrefs and '/work' in hrefs
    assert all(not href.endswith('/howrah-india') for href in hrefs)
    assert 'content="noindex, follow"' in source


def test_malformed_country_slug_cannot_create_a_navigation_url(tmp_path):
    doc = document(); doc['location']['country_slug'] = '../admin?token=unsafe'
    source = location_html(doc, {}, build_dir=tmp_path)
    assert Links(source).hrefs == ['/freelancer-seo-expert', '/work', '/contact']
