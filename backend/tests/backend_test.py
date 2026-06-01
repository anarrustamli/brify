"""
BizMarket B2B Marketplace - Backend API tests.
Covers: public catalog, auth (login/demo/register/me), buyer flow, provider flow,
admin flow, and role-based access (RBAC).
"""
import os
import uuid
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@bizmarket.az", "password": "Admin123!"}
BUYER = {"email": "buyer@bizmarket.az", "password": "Buyer123!"}
PROVIDER = {"email": "provider@bizmarket.az", "password": "Provider123!"}


# ---------------- fixtures ----------------
@pytest.fixture(scope="session")
def session():
    # Public-endpoint session only; do not use this session for authed flows
    # to avoid auth cookie cross-contamination.
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(autouse=True)
def _clear_session_cookies(session):
    # Some tests hit /auth/login which sets an access_token cookie on the
    # shared public session. Server prefers cookie over Authorization header,
    # so we wipe cookies before every test to avoid cross-contamination.
    session.cookies.clear()
    yield
    session.cookies.clear()


def _login(creds):
    # Use isolated session per role so the auth cookie set on login does not
    # leak into other roles' sessions (server prefers cookie over Bearer header).
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json=creds)
    assert r.status_code == 200, f"login failed for {creds['email']}: {r.status_code} {r.text}"
    # Clear cookies so subsequent requests rely solely on Bearer header.
    s.cookies.clear()
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_token():
    return _login(ADMIN)


@pytest.fixture(scope="session")
def buyer_token():
    return _login(BUYER)


@pytest.fixture(scope="session")
def provider_token():
    return _login(PROVIDER)


