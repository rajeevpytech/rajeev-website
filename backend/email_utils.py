import os
import re
import ipaddress
import asyncio
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr, formatdate, make_msgid
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

import resend
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("rajeevfreelancer.email")

# EMAIL_PROVIDER: "gmail"/"smtp" (Gmail SMTP) or "resend".
EMAIL_PROVIDER = os.environ.get("EMAIL_PROVIDER", "resend").lower()
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", SMTP_USER or "onboarding@resend.dev")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Rajeev Freelancer")
# Owner can be one or more comma-separated addresses — every lead goes to all of them.
OWNER_EMAILS = [e.strip() for e in os.environ.get("OWNER_EMAIL", "rajeev@rajeevfreelancer.com").split(",") if e.strip()]
OWNER_EMAIL = OWNER_EMAILS[0] if OWNER_EMAILS else "rajeev@rajeevfreelancer.com"
SITE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://rajeevfreelancer.com").rstrip("/")
_last_error: str | None = None


def apply_config(cfg: dict) -> None:
    """Override env defaults with admin-saved settings (server-side only)."""
    global EMAIL_PROVIDER, SMTP_USER, SMTP_PASSWORD, SENDER_EMAIL, OWNER_EMAILS, OWNER_EMAIL, EMAIL_FROM_NAME
    if not cfg:
        return
    if cfg.get("provider"):
        EMAIL_PROVIDER = str(cfg["provider"]).lower()
    if cfg.get("smtp_user") is not None:
        SMTP_USER = str(cfg["smtp_user"]).strip()
    if cfg.get("smtp_password"):
        SMTP_PASSWORD = str(cfg["smtp_password"]).replace(" ", "").strip()
    if cfg.get("from_name"):
        EMAIL_FROM_NAME = str(cfg["from_name"]).strip()
    if SMTP_USER:
        SENDER_EMAIL = SMTP_USER
    owners = [e.strip() for e in (cfg.get("owner_emails") or []) if str(e).strip()]
    if owners:
        OWNER_EMAILS = owners
        OWNER_EMAIL = owners[0]

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan(); scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")


def _html_to_text(html: str) -> str:
    """Rough plain-text version of an HTML email (improves inbox placement)."""
    text = re.sub(r"(?is)<(script|style).*?>.*?</\1>", "", html)
    text = re.sub(r"(?i)<br\s*/?>", "\n", text)
    text = re.sub(r"(?i)</(p|tr|div|h[1-6]|table)>", "\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n\s*\n+", "\n\n", text)
    return text.strip() or "You have a new message from Rajeev Freelancer."


