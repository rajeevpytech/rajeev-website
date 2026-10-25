"""Authenticated 90-day SEO work tracking alongside the existing Blog Autopilot.

Reading the dashboard never activates a plan, writes settings, calls a paid API,
submits a link or creates a blog post. Only explicit administrator actions write
workflow records. Publication remains owned by the existing Autopilot.
"""
import hashlib
import ipaddress
import json
import os
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Literal, Optional
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pymongo.errors import DuplicateKeyError

CONTENT_PATH = Path(__file__).with_name('seo_content_plan.json')
DEFAULT_PLAN_ID = 'rajeev-seo90-20261025'
KINDS = ('technical', 'content', 'offpage', 'conversion', 'measurement')
DEFAULT_SETTINGS = {'weekly_review_day': 'monday', 'target_keywords': ['website freelancer in Gurgaon', 'freelance website developer Gurgaon', 'SEO consultant Gurgaon'], 'notes': ''}
OFFPAGE = [
    ('Check the existing business profile', 'Confirm the real business identity, contact details, ownership and public listing URL before proposing changes.'),
    ('Research relevant citation opportunities', 'List genuine local or industry directories and assess relevance, editorial requirements and existing duplicates.'),
    ('Record an approved profile submission', 'If a relevant profile is approved, submit truthful details manually and record the submission evidence; a submission is not a live backlink.'),
    ('Check submitted profile outcomes', 'Record whether an earlier submission is pending, rejected or publicly visible. Add the exact public URL only when a placement exists.'),
    ('Prepare a useful contribution', 'Identify one relevant community or publication and prepare an original answer or resource. Keep unpublished drafts labelled as drafts.'),
    ('Review existing citation consistency', 'Compare business name, phone, website and service area across genuine existing listings and note discrepancies.'),
    ('Review editorial opportunities', 'Assess relevant publications and prepare a helpful pitch or contribution; do not claim outreach or publication without evidence.'),
    ('Record an approved contribution outcome', 'Record an actual owner-approved contribution or its submission status. Avoid paid link schemes and mass directory submissions.'),
    ('Audit citation and placement links', 'Manually check recorded public URLs for the intended destination and context, and document removed or incorrect placements.'),
    ('Prepare a local business resource', 'Develop a useful resource for the actual service area and identify relevant places where it could help readers.'),
    ('Follow up on existing submissions', 'Record permitted follow-ups and actual replies. Pending or rejected submissions remain distinct from live placements.'),
    ('Review genuine external mentions', 'Record relevant, verifiable mentions and check that they refer to the correct business and website.'),
    ('Close the citation evidence log', 'Summarize confirmed placements, submissions still pending and opportunities not pursued, with evidence URLs.'),
]
TECHNICAL = [
    'Record the deployment and GSC baseline', 'Check priority service URLs and canonical continuity',
    'Review crawling, robots and sitemap coverage', 'Review mobile layout and enquiry performance',
    'Check internal links and article discovery', 'Review indexed and excluded URL examples',
    'Check service and location content accuracy', 'Review image delivery and page loading evidence',
    'Check duplicate and redirected URL behavior', 'Review priority pages against real buyer questions',
    'Check new article indexing and internal links', 'Review genuine market pages and business details',
    'Document the final technical findings and remaining work',
]
CONVERSION = [
    'Verify a real website enquiry reaches the team', 'Review the contact and WhatsApp journeys',
    'Check mobile enquiry form labels and error states', 'Review offer clarity on a priority service page',
    'Review enquiry source tracking', 'Check follow-up ownership for genuine enquiries',
    'Review the consultation request journey', 'Check accessibility of important calls to action',
    'Review qualified enquiries against source channels', 'Review service scope and proposal requests',
    'Check contact information consistency', 'Review enquiry quality and common questions',
    'Document improvements and unresolved conversion issues',
]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def today_local():
    return datetime.now(ZoneInfo('Asia/Kolkata')).date()


def normalized_title(value):
    return ' '.join(str(value or '').casefold().split())


