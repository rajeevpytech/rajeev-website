"""Discovery copy for newly added remote markets; existing page copy is untouched.

Geography comes from world_locations.json. No local office, client, review,
provider support or performance result is implied by inclusion in the catalog.
"""

SERVICE_SCOPE = {
    "freelance-website-developer": (
        "Website planning and development",
        "Map the pages, customer journeys, mobile enquiry form and content responsibilities before choosing WordPress or a custom application. Agree who supplies photography, copy and translations, and which pages need to be editable.",
        "Check responsive layouts, accessible form labels, keyboard navigation, redirects, canonical URLs and a working enquiry submission before launch.",
    ),
    "freelance-app-developer": (
        "Mobile application development",
        "Define the Android and iOS journeys, account roles, notifications and offline requirements. Identify the device features and third-party systems needed before deciding on a cross-platform or native build.",
        "Review permissions, error states, privacy disclosures, store ownership and release requirements with the client. Test the agreed journeys on representative devices.",
    ),
    "freelance-software-developer": (
        "Custom business software",
        "Document the current workflow, user permissions, reporting needs and existing data formats. Scope the first useful release around the client's actual operations instead of copying a generic CRM or ERP feature list.",
        "Agree migration samples, validation rules, access controls, backups and acceptance examples. Confirm integration access before committing to a delivery estimate.",
    ),
    "freelance-seo-expert": (
        "Search visibility and technical SEO",
        "Start with existing Search Console data, indexed URLs and the business's actual services. Audit crawling, canonicalization, page content and enquiry tracking before deciding which new pages would help customers.",
        "Keep a before-and-after URL inventory. Measure relevant impressions, clicks and enquiries; a technical pass, sitemap submission or AI-friendly format does not guarantee rankings or indexing.",
    ),
    "freelance-digital-marketing-consultant": (
        "Digital marketing planning",
        "Define the audience, service area, offer and lead qualification process. Separate the service fee from advertising spend and choose channels using the client's customer knowledge and available account data.",
        "Confirm account ownership, conversion events, landing-page messages and follow-up responsibilities. Report qualified enquiries and agreed business outcomes without promising a fixed result.",
    ),
    "freelance-ai-consultant": (
        "AI and workflow automation",
        "Choose a specific repeatable task, such as answering approved questions, triaging enquiries or transferring records between systems. Document the source material, access permissions and point where a person takes over.",
        "Test representative questions, unknown answers, failed integrations and human escalation. Agree data handling and usage limits before connecting live customer information.",
    ),
    "whatsapp-marketing-freelancer": (
        "WhatsApp communication workflows",
        "Map consent collection, enquiry responses, follow-up timing and handover to the business team. Check the client's WhatsApp account, approved templates and provider capabilities before choosing an integration.",
        "Test opt-out handling, delivery failures, correct recipient mapping and agent handover. Account approval, template approval and messaging costs depend on the platform and provider.",
    ),
    "sms-marketing-freelancer": (
        "SMS communication workflows",
        "Define the purpose of each message, recipient consent, sender identity and fallback contact channel. Check the available SMS provider and destination-specific requirements before scheduling campaigns or OTP messages.",
        "Test message content, opt-outs, rate limits, delivery reports and failure handling. Coverage, sender registration and per-message charges must be confirmed with the chosen provider.",
    ),
}


def build_new_market_content(service: dict, loc: dict, *, world_expansion: bool = False) -> dict:
    city, country = loc["city"], loc["country"]
    scope_slug = service["slug"]
    if world_expansion and scope_slug.startswith("freelancer-"):
        scope_slug = scope_slug.replace("freelancer-", "freelance-", 1)
    topic, scope, acceptance = SERVICE_SCOPE.get(scope_slug, (
        service["name"],
        "Agree the business goal, deliverables, systems and acceptance criteria before starting the project.",
        "Review the work against the agreed scope and test the customer journey before launch.",
    ))
    # Preserve every previously generated template. Worldwide boroughs must
    # never inherit the Delhi wording used by the original locality catalog.
    if world_expansion:
        area = f"{city}, {loc['parent_city']}" if loc.get("parent_city") else city
    else:
        area = f"{city}, Delhi" if loc.get("location_type") == "locality" else city
    timezone = loc.get("timezone")
    notes = loc.get("planning_notes") or []
    scheduling = (f"Plan reviews using {timezone} and Asia/Kolkata for the actual meeting date."
                  if timezone else "Agree the client's time zone and a suitable review window during discovery.")
    return {
        "title": f"{service['name']} for {area} | Remote Services by Rajeev",
        "meta_description": f"Discuss {service.get('short', service['name']).lower()} for {area}, {country}. Remote project delivery from India, a defined scope and scheduled reviews.",
        "h1": f"{service['name']} for businesses in {area}",
        "intro": [
            f"Looking for {service['name'].lower()} for a business in {area}? Rajeev works remotely from India. Share your existing website or workflow, target customers and desired launch date so the project can be scoped around what you need.",
            f"{topic} starts with discovery and a written proposal. This page describes remote service coverage for {country}; it does not represent an office or a claim of completed local projects.",
        ],
        "why_choose": [
            {"title": "A defined scope", "text": scope},
            {"title": "Reviewable milestones", "text": "Agree deliverables, a staging or test environment, review dates and acceptance criteria before implementation."},
            {"title": "Time-zone planning", "text": scheduling},
            {"title": "Client-owned accounts", "text": "Agree ownership of source files, hosting, platform accounts and credentials in the proposal, including any third-party licence restrictions."},
        ],
        "service_details": scope + " " + acceptance,
        "process": [
            {"step": "01", "title": "Share the brief", "text": f"Explain the customer journey or workflow for your {area} business and provide examples of the current problem."},
            {"step": "02", "title": "Confirm the plan", "text": "Review deliverables, exclusions, dependencies, payment milestones and a realistic schedule."},
            {"step": "03", "title": "Build and review", "text": "Review working milestones with test data and collect feedback before the next stage."},
            {"step": "04", "title": "Test acceptance", "text": acceptance},
            {"step": "05", "title": "Hand over", "text": "Receive the agreed files, account access and operating notes; confirm any ongoing support separately."},
        ],
        "whatsapp_section": f"Use WhatsApp, email and scheduled calls to share briefs, progress and review decisions. {scheduling} Response times and support coverage are agreed in the proposal.",
        "local_context": " ".join([loc.get("local_context", f"Confirm the actual service coverage for {city}, {country}."), *notes]),
        "faqs": [
            {"q": f"Is Rajeev based in {city}?", "a": f"Project work for {city} is delivered remotely from India. No office in {city} is represented by this service page."},
            {"q": f"What does {service.get('short', service['name']).lower()} include?", "a": scope},
            {"q": "What should I send for a proposal?", "a": "Share your business goal, existing website or system, target audience, required features, budget range and preferred launch date."},
            {"q": "How are meetings arranged?", "a": scheduling + " Async written updates can cover the time between review calls."},
            {"q": "Are the price and delivery date fixed?", "a": "They are confirmed after the scope, integrations and content responsibilities are agreed. Third-party platform charges and approvals are identified separately."},
            {"q": "Can a new page guarantee Google or AI visibility?", "a": "No. Helpful content and sound technical delivery support discoverability, while search engines decide crawling, indexing and ranking."},
        ],
    }
