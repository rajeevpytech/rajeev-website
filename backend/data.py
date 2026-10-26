"""Static data: services and worldwide location dataset for programmatic SEO pages."""

SERVICES = [
    {
        "slug": "freelance-ai-consultant",
        "name": "Freelance AI Consultant",
        "short": "AI Consulting",
        "tagline": "AI automation, bots, agents & workflow integrations",
        "keyword": "freelance AI consultant",
        "icon": "Bot",
    },
    {
        "slug": "freelance-digital-marketing-consultant",
        "name": "Freelance Digital Marketing Consultant",
        "short": "Digital Marketing",
        "tagline": "Paid, organic & lifecycle growth engineered around revenue",
        "keyword": "freelance digital marketing consultant",
        "icon": "TrendingUp",
    },
    {
        "slug": "freelance-seo-expert",
        "name": "Freelance SEO Expert",
        "short": "SEO Consulting",
        "tagline": "Technical + content SEO that compounds into rankings",
        "keyword": "freelance SEO expert",
        "icon": "Search",
    },
    {
        "slug": "freelance-website-developer",
        "name": "Freelance Website Developer",
        "short": "Website Development",
        "tagline": "WordPress & custom web apps built for speed and conversion",
        "keyword": "freelance website developer",
        "icon": "Code",
    },
    {
        "slug": "freelance-app-developer",
        "name": "Freelance App Developer",
        "short": "App Development",
        "tagline": "iOS, Android & cross-platform mobile apps built to scale",
        "keyword": "freelance app developer",
        "icon": "Smartphone",
    },
    {
        "slug": "freelance-software-developer",
        "name": "Freelance Software Developer",
        "short": "Software Development",
        "tagline": "Custom applications & production-grade software engineering",
        "keyword": "freelance software developer",
        "icon": "Terminal",
    },
    {
        "slug": "whatsapp-marketing-freelancer",
        "name": "WhatsApp Marketing Freelancer",
        "short": "WhatsApp Marketing",
        "tagline": "Campaigns, auto-replies, chatbots & lead nurturing",
        "keyword": "WhatsApp marketing freelancer",
        "icon": "MessageCircle",
    },
    {
        "slug": "sms-marketing-freelancer",
        "name": "SMS Marketing Freelancer",
        "short": "SMS Marketing",
        "tagline": "Bulk SMS campaigns, OTP flows & automated journeys",
        "keyword": "SMS marketing freelancer",
        "icon": "Smartphone",
    },
]