def topic_policy(topic, article=None):
    """An editorial refresh is never permission to create a replacement post."""
    records = [topic, article or {}]
    refresh_actions = {'refresh_candidate', 'refresh_existing', 'refresh_existing_post'}
    actions = [record.get('intent_action') or record.get('status') for record in records]
    blocked = any(action in refresh_actions for action in actions) or any(
        record.get('queue_eligible') is False or record.get('new_post_eligible') is False
        for record in records)
    targets = []
    for record in records:
        values = list(record.get('existing_target_slugs') or [])
        if record.get('existing_post_slug'): values.append(record['existing_post_slug'])
        targets.extend(str(value) for value in values if value)
    explicit_action = next((record.get('intent_action') for record in records if record.get('intent_action')), None)
    source_reports_publication = any(record.get('status') == 'published' or record.get('intent_action') in {'already_published', 'already_created'} for record in records)
    return {'queue_eligible': not blocked,
            'intent_action': next((action for action in actions if action in refresh_actions), explicit_action or ('review_existing' if blocked else 'new_article')),
            'existing_target_slugs': list(dict.fromkeys(targets)),
            'existing_content_read_only': bool(blocked or targets or source_reports_publication),
            'may_merge_into_existing': False, 'may_replace_existing': False,
            'review_reason': ('already_created' if source_reports_publication and not any(action in refresh_actions for action in actions) else 'review_existing') if blocked else None}


def provider_diagnostic(settings, profiles=None):
    """Report the latest saved outcome, without calling or trusting a provider."""
    from ai_runtime import safe_error_message
    if profiles is None:
        present = bool(os.environ.get('EMERGENT_LLM_KEY', '').strip())
        profiles = {'text': {'provider': 'emergent', 'api_key': 'present' if present else '', 'key_source': 'environment' if present else 'unset'},
                    'image': {'provider': 'emergent', 'api_key': 'present' if present else '', 'key_source': 'environment' if present else 'unset'}}
    text_profile, image_profile = profiles.get('text') or {}, profiles.get('image') or {}
    credential_present = bool(text_profile.get('api_key'))
    def timestamp(value):
        try:
            parsed = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
            return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed
        except (TypeError, ValueError):
            return None
    last_run, last_success = timestamp(settings.get('last_run_at')), timestamp(settings.get('last_success_at'))
    error = settings.get('last_error')
    active_error = bool(error) and not (last_run and last_success and last_success > last_run)
    safe_error = safe_error_message(RuntimeError(str(error))) if active_error else None
    if active_error and any(marker in str(error).casefold() for marker in ('401', 'api_key_invalid', 'invalid api key', 'api key not valid', 'authentication failed', 'unauthorized')):
        state, message = 'blocked_authentication', safe_error
    elif active_error:
        state, message = 'generation_error', safe_error
    elif text_profile.get('key_source') == 'unavailable':
        state = 'configuration_unavailable'
        message = 'The protected provider settings could not be read. Restore the stable backend encryption configuration in Admin → API Settings; existing published article reads remain available.'
    elif not credential_present:
        state = 'credential_missing'
        message = 'Configure a matching text provider key in Admin → API Settings or on the server. Existing published article reads remain available.'
    elif settings.get('generate_cover', True) and not image_profile.get('api_key'):
        state = 'image_credential_missing'
        message = 'A text credential is present, but cover generation needs its own matching image-provider configuration. No provider request was performed.'
    else:
        state = 'not_verified'
        message = 'Provider credentials are configured. An enabled schedule or an older success does not verify the current key, cover generation or future scheduled runs.'
    return {'state': state, 'message': message, 'credential_present': credential_present,
            'image_credential_present': bool(image_profile.get('api_key')),
            'text_provider': text_profile.get('provider'), 'image_provider': image_profile.get('provider'),
            'text_key_source': text_profile.get('key_source'), 'image_key_source': image_profile.get('key_source'),
            'credential_value_exposed': False, 'provider_request_performed': False,
            'latest_failure': safe_error, 'failure_is_latest': active_error,
            'generated_count': settings.get('generated_count'),
            'last_attempt_at': settings.get('last_run_at'), 'last_success_at': settings.get('last_success_at')}


async def _runtime_diagnostic_profiles(db):
    try:
        from api_credentials import get_runtime_credentials
        return await get_runtime_credentials(db)
    except Exception:
        # The dashboard remains readable even when vault configuration needs
        # attention. Values and raw decryption/provider errors stay private.
        return {'text': {'provider': None, 'api_key': '', 'key_source': 'unavailable'},
                'image': {'provider': None, 'api_key': '', 'key_source': 'unavailable'}}


