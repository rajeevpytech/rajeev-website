from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Email (Emergent Managed Resend)
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Rajeev Freelancer")
CONTACT_INBOX = os.environ.get("CONTACT_INBOX", "hello@rajeevfreelancer.com")

app = FastAPI(title="Rajeev Freelancer API")
api_router = APIRouter(prefix="/api")


# ---------------------- MODELS ----------------------
def _now_iso():
    return datetime.now(timezone.utc).isoformat()


class LeadCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    email: EmailStr
    project_type: str = Field(..., min_length=1, max_length=80)
    budget: str = Field(..., min_length=1, max_length=80)
    message: str = Field(..., min_length=1, max_length=4000)
    source: Optional[str] = "website"


class Lead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    project_type: str
    budget: str
    message: str
    source: str = "website"
    created_at: str = Field(default_factory=_now_iso)


class ProjectOut(BaseModel):
    id: str
    slug: str
    title: str
    subtitle: str
    category: str
    year: str
    tags: List[str]
    image: str
    span: str  # bento span hint
    href: Optional[str] = None
    metric: Optional[str] = None


class TestimonialOut(BaseModel):
    id: str
    quote: str
    author: str
    role: str
    company: str


class StatOut(BaseModel):
    label: str
    value: str


class ExperienceOut(BaseModel):
    year: str
    company: str
    role: str
    detail: str


class SiteContent(BaseModel):
    projects: List[ProjectOut]
    testimonials: List[TestimonialOut]
    stats: List[StatOut]
    experience: List[ExperienceOut]


# ---------------------- SEED CONTENT ----------------------
PROJECTS = [
    ProjectOut(
        id="p1", slug="cardano-scaling", title="Cardano Scaling Layer",
        subtitle="High-throughput settlement UI for a Layer-1 blockchain team.",
        category="Software Engineering", year="2024",
        tags=["React", "TypeScript", "Rust", "GraphQL"],
        image="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
        span="col-span-12 md:col-span-8 row-span-2", href="#",
        metric="4.2M tx/day",
    ),
    ProjectOut(
        id="p2", slug="fintech-growth", title="Fintech Growth Engine",
        subtitle="Paid + organic campaigns that 3.4x pipeline in two quarters.",
        category="Digital Marketing", year="2024",
        tags=["SEO", "PPC", "Attribution"],
        image="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        span="col-span-12 md:col-span-4", href="#",
        metric="+342% pipeline",
    ),
    ProjectOut(
        id="p3", slug="commerce-headless", title="Headless Commerce Rebuild",
        subtitle="Sub-second storefront on Next.js + edge cache for a DTC brand.",
        category="Web Development", year="2023",
        tags=["Next.js", "Edge", "Stripe"],
        image="https://images.unsplash.com/photo-1607082349566-187342175e2f?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        span="col-span-12 md:col-span-4", href="#",
        metric="0.6s LCP",
    ),
    ProjectOut(
        id="p4", slug="saas-analytics", title="SaaS Analytics Console",
        subtitle="Realtime dashboards, custom SQL, alerting for a Series B SaaS.",
        category="Software Engineering", year="2023",
        tags=["React", "ClickHouse", "Python"],
        image="https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
        span="col-span-12 md:col-span-8", href="#",
        metric="12k daily users",
    ),
    ProjectOut(
        id="p5", slug="seo-consulting", title="Enterprise SEO Overhaul",
        subtitle="Technical audit + content ops for a media portfolio of 40 sites.",
        category="SEO Consulting", year="2022",
        tags=["Technical SEO", "Content", "Schema"],
        image="https://images.unsplash.com/photo-1460925895917-afdab827c52f?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        span="col-span-12 md:col-span-6", href="#",
        metric="+1.9M organic",
    ),
    ProjectOut(
        id="p6", slug="ai-copilot", title="AI Copilot for Ops Teams",
        subtitle="LLM-powered internal assistant for a global consulting firm.",
        category="Software Engineering", year="2025",
        tags=["LLM", "RAG", "Python"],
        image="https://images.unsplash.com/photo-1677442136019-21780ecad995?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        span="col-span-12 md:col-span-6", href="#",
        metric="63% ticket deflection",
    ),
]