# country_slug -> {name, region, cities:[...]}
COUNTRIES = {
    "india": {"name": "India", "region": "Asia-Pacific", "cities": [
        "Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai", "Pune", "Kolkata", "Gurgaon", "Noida", "Ahmedabad",
        "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Bhopal", "Surat", "Vadodara", "Rajkot", "Coimbatore",
        "Kochi", "Thiruvananthapuram", "Visakhapatnam", "Vijayawada", "Bhubaneswar", "Chandigarh", "Ludhiana", "Amritsar", "Jalandhar", "Nashik",
        "Faridabad", "Ghaziabad", "Agra", "Varanasi", "Prayagraj", "Meerut", "Ranchi", "Jamshedpur", "Dhanbad", "Raipur",
        "Guwahati", "Dehradun", "Jodhpur", "Udaipur", "Mysore", "Mangalore", "Madurai", "Tiruchirappalli", "Salem", "Aurangabad",
        "Jabalpur", "Gwalior", "Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga", "Purnia", "Bihar Sharif", "Hazaribagh",
        "Greater Noida", "Dwarka", "Rohini", "Saket", "Nehru Place", "Janakpuri", "Pitampura", "Lajpat Nagar", "Karol Bagh", "Okhla",
        "Vasant Kunj", "Rajouri Garden", "Mayur Vihar", "Netaji Subhash Place", "Manesar", "Sohna", "Bahadurgarh", "Sonipat", "Bhiwadi", "Palwal"
    ]},
    "usa": {"name": "USA", "region": "North America", "cities": ["New York", "San Francisco", "Los Angeles", "Chicago", "Austin", "Seattle", "Boston", "Miami", "Dallas", "Atlanta"]},
    "uk": {"name": "UK", "region": "Europe", "cities": ["London", "Manchester", "Birmingham", "Leeds", "Bristol", "Edinburgh", "Glasgow"]},
    "canada": {"name": "Canada", "region": "North America", "cities": ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"]},
    "australia": {"name": "Australia", "region": "Asia-Pacific", "cities": ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"]},
    "uae": {"name": "UAE", "region": "Middle East", "cities": ["Dubai", "Abu Dhabi", "Sharjah"]},
    "singapore": {"name": "Singapore", "region": "Asia-Pacific", "cities": ["Singapore"]},
    "germany": {"name": "Germany", "region": "Europe", "cities": ["Berlin", "Munich", "Frankfurt", "Hamburg", "Cologne"]},
    "france": {"name": "France", "region": "Europe", "cities": ["Paris", "Lyon", "Marseille", "Toulouse"]},
    "netherlands": {"name": "Netherlands", "region": "Europe", "cities": ["Amsterdam", "Rotterdam", "The Hague", "Eindhoven"]},
    "spain": {"name": "Spain", "region": "Europe", "cities": ["Madrid", "Barcelona", "Valencia", "Seville"]},
    "italy": {"name": "Italy", "region": "Europe", "cities": ["Milan", "Rome", "Turin", "Naples"]},
    "ireland": {"name": "Ireland", "region": "Europe", "cities": ["Dublin", "Cork", "Galway"]},
    "saudi-arabia": {"name": "Saudi Arabia", "region": "Middle East", "cities": ["Riyadh", "Jeddah", "Dammam"]},
    "qatar": {"name": "Qatar", "region": "Middle East", "cities": ["Doha"]},
    "south-africa": {"name": "South Africa", "region": "Africa", "cities": ["Johannesburg", "Cape Town", "Durban"]},
    "nigeria": {"name": "Nigeria", "region": "Africa", "cities": ["Lagos", "Abuja", "Port Harcourt"]},
    "kenya": {"name": "Kenya", "region": "Africa", "cities": ["Nairobi", "Mombasa"]},
    "egypt": {"name": "Egypt", "region": "Africa", "cities": ["Cairo", "Alexandria"]},
    "brazil": {"name": "Brazil", "region": "Latin America", "cities": ["Sao Paulo", "Rio de Janeiro", "Brasilia"]},
    "mexico": {"name": "Mexico", "region": "Latin America", "cities": ["Mexico City", "Guadalajara", "Monterrey"]},
    "argentina": {"name": "Argentina", "region": "Latin America", "cities": ["Buenos Aires", "Cordoba"]},
    "japan": {"name": "Japan", "region": "Asia-Pacific", "cities": ["Tokyo", "Osaka", "Yokohama"]},
    "china": {"name": "China", "region": "Asia-Pacific", "cities": ["Shanghai", "Beijing", "Shenzhen", "Guangzhou"]},
    "hong-kong": {"name": "Hong Kong", "region": "Asia-Pacific", "cities": ["Hong Kong"]},
    "malaysia": {"name": "Malaysia", "region": "Asia-Pacific", "cities": ["Kuala Lumpur", "Penang", "Johor Bahru"]},
    "indonesia": {"name": "Indonesia", "region": "Asia-Pacific", "cities": ["Jakarta", "Surabaya", "Bandung"]},
    "philippines": {"name": "Philippines", "region": "Asia-Pacific", "cities": ["Manila", "Cebu", "Davao"]},
    "thailand": {"name": "Thailand", "region": "Asia-Pacific", "cities": ["Bangkok", "Chiang Mai", "Phuket"]},
    "vietnam": {"name": "Vietnam", "region": "Asia-Pacific", "cities": ["Ho Chi Minh City", "Hanoi", "Da Nang"]},
    "pakistan": {"name": "Pakistan", "region": "Asia-Pacific", "cities": ["Karachi", "Lahore", "Islamabad"]},
    "bangladesh": {"name": "Bangladesh", "region": "Asia-Pacific", "cities": ["Dhaka", "Chittagong"]},
    "sri-lanka": {"name": "Sri Lanka", "region": "Asia-Pacific", "cities": ["Colombo"]},
    "new-zealand": {"name": "New Zealand", "region": "Asia-Pacific", "cities": ["Auckland", "Wellington", "Christchurch"]},
    "sweden": {"name": "Sweden", "region": "Europe", "cities": ["Stockholm", "Gothenburg", "Malmo"]},
    "switzerland": {"name": "Switzerland", "region": "Europe", "cities": ["Zurich", "Geneva", "Basel"]},
    "poland": {"name": "Poland", "region": "Europe", "cities": ["Warsaw", "Krakow", "Wroclaw"]},
    "turkey": {"name": "Turkey", "region": "Europe", "cities": ["Istanbul", "Ankara", "Izmir"]},
    "portugal": {"name": "Portugal", "region": "Europe", "cities": ["Lisbon", "Porto"]},
    "belgium": {"name": "Belgium", "region": "Europe", "cities": ["Brussels", "Antwerp"]},
    "finland": {"name": "Finland", "region": "Europe", "cities": ["Helsinki", "Espoo", "Tampere", "Oulu"]},
    "norway": {"name": "Norway", "region": "Europe", "cities": ["Oslo", "Bergen", "Trondheim"]},
    "denmark": {"name": "Denmark", "region": "Europe", "cities": ["Copenhagen", "Aarhus"]},
    "austria": {"name": "Austria", "region": "Europe", "cities": ["Vienna", "Graz", "Salzburg"]},
    "kuwait": {"name": "Kuwait", "region": "Middle East", "cities": ["Kuwait City"]},
    "bahrain": {"name": "Bahrain", "region": "Middle East", "cities": ["Manama"]},
    "oman": {"name": "Oman", "region": "Middle East", "cities": ["Muscat"]},
    "nepal": {"name": "Nepal", "region": "Asia-Pacific", "cities": ["Kathmandu", "Pokhara"]},
    "south-korea": {"name": "South Korea", "region": "Asia-Pacific", "cities": ["Seoul", "Busan", "Incheon"]},
}


# Additive worldwide coverage. Existing names, country slugs and city order remain intact.
# Geographic catalog entries describe remote coverage, never additional business offices.
import json as _world_json
from pathlib import Path as _WorldPath
_WORLD_CATALOG = _world_json.loads((_WorldPath(__file__).with_name("world_locations.json")).read_text(encoding="utf-8"))
# The live public catalog is newer than the uploaded ZIP. Merge it before taking the
# preservation baseline so existing public URLs are never treated as new locations.
_LIVE_LOCATION_CATALOG = _world_json.loads((_WorldPath(__file__).with_name("live_location_catalog.json")).read_text(encoding="utf-8"))
_LIVE_LOCATION_SLUGS = {}
for _live_country in _LIVE_LOCATION_CATALOG["countries"]:
    _live_country_slug = _live_country["slug"]
    if _live_country_slug not in COUNTRIES:
        COUNTRIES[_live_country_slug] = {"name": _live_country["name"], "region": _live_country["region"], "cities": []}
    for _live_city in _live_country["cities"]:
        if _live_city["city"] not in COUNTRIES[_live_country_slug]["cities"]:
            COUNTRIES[_live_country_slug]["cities"].append(_live_city["city"])
        _LIVE_LOCATION_SLUGS[(_live_country_slug, _live_city["city"])] = _live_city["loc_slug"]
_ORIGINAL_COUNTRY_SLUGS = frozenset(COUNTRIES)
_ORIGINAL_LOCATION_NAMES = {key: frozenset(value["cities"]) for key, value in COUNTRIES.items()}
_WORLD_CITY_METADATA = {}
for _world_country in _WORLD_CATALOG["countries"]:
    _world_slug = _world_country["slug"]
    if _world_slug not in COUNTRIES:
        COUNTRIES[_world_slug] = {"name": _world_country["name"], "region": _world_country["region"], "cities": []}
    COUNTRIES[_world_slug]["country_code"] = _world_country["code"]
    COUNTRIES[_world_slug]["capital"] = _world_country["capital"]
    COUNTRIES[_world_slug]["currency_code"] = _world_country["currency_code"]
    COUNTRIES[_world_slug]["languages"] = _world_country["languages"]
    COUNTRIES[_world_slug]["language_names"] = _world_country["language_names"]
    COUNTRIES[_world_slug]["geographic_source_url"] = _world_country["source_url"]
    COUNTRIES[_world_slug]["is_new_country"] = _world_slug not in _ORIGINAL_COUNTRY_SLUGS
    for _world_city in _world_country["cities"]:
        if _world_city["name"] not in COUNTRIES[_world_slug]["cities"]:
            COUNTRIES[_world_slug]["cities"].append(_world_city["name"])
        _WORLD_CITY_METADATA[(_world_slug, _world_city["name"])] = _world_city


def _slug(text: str) -> str:
    return (
        text.lower()
        .replace("&", "and")
        .replace(".", "")
        .replace("'", "")
        .replace(" ", "-")
    )


def build_city_map():
    """Return {loc_slug: {city, country, country_slug, region}} where loc_slug = 'delhi-india'."""
    city_map = {}
    for c_slug, c in COUNTRIES.items():
        for city in c["cities"]:
            loc_slug = _LIVE_LOCATION_SLUGS.get((c_slug, city), f"{_slug(city)}-{c_slug}")
            city_map[loc_slug] = {
                "city": city,
                "country": c["name"],
                "country_slug": c_slug,
                "region": c["region"],
                "loc_slug": loc_slug,
                **({"is_new_location": True, **{key: value for key, value in _WORLD_CITY_METADATA.get((c_slug, city), {}).items() if key not in {"name", "is_new_location"}}}
                   if city not in _ORIGINAL_LOCATION_NAMES.get(c_slug, frozenset()) else {}),
            }
    return city_map


SERVICE_MAP = {s["slug"]: s for s in SERVICES}
CITY_MAP = build_city_map()

# Highest-value markets to pre-generate (warm the AI cache so they load instantly).
# Delhi NCR is the priority focus, so it leads the list and is warmed first.
TOP_CITY_SLUGS = [
    # --- Delhi NCR (priority) ---
    "delhi-india", "gurgaon-india", "noida-india", "greater-noida-india", "faridabad-india", "ghaziabad-india",
    "dwarka-india", "rohini-india", "saket-india", "nehru-place-india", "janakpuri-india", "pitampura-india",
    "lajpat-nagar-india", "karol-bagh-india", "okhla-india", "vasant-kunj-india", "rajouri-garden-india",
    "mayur-vihar-india", "netaji-subhash-place-india", "manesar-india", "sohna-india", "bahadurgarh-india", "sonipat-india",
    # --- Other top Indian metros ---
    "mumbai-india", "bangalore-india", "hyderabad-india", "chennai-india", "pune-india", "kolkata-india",
    "jaipur-india", "lucknow-india", "patna-india", "ahmedabad-india", "chandigarh-india",
    # --- Global hubs ---
    "new-york-usa", "san-francisco-usa", "los-angeles-usa", "austin-usa",
    "london-uk", "manchester-uk", "toronto-canada", "vancouver-canada",
    "sydney-australia", "melbourne-australia", "dubai-uae", "abu-dhabi-uae", "singapore-singapore",
]
