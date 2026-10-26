#!/usr/bin/env python3
"""Prepare a complete route inventory and a small editorial draft pack offline.

No database, provider, publication or search-submission calls. The optional
sitemap is an explicitly supplied snapshot, not proof of publication/indexing.
"""
import argparse
from datetime import datetime
from hashlib import sha256
from html import escape
import json
from pathlib import Path
import sys
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from world_expansion import SERVICE_MAP, catalog, expansion_page_document

ORIGIN = "https://rajeevfreelancer.com"
CITIES = ("howrah-india", "coventry-uk", "denver-usa")
PRIORITY = {"IN": 0, "GB": 1, "US": 2}
# Illustrative briefs, not claims that these businesses are clients or that a
# city has a particular industry, language requirement or legal obligation.
SCENARIOS = {
    "freelancer-website-developer": [
        ("Appointment enquiries and editable service information", "A hypothetical service business wants visitors to choose an enquiry type, describe their requirement and receive a reference. Separate the public service information from the staff follow-up screen. If the owner wants more than one language, ask them to supply and approve each translation rather than inferring a language from the visitor's location.", "Submit a labelled enquiry from a narrow mobile screen, locate its reference in Admin and confirm receipt in the actual inbox. Then change an editable service paragraph and verify the public result."),
        ("A consultancy website with a useful project brief", "A hypothetical consultancy needs service pages, downloadable information and a brief that routes enquiries to the right person. Ask which documents can be public and which require a conversation. A brochure download and an enquiry are different actions; the site should explain each clearly without silently enrolling a visitor into marketing.", "Open a service URL directly, download the current document, send a labelled brief and check the saved record. Ask a staff member to replace the document and verify that the public download points to the intended version."),
        ("Event information with clear local dates", "A hypothetical event organiser needs a website that presents dates clearly to visitors in different time zones. Store the event's named time zone with its start and end instead of treating a date string as universal. Define whether a visitor is making an enquiry or securing a booking before designing the confirmation message.", "Test an event that spans midnight for an overseas visitor, verify the displayed local date and complete the intended enquiry or booking journey. An enquiry success message must not imply a confirmed reservation."),
    ],
    "freelancer-app-developer": [
        ("A field-team request app with upload recovery", "A hypothetical field team needs to create a service request, attach a photo and pass it to an office reviewer. Define which actions can wait for connectivity, what the user sees while an upload is pending and how staff find the same request later. Device permissions should follow the actual feature rather than being requested at first launch without context.", "Create a request on a representative Android device, interrupt an upload and reconnect. Verify that the request has one reference, the attachment is not silently lost and the reviewer can see its current state."),
        ("An appointment app with staff-controlled slots", "A hypothetical appointment business needs staff availability, customer booking requests and cancellation handling. Agree who owns the store accounts and how staff close a slot. Use the business time zone explicitly in the booking model, and decide whether users can edit a request before staff confirm it.", "Try two requests for the same slot, a staff closure and a cancellation. Check the date at a clock-change boundary and make sure the customer sees the same booking state as staff."),
        ("An event app for distributed attendees", "A hypothetical organiser wants attendees to see an agenda, bookmark sessions and receive relevant updates. Decide which agenda information is available offline and whether notifications are optional. Keep the venue's named time zone available even when the phone is travelling or its settings change.", "Open the agenda with the phone in another time zone, update a session and reopen the offline view. Verify that the user can distinguish cached information from a fresh schedule and that opting out of notifications does not block the agenda."),
    ],
    "freelancer-software-developer": [
        ("A quotation and enquiry follow-up workspace", "A hypothetical small team currently handles enquiries in spreadsheets and needs one place for quotations and next actions. Agree customer identifiers, duplicate rules, staff permissions and which historical columns are worth importing. A quotation draft, an issued quotation and an accepted order need distinct states.", "Import a synthetic sample with repeated customer details, assign a follow-up and issue a test quotation. Verify totals against the agreed business rules, permissions for another staff role and a readable export."),
        ("A recurring service task workspace", "A hypothetical service team needs to assign recurring tasks, record completion and show overdue work. Define whether recurrence follows a calendar date, an elapsed duration or a local business schedule. Separate an employee's working view from an administrator's configuration screen and decide how completed records can be corrected.", "Create a recurring test task around a month boundary, reassign it and record a correction. Confirm that its history explains who changed it and that the next occurrence matches the agreed recurrence rule."),
        ("A scheduling and handover workspace", "A hypothetical distributed team needs appointments, task handovers and reports across time zones. Agree the authoritative time zone for deadlines and the meaning of an all-day task. Staff should be able to see an unambiguous handover status without calculating offsets from a free-text note.", "Move a task between two staff time zones, export its deadline and check the report against the original record. Verify the handling of an all-day item separately from a timed appointment."),
    ],
    "freelancer-seo-expert": [
        ("An enquiry-focused URL and content audit", "A hypothetical business wants to understand which existing service pages attract useful enquiries. Start with its actual Search Console and analytics records, identify important URLs and check the enquiry path. Do not infer local ranking entitlement from a service-area name or create an office listing without a real eligible business presence.", "Record a dated URL inventory, inspect a representative service page and trace one labelled form submission. Keep sitemap acceptance, crawl eligibility, search indexing and qualified enquiries as separate report fields."),
        ("A redesign plan that preserves useful service URLs", "A hypothetical established website is being redesigned and needs to retain useful service and article URLs. Compare the old inventory with the proposed navigation before launch. Assign specific replacements where a redirect is appropriate, and preserve the original purpose when the content still serves customers.", "Test representative old links, their final destinations, response codes, canonicals and mobile enquiry journeys. Review Search Console after deployment using comparable periods rather than claiming a redesign itself caused an immediate ranking gain."),
        ("An audit of dated content and event discovery", "A hypothetical event website has current pages, past events and recurring resources. Decide which old pages still provide useful information and how visitors reach the current event. Check date presentation and structured information against visible content; do not silently change historical event facts to make a page appear fresh.", "Inspect an upcoming event, a past event and a lasting guide. Check their visible dates, internal links, intended index state and canonical URLs, then document any changes that require the owner's editorial decision."),
    ],
    "freelancer-digital-marketing-consultant": [
        ("A campaign plan tied to enquiry follow-up", "A hypothetical service business needs a defined offer, useful landing information and a staff process for responding to enquiries. Agree the intended customer group with the owner rather than deriving it from city demographics. Separate the marketing service fee from any proposed advertising spend and document the meaning of a qualified enquiry.", "Use a labelled campaign link, complete the agreed enquiry action and confirm the reference in the follow-up system. Check that internal tests and repeated submissions do not inflate qualified-enquiry reporting."),
        ("A consultancy lead-qualification plan", "A hypothetical consultancy needs to distinguish a brochure reader, a project enquiry and a booked discussion. Map the questions that help staff decide whether a request fits their services. Choose channels from the owner's audience knowledge and account evidence, and agree who handles requests that arrive between scheduled review windows.", "Review the landing message against the offer, submit a test brief and verify the staff handover. Compare campaign visits with qualified discussions; downloading a document alone is not evidence of a sales-ready lead."),
        ("A launch campaign with a date-aware handover", "A hypothetical organiser needs a campaign that explains an event, its date and the next visitor action. Agree whether the goal is an enquiry, registration request or completed purchase. Plan message updates when the date changes and identify who owns the landing page and follow-up queue.", "Follow a labelled campaign link on mobile, check the event date in the chosen time zone and complete the intended action. Confirm that the campaign report uses the agreed conversion definition and does not count an abandoned form as a registration."),
    ],
    "freelancer-ai-consultant": [
        ("An approved-answer assistant with staff escalation", "A hypothetical business wants an assistant to answer service questions from an approved document set. Identify who maintains prices, availability and exclusions, then define questions that should reach staff. The assistant needs a clear response when the source material does not contain an answer; it should not invent a quotation or appointment confirmation.", "Ask a supported question, an outdated-price question and an out-of-scope request using synthetic data. Check that escalation creates the intended staff task and that the operator can review the source used for a response."),
        ("A project-brief triage assistant", "A hypothetical consultancy wants help sorting incoming project briefs before a person replies. Define a small useful output such as service interest, missing information and a suggested staff queue. Keep the original brief available and make uncertainty visible instead of letting a generated category become an irreversible decision.", "Use synthetic briefs containing multiple service needs, missing dates and conflicting requirements. Verify the staff review step, failure handling and record mapping before enabling any connection to real enquiries."),
        ("An event-information assistant with current sources", "A hypothetical organiser wants an assistant to explain the agenda and direct attendees to staff when needed. Decide which published source owns session times and cancellations. Treat a changed event date as a source update and test whether previously generated answers become stale; the model should not independently promise seat availability.", "Change a synthetic session time, ask the assistant in a second time zone and request something absent from the approved sources. Confirm source freshness, explicit uncertainty and a working human handover."),
    ],
    "whatsapp-marketing-freelancer": [
        ("An enquiry confirmation and opt-out workflow", "A hypothetical service business wants a WhatsApp acknowledgement after a visitor asks for contact. Map how the visitor's request and communication choice are recorded, which number is used and when a staff member takes over. Check the actual account and provider before promising template or outbound-message capabilities.", "Send only a labelled, authorised test through the selected provider. Verify recipient mapping, the saved enquiry reference, a delivery failure and an opt-out action. Test each outcome independently of the website's own success message."),
        ("A discussion-reminder and staff handover workflow", "A hypothetical consultancy wants reminders for requested discussions and a shared way to hand conversations to staff. Define the appointment time zone and the information included in a reminder. Review current provider requirements, available account features and the visitor's communication permission before enabling outbound messages.", "Use an authorised test contact, reschedule a synthetic appointment and verify that the old reminder does not send accidentally. Check the staff handover, opt-out handling and visible failure state."),
        ("An event-update workflow with clear recipients", "A hypothetical organiser wants to send requested event updates to the right attendees. Separate an operational update from broader marketing and agree what the recipient has asked to receive. Use a stable event reference and named time zone so a schedule change does not become an ambiguous message.", "Test a synthetic event update with an authorised contact, then check cancellation, opt-out and delivery-failure paths. Confirm that a recipient change cannot attach one attendee's details to another person's message."),
    ],
    "sms-marketing-freelancer": [
        ("A reference-based service-status SMS workflow", "A hypothetical business wants to notify customers about the status of a request. Agree message purpose, sender identity, recipient mapping and the point at which a message is created. Check destination support, current provider requirements and pricing before selecting a sender or giving a delivery estimate.", "Trigger one authorised test from a synthetic request and compare the message reference with the saved record. Check opt-out handling where applicable, a failed delivery and whether a retry can create duplicate notifications."),
        ("An appointment-change SMS workflow", "A hypothetical appointment business needs requested reminders and schedule-change messages. Decide how cancelled and rescheduled appointments affect queued messages. Keep the business time zone explicit, and review the chosen provider's current sender and recipient requirements rather than assuming identical behaviour across destinations.", "Create and reschedule a synthetic appointment for an authorised test contact. Confirm the queued message uses the current date, the old reminder is handled correctly and a provider failure is visible to staff."),
        ("An event-change SMS workflow", "A hypothetical organiser needs a short message when an attendee's event changes. Define the event reference, recipient scope and authoritative local date before choosing message templates. Agree an alternative contact method for people whose numbers cannot receive the intended message through the selected provider.", "Change a synthetic event time, issue one authorised test and match its reference with the event record. Check a failed delivery, a duplicate trigger and the recipient's communication preferences before enabling the real workflow."),
    ],
}