TESTIMONIALS = [
    TestimonialOut(id="t1", quote="Rajeev shipped in weeks what our internal team couldn't in a year. Rare combination of engineer and operator.",
                   author="Priya Menon", role="VP Product", company="Series B SaaS"),
    TestimonialOut(id="t2", quote="He translated a messy brief into a beautiful, performant product. Genuinely one of the best freelancers we've hired.",
                   author="Daniel Rasmussen", role="Founder", company="DTC Retail"),
    TestimonialOut(id="t3", quote="Deep technical taste and marketing instinct in the same person. Our organic traffic tripled after his audit.",
                   author="Sofia Aguilar", role="Head of Growth", company="Fintech Scaleup"),
    TestimonialOut(id="t4", quote="Reliable, senior, and remarkably calm under fire. We keep him on retainer.",
                   author="Marcus Bell", role="CTO", company="AI Startup"),
]

STATS = [
    StatOut(label="Years shipping", value="12+"),
    StatOut(label="Projects delivered", value="180"),
    StatOut(label="Countries served", value="27"),
    StatOut(label="Client retention", value="94%"),
]

EXPERIENCE = [
    ExperienceOut(year="2012", company="Beginning", role="First lines of production code",
                  detail="Started building for the web out of college — HTML, PHP, curiosity."),
    ExperienceOut(year="2014", company="IOG", role="Software Engineer",
                  detail="Contributed to distributed systems and developer tooling for a global blockchain research org."),
    ExperienceOut(year="2017", company="Accenture", role="Senior Consultant",
                  detail="Built enterprise platforms for Fortune 500 clients across banking and telecom."),
    ExperienceOut(year="2019", company="Google", role="Contract Engineer",
                  detail="Worked with internal product teams on measurement, tooling and growth systems."),
    ExperienceOut(year="2020", company="Independent", role="Full-time Freelancer",
                  detail="Left full-time work to run a solo studio. Serving founders, scaleups, and agencies since."),
    ExperienceOut(year="2025", company="Today", role="Trusted senior for hire",
                  detail="Engineering + marketing under one roof. Selective engagements, senior-only delivery."),
]


# ---------------------- ROUTES ----------------------
@api_router.get("/")
async def root():
    return {"message": "Rajeev Freelancer API", "status": "ok"}


@api_router.get("/content", response_model=SiteContent)
async def get_content():
    return SiteContent(projects=PROJECTS, testimonials=TESTIMONIALS,
                       stats=STATS, experience=EXPERIENCE)


@api_router.post("/leads", response_model=Lead)
async def create_lead(payload: LeadCreate):
    lead = Lead(**payload.model_dump())
    await db.leads.insert_one(lead.model_dump())

    # Fire-and-forget email notification (best effort)
    if EMAIL_KEY:
        html = f"""
        <table width='100%' cellpadding='0' cellspacing='0' style='background:#050505;padding:32px;font-family:Manrope,Arial,sans-serif;color:#F4F4F5'>
          <tr><td>
            <table width='560' align='center' cellpadding='0' cellspacing='0' style='background:#121212;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:32px'>
              <tr><td style='padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.1)'>
                <div style='font-family:monospace;color:#D4FF00;font-size:12px;letter-spacing:0.2em'>NEW LEAD // RAJEEVFREELANCER.COM</div>
                <div style='font-family:Georgia,serif;color:#F4F4F5;font-size:28px;margin-top:8px'>{lead.name}</div>
                <div style='color:#A1A1AA;font-size:14px;margin-top:4px'>{lead.email}</div>
              </td></tr>
              <tr><td style='padding-top:20px'>
                <p style='color:#A1A1AA;font-size:12px;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 4px'>Project</p>
                <p style='color:#F4F4F5;margin:0 0 16px'>{lead.project_type}</p>
                <p style='color:#A1A1AA;font-size:12px;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 4px'>Budget</p>
                <p style='color:#F4F4F5;margin:0 0 16px'>{lead.budget}</p>
                <p style='color:#A1A1AA;font-size:12px;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 4px'>Brief</p>
                <p style='color:#F4F4F5;line-height:1.6;margin:0'>{lead.message}</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
        """
        try:
            async with httpx.AsyncClient(timeout=15) as hc:
                resp = await hc.post(
                    f"{EMAIL_BASE_URL}/api/v1/email/send",
                    headers={"X-Email-Key": EMAIL_KEY},
                    json={
                        "to": [CONTACT_INBOX],
                        "subject": f"New lead — {lead.name} · {lead.project_type}",
                        "html": html,
                        "from_name": EMAIL_FROM_NAME,
                        "contact_email": lead.email,
                    },
                )
                if resp.status_code >= 400:
                    logging.warning("Email proxy responded %s: %s", resp.status_code, resp.text)
        except Exception as e:  # noqa: BLE001
            logging.warning("Email notify failed: %s", e)

    return lead


@api_router.get("/leads", response_model=List[Lead])
async def list_leads():
    docs = await db.leads.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


# Wire router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
