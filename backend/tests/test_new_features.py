"""
Tests for iteration-2 new features: Case Studies, Team, Certificates, Awards,
Provider Reviews, expanded Company fields (statistics/sections/etc.),
plus new sub-resource endpoints (GET/PUT individual service & portfolio entries).
Public sub-resource endpoints for case-studies and awards are also covered.
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


def _login(creds):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json=creds)
    assert r.status_code == 200, f"login failed for {creds['email']}: {r.status_code} {r.text}"
    s.cookies.clear()
    return r.json()["token"]


def H(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def provider_token():
    return _login(PROVIDER)


@pytest.fixture(scope="module")
def buyer_token():
    return _login(BUYER)


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN)


@pytest.fixture(scope="module")
def my_company(provider_token):
    r = requests.get(f"{API}/me/company", headers=H(provider_token))
    assert r.status_code == 200
    return r.json()


# ============================================================
# NEW endpoints that should exist per review_request
# ============================================================
class TestServiceGetById:
    """Backend: GET /api/me/services/{id} returns service for provider (NEW)"""

    def test_get_my_service_by_id(self, provider_token):
        # Create a service first via the existing endpoint
        payload = {
            "name": "TEST GetById Service", "category": "veb-sayt",
            "description": "desc", "price_min": 100, "price_max": 200,
            "timeline": "1 hafta",
        }
        c = requests.post(f"{API}/me/services", json=payload, headers=H(provider_token))
        assert c.status_code == 200, c.text
        sid = c.json()["id"]
        # GET by id (NEW endpoint under test)
        r = requests.get(f"{API}/me/services/{sid}", headers=H(provider_token))
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        body = r.json()
        assert body.get("id") == sid
        assert body.get("name") == "TEST GetById Service"
        # cleanup
        requests.delete(f"{API}/me/services/{sid}", headers=H(provider_token))


class TestPortfolioGetByIdAndUpdate:
    """Backend: GET /api/me/portfolio/{id} & PUT /api/me/portfolio/{id} (NEW)"""

    def test_get_and_update_my_portfolio(self, provider_token):
        payload = {"title": "TEST Portfolio Item", "client_name": "TEST Client"}
        c = requests.post(f"{API}/me/portfolio", json=payload, headers=H(provider_token))
        assert c.status_code == 200, c.text
        pid = c.json()["id"]
        # GET by id (NEW endpoint)
        r = requests.get(f"{API}/me/portfolio/{pid}", headers=H(provider_token))
        assert r.status_code == 200, f"GET /me/portfolio/{{id}} not implemented: {r.status_code}"
        assert r.json().get("id") == pid
        # PUT update (NEW endpoint)
        r2 = requests.put(f"{API}/me/portfolio/{pid}",
                          json={"title": "TEST Portfolio Updated", "client_name": "TEST Client"},
                          headers=H(provider_token))
        assert r2.status_code == 200, f"PUT /me/portfolio/{{id}} not implemented: {r2.status_code}"
        # verify persistence via GET
        r3 = requests.get(f"{API}/me/portfolio/{pid}", headers=H(provider_token))
        assert r3.status_code == 200
        assert r3.json().get("title") == "TEST Portfolio Updated"
        requests.delete(f"{API}/me/portfolio/{pid}", headers=H(provider_token))


class TestCaseStudiesCRUD:
    """Backend: Case Studies CRUD - GET list, POST, GET by id, PUT, DELETE"""

    def test_case_studies_full_crud(self, provider_token):
        # GET list
        r0 = requests.get(f"{API}/me/case-studies", headers=H(provider_token))
        assert r0.status_code == 200, f"GET /me/case-studies missing: {r0.status_code}"
        assert isinstance(r0.json(), list)
        # POST create
        payload = {"title": "TEST Case Study", "client_name": "TEST Client",
                   "summary": "summary", "challenge": "ch", "solution": "sol", "result": "res"}
        c = requests.post(f"{API}/me/case-studies", json=payload, headers=H(provider_token))
        assert c.status_code == 200, f"POST /me/case-studies missing: {c.status_code} {c.text}"
        cid = c.json().get("id")
        assert cid
        # GET by id
        r = requests.get(f"{API}/me/case-studies/{cid}", headers=H(provider_token))
        assert r.status_code == 200, f"GET /me/case-studies/{{id}} missing: {r.status_code}"
        # PUT
        r2 = requests.put(f"{API}/me/case-studies/{cid}",
                          json={**payload, "title": "TEST Case Study Updated"},
                          headers=H(provider_token))
        assert r2.status_code == 200, f"PUT missing: {r2.status_code}"
        # GET again -> verify persistence
        r3 = requests.get(f"{API}/me/case-studies/{cid}", headers=H(provider_token))
        assert r3.status_code == 200
        assert r3.json().get("title") == "TEST Case Study Updated"
        # DELETE
        r4 = requests.delete(f"{API}/me/case-studies/{cid}", headers=H(provider_token))
        assert r4.status_code in (200, 204), f"DELETE missing: {r4.status_code}"
        r5 = requests.get(f"{API}/me/case-studies/{cid}", headers=H(provider_token))
        assert r5.status_code == 404


class TestTeamCRUD:
    """Backend: Team CRUD - GET, POST, GET by id, PUT, DELETE"""

    def test_team_full_crud(self, provider_token):
        r0 = requests.get(f"{API}/me/team", headers=H(provider_token))
        assert r0.status_code == 200, f"GET /me/team missing: {r0.status_code}"
        assert isinstance(r0.json(), list)
        payload = {"name": "TEST Member", "role": "CTO", "bio": "bio", "photo_url": ""}
        c = requests.post(f"{API}/me/team", json=payload, headers=H(provider_token))
        assert c.status_code == 200, f"POST /me/team missing: {c.status_code} {c.text}"
        tid = c.json().get("id")
        assert tid
        r = requests.get(f"{API}/me/team/{tid}", headers=H(provider_token))
        assert r.status_code == 200, f"GET /me/team/{{id}} missing: {r.status_code}"
        r2 = requests.put(f"{API}/me/team/{tid}",
                          json={**payload, "role": "CEO"}, headers=H(provider_token))
        assert r2.status_code == 200, f"PUT missing: {r2.status_code}"
        r3 = requests.get(f"{API}/me/team/{tid}", headers=H(provider_token))
        assert r3.json().get("role") == "CEO"
        r4 = requests.delete(f"{API}/me/team/{tid}", headers=H(provider_token))
        assert r4.status_code in (200, 204)


class TestCertificatesCRUD:
    """Backend: Certificates CRUD - GET, POST, DELETE"""

    def test_certificates_crud(self, provider_token):
        r0 = requests.get(f"{API}/me/certificates", headers=H(provider_token))
        assert r0.status_code == 200, f"GET /me/certificates missing: {r0.status_code}"
        assert isinstance(r0.json(), list)
        payload = {"name": "TEST Cert", "issuer": "ISO", "year": 2024, "file_url": ""}
        c = requests.post(f"{API}/me/certificates", json=payload, headers=H(provider_token))
        assert c.status_code == 200, f"POST /me/certificates missing: {c.status_code} {c.text}"
        cid = c.json().get("id")
        assert cid
        r4 = requests.delete(f"{API}/me/certificates/{cid}", headers=H(provider_token))
        assert r4.status_code in (200, 204)


class TestAwardsCRUD:
    """Backend: Awards CRUD - GET, POST, DELETE"""

    def test_awards_crud(self, provider_token):
        r0 = requests.get(f"{API}/me/awards", headers=H(provider_token))
        assert r0.status_code == 200, f"GET /me/awards missing: {r0.status_code}"
        assert isinstance(r0.json(), list)
        payload = {"title": "TEST Award", "issuer": "Awards Inc", "year": 2024}
        c = requests.post(f"{API}/me/awards", json=payload, headers=H(provider_token))
        assert c.status_code == 200, f"POST /me/awards missing: {c.status_code} {c.text}"
        aid = c.json().get("id")
        assert aid
        r4 = requests.delete(f"{API}/me/awards/{aid}", headers=H(provider_token))
        assert r4.status_code in (200, 204)


class TestProviderReviewsList:
    """Backend: GET /api/me/reviews (list reviews for own company)"""

    def test_get_my_reviews(self, provider_token):
        r = requests.get(f"{API}/me/reviews", headers=H(provider_token))
        assert r.status_code == 200, f"GET /me/reviews missing: {r.status_code}"
        assert isinstance(r.json(), list)


class TestCompanyUpdateNewFields:
    """Backend: PUT /api/me/company accepts NEW fields."""

    def test_company_update_new_fields_persist(self, provider_token):
        payload = {
            "short_description": "TEST short",
            "whatsapp": "+994501234567",
            "address": "TEST address Baku",
            "maps_url": "https://maps.google.com/?q=1,2",
            "branches": [{"city": "Baku", "address": "X"}],
            "service_countries": ["AZ", "TR"],
            "tax_number": "1234567890",
            "statistics": {"projects": 10, "clients": 5, "years": 7},
            "sections": {
                "about": {"enabled": True, "order": 1},
                "services": {"enabled": True, "order": 2},
                "case_studies": {"enabled": False, "order": 3},
            },
        }
        r = requests.put(f"{API}/me/company", json=payload, headers=H(provider_token))
        assert r.status_code == 200, f"PUT /me/company rejected new fields: {r.status_code} {r.text}"
        # GET company and verify all fields persisted
        g = requests.get(f"{API}/me/company", headers=H(provider_token))
        assert g.status_code == 200
        body = g.json()
        missing = [k for k in payload.keys() if k not in body or body.get(k) in (None, "", [], {})]
        assert not missing, f"Fields not persisted on company doc: {missing}. Got keys: {list(body.keys())}"
        # spot-check nested
        assert body.get("statistics", {}).get("projects") == 10
        assert body.get("sections", {}).get("case_studies", {}).get("enabled") is False


class TestPublicSubResources:
    """Backend: Public endpoints for case studies / awards on a company."""

    def test_public_case_studies(self):
        # Use first company
        clist = requests.get(f"{API}/companies", params={"limit": 1}).json()["items"]
        cid = clist[0]["id"]
        r = requests.get(f"{API}/public/companies/{cid}/case-studies")
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

    def test_public_awards(self):
        clist = requests.get(f"{API}/companies", params={"limit": 1}).json()["items"]
        cid = clist[0]["id"]
        r = requests.get(f"{API}/public/companies/{cid}/awards")
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)


# ============================================================
# RBAC for new endpoints — buyer/admin must not access provider-only resources
# ============================================================
class TestRBACNewEndpoints:
    @pytest.mark.parametrize("path", [
        "/me/case-studies", "/me/team", "/me/awards", "/me/certificates", "/me/reviews",
    ])
    def test_buyer_blocked(self, buyer_token, path):
        r = requests.get(f"{API}{path}", headers=H(buyer_token))
        assert r.status_code == 403, f"buyer should be 403 at {path}, got {r.status_code}"

    @pytest.mark.parametrize("path", [
        "/me/case-studies", "/me/team", "/me/awards", "/me/certificates",
    ])
    def test_admin_blocked_from_provider_scoped(self, admin_token, path):
        # These are provider-only (scoped to owner_id), so admin should also get 403
        r = requests.get(f"{API}{path}", headers=H(admin_token))
        assert r.status_code == 403, f"admin should be 403 at {path}, got {r.status_code}"


class TestDemoLoginProviderStillWorks:
    def test_provider_login(self):
        r = requests.post(f"{API}/auth/login", json=PROVIDER)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "provider"