def _send_via_smtp(recipients: list, subject: str, html: str, reply_to: str | None = None) -> str | None:
    """Send a multipart (text + HTML) email through SMTP (e.g. Gmail) with proper
    headers so mailbox providers deliver it to the inbox rather than spam."""
    from_addr = SMTP_USER or SENDER_EMAIL
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = formataddr((EMAIL_FROM_NAME, from_addr))
    msg["To"] = ", ".join(recipients)
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain=from_addr.split("@")[-1])
    if reply_to:
        msg["Reply-To"] = reply_to
    msg["X-Priority"] = "3"
    msg.attach(MIMEText(_html_to_text(html), "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))
    if SMTP_PORT == 465:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(from_addr, recipients, msg.as_string())
    else:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(from_addr, recipients, msg.as_string())
    return "smtp-ok"


async def send_email(*, to, subject: str, html: str, reply_to: str | None = None) -> str | None:
    global _last_error
    _assert_safe_email(subject, html)
    recipients = to if isinstance(to, list) else [to]

    # Gmail / generic SMTP path
    if EMAIL_PROVIDER in ("gmail", "smtp") and SMTP_USER and SMTP_PASSWORD:
        try:
            res = await asyncio.to_thread(_send_via_smtp, recipients, subject, html, reply_to)
            _last_error = None
            return res
        except Exception as e:
            _last_error = f"SMTP: {e}"
            logger.error(f"SMTP send error: {e}")
            return None

    # Resend path
    if not RESEND_API_KEY:
        _last_error = "No email provider configured (SMTP creds / RESEND_API_KEY)"
        logger.warning("No email provider configured (SMTP creds / RESEND_API_KEY) — skipping email send")
        return None
    resend.api_key = RESEND_API_KEY
    params = {
        "from": f"{EMAIL_FROM_NAME} <{SENDER_EMAIL}>",
        "to": recipients,
        "subject": subject,
        "html": html,
    }
    if reply_to:
        params["reply_to"] = reply_to
    try:
        # Resend SDK is synchronous — run in a thread to keep FastAPI non-blocking
        result = await asyncio.to_thread(resend.Emails.send, params)
        _last_error = None
        return result.get("id") if isinstance(result, dict) else None
    except Exception as e:
        _last_error = f"Resend: {e}"
        logger.error(f"Email send error: {e}")
        return None


async def notify_new_lead(lead: dict) -> None:
    """Fire-and-forget owner notification. Never raises (won't break lead capture)."""
    try:
        rows = []
        for label, key in [("Name", "name"), ("Email", "email"), ("Phone", "phone"),
                            ("Service", "service"), ("Budget", "budget"),
                            ("Location", "location"), ("Detected location", "geo_location"),
                            ("Page", "source_path"), ("Message", "message")]:
            val = str(lead.get(key) or "—")
            rows.append(
                f'<tr><td style="padding:6px 14px;color:#8A8A8E;font-size:12px;'
                f'text-transform:uppercase;letter-spacing:1px;white-space:nowrap">{escape(label)}</td>'
                f'<td style="padding:6px 14px;color:#141414;font-size:14px">{escape(val)}</td></tr>'
            )
        html = (
            '<table role="presentation" width="100%" style="background:#FAFAFA;padding:24px">'
            '<tr><td align="center"><table role="presentation" width="560" '
            'style="background:#fff;border:1px solid #E5E7EB;border-radius:16px;'
            'font-family:Arial,Helvetica,sans-serif;overflow:hidden">'
            '<tr><td style="background:#0055FF;padding:20px 24px;color:#fff">'
            '<div style="font-size:18px;font-weight:bold">New lead — Rajeev Freelancer</div>'
            '<div style="font-size:12px;opacity:.85">A new enquiry just landed on your site</div></td></tr>'
            f'<tr><td style="padding:12px 10px"><table role="presentation" width="100%">{"".join(rows)}</table></td></tr>'
            f'<tr><td style="padding:8px 24px 24px"><a href="{SITE_URL}/admin" '
            'style="display:inline-block;background:#141414;color:#fff;text-decoration:none;'
            'padding:12px 22px;border-radius:999px;font-size:13px">Open leads dashboard</a></td></tr>'
            '<tr><td style="padding:14px 24px;border-top:1px solid #E5E7EB;color:#8A8A8E;font-size:11px">'
            'Sent by Rajeev Freelancer. We never ask for your password or card details by email.</td></tr>'
            '</table></td></tr></table>'
        )
        subject = f"New lead: {lead.get('name') or 'Website enquiry'}"
        reply_to = (lead.get("email") or "").strip() or None
        if not email_configured():
            return {"status": "skipped", "reason": "No email provider configured (set EMAIL_PROVIDER=gmail + SMTP_USER/SMTP_PASSWORD)", "to": OWNER_EMAILS}
        result = await send_email(to=OWNER_EMAILS, subject=subject, html=html, reply_to=reply_to)
        if result:
            return {"status": "sent", "to": OWNER_EMAILS, "id": result}
        return {"status": "failed", "to": OWNER_EMAILS, "error": _last_error or "send returned no id"}
    except Exception as e:
        logger.error(f"notify_new_lead failed: {e}")
        return {"status": "failed", "to": OWNER_EMAILS, "error": str(e)}


def email_configured() -> bool:
    if EMAIL_PROVIDER in ("gmail", "smtp"):
        return bool(SMTP_USER and SMTP_PASSWORD)
    return bool(RESEND_API_KEY)


def email_status() -> dict:
    return {
        "configured": email_configured(),
        "provider": EMAIL_PROVIDER,
        "sender": SMTP_USER if EMAIL_PROVIDER in ("gmail", "smtp") else SENDER_EMAIL,
        "smtp_password_set": bool(SMTP_PASSWORD),
        "resend_key_set": bool(RESEND_API_KEY),
        "owner_emails": OWNER_EMAILS,
        "last_error": _last_error,
    }



def _shell(inner: str) -> str:
    return (
        '<table role="presentation" width="100%" style="background:#FAFAFA;padding:24px">'
        '<tr><td align="center"><table role="presentation" width="560" '
        'style="background:#fff;border:1px solid #E5E7EB;border-radius:16px;'
        'font-family:Arial,Helvetica,sans-serif;overflow:hidden">'
        f'{inner}'
        '<tr><td style="padding:14px 24px;border-top:1px solid #E5E7EB;color:#8A8A8E;font-size:11px">'
        'Sent by Rajeev Freelancer. We never ask for your password or card details by email.</td></tr>'
        '</table></td></tr></table>'
    )


async def send_lead_confirmation(lead: dict) -> None:
    """Instant branded confirmation to the prospect who enquired. Never raises."""
    to = (lead.get("email") or "").strip()
    if not to or "@" not in to:
        return
    try:
        name = escape(str(lead.get("name") or "there").split(" ")[0])
        service = escape(str(lead.get("service") or "your project"))
        inner = (
            '<tr><td style="background:#0055FF;padding:22px 24px;color:#fff">'
            '<div style="font-size:19px;font-weight:bold">Thanks for reaching out 👋</div>'
            '<div style="font-size:12px;opacity:.85">Rajeev Freelancer</div></td></tr>'
            '<tr><td style="padding:24px;color:#141414;font-size:15px;line-height:1.6">'
            f'<p style="margin:0 0 14px">Hi {name},</p>'
            f'<p style="margin:0 0 14px">Thanks for your enquiry about <strong>{service}</strong>. '
            'It has landed with Rajeev directly and you can expect a personal reply — usually within a few hours '
            'during business hours.</p>'
            '<p style="margin:0 0 14px">In the meantime, if it is urgent, the fastest way to reach Rajeev is WhatsApp.</p>'
            '<p style="margin:0 0 4px">Talk soon,</p>'
            '<p style="margin:0;font-weight:bold">Rajeev</p>'
            '<p style="margin:2px 0 0;color:#8A8A8E;font-size:12px">Senior Freelance Engineer &amp; AI / Digital Marketing Consultant</p>'
            '</td></tr>'
            f'<tr><td style="padding:0 24px 26px"><a href="{SITE_URL}" '
            'style="display:inline-block;background:#141414;color:#fff;text-decoration:none;'
            'padding:12px 22px;border-radius:999px;font-size:13px">Visit the website</a></td></tr>'
        )
        await send_email(to=to, subject="We got your enquiry — Rajeev Freelancer", html=_shell(inner), reply_to=OWNER_EMAIL)
    except Exception as e:
        logger.error(f"send_lead_confirmation failed: {e}")


async def send_lead_digest(leads: list, period_label: str) -> int:
    """Owner digest of recent leads. Returns count sent (0 if none/failed). Never raises."""
    try:
        if not leads:
            inner = (
                '<tr><td style="background:#141414;padding:20px 24px;color:#fff">'
                '<div style="font-size:18px;font-weight:bold">Daily lead digest</div>'
                f'<div style="font-size:12px;opacity:.85">{escape(period_label)}</div></td></tr>'
                '<tr><td style="padding:24px;color:#141414;font-size:14px">No new leads in this period. '
                'Your pipeline is quiet — a good time to publish or promote a location page.</td></tr>'
            )
            await send_email(to=OWNER_EMAILS, subject="Daily lead digest — 0 new leads", html=_shell(inner))
            return 0
        rows = []
        for l in leads:
            rows.append(
                '<tr>'
                f'<td style="padding:8px 12px;border-top:1px solid #F0F0F0;font-size:13px;color:#141414">{escape(str(l.get("name") or "—"))}'
                f'<div style="color:#8A8A8E;font-size:11px">{escape(str(l.get("email") or ""))} {escape(str(l.get("phone") or ""))}</div></td>'
                f'<td style="padding:8px 12px;border-top:1px solid #F0F0F0;font-size:13px;color:#141414">{escape(str(l.get("service") or "—"))}</td>'
                f'<td style="padding:8px 12px;border-top:1px solid #F0F0F0;font-size:13px;color:#141414">{escape(str(l.get("location") or "—"))}</td>'
                f'<td style="padding:8px 12px;border-top:1px solid #F0F0F0;font-size:12px;color:#8A8A8E">{escape(str(l.get("status") or "new"))}</td>'
                '</tr>'
            )
        inner = (
            '<tr><td style="background:#0055FF;padding:20px 24px;color:#fff">'
            '<div style="font-size:18px;font-weight:bold">Daily lead digest</div>'
            f'<div style="font-size:12px;opacity:.85">{escape(period_label)} · {len(leads)} new lead(s)</div></td></tr>'
            '<tr><td style="padding:16px 12px"><table role="presentation" width="100%" style="border-collapse:collapse">'
            '<tr><th align="left" style="padding:6px 12px;font-size:11px;color:#8A8A8E;text-transform:uppercase;letter-spacing:1px">Lead</th>'
            '<th align="left" style="padding:6px 12px;font-size:11px;color:#8A8A8E;text-transform:uppercase;letter-spacing:1px">Service</th>'
            '<th align="left" style="padding:6px 12px;font-size:11px;color:#8A8A8E;text-transform:uppercase;letter-spacing:1px">Location</th>'
            '<th align="left" style="padding:6px 12px;font-size:11px;color:#8A8A8E;text-transform:uppercase;letter-spacing:1px">Status</th></tr>'
            f'{"".join(rows)}'
            '</table></td></tr>'
            f'<tr><td style="padding:4px 24px 26px"><a href="{SITE_URL}/admin" '
            'style="display:inline-block;background:#141414;color:#fff;text-decoration:none;'
            'padding:12px 22px;border-radius:999px;font-size:13px">Open leads dashboard</a></td></tr>'
        )
        await send_email(to=OWNER_EMAILS, subject=f"Daily lead digest — {len(leads)} new lead(s)", html=_shell(inner))
        return len(leads)
    except Exception as e:
        logger.error(f"send_lead_digest failed: {e}")
        return 0