def public_url(value):
    """Validate evidence as a public URL; this function never fetches it."""
    value = str(value or '').strip()
    try:
        parsed = urlsplit(value)
        if parsed.scheme not in {'http', 'https'} or not parsed.hostname or parsed.username or parsed.password:
            raise ValueError('Use a public http(s) URL without credentials.')
        host = parsed.hostname.lower()
        if host == 'localhost' or host.endswith(('.localhost', '.local', '.internal')) or '.' not in host:
            raise ValueError('Use a public website URL.')
        try:
            if not ipaddress.ip_address(host).is_global:
                raise ValueError('Private or local network URLs cannot be evidence.')
        except ValueError as exc:
            if 'network URLs' in str(exc): raise
        _ = parsed.port
    except (ValueError, TypeError):
        raise ValueError('Use a valid public http(s) URL without credentials or private network addresses.') from None
    return value


class ActivateInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    start_date: Optional[date] = None
    queue_topics: bool = False


class SettingsInput(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    status: Optional[Literal['active', 'paused', 'completed']] = None
    weekly_review_day: Optional[Literal['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']] = None
    target_keywords: Optional[list[str]] = Field(None, max_length=30)
    notes: Optional[str] = Field(None, max_length=4000)

    @field_validator('target_keywords')
    @classmethod
    def clean_keywords(cls, values):
        if values is None: return values
        result = []
        for value in values:
            value = value.strip()
            if not value or len(value) > 120: raise ValueError('Keywords must have 1–120 characters.')
            if value not in result: result.append(value)
        return result


class TaskInput(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    status: Optional[Literal['pending', 'in_progress', 'done']] = None
    notes: Optional[str] = Field(None, max_length=6000)
    evidence_urls: Optional[list[str]] = Field(None, max_length=30)

    @field_validator('evidence_urls')
    @classmethod
    def check_urls(cls, values):
        return list(dict.fromkeys(public_url(value) for value in values)) if values is not None else values


class EvidenceInput(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    url: str = Field(max_length=2048)
    kind: Literal['source', 'opportunity', 'submission', 'live_placement', 'report'] = 'source'
    note: str = Field('', max_length=2000)

    @field_validator('url')
    @classmethod
    def check_url(cls, value): return public_url(value)


class EvidenceReviewInput(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    status: Literal['recorded', 'owner_confirmed', 'rejected']
    note: Optional[str] = Field(None, max_length=2000)


class QueueInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    topic_ids: Optional[list[str]] = Field(None, max_length=13)
    upto_week: Optional[int] = Field(None, ge=1, le=13)


class MetricInput(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    date: date
    organic_clicks: Optional[int] = Field(None, ge=0, le=10**9)
    impressions: Optional[int] = Field(None, ge=0, le=10**12)
    indexed_pages: Optional[int] = Field(None, ge=0, le=10**9)
    qualified_leads: Optional[int] = Field(None, ge=0, le=10**9)
    ai_impressions: Optional[int] = Field(None, ge=0, le=10**12)
    source_url: Optional[str] = Field(None, max_length=2048)
    notes: Optional[str] = Field(None, max_length=3000)

    @field_validator('source_url')
    @classmethod
    def check_url(cls, value): return public_url(value) if value else None


class Workflow:
    def __init__(self, db, content_path=None, today_fn=None):
        self.db = db
        self.content_path = Path(content_path or CONTENT_PATH)
        self.today = today_fn or today_local

    def content(self):
        try:
            content = json.loads(self.content_path.read_text(encoding='utf-8'))
            weeks = content['weeks']
            if len(weeks) != 13 or {int(w['week']) for w in weeks} != set(range(1, 14)):
                raise ValueError('Expected thirteen distinct weeks')
            if len({w['topic_id'] for w in weeks}) != 13:
                raise ValueError('Expected unique topic IDs')
            content['content_available'] = True
            return content
        except (OSError, KeyError, ValueError, TypeError):
            return {'plan_id': DEFAULT_PLAN_ID, 'content_available': False, 'weeks': [
                {'week': week, 'topic_id': f'week-{week:02d}', 'title': f'Week {week} article review', 'brief': 'The researched content plan must be available before queuing.'}
                for week in range(1, 14)], 'sources': [], 'articles': []}

    async def indexes(self):
        for name in ('seo_workflow_plans', 'seo_workflow_tasks', 'seo_workflow_metrics', 'seo_workflow_topic_ledger'):
            await self.db[name].create_index('id', unique=True)

    async def insert_once(self, collection, record_id, values):
        # Unique IDs make retries and concurrent activation safe. An existing
        # record always wins, including its status, dates, notes and evidence.
        try:
            await collection.update_one({'id': record_id}, {'$setOnInsert': values}, upsert=True)
        except DuplicateKeyError:
            pass

    def skeleton(self, content, start=None):
        plan_id = content['plan_id']
        tasks, weeks = [], []
        for row in sorted(content['weeks'], key=lambda w: int(w['week'])):
            week = int(row['week'])
            first = (week - 1) * 7
            last = min(week * 7 - 1, 89)
            due = (start + timedelta(days=last)).isoformat() if start else None
            ids = []
            for kind in KINDS:
                task_id = f'{plan_id}:w{week:02d}:{kind}'
                title, description = {
                    'technical': (TECHNICAL[week - 1], 'Use actual page responses and the relevant Search Console examples. Preserve working URLs and saved metadata; record what was checked.'),
                    'content': ('Review and prepare: ' + row['title'], row.get('brief', 'Review the article against the service scope, source material and real buyer questions before queuing it.')),
                    'offpage': OFFPAGE[week - 1],
                    'conversion': (CONVERSION[week - 1], 'Test the real customer journey and record evidence or findings. A submitted form or button click is not automatically a qualified lead.'),
                    'measurement': ('Record the weekly SEO and enquiry review', 'Enter measured clicks, impressions, index coverage, AI visibility and qualified enquiries where available. Leave unavailable metrics blank and retain the reporting source.'),
                }[kind]
                tasks.append({'id': task_id, 'plan_id': plan_id, 'week': week, 'kind': kind, 'title': title, 'description': description, 'due_date': due, 'status': 'pending', 'notes': '', 'evidence': [], 'evidence_urls': []})
                ids.append(task_id)
            weeks.append({'week': week, 'title': row.get('title'), 'start_date': (start + timedelta(days=first)).isoformat() if start else None, 'due_date': due, 'days': last - first + 1, 'task_ids': ids, 'topic_id': row['topic_id']})
        return tasks, weeks

    async def require_plan(self, active=False):
        plan = await self.db.seo_workflow_plans.find_one({'id': self.content()['plan_id']}, {'_id': 0})
        if not plan: raise HTTPException(409, 'Activate the 90-day plan first.')
        if active and plan.get('status') != 'active': raise HTTPException(409, 'Resume the plan before queuing topics.')
        return plan

    async def task(self, task_id):
        plan = await self.require_plan()
        task = await self.db.seo_workflow_tasks.find_one({'id': task_id, 'plan_id': plan['id']}, {'_id': 0})
        if not task: raise HTTPException(404, 'Workflow task not found.')
        return task

    async def overview(self):
        content = self.content()
        saved = await self.db.seo_workflow_plans.find_one({'id': content['plan_id']}, {'_id': 0})
        plan = saved or {'id': content['plan_id'], 'status': 'not_started', 'duration_days': 90, 'start_date': None, 'end_date': None, 'timezone': 'Asia/Kolkata', 'activated_at': None}
        start = date.fromisoformat(plan['start_date']) if plan.get('start_date') else None
        defaults, weeks = self.skeleton(content, start)
        rows = await self.db.seo_workflow_tasks.find({'plan_id': plan['id']}, {'_id': 0}).to_list(100)
        by_id = {row['id']: row for row in rows}
        tasks = [{**task, **by_id.get(task['id'], {})} for task in defaults]
        metrics = await self.db.seo_workflow_metrics.find({'plan_id': plan['id']}, {'_id': 0}).sort('date', -1).to_list(100)
        ap_raw = await self.db.settings.find_one({'key': 'blog_autopilot'}, {'_id': 0})
        ap = ap_raw or {}
        # Read raw settings without calling Autopilot.get_settings(), which may
        # write its initial schedule date. Existing legacy defaults are reported.
        configured = ap_raw is not None
        custom = ap.get('custom_topics') or []
        posts = await self.db.blog_posts.find({}, {'_id': 0, 'id': 1, 'slug': 1, 'title': 1, 'published': 1, 'autopilot_run_key': 1}).to_list(2000)
        history = await self.db.autopilot_topics.find({}, {'_id': 0}).sort('created_at', -1).to_list(2000)
        ledgers = await self.db.seo_workflow_topic_ledger.find({'plan_id': plan['id']}, {'_id': 0}).to_list(30)
        ledger_by_id = {row['topic_id']: row for row in ledgers}
        source_by_id = {source['id']: source for source in content.get('sources', [])}
        articles_by_topic = {article['topic_id']: article for article in content.get('articles', [])}
        topics = []
        for row in sorted(content['weeks'], key=lambda item: item['week']):
            title_key = normalized_title(row['title'])
            article = articles_by_topic.get(row['topic_id'], {})
            policy = topic_policy(row, article)
            candidate_slugs = {row.get('slug'), article.get('slug'), *policy['existing_target_slugs']}
            used = next((item for item in history if normalized_title(item.get('topic')) == title_key and item.get('status') == 'used'), None)
            post = next((item for item in posts if item.get('slug') in candidate_slugs or normalized_title(item.get('title')) == title_key or used and item.get('slug') == used.get('slug')), None)
            queued = any(normalized_title(t) == title_key for t in custom) or any(normalized_title(item.get('topic')) == title_key and item.get('status') == 'queued' for item in history)
            status = ('published' if post.get('published') else 'draft') if post else ('queued' if queued else 'planned')
            ledger = ledger_by_id.get(row['topic_id'])
            topics.append({'id': row['topic_id'], 'week': row['week'], 'title': row['title'], 'slug': row.get('slug'), 'brief': row.get('brief', ''), 'internal_links': row.get('internal_links', []), 'source_ids': row.get('source_ids', []), 'source_urls': [source_by_id[x]['url'] for x in row.get('source_ids', []) if x in source_by_id], 'status': status, 'post_url': '/blog/' + post['slug'] if post else None, 'draft_available': row['topic_id'] in articles_by_topic, 'queue_state': 'queued' if queued else ('previously_recorded' if ledger else 'not_queued'), 'queued_at': (ledger or {}).get('queued_at'), **policy})
        today = self.today()
        current_week = min(13, (today - start).days // 7 + 1) if start and today >= start else 0
        count = {key: sum(task['status'] == key for task in tasks) for key in ('pending', 'in_progress', 'done')}
        evidence = [item for task in tasks for item in task.get('evidence', [])]
        drafts = [{**article, 'source_urls': [source_by_id[x]['url'] for x in article.get('source_ids', []) if x in source_by_id]} for article in content.get('articles', [])]
        return {'plan': {k: v for k, v in plan.items() if k != 'settings'}, 'settings': {**DEFAULT_SETTINGS, **plan.get('settings', {})}, 'weeks': weeks, 'tasks': tasks, 'blog_topics': topics, 'blog_drafts': drafts, 'metrics': metrics,
            'summary': {'tasks_total': len(tasks), **count, 'overdue': sum(bool(task.get('due_date')) and task['due_date'] < today.isoformat() and task['status'] != 'done' for task in tasks), 'current_week': current_week, 'evidence_links': len(evidence), 'owner_confirmed_links': sum(item.get('status') == 'owner_confirmed' for item in evidence), 'metrics_logged': len(metrics), 'topics_queued': sum(item['status'] == 'queued' for item in topics), 'topics_published': sum(item['status'] == 'published' for item in topics), 'refresh_candidates': sum(not item['queue_eligible'] for item in topics), 'new_topics_published': sum(item['status'] == 'published' and item['queue_eligible'] for item in topics)},
            'autopilot': {'configured': configured, 'enabled': ap.get('enabled', True) if configured else False, 'auto_publish': ap.get('auto_publish', True) if configured else False, 'frequency': ap.get('frequency', 'daily') if configured else 'not_configured', 'queue_count': len(custom), 'max_posts_per_run': 1, 'provider_diagnostic': provider_diagnostic(ap, await _runtime_diagnostic_profiles(self.db))},
            'content_available': content.get('content_available', False),
            'limits': ['The plan tracks work; it does not submit backlinks, send outreach or guarantee inclusion, rankings or AI recommendations.', 'Evidence URLs are administrator records. Owner confirmation is a manual review, not an automated backlink verification.', 'Researched article drafts are separate from saved blog posts. Queuing uses the existing Blog Autopilot and its current draft/publish settings.', 'Curated topics become eligible in their planned week. Queueing does not start generation immediately, and each existing Autopilot run handles at most one post.', 'Pausing this plan prevents new workflow queuing; existing Blog Autopilot scheduling is managed separately.']}

    async def activate(self, payload, admin):
        await self.indexes()
        content = self.content(); plan_id = content['plan_id']
        existing = await self.db.seo_workflow_plans.find_one({'id': plan_id}, {'_id': 0})
        requested = payload.start_date or self.today()
        if existing and payload.start_date and existing['start_date'] != requested.isoformat():
            raise HTTPException(409, 'The plan is already activated with another start date. Existing tasks and evidence have been retained.')
        start = date.fromisoformat(existing['start_date']) if existing else requested
        now = now_iso()
        plan = {'id': plan_id, 'status': 'active', 'duration_days': 90, 'start_date': start.isoformat(), 'end_date': (start + timedelta(days=89)).isoformat(), 'timezone': 'Asia/Kolkata', 'activated_at': now, 'activated_by': admin['email'], 'settings': dict(DEFAULT_SETTINGS)}
        await self.insert_once(self.db.seo_workflow_plans, plan_id, plan)
        committed = await self.db.seo_workflow_plans.find_one({'id': plan_id}, {'_id': 0})
        if payload.start_date and committed['start_date'] != payload.start_date.isoformat():
            raise HTTPException(409, 'The plan was already activated with another start date. Existing tasks and evidence have been retained.')
        start = date.fromisoformat(committed['start_date'])
        tasks, _ = self.skeleton(content, start)
        for task in tasks:
            await self.insert_once(self.db.seo_workflow_tasks, task['id'], {**task, 'created_at': now})
        queue_result = await self.queue(QueueInput(upto_week=1), admin) if payload.queue_topics else None
        result = await self.overview()
        result['activation'] = {'already_active': existing is not None, 'queued': queue_result}
        return result

    async def settings(self, payload, admin):
        plan = await self.require_plan()
        patch = payload.model_dump(exclude_none=True)
        status = patch.pop('status', None)
        update = {f'settings.{key}': value for key, value in patch.items()}
        if status:
            if status == 'completed' and await self.db.seo_workflow_tasks.count_documents({'plan_id': plan['id'], 'status': {'$ne': 'done'}}):
                raise HTTPException(409, 'Complete the outstanding tasks before marking the plan completed.')
            update['status'] = status
        if update:
            update.update(updated_at=now_iso(), updated_by=admin['email'])
            await self.db.seo_workflow_plans.update_one({'id': plan['id']}, {'$set': update})
        return await self.overview()

    def evidence_record(self, task_id, url, admin, kind='source', note=''):
        return {'id': hashlib.sha256((task_id + '\n' + url).encode()).hexdigest()[:20], 'url': url, 'kind': kind, 'note': note, 'status': 'recorded', 'external_check_performed': False, 'recorded_at': now_iso(), 'recorded_by': admin['email']}

    async def update_task(self, task_id, payload, admin):
        task = await self.task(task_id)
        patch = payload.model_dump(exclude_none=True); urls = patch.pop('evidence_urls', [])
        evidence = list(task.get('evidence', [])); existing = {item['url'] for item in evidence}
        for url in urls:
            if url not in existing:
                evidence.append(self.evidence_record(task_id, url, admin)); existing.add(url)
        if patch.get('status') == 'done' and task['kind'] == 'offpage' and not any(item.get('status') != 'rejected' for item in evidence):
            raise HTTPException(400, 'Record an evidence URL before completing an off-page task; drafts and opportunities are not live placements.')
        patch.update(evidence=evidence, evidence_urls=[item['url'] for item in evidence], updated_at=now_iso(), updated_by=admin['email'])
        await self.db.seo_workflow_tasks.update_one({'id': task_id, 'plan_id': task['plan_id']}, {'$set': patch})
        return await self.task(task_id)

    async def add_evidence(self, task_id, payload, admin):
        task = await self.task(task_id)
        evidence = list(task.get('evidence', []))
        if not any(item['url'] == payload.url for item in evidence):
            evidence.append(self.evidence_record(task_id, payload.url, admin, payload.kind, payload.note))
        await self.db.seo_workflow_tasks.update_one({'id': task_id, 'plan_id': task['plan_id']}, {'$set': {'evidence': evidence, 'evidence_urls': [item['url'] for item in evidence], 'updated_at': now_iso(), 'updated_by': admin['email']}})
        return await self.task(task_id)

    async def review_evidence(self, task_id, evidence_id, payload, admin):
        task = await self.task(task_id); evidence = list(task.get('evidence', []))
        item = next((item for item in evidence if item['id'] == evidence_id), None)
        if not item: raise HTTPException(404, 'Evidence record not found.')
        item.update(status=payload.status, reviewed_at=now_iso(), reviewed_by=admin['email'], verification_method='manual_admin_review', external_check_performed=False)
        if payload.note is not None: item['note'] = payload.note
        status = task['status']
        if task['kind'] == 'offpage' and status == 'done' and not any(row.get('status') != 'rejected' for row in evidence): status = 'in_progress'
        await self.db.seo_workflow_tasks.update_one({'id': task_id, 'plan_id': task['plan_id']}, {'$set': {'evidence': evidence, 'status': status, 'updated_at': now_iso(), 'updated_by': admin['email']}})
        return await self.task(task_id)

    async def queue(self, payload, admin):
        plan = await self.require_plan(active=True); content = self.content()
        if not content.get('content_available'): raise HTTPException(503, 'The researched content plan is unavailable; topics were not queued.')
        overview = await self.overview()
        if overview['summary']['current_week'] == 0:
            raise HTTPException(409, 'The plan start date has not arrived. Topics were not queued.')
        chosen_ids = set(payload.topic_ids or [])
        known_ids = {row['topic_id'] for row in content['weeks']}
        if chosen_ids - known_ids: raise HTTPException(400, 'Unknown curated topic ID.')
        upto = payload.upto_week or max(1, overview['summary']['current_week'])
        candidates = [row for row in content['weeks'] if row['topic_id'] in chosen_ids] if chosen_ids else [row for row in content['weeks'] if row['week'] <= upto]
        if any(row['week'] > overview['summary']['current_week'] for row in candidates):
            raise HTTPException(409, 'Future-week topics are not due yet. Queue them when their planned week starts.')
        results = []
        topic_views = {row['id']: row for row in overview['blog_topics']}
        article_by_topic = {article['topic_id']: article for article in content.get('articles', [])}
        for row in candidates:
            article = article_by_topic.get(row['topic_id'], {})
            policy = topic_policy(row, article)
            if not policy['queue_eligible'] and policy['review_reason'] != 'already_created':
                results.append({'id': row['topic_id'], 'result': 'review_existing', 'reason': 'review_existing', 'existing_target_slugs': policy['existing_target_slugs']})
                continue
            # Read again at the point of queuing: an administrator may have
            # manually published the researched draft since the overview loaded.
            candidate_slugs = {slug for slug in (row.get('slug'), article.get('slug'), row.get('existing_post_slug'), article.get('existing_post_slug')) if slug}
            published = await self.db.blog_posts.find_one({'published': True, '$or': [{'slug': slug} for slug in sorted(candidate_slugs)] + [{'title': row['title']}]}, {'_id': 0, 'slug': 1, 'title': 1})
            if published:
                results.append({'id': row['topic_id'], 'result': 'existing_published', 'reason': 'existing_published', 'post_url': '/blog/' + published['slug']})
                continue
            if not policy['queue_eligible']:
                # Source notes about a manual publication are not a substitute
                # for the current database record, and never permit a duplicate.
                results.append({'id': row['topic_id'], 'result': 'review_existing', 'reason': 'review_existing', 'existing_target_slugs': policy['existing_target_slugs']})
                continue
            ledger_id = plan['id'] + ':' + row['topic_id']
            ledger = await self.db.seo_workflow_topic_ledger.find_one({'id': ledger_id}, {'_id': 0})
            if ledger and ledger.get('status') != 'reserved':
                results.append({'id': row['topic_id'], 'result': 'already_recorded'}); continue
            actual = topic_views[row['topic_id']]
            if actual['status'] in {'draft', 'published', 'queued'}:
                await self.insert_once(self.db.seo_workflow_topic_ledger, ledger_id, {'id': ledger_id, 'plan_id': plan['id'], 'topic_id': row['topic_id'], 'status': 'existing_' + actual['status'], 'recorded_at': now_iso(), 'recorded_by': admin['email']})
                results.append({'id': row['topic_id'], 'result': 'existing_' + actual['status']}); continue
            await self.insert_once(self.db.seo_workflow_topic_ledger, ledger_id, {'id': ledger_id, 'plan_id': plan['id'], 'topic_id': row['topic_id'], 'status': 'reserved', 'recorded_at': now_iso(), 'recorded_by': admin['email']})
            # A missing Autopilot configuration starts disabled. Existing enabled,
            # auto_publish, queue order and all other settings remain untouched.
            existing_ap = await self.db.settings.find_one({'key': 'blog_autopilot'}, {'_id': 0})
            if existing_ap is None:
                try:
                    await self.db.settings.insert_one({'_id': 'seo-workflow-blog-autopilot', 'key': 'blog_autopilot', 'enabled': False, 'auto_publish': False, 'custom_topics': []})
                except DuplicateKeyError:
                    pass
            result = await self.db.settings.update_one({'key': 'blog_autopilot'}, {'$addToSet': {'custom_topics': row['title']}})
            await self.db.seo_workflow_topic_ledger.update_one({'id': ledger_id}, {'$set': {'status': 'queued', 'queued_at': now_iso(), 'queued_by': admin['email']}})
            results.append({'id': row['topic_id'], 'result': 'queued' if result.modified_count else 'existing_queued'})
        queued_count = sum(item['result'] == 'queued' for item in results)
        refresh_count = sum(item['result'] == 'review_existing' for item in results)
        message = ('Eligible topics were added to the existing Blog Autopilot queue. Its current schedule and draft/publish settings control processing.' if queued_count else
                   'No new topics were queued. Existing article references are read-only; no edits or replacements were applied.' if refresh_count else
                   'No new topics were queued. Existing articles and earlier queue records were retained.')
        return {'results': results, 'queued_count': queued_count, 'existing_count': sum(item['result'] != 'queued' for item in results), 'review_existing_count': refresh_count, 'publication_started': False, 'max_posts_per_run': 1, 'message': message}

    async def metric(self, payload, admin):
        plan = await self.require_plan()
        if payload.date > self.today(): raise HTTPException(400, 'Actual metrics cannot be dated in the future.')
        numeric = ('organic_clicks', 'impressions', 'indexed_pages', 'qualified_leads', 'ai_impressions')
        if not any(getattr(payload, key) is not None for key in numeric): raise HTTPException(400, 'Record at least one measured numeric value; use zero only when the measured result is zero.')
        metric_id = plan['id'] + ':' + payload.date.isoformat()
        values = payload.model_dump(exclude_unset=True)
        values['date'] = payload.date.isoformat()
        values.update(updated_at=now_iso(), updated_by=admin['email'], source='manual_admin_entry')
        await self.db.seo_workflow_metrics.update_one({'id': metric_id}, {'$set': values, '$setOnInsert': {'id': metric_id, 'plan_id': plan['id'], 'created_at': now_iso()}}, upsert=True)
        return await self.db.seo_workflow_metrics.find_one({'id': metric_id}, {'_id': 0})


def build_router(*, db, get_current_admin, content_path=None, today_fn=None):
    workflow = Workflow(db, content_path, today_fn)
    router = APIRouter(prefix='/admin/seo-workflow')
    router.workflow_service = workflow

    @router.get('')
    async def overview(admin=Depends(get_current_admin)): return await workflow.overview()

    @router.post('/activate')
    async def activate(payload: ActivateInput, admin=Depends(get_current_admin)): return await workflow.activate(payload, admin)

    @router.patch('/settings')
    async def settings(payload: SettingsInput, admin=Depends(get_current_admin)): return await workflow.settings(payload, admin)

    @router.patch('/tasks/{task_id}')
    async def task(task_id: str, payload: TaskInput, admin=Depends(get_current_admin)): return await workflow.update_task(task_id, payload, admin)

    @router.post('/tasks/{task_id}/evidence')
    async def evidence(task_id: str, payload: EvidenceInput, admin=Depends(get_current_admin)): return await workflow.add_evidence(task_id, payload, admin)

    @router.patch('/tasks/{task_id}/evidence/{evidence_id}')
    async def review(task_id: str, evidence_id: str, payload: EvidenceReviewInput, admin=Depends(get_current_admin)): return await workflow.review_evidence(task_id, evidence_id, payload, admin)

    @router.post('/queue-topics')
    async def queue(payload: QueueInput, admin=Depends(get_current_admin)): return await workflow.queue(payload, admin)

    @router.post('/metrics')
    async def metric(payload: MetricInput, admin=Depends(get_current_admin)): return await workflow.metric(payload, admin)

    return router