def schedule(location):
    samples = []
    for day in ("2027-01-15", "2027-07-15"):
        india = datetime.fromisoformat(day + "T21:00:00").replace(tzinfo=ZoneInfo("Asia/Kolkata"))
        local = india.astimezone(ZoneInfo(location["timezone"]))
        samples.append(f"{day}: 21:00 India corresponds to {local:%H:%M %Z} in {location['city']}")
    return "; ".join(samples) + ". These are illustrative conversions from the available time-zone database, not offered support hours; confirm the actual meeting date and availability."


def draft_pages():
    data = catalog()
    pages = []
    for city_index, slug in enumerate(CITIES):
        loc = data["additional"][slug]
        for service_slug, service in SERVICE_MAP.items():
            angle, scenario, acceptance = SCENARIOS[service_slug][city_index]
            content = expansion_page_document(service, loc)["content"]
            content.update({
                "title": f"{service['short']} for {loc['city']} | Rajeev Freelancer",
                "h1": f"{service['short']} for {loc['city']}: {angle[0].lower() + angle[1:]}",
                "meta_description": f"Plan {service['short'].lower()} for {loc['city']}, {loc['country']}: a practical brief, acceptance checks and remote delivery from India.",
                "intro": [f"A {service['short'].lower()} project for a business in {loc['city']} needs a specific job to solve and a clear way to check delivery. Rajeev works remotely from India; the scope, review dates and handover are agreed before implementation.", scenario, "The example is illustrative. It does not describe a named client, prove local demand or represent a local office. Use it to decide what your own brief needs, then adjust the scope around your business and existing systems."],
                "service_details": content["service_details"] + " A practical acceptance example for this brief: " + acceptance,
                "local_context": f"{loc['city']} is recorded in {loc['country']}" + (f", {loc['admin1_name']}" if loc.get("admin1_name") else "") + f" in the retained GeoNames source. The geographic record identifies a place, not a business address. Its named time zone is {loc['timezone']}. " + schedule(loc),
                "whatsapp_section": f"Keep the brief, approval decisions and acceptance results together in written updates, with calls arranged when useful. {schedule(loc)} Agree who can accept a milestone and what happens when a dependency or integration is unavailable.",
            })
            content["why_choose"][0] = {"title": angle, "text": scenario}
            content["why_choose"][1] = {"title": "An observable acceptance result", "text": acceptance}
            content["process"][0]["text"] = f"Describe your own version of the {angle.lower()} brief, the existing systems, who uses them and the first useful outcome. Provide sample content or synthetic records for review."
            content["process"][3]["text"] = acceptance
            content["faqs"][1] = {"q": "What would we test for this example?", "a": acceptance}
            pages.append({"path": f"/{service_slug}/{slug}", "source_geoname_id": loc["geoname_id"], "content": content,
                          "source_notes": f"Prepared draft, not editorial approval. Geography: {loc['source_url']}; retained GeoNames snapshot dated 2026-10-25, source row hash {loc['source_line_sha256']}. Scheduling: Python zoneinfo with {loc['timezone']} and Asia/Kolkata; examples dated 2027-01-15 and 2027-07-15. Business service scope follows the site's public service catalog. Scenario is hypothetical. Check distinct reader value, service scope, sources and business claims before approving; no client results or local office are claimed."})
    return pages


