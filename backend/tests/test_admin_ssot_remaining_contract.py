"""
Remaining Admin SSOT contracts: typed admin CRUD, public sync, billing lifecycle,
media validation, DB-backed compare snapshots, and real forgot-password flow.
"""
import os
import uuid

import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://127.0.0.1:8001").rstrip("/")
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


def HB(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN)


@pytest.fixture(scope="module")
def buyer_token():
    return _login(BUYER)


@pytest.fixture(scope="module")
def provider_token():
    return _login(PROVIDER)


@pytest.fixture(scope="module")
def provider_company(provider_token):
    r = requests.get(f"{API}/me/company", headers=H(provider_token))
    assert r.status_code == 200
    return r.json()


def assert_admin_contract(body):
    assert {"items", "total", "page", "limit", "filters", "sort"}.issubset(body.keys())
    assert isinstance(body["items"], list)


def test_admin_user_typed_crud_and_audit(admin_token):
    email = f"ssot-user-{uuid.uuid4().hex[:8]}@bizmarket.az"
    created = requests.post(
        f"{API}/admin/users",
        json={"email": email, "name": "SSOT User", "role": "buyer", "verified": True, "status": "active"},
        headers=H(admin_token),
    )
    assert created.status_code == 200, created.text
    uid = created.json()["id"]

    updated = requests.put(f"{API}/admin/users/{uid}", json={"name": "SSOT User Updated", "status": "suspended"}, headers=H(admin_token))
    assert updated.status_code == 200, updated.text
    assert updated.json()["name"] == "SSOT User Updated"

    listed = requests.get(f"{API}/admin/users", params={"q": email}, headers=H(admin_token))
    assert listed.status_code == 200
    assert_admin_contract(listed.json())
    assert any(user["id"] == uid for user in listed.json()["items"])

    deleted = requests.delete(f"{API}/admin/users/{uid}", headers=H(admin_token))
    assert deleted.status_code == 200

    logs = requests.get(f"{API}/admin/audit-logs", params={"entity_type": "user", "entity_id": uid}, headers=H(admin_token))
    assert logs.status_code == 200
    actions = {item["action"] for item in logs.json()["items"]}
    assert {"user.create", "user.update", "user.delete"}.issubset(actions)


def test_admin_services_and_portfolio_visibility_rules(admin_token, provider_company):
    service_name = f"SSOT Service {uuid.uuid4().hex[:6]}"
    service = requests.post(
        f"{API}/admin/services",
        json={
            "name": service_name,
            "company_id": provider_company["id"],
            "company_name": provider_company["name"],
            "category": "veb-sayt",
            "description": "Admin created service",
            "price_min": 100,
            "price_max": 300,
            "timeline": "1 həftə",
            "status": "active",
        },
        headers=H(admin_token),
    )
    assert service.status_code == 200, service.text
    sid = service.json()["id"]
    public = requests.get(f"{API}/services", params={"q": service_name, "limit": 20})
    assert any(item["id"] == sid for item in public.json()["items"])

    hidden = requests.put(f"{API}/admin/services/{sid}", json={"status": "rejected"}, headers=H(admin_token))
    assert hidden.status_code == 200, hidden.text
    public_hidden = requests.get(f"{API}/services", params={"q": service_name, "limit": 20})
    assert all(item["id"] != sid for item in public_hidden.json()["items"])

    portfolio_title = f"SSOT Portfolio {uuid.uuid4().hex[:6]}"
    portfolio = requests.post(
        f"{API}/admin/portfolio",
        json={"title": portfolio_title, "company_id": provider_company["id"], "client_name": "SSOT Client", "visibility": "public", "status": "active"},
        headers=H(admin_token),
    )
    assert portfolio.status_code == 200, portfolio.text
    pid = portfolio.json()["id"]
    public_portfolio = requests.get(f"{API}/portfolio", params={"q": portfolio_title, "limit": 20})
    assert any(item["id"] == pid for item in public_portfolio.json()["items"])

    deleted = requests.delete(f"{API}/admin/portfolio/{pid}", headers=H(admin_token))
    assert deleted.status_code == 200
    public_deleted = requests.get(f"{API}/portfolio", params={"q": portfolio_title, "limit": 20})
    assert all(item["id"] != pid for item in public_deleted.json()["items"])


def test_billing_approve_reject_lifecycle(provider_token, admin_token, provider_company):
    request = requests.post(f"{API}/me/subscription-requests", json={"plan": "premium", "amount": 199}, headers=H(provider_token))
    assert request.status_code == 200, request.text
    sid = request.json()["id"]

    approved = requests.post(f"{API}/admin/billing/subscriptions/{sid}/approve", json={"note": "Approved by test"}, headers=H(admin_token))
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "active"
    assert approved.json()["invoice_id"]
    assert approved.json()["payment_id"]

    company = requests.get(f"{API}/me/company", headers=H(provider_token)).json()
    assert company["plan"] == "premium"

    history = requests.get(f"{API}/me/billing", headers=H(provider_token))
    assert history.status_code == 200
    assert any(item["id"] == sid for item in history.json()["subscriptions"])
    assert any(item["id"] == approved.json()["invoice_id"] for item in history.json()["invoices"])

    second = requests.post(f"{API}/me/subscription-requests", json={"plan": "pro", "amount": 99}, headers=H(provider_token)).json()
    rejected = requests.post(f"{API}/admin/billing/subscriptions/{second['id']}/reject", json={"note": "No"}, headers=H(admin_token))
    assert rejected.status_code == 200, rejected.text
    assert rejected.json()["status"] == "rejected"


