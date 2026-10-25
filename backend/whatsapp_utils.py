import os
import asyncio
import logging

import requests
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("rajeevfreelancer.whatsapp")

WA_API_VERSION = os.environ.get("WHATSAPP_API_VERSION", "v25.0")
WA_PHONE_NUMBER_ID = os.environ.get("WHATSAPP_PHONE_NUMBER_ID", "").strip()
WA_ACCESS_TOKEN = os.environ.get("WHATSAPP_ACCESS_TOKEN", "").strip()
WA_RECIPIENTS = [n.strip() for n in os.environ.get("WHATSAPP_RECIPIENT_NUMBERS", "").split(",") if n.strip()]
WA_TEMPLATE_NAME = os.environ.get("WHATSAPP_TEMPLATE_NAME", "").strip()
WA_TEMPLATE_LANGUAGE = os.environ.get("WHATSAPP_TEMPLATE_LANGUAGE", "en_US").strip() or "en_US"


def apply_config(cfg: dict) -> None:
    """Override env defaults with admin-saved settings (server-side only)."""
    global WA_API_VERSION, WA_PHONE_NUMBER_ID, WA_ACCESS_TOKEN, WA_RECIPIENTS, WA_TEMPLATE_NAME, WA_TEMPLATE_LANGUAGE
    if not cfg:
        return
    if cfg.get("api_version"):
        WA_API_VERSION = str(cfg["api_version"]).strip()
    if cfg.get("phone_number_id") is not None:
        WA_PHONE_NUMBER_ID = str(cfg["phone_number_id"]).strip()
    if cfg.get("access_token"):
        WA_ACCESS_TOKEN = str(cfg["access_token"]).strip()
    if cfg.get("recipients") is not None:
        WA_RECIPIENTS = [str(n).strip() for n in cfg["recipients"] if str(n).strip()]
    if cfg.get("template_name") is not None:
        WA_TEMPLATE_NAME = str(cfg["template_name"]).strip()
    if cfg.get("template_language"):
        WA_TEMPLATE_LANGUAGE = str(cfg["template_language"]).strip()


def whatsapp_configured() -> bool:
    return bool(WA_PHONE_NUMBER_ID and WA_ACCESS_TOKEN and WA_RECIPIENTS)


def whatsapp_status() -> dict:
    return {
        "configured": whatsapp_configured(),
        "phone_number_id_set": bool(WA_PHONE_NUMBER_ID),
        "access_token_set": bool(WA_ACCESS_TOKEN),
        "recipients": WA_RECIPIENTS,
        "template_name": WA_TEMPLATE_NAME or None,
        "template_language": WA_TEMPLATE_LANGUAGE,
        "mode": "template" if WA_TEMPLATE_NAME else "text (24h window only)",
    }


def _endpoint() -> str:
    return f"https://graph.facebook.com/{WA_API_VERSION}/{WA_PHONE_NUMBER_ID}/messages"


def _post(payload: dict) -> dict:
    r = requests.post(_endpoint(), json=payload, timeout=15,
                      headers={"Authorization": f"Bearer {WA_ACCESS_TOKEN}", "Content-Type": "application/json"})
    try:
        data = r.json()
    except Exception:
        data = {"raw": r.text[:300]}
    if r.status_code >= 400:
        err = (data or {}).get("error", {}) if isinstance(data, dict) else {}
        raise RuntimeError(f"WhatsApp API {r.status_code} code={err.get('code')} {err.get('message') or data}")
    return data


def _lead_fields(lead: dict) -> list[str]:
    def v(k):
        return (str(lead.get(k) or "—")).replace("\n", " ").strip()[:300]
    return [v("name"), v("phone"), v("email"), v("service"), v("budget"),
            (lead.get("geo_location") or lead.get("location") or "—"), v("message")]


def _lead_text(lead: dict) -> str:
    n, p, e, s, b, loc, m = _lead_fields(lead)
    return ("New lead - Rajeev Freelancer\n"
            f"Name: {n}\nPhone: {p}\nEmail: {e}\nService: {s}\nBudget: {b}\nLocation: {loc}\n"
            f"Page: {lead.get('source_path') or '—'}\nMessage: {m}")[:4000]


def _template_payload(to: str, lead: dict) -> dict:
    params = [{"type": "text", "text": x[:1024]} for x in _lead_fields(lead)]
    return {"messaging_product": "whatsapp", "recipient_type": "individual", "to": to, "type": "template",
            "template": {"name": WA_TEMPLATE_NAME, "language": {"code": WA_TEMPLATE_LANGUAGE},
                         "components": [{"type": "body", "parameters": params}]}}


def _text_payload(to: str, lead: dict) -> dict:
    return {"messaging_product": "whatsapp", "recipient_type": "individual", "to": to, "type": "text",
            "text": {"preview_url": False, "body": _lead_text(lead)}}


def _send_one(to: str, lead: dict) -> dict:
    if WA_TEMPLATE_NAME:
        try:
            data = _post(_template_payload(to, lead))
            return {"to": to, "ok": True, "mode": "template", "message_id": data["messages"][0]["id"]}
        except Exception as e:
            logger.warning(f"WhatsApp template send failed for {to}: {e}; trying text")
            template_err = str(e)
    else:
        template_err = None
    try:
        data = _post(_text_payload(to, lead))
        return {"to": to, "ok": True, "mode": "text", "message_id": data["messages"][0]["id"],
                **({"template_error": template_err} if template_err else {})}
    except Exception as e:
        return {"to": to, "ok": False, "error": str(e), **({"template_error": template_err} if template_err else {})}


async def send_lead_whatsapp(lead: dict) -> dict:
    """Send the lead to every configured owner number via Meta Cloud API. Never raises."""
    if not whatsapp_configured():
        return {"status": "skipped", "reason": "WhatsApp Cloud API not configured", "results": []}
    results = await asyncio.gather(*[asyncio.to_thread(_send_one, to, lead) for to in WA_RECIPIENTS])
    ok = [r for r in results if r.get("ok")]
    status = "sent" if len(ok) == len(results) else ("partial" if ok else "failed")
    for r in results:
        logger.info(f"WhatsApp -> {r.get('to')}: {'ok' if r.get('ok') else r.get('error')}")
    return {"status": status, "results": list(results)}