def prepare(output, snapshot=None):
    data = catalog()
    output = Path(output).resolve()
    if output == ROOT or output == ROOT / "backend" or output == ROOT / "frontend":
        raise ValueError("Choose a separate output directory")
    output.mkdir(parents=True, exist_ok=True)
    listed, snapshot_hash = set(), None
    if snapshot:
        raw = Path(snapshot).read_bytes()
        snapshot_hash = sha256(raw).hexdigest()
        values = json.loads(raw)
        values = values.get("urls", []) if isinstance(values, dict) else values
        if not isinstance(values, list) or not all(isinstance(url, str) and url.startswith(ORIGIN + "/") and urlsplit(url).netloc == "rajeevfreelancer.com" for url in values):
            raise ValueError("Snapshot must contain canonical HTTPS URLs for this website")
        listed = set(values)
    drafts = draft_pages()
    draft_paths = {row["path"] for row in drafts}
    rows, paths = [], set()
    for loc in sorted(data["locations"], key=lambda row: (PRIORITY.get(row.get("country_code"), 3), row["country_slug"], row["loc_slug"])):
        for service in SERVICE_MAP:
            path = f"/{service}/{loc['loc_slug']}"
            if path in paths: raise ValueError("Duplicate route: " + path)
            paths.add(path)
            rows.append({"path": path, "url": ORIGIN + path, "city": loc["city"], "country": loc["country"], "service": service,
                         "catalog": "additional" if loc["loc_slug"] in data["additional"] else "existing_base",
                         "sitemap_snapshot": "listed" if ORIGIN + path in listed else "not_listed" if snapshot else "not_checked",
                         "draft_pack": path in draft_paths, "publication": "not_certified", "search_indexing": "not_certified"})
    if len(rows) != 40008: raise ValueError("Catalog count changed; review capacity before release")
    with (output / "all-40008-routes.jsonl").open("w", encoding="utf-8") as stream:
        for row in rows: stream.write(json.dumps(row, ensure_ascii=False) + "\n")
    pack = {"format": "rf-service-area-drafts-v1", "prepared_on": "2026-10-26", "publication": "drafts_only", "pages": drafts}
    (output / "first-24-drafts.json").write_text(json.dumps(pack, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    report = {"candidate_capacity": len(rows), "existing_base_combinations": sum(row["catalog"] == "existing_base" for row in rows),
              "additional_combinations": sum(row["catalog"] == "additional" for row in rows), "new_drafts": len(drafts),
              "draft_locations": list(CITIES), "sitemap_snapshot_total": len(listed) if snapshot else None,
              "combinations_listed_in_snapshot": sum(row["sitemap_snapshot"] == "listed" for row in rows) if snapshot else None,
              "snapshot_sha256": snapshot_hash, "database_writes": 0, "provider_calls": 0, "publications": 0,
              "draft_pack_sha256": sha256((output / "first-24-drafts.json").read_bytes()).hexdigest(),
              "publication_note": "No draft has been saved, approved or added to a live sitemap by this offline command. Sitemap membership is not an indexing measurement."}
    (output / "release-summary.json").write_text(json.dumps(report, indent=2) + "\n")
    sections = []
    for row in drafts:
        c = row["content"]
        paragraphs = c["intro"] + [c["service_details"], c["local_context"], c["whatsapp_section"]]
        blocks = "".join(f"<p>{escape(p)}</p>" for p in paragraphs)
        blocks += "<h3>Project steps</h3>" + "".join(f"<h4>{escape(x['title'])}</h4><p>{escape(x['text'])}</p>" for x in c["process"])
        blocks += "<h3>Questions</h3>" + "".join(f"<h4>{escape(x['q'])}</h4><p>{escape(x['a'])}</p>" for x in c["faqs"])
        sections.append(f"<details><summary>{escape(c['title'])}</summary><h2>{escape(c['h1'])}</h2><p><code>{escape(row['path'])}</code></p>{blocks}<p class='note'>{escape(row['source_notes'])}</p></details>")
    html = "<!doctype html><html lang='en'><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>40,008-page expansion: inventory and first drafts</title><style>*{box-sizing:border-box}body{font:16px/1.65 system-ui;color:#203449;background:#f6f8fc;max-width:1050px;margin:30px auto;padding:0 20px;overflow-wrap:anywhere}h1,h2,h3{line-height:1.25;color:#102b4c}details,section{padding:24px;border:1px solid #dbe4ef;border-radius:12px;background:white;margin:20px 0}summary{font-weight:700;cursor:pointer}.note{padding:16px;background:#eaf3ff}pre{white-space:pre-wrap;font:13px/1.5 monospace}a{color:#0755b9}@media(max-width:600px){body{padding:0 12px}details,section{padding:16px}h1{font-size:28px}}</style><h1>40,008-page expansion: inventory and first drafts</h1><p>26 October 2026 · RajeevFreelancer.com</p><section><h2>What this pack contains</h2><p>The complete route inventory is separate from the current public sitemap. The first 24 pages are editable drafts for Howrah, Coventry and Denver across the eight existing services. No publication or indexing is claimed.</p><p>After deploying the Admin import change, open New service-area pages, review an individual new page, import first-24-drafts.json and choose a draft. Preview it against the live record, read all sections and either save it as a draft or approve only after completing the checks. Import itself performs no write; existing saved content is protected.</p><p>The existing dynamic sitemap automatically includes valid, approved, indexable pages after they are saved. This pack does not include a submission-ready sitemap of unapproved candidates.</p><pre>" + escape(json.dumps(report, indent=2)) + "</pre></section><section><h2>Reader-value review still required</h2><p>These drafts vary the service brief, hypothetical scenario, acceptance example and scheduling context. They still share structure and general delivery copy. Technical validity does not establish that every location deserves a separate indexed page. Review overlap and distinct usefulness; consolidate pages that do not help the reader beyond an existing service or regional page.</p><p>Additional geographic data: GeoNames, CC BY 4.0. Each draft retains its source ID and source-row fingerprint. Existing website content and base catalog remain unchanged.</p></section><h2>Read the 24 full draft texts</h2>" + "".join(sections) + "</html>"
    (output / "Expansion_40008_Review.html").write_text(html, encoding="utf-8")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--sitemap-snapshot", type=Path)
    args = parser.parse_args()
    print(json.dumps(prepare(args.output, args.sitemap_snapshot), indent=2))
