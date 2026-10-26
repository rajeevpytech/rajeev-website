"""Runtime provider adapters. Credentials are resolved per explicit generation call.

Reading pages/settings or importing this module never calls a provider. Google
keys are sent only to Google's fixed host; Emergent keys stay with its SDK.
"""
import base64
import re
from contextlib import asynccontextmanager

import httpx


class ProviderRuntimeError(RuntimeError):
    def __init__(self, code, purpose='generation'):
        self.code = code
        self.purpose = purpose
        super().__init__(safe_error_message(self, purpose))


def _error_code(error):
    if isinstance(error, ProviderRuntimeError):
        return error.code
    code = getattr(error, 'code', None)
    if isinstance(code, str) and code in {'credential_missing', 'storage_unavailable', 'authentication', 'permission', 'quota', 'model_unavailable', 'timeout', 'invalid_response', 'provider_error'}:
        return code
    status = getattr(error, 'status_code', None) or getattr(getattr(error, 'response', None), 'status_code', None)
    # Inspect errors for classification only. Never return their text, headers,
    # URLs or bodies, which can contain a key echoed by an upstream service.
    raw = str(error).casefold()
    if status == 401 or any(word in raw for word in ('401', 'api_key_invalid', 'invalid api key', 'api key not valid', 'authentication failed', 'unauthorized')):
        return 'authentication'
    if status == 403 or 'permission_denied' in raw:
        return 'permission'
    if status == 429 or any(word in raw for word in ('429', 'resource_exhausted', 'quota exceeded')):
        return 'quota'
    if status == 404 or 'model not found' in raw or 'not_found' in raw:
        return 'model_unavailable'
    if isinstance(error, (TimeoutError, httpx.TimeoutException)) or 'timed out' in raw:
        return 'timeout'
    return 'provider_error'


def safe_error_message(error, purpose='generation'):
    label = {'text': 'Text generation', 'image': 'Cover image generation'}.get(purpose, 'Generation')
    messages = {
        'credential_missing': 'requires a matching provider key. Configure it in Admin → API Settings or the server environment.',
        'storage_unavailable': 'could not read the protected API settings. Check the server encryption configuration.',
        'authentication': 'was rejected by the provider (HTTP 401 / invalid API key). Update the matching provider key in Admin → API Settings and explicitly test it.',
        'permission': 'was denied by the provider (HTTP 403). Check the key permissions, project access and selected model.',
        'quota': 'is blocked by provider quota or rate limits (HTTP 429). Check the provider account before retrying.',
        'model_unavailable': 'could not access the selected model (HTTP 404). Check the model and provider selection.',
        'timeout': 'timed out. Retry after checking the provider status.',
        'invalid_response': 'returned no usable result. Check the selected model and retry.',
        'provider_error': 'failed. Check the provider configuration and retry; upstream error details are withheld to protect credentials.',
    }
    return label + ' ' + messages.get(_error_code(error), messages['provider_error'])


@asynccontextmanager
async def _gate(gate):
    if gate is None:
        yield
    else:
        async with gate:
            yield


async def _profile(db, purpose):
    try:
        from api_credentials import get_runtime_credentials
        profiles = await get_runtime_credentials(db)
        profile = profiles.get(purpose) or {}
    except Exception:
        raise ProviderRuntimeError('storage_unavailable', purpose) from None
    if profile.get('provider') not in {'emergent', 'google'} or not profile.get('api_key'):
        raise ProviderRuntimeError('credential_missing', purpose)
    model = str(profile.get('model') or '')
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]{0,127}', model):
        raise ProviderRuntimeError('model_unavailable', purpose)
    return profile