def test_media_module_validation_and_soft_delete(admin_token):
    bad = requests.post(
        f"{API}/media",
        data={"module": "company-logo", "entity_id": "x"},
        files={"file": ("bad.pdf", b"%PDF-1.4", "application/pdf")},
        headers=HB(admin_token),
    )
    assert bad.status_code == 400

    good = requests.post(
        f"{API}/media",
        data={"module": "company-logo", "entity_id": "x", "alt": "Logo"},
        files={"file": ("logo.png", b"\x89PNG\r\n\x1a\n", "image/png")},
        headers=HB(admin_token),
    )
    assert good.status_code == 200, good.text
    asset_id = good.json()["id"]
    served = requests.get(f"{API}/media/{asset_id}")
    assert served.status_code == 200
    deleted = requests.delete(f"{API}/media/{asset_id}", headers=H(admin_token))
    assert deleted.status_code == 200
    hidden = requests.get(f"{API}/media/{asset_id}")
    assert hidden.status_code == 404


def test_content_home_provider_and_faq_sync(admin_token):
    home = requests.put(
        f"{API}/admin/content-pages/home",
        json={"title": "SSOT Home", "slug": "home", "body": "Home body", "status": "published", "stats": [{"value": "999", "label": "Test"}]},
        headers=H(admin_token),
    )
    assert home.status_code == 200, home.text
    public_home = requests.get(f"{API}/content/home")
    assert public_home.status_code == 200
    assert public_home.json()["title"] == "SSOT Home"

    provider = requests.put(
        f"{API}/admin/content-pages/provider-landing",
        json={"title": "SSOT Provider", "slug": "provider-landing", "body": "Provider body", "status": "published"},
        headers=H(admin_token),
    )
    assert provider.status_code == 200, provider.text
    public_provider = requests.get(f"{API}/content/provider-landing")
    assert public_provider.status_code == 200
    assert public_provider.json()["title"] == "SSOT Provider"

    faq = requests.post(
        f"{API}/admin/faqs",
        json={"question": f"SSOT FAQ {uuid.uuid4().hex[:6]}", "answer": "Answer", "category": "buyer", "order": 1, "status": "published"},
        headers=H(admin_token),
    )
    assert faq.status_code == 200, faq.text
    faqs = requests.get(f"{API}/faqs", params={"category": "buyer"})
    assert faqs.status_code == 200
    assert any(item["id"] == faq.json()["id"] for item in faqs.json())


def test_compare_snapshots_are_db_backed(buyer_token):
    payload = {"title": "SSOT Compare", "company_ids": ["c1", "c2"], "companies": [{"id": "c1", "name": "One"}]}
    created = requests.post(f"{API}/me/compare-snapshots", json=payload, headers=H(buyer_token))
    assert created.status_code == 200, created.text
    cid = created.json()["id"]

    listed = requests.get(f"{API}/me/compare-snapshots", headers=H(buyer_token))
    assert listed.status_code == 200
    assert any(item["id"] == cid for item in listed.json())

    deleted = requests.delete(f"{API}/me/compare-snapshots/{cid}", headers=H(buyer_token))
    assert deleted.status_code == 200


def test_compare_snapshots_support_service_and_portfolio_levels(buyer_token):
    payload = {
        "title": "SSOT Service Compare",
        "item_type": "service",
        "item_ids": ["s1", "s2"],
        "items": [{"id": "s1", "name": "SEO Audit"}],
    }
    created = requests.post(f"{API}/me/compare-snapshots", json=payload, headers=H(buyer_token))
    assert created.status_code == 200, created.text
    body = created.json()
    assert body["item_type"] == "service"
    assert body["item_ids"] == ["s1", "s2"]


def test_forgot_and_reset_password_flow(admin_token):
    email = f"reset-{uuid.uuid4().hex[:8]}@bizmarket.az"
    user = requests.post(f"{API}/admin/users", json={"email": email, "name": "Reset User", "role": "buyer", "status": "active"}, headers=H(admin_token))
    assert user.status_code == 200, user.text

    requested = requests.post(f"{API}/auth/forgot-password", json={"email": email})
    assert requested.status_code == 200
    assert requested.json()["ok"] is True
    token = requested.json()["reset_token"]
    assert token

    invalid = requests.post(f"{API}/auth/reset-password", json={"token": "bad-token", "password": "NewPass123!"})
    assert invalid.status_code == 400

    reset = requests.post(f"{API}/auth/reset-password", json={"token": token, "password": "NewPass123!"})
    assert reset.status_code == 200, reset.text

    login = requests.post(f"{API}/auth/login", json={"email": email, "password": "NewPass123!"})
    assert login.status_code == 200
