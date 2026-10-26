import os, requests
from dotenv import dotenv_values
B = (dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"]).rstrip("/")
s = requests.Session()
tok = s.post(f"{B}/api/auth/login", json={"email": "rajeev@rajeevfreelancer.com", "password": "Rajeev@2026!Admin"}).json()
tok = tok.get("access_token") or tok.get("token")
s.headers.update({"Authorization": f"Bearer {tok}"})
posts = s.get(f"{B}/api/admin/blog").json()["posts"]
for p in posts:
    if p["title"].startswith("TEST_") or "measure-real-business-roi" in p["slug"] or "how-to-measure-real" in p["slug"]:
        print("deleting", p["slug"], s.delete(f"{B}/api/admin/blog/{p['id']}").status_code)
r = s.put(f"{B}/api/admin/blog-autopilot", json={"custom_topics": [], "enabled": True, "frequency_days": 7, "auto_publish": True}).json()
print({k: r[k] for k in ("enabled", "frequency_days", "auto_publish", "custom_topics", "next_topic")})
print("post count:", len(s.get(f"{B}/api/admin/blog").json()["posts"]))