async def _google_generate(profile, prompt, *, system='', image=False):
    purpose = 'image' if image else 'text'
    payload = {'contents': [{'role': 'user', 'parts': [{'text': prompt}]}]}
    if system:
        payload['systemInstruction'] = {'parts': [{'text': system}]}
    if image:
        payload['generationConfig'] = {'responseModalities': ['TEXT', 'IMAGE']}
    # Model is validated above. Keys are headers, never query parameters.
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{profile['model']}:generateContent"
    async with httpx.AsyncClient(timeout=90.0, follow_redirects=False) as client:
        response = await client.post(url, headers={'x-goog-api-key': profile['api_key'], 'Content-Type': 'application/json'}, json=payload)
    if response.status_code != 200:
        error = RuntimeError('')
        error.status_code = response.status_code
        try:
            raw = response.json().get('error', {})
            # Provider messages are used only by the classifier, never exposed.
            error = RuntimeError(str(raw.get('status', '')) + ' ' + str(raw.get('message', '')))
            error.status_code = response.status_code
        except Exception:
            pass
        raise ProviderRuntimeError(_error_code(error), purpose)
    data = response.json()
    parts = [part for candidate in data.get('candidates', []) for part in candidate.get('content', {}).get('parts', []) if not part.get('thought')]
    if image:
        for part in parts:
            inline = part.get('inlineData') or part.get('inline_data') or {}
            if str(inline.get('mimeType') or inline.get('mime_type') or '').startswith('image/') and inline.get('data'):
                return base64.b64decode(inline['data'], validate=True)
    else:
        text = ''.join(str(part.get('text') or '') for part in parts).strip()
        if text:
            return text
    raise ProviderRuntimeError('invalid_response', purpose)


async def generate_text(db, prompt, system, session, *, gate=None):
    profile = await _profile(db, 'text')
    try:
        async with _gate(gate):
            if profile['provider'] == 'google':
                return await _google_generate(profile, prompt, system=system)
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            chat = LlmChat(api_key=profile['api_key'], session_id=session, system_message=system).with_model('gemini', profile['model'])
            response = await chat.send_message(UserMessage(text=prompt))
            text = response if isinstance(response, str) else str(response)
            if not text.strip():
                raise ProviderRuntimeError('invalid_response', 'text')
            return text
    except Exception as error:
        raise ProviderRuntimeError(_error_code(error), 'text') from None


async def generate_image(db, prompt, session, *, gate=None):
    profile = await _profile(db, 'image')
    try:
        async with _gate(gate):
            if profile['provider'] == 'google':
                return await _google_generate(profile, prompt, image=True)
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            chat = LlmChat(api_key=profile['api_key'], session_id=session, system_message='You generate editorial cover images.')
            chat.with_model('gemini', profile['model']).with_params(modalities=['image', 'text'])
            _text, images = await chat.send_message_multimodal_response(UserMessage(text=prompt))
            if not images:
                raise ProviderRuntimeError('invalid_response', 'image')
            return base64.b64decode(images[0]['data'], validate=True)
    except Exception as error:
        raise ProviderRuntimeError(_error_code(error), 'image') from None


_PUBLIC_SECTIONS = {'seo', 'contact', 'social', 'business', 'tracking', 'marketing'}
_PRIVATE_KEY = re.compile(r'api.?key|password|secret|credential|cipher|encrypt|token|authorization|private.?key|webhook|^keys?$', re.I)


def public_settings_view(settings):
    """A detached public view; private API settings never enter bootstrap JSON."""
    def clean(value):
        if isinstance(value, dict):
            return {key: clean(item) for key, item in value.items() if not _PRIVATE_KEY.search(str(key))}
        if isinstance(value, list):
            return [clean(item) for item in value]
        return value
    return {key: clean(value) for key, value in (settings or {}).items() if key in _PUBLIC_SECTIONS}


def redact_error_fields(value):
    """Redact historical stored upstream errors when an admin reads run history."""
    if isinstance(value, dict):
        return {key: (safe_error_message(RuntimeError(str(item)), 'image' if 'cover' in str(key) else 'generation')
                      if key in {'error', 'last_error', 'cover_error'} and item else redact_error_fields(item))
                for key, item in value.items() if not _PRIVATE_KEY.search(str(key))}
    if isinstance(value, list):
        return [redact_error_fields(item) for item in value]
    return value
