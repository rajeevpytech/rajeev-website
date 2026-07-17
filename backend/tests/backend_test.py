"""Backend API tests for RajeevFreelancer.com

Covers:
- Root /api/ health
- /api/content shape (projects, testimonials, stats, experience)
- /api/leads POST (valid, invalid email)
- /api/leads GET
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # Fallback: read frontend .env
    env_path = "/app/frontend/.env"
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.strip().startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.strip().split("=", 1)[1].strip()
                    break

BASE_URL = (BASE_URL or "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL not configured"


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


class TestRoot:
    def test_root(self, api):
        r = api.get(f"{BASE_URL}/api/", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("message") == "Rajeev Freelancer API"
        assert data.get("status") == "ok"


class TestContent:
    def test_content_shape(self, api):
        r = api.get(f"{BASE_URL}/api/content", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()

        assert set(["projects", "testimonials", "stats", "experience"]).issubset(data.keys())

        # Counts
        assert len(data["projects"]) == 6, f"expected 6 projects, got {len(data['projects'])}"
        assert len(data["testimonials"]) == 4, f"expected 4 testimonials, got {len(data['testimonials'])}"
        assert len(data["stats"]) == 4, f"expected 4 stats, got {len(data['stats'])}"
        assert len(data["experience"]) == 6, f"expected 6 experience items, got {len(data['experience'])}"

    def test_projects_structure(self, api):
        r = api.get(f"{BASE_URL}/api/content", timeout=30)
        data = r.json()
        p = data["projects"][0]
        for k in ["id", "slug", "title", "subtitle", "category", "year", "tags", "image", "span"]:
            assert k in p, f"missing key {k} in project"
        assert isinstance(p["tags"], list)

        slugs = {x["slug"] for x in data["projects"]}
        assert "cardano-scaling" in slugs

    def test_experience_years(self, api):
        r = api.get(f"{BASE_URL}/api/content", timeout=30)
        years = [x["year"] for x in r.json()["experience"]]
        for y in ["2012", "2014", "2017", "2019", "2020", "2025"]:
            assert y in years, f"missing year {y} in experience"

    def test_stats_values(self, api):
        r = api.get(f"{BASE_URL}/api/content", timeout=30)
        vals = [x["value"] for x in r.json()["stats"]]
        for v in ["12+", "180", "27", "94%"]:
            assert v in vals


class TestLeads:
    unique = str(uuid.uuid4())[:8]

    def test_create_lead_valid(self, api):
        payload = {
            "name": f"TEST_User_{self.unique}",
            "email": f"test_{self.unique}@example.com",
            "project_type": "Web Development",
            "budget": "$3k – $10k",
            "message": "TEST lead — automated backend test.",
        }
        r = api.post(f"{BASE_URL}/api/leads", json=payload, timeout=45)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("id"), "lead id missing"
        assert data.get("created_at"), "created_at missing"
        assert data["name"] == payload["name"]
        assert data["email"] == payload["email"]
        assert data["project_type"] == payload["project_type"]
        assert data["budget"] == payload["budget"]
        assert data["message"] == payload["message"]
        # store for later
        TestLeads.created_id = data["id"]
        TestLeads.created_email = payload["email"]

    def test_create_lead_invalid_email(self, api):
        payload = {
            "name": "TEST_bademail",
            "email": "not-an-email",
            "project_type": "Web Development",
            "budget": "$3k – $10k",
            "message": "should fail validation",
        }
        r = api.post(f"{BASE_URL}/api/leads", json=payload, timeout=30)
        assert r.status_code == 422, f"expected 422, got {r.status_code}: {r.text}"

    def test_create_lead_missing_fields(self, api):
        payload = {"name": "TEST_only_name"}
        r = api.post(f"{BASE_URL}/api/leads", json=payload, timeout=30)
        assert r.status_code == 422

    def test_list_leads_contains_created(self, api):
        # small delay to ensure write is visible
        time.sleep(0.5)
        r = api.get(f"{BASE_URL}/api/leads", timeout=30)
        assert r.status_code == 200, r.text
        leads = r.json()
        assert isinstance(leads, list)
        emails = {l.get("email") for l in leads}
        assert getattr(TestLeads, "created_email", None) in emails, \
            f"created lead email not found in list (total: {len(leads)})"