def H(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------------- Public endpoints ----------------
class TestPublic:
    def test_categories_seeded_20(self, session):
        r = session.get(f"{API}/categories")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 20, f"expected >=20 categories, got {len(data)}"
        assert "slug" in data[0] and "name" in data[0]

    def test_plans_4(self, session):
        r = session.get(f"{API}/plans")
        assert r.status_code == 200
        data = r.json()
        slugs = {p["slug"] for p in data}
        assert {"free", "pro", "premium", "enterprise"}.issubset(slugs), slugs

    def test_companies_list_and_filters(self, session):
        r = session.get(f"{API}/companies")
        assert r.status_code == 200
        body = r.json()
        assert {"items", "total", "page", "limit"}.issubset(body.keys())
        assert body["total"] >= 1

        # filter verified
        r2 = session.get(f"{API}/companies", params={"verified": "true", "sort": "rating", "page": 1, "limit": 5})
        assert r2.status_code == 200
        b2 = r2.json()
        for c in b2["items"]:
            assert c.get("verified") is True

    def test_company_detail_with_relations(self, session):
        r = session.get(f"{API}/companies", params={"limit": 1})
        items = r.json()["items"]
        assert items, "no seeded companies"
        slug = items[0]["slug"]
        r2 = session.get(f"{API}/companies/{slug}")
        assert r2.status_code == 200
        body = r2.json()
        for k in ("services", "portfolio", "reviews", "team", "certificates"):
            assert k in body and isinstance(body[k], list)

    def test_services_list_and_detail(self, session):
        r = session.get(f"{API}/services", params={"limit": 5})
        assert r.status_code == 200
        body = r.json()
        assert body["total"] >= 1
        sid = body["items"][0]["id"]
        r2 = session.get(f"{API}/services/{sid}")
        assert r2.status_code == 200
        s = r2.json()
        assert s["id"] == sid
        assert s.get("company") is not None

    def test_ads_and_blog(self, session):
        r = session.get(f"{API}/ads")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        r = session.get(f"{API}/blog")
        assert r.status_code == 200
        posts = r.json()
        assert isinstance(posts, list)
        if posts:
            slug = posts[0]["slug"]
            r2 = session.get(f"{API}/blog/{slug}")
            assert r2.status_code == 200
            assert r2.json()["slug"] == slug


# ---------------- Auth ----------------
class TestAuth:
    def test_login_demo_users_all_three(self, session):
        for creds, role in [(BUYER, "buyer"), (PROVIDER, "provider"), (ADMIN, "admin")]:
            r = session.post(f"{API}/auth/login", json=creds)
            assert r.status_code == 200, f"{creds['email']} -> {r.status_code} {r.text}"
            body = r.json()
            assert "token" in body and "user" in body
            assert body["user"]["role"] == role
            assert "password_hash" not in body["user"]

    def test_login_wrong_password(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN["email"], "password": "wrong"})
        assert r.status_code == 401

    def test_demo_login_each_role(self, session):
        for role in ("buyer", "provider", "admin"):
            r = session.post(f"{API}/auth/demo-login", json={"role": role})
            assert r.status_code == 200, f"{role} -> {r.text}"
            assert r.json()["user"]["role"] == role

    def test_demo_login_invalid_role(self, session):
        r = session.post(f"{API}/auth/demo-login", json={"role": "ghost"})
        assert r.status_code in (400, 404)

    def test_auth_me_with_bearer(self, session, buyer_token):
        r = session.get(f"{API}/auth/me", headers=H(buyer_token))
        assert r.status_code == 200
        assert r.json()["email"] == BUYER["email"]

    def test_auth_me_unauthenticated(self, session):
        r = requests.get(f"{API}/auth/me")  # fresh session, no cookies
        assert r.status_code == 401

    def test_register_buyer_creates_profile(self, session):
        email = f"test_buyer_{uuid.uuid4().hex[:8]}@bizmarket.az"
        r = session.post(f"{API}/auth/register", json={
            "email": email, "password": "Pass123!", "name": "Test Buyer", "role": "buyer",
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["user"]["role"] == "buyer"
        # verify /me works with returned token
        me = session.get(f"{API}/auth/me", headers=H(body["token"]))
        assert me.status_code == 200 and me.json()["email"] == email

    def test_register_provider_creates_pending_company(self, session, admin_token):
        email = f"test_provider_{uuid.uuid4().hex[:8]}@bizmarket.az"
        r = session.post(f"{API}/auth/register", json={
            "email": email, "password": "Pass123!", "name": "Test Provider",
            "role": "provider", "company_name": "TEST Company XYZ", "sector": "IT",
        })
        assert r.status_code == 200, r.text
        token = r.json()["token"]
        # Provider can fetch own (pending) company
        comp = session.get(f"{API}/me/company", headers=H(token))
        assert comp.status_code == 200
        assert comp.json()["status"] == "pending"

    def test_register_duplicate(self, session):
        r = session.post(f"{API}/auth/register", json={
            "email": BUYER["email"], "password": "x", "name": "x", "role": "buyer",
        })
        assert r.status_code == 400

    def test_register_invalid_role(self, session):
        r = session.post(f"{API}/auth/register", json={
            "email": f"x{uuid.uuid4().hex[:6]}@bm.az", "password": "x", "name": "x", "role": "admin",
        })
        assert r.status_code == 400


# ---------------- Buyer flow ----------------
class TestBuyerFlow:
    def test_create_brief_and_list(self, session, buyer_token):
        payload = {
            "title": "TEST_Brief web sayt",
            "category": "veb-sayt",
            "budget_min": 1000, "budget_max": 5000,
            "description": "Test brief desc",
        }
        r = session.post(f"{API}/briefs", json=payload, headers=H(buyer_token))
        assert r.status_code == 200, r.text
        bid = r.json()["id"]

        # list my briefs
        r2 = session.get(f"{API}/me/briefs", headers=H(buyer_token))
        assert r2.status_code == 200
        assert any(b["id"] == bid for b in r2.json())

        # get individual brief
        r3 = session.get(f"{API}/briefs/{bid}", headers=H(buyer_token))
        assert r3.status_code == 200
        assert r3.json()["id"] == bid
        assert "proposals" in r3.json()

    def test_proposals_received(self, session, buyer_token):
        r = session.get(f"{API}/me/proposals/received", headers=H(buyer_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_shortlist_add_get_remove(self, session, buyer_token):
        comps = session.get(f"{API}/companies", params={"limit": 1}).json()["items"]
        cid = comps[0]["id"]
        r1 = session.post(f"{API}/me/shortlist/{cid}", headers=H(buyer_token))
        assert r1.status_code == 200
        r2 = session.get(f"{API}/me/shortlist", headers=H(buyer_token))
        assert r2.status_code == 200
        assert any(c["id"] == cid for c in r2.json())
        r3 = session.delete(f"{API}/me/shortlist/{cid}", headers=H(buyer_token))
        assert r3.status_code == 200
        r4 = session.get(f"{API}/me/shortlist", headers=H(buyer_token))
        assert all(c["id"] != cid for c in r4.json())

    def test_buyer_dashboard(self, session, buyer_token):
        r = session.get(f"{API}/me/buyer-dashboard", headers=H(buyer_token))
        assert r.status_code == 200
        body = r.json()
        for k in ("active_briefs", "proposals_count", "shortlist_count", "messages", "recent_briefs"):
            assert k in body


# ---------------- Provider flow ----------------
class TestProviderFlow:
    def test_get_my_company(self, session, provider_token):
        r = session.get(f"{API}/me/company", headers=H(provider_token))
        assert r.status_code == 200
        assert "id" in r.json()

    def test_update_my_company(self, session, provider_token):
        r = session.put(f"{API}/me/company", json={"slogan": "TEST slogan", "about": "TEST about info"},
                        headers=H(provider_token))
        assert r.status_code == 200
        assert "profile_completion" in r.json()

    def test_services_crud(self, session, provider_token):
        # create
        payload = {
            "name": "TEST Service", "category": "veb-sayt", "description": "Test desc",
            "price_min": 500, "price_max": 1500, "timeline": "2 həftə",
        }
        r = session.post(f"{API}/me/services", json=payload, headers=H(provider_token))
        assert r.status_code == 200, r.text
        sid = r.json()["id"]
        # list
        r2 = session.get(f"{API}/me/services", headers=H(provider_token))
        assert any(s["id"] == sid for s in r2.json())
        # update
        payload["name"] = "TEST Service Updated"
        r3 = session.put(f"{API}/me/services/{sid}", json=payload, headers=H(provider_token))
        assert r3.status_code == 200
        # public detail reflects update
        r4 = session.get(f"{API}/services/{sid}")
        assert r4.status_code == 200 and r4.json()["name"] == "TEST Service Updated"
        # delete
        r5 = session.delete(f"{API}/me/services/{sid}", headers=H(provider_token))
        assert r5.status_code == 200
        r6 = session.get(f"{API}/services/{sid}")
        assert r6.status_code == 404

    def test_leads(self, session, provider_token):
        r = session.get(f"{API}/me/leads", headers=H(provider_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_proposal_create_and_sent(self, session, buyer_token, provider_token):
        # buyer creates a brief first
        brief = session.post(f"{API}/briefs", json={
            "title": "TEST_Proposal Brief", "category": "marketinq",
            "budget_min": 200, "budget_max": 800, "description": "for proposal",
        }, headers=H(buyer_token)).json()
        bid = brief["id"]
        # provider sends proposal
        r = session.post(f"{API}/proposals", json={
            "brief_id": bid, "title": "TEST Proposal", "text": "we can do it",
            "price": 500, "timeline": "1 hafta",
        }, headers=H(provider_token))
        assert r.status_code == 200, r.text
        # list sent
        r2 = session.get(f"{API}/me/proposals/sent", headers=H(provider_token))
        assert any(p["brief_id"] == bid for p in r2.json())

    def test_analytics(self, session, provider_token):
        r = session.get(f"{API}/me/analytics", headers=H(provider_token))
        assert r.status_code == 200
        body = r.json()
        for k in ("services", "portfolio", "leads", "proposals_sent", "win_rate"):
            assert k in body


# ---------------- Admin flow ----------------
class TestAdmin:
    def test_stats(self, session, admin_token):
        r = session.get(f"{API}/admin/stats", headers=H(admin_token))
        assert r.status_code == 200
        body = r.json()
        for k in ("providers", "buyers", "leads", "briefs", "proposals"):
            assert k in body

    def test_companies_list_and_actions(self, session, admin_token):
        r = session.get(f"{API}/admin/companies", headers=H(admin_token))
        assert r.status_code == 200 and isinstance(r.json(), list)
        cid = r.json()[0]["id"]
        # status
        r1 = session.put(f"{API}/admin/companies/{cid}/status", json={"status": "active"}, headers=H(admin_token))
        assert r1.status_code == 200
        # verify
        r2 = session.put(f"{API}/admin/companies/{cid}/verify", json={"verified": True}, headers=H(admin_token))
        assert r2.status_code == 200
        # feature
        r3 = session.put(f"{API}/admin/companies/{cid}/feature", json={"featured": True}, headers=H(admin_token))
        assert r3.status_code == 200

    def test_users_reviews_leads_briefs(self, session, admin_token):
        for path in ("/admin/users", "/admin/reviews", "/admin/leads", "/admin/briefs"):
            r = session.get(f"{API}{path}", headers=H(admin_token))
            assert r.status_code == 200, f"{path} -> {r.status_code}"
            assert isinstance(r.json(), list)

    def test_ads_plans_settings_integrations_audit(self, session, admin_token):
        for path in ("/admin/ads", "/admin/plans", "/admin/integrations", "/admin/audit-logs"):
            r = session.get(f"{API}{path}", headers=H(admin_token))
            assert r.status_code == 200, f"{path} -> {r.status_code}"
        s = session.get(f"{API}/admin/settings", headers=H(admin_token))
        assert s.status_code == 200


# ---------------- RBAC ----------------
class TestRBAC:
    def test_buyer_blocked_from_admin(self, session, buyer_token):
        r = session.get(f"{API}/admin/stats", headers=H(buyer_token))
        assert r.status_code == 403

    def test_provider_blocked_from_admin(self, session, provider_token):
        r = session.get(f"{API}/admin/users", headers=H(provider_token))
        assert r.status_code == 403

    def test_buyer_blocked_from_provider_endpoints(self, session, buyer_token):
        for path in ("/me/company", "/me/services", "/me/leads", "/me/analytics", "/me/proposals/sent"):
            r = session.get(f"{API}{path}", headers=H(buyer_token))
            assert r.status_code == 403, f"buyer should be 403 at {path} but got {r.status_code}"

    def test_provider_blocked_from_buyer_endpoints(self, session, provider_token):
        for path in ("/me/briefs", "/me/shortlist", "/me/buyer-dashboard", "/me/proposals/received"):
            r = session.get(f"{API}{path}", headers=H(provider_token))
            assert r.status_code == 403, f"provider should be 403 at {path} but got {r.status_code}"

    def test_unauthenticated_blocked(self, session):
        # fresh request without auth
        r = requests.get(f"{API}/admin/stats")
        assert r.status_code == 401
        r = requests.post(f"{API}/briefs", json={})
        assert r.status_code == 401
