"""
Admin single-source-of-truth foundation contract tests.

These tests pin the admin data contract that feeds the admin UI and the
public/provider/buyer surfaces: standard paginated lists, RBAC permissions,
audited mutations, generic resource CRUD, public content sync, and media
metadata-backed uploads.
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


def assert_admin_list_contract(body):
    assert {"items", "total", "page", "limit", "filters", "sort"}.issubset(body.keys())
    assert isinstance(body["items"], list)
    assert isinstance(body["total"], int)
    assert isinstance(body["page"], int)
    assert isinstance(body["limit"], int)
    assert isinstance(body["filters"], dict)


def test_admin_lists_use_standard_contract(admin_token):
    for resource in ("companies", "users", "reviews", "briefs", "leads", "ads", "plans", "audit-logs"):
        r = requests.get(f"{API}/admin/{resource}", params={"page": 1, "limit": 5}, headers=H(admin_token))
        assert r.status_code == 200, f"{resource}: {r.status_code} {r.text}"
        assert_admin_list_contract(r.json())


def test_admin_permissions_contract(admin_token):
    r = requests.get(f"{API}/admin/me/permissions", headers=H(admin_token))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["role"] in ("admin", "super_admin")
    assert body["can_manage_all"] is True
    assert "companies" in body["modules"]
    assert "billing" in body["modules"]
    assert "media" in body["modules"]


def test_admin_company_mutation_writes_audit_log(admin_token):
    companies = requests.get(f"{API}/admin/companies", params={"limit": 1}, headers=H(admin_token))
    assert companies.status_code == 200, companies.text
    items = companies.json()["items"]
    assert items, "expected at least one seeded company"
    company = items[0]
    next_status = "pending" if company.get("status") == "active" else "active"

    changed = requests.put(
        f"{API}/admin/companies/{company['id']}/status",
        json={"status": next_status},
        headers=H(admin_token),
    )
    assert changed.status_code == 200, changed.text

    logs = requests.get(
        f"{API}/admin/audit-logs",
        params={"entity_type": "company", "entity_id": company["id"], "limit": 10},
        headers=H(admin_token),
    )
    assert logs.status_code == 200, logs.text
    assert_admin_list_contract(logs.json())
    match = next((x for x in logs.json()["items"] if x.get("action") == "company.status.update"), None)
    assert match, logs.json()["items"]
    assert match["old_value"].get("status") == company.get("status")
    assert match["new_value"].get("status") == next_status


def test_generic_admin_resource_crud_and_public_content_sync(admin_token):
    slug = f"test-page-{uuid.uuid4().hex[:8]}"
    payload = {
        "title": "TEST Content Page",
        "slug": slug,
        "body": "Admin managed content",
        "status": "published",
        "seo_title": "TEST SEO",
    }
    created = requests.post(f"{API}/admin/content-pages", json=payload, headers=H(admin_token))
    assert created.status_code == 200, created.text
    cid = created.json()["id"]

    public = requests.get(f"{API}/content/pages/{slug}")
    assert public.status_code == 200, public.text
    assert public.json()["title"] == payload["title"]

    updated = requests.put(
        f"{API}/admin/content-pages/{cid}",
        json={"title": "TEST Content Page Updated", "status": "published"},
        headers=H(admin_token),
    )
    assert updated.status_code == 200, updated.text

    listed = requests.get(f"{API}/admin/content-pages", params={"q": slug}, headers=H(admin_token))
    assert listed.status_code == 200, listed.text
    assert_admin_list_contract(listed.json())
    assert any(x["id"] == cid for x in listed.json()["items"])

    deleted = requests.delete(f"{API}/admin/content-pages/{cid}", headers=H(admin_token))
    assert deleted.status_code == 200, deleted.text

    hidden = requests.get(f"{API}/content/pages/{slug}")
    assert hidden.status_code == 404


def test_admin_billing_ledger_resource(admin_token):
    reference = f"TEST-PAY-{uuid.uuid4().hex[:8]}"
    payload = {
        "reference": reference,
        "company_id": "manual-ledger",
        "amount": 199,
        "currency": "AZN",
        "status": "paid",
        "method": "manual",
        "description": "Manual admin ledger test payment",
    }
    created = requests.post(f"{API}/admin/payments", json=payload, headers=H(admin_token))
    assert created.status_code == 200, created.text
    assert created.json()["reference"] == reference

    listed = requests.get(f"{API}/admin/payments", params={"q": reference, "limit": 5}, headers=H(admin_token))
    assert listed.status_code == 200, listed.text
    assert_admin_list_contract(listed.json())
    assert any(x.get("reference") == reference for x in listed.json()["items"])


def test_admin_media_upload_creates_metadata(admin_token):
    files = {"file": ("test-logo.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    data = {"module": "category-icons", "entity_id": "test-category", "alt": "Test logo"}
    uploaded = requests.post(f"{API}/media", data=data, files=files, headers=HB(admin_token))
    assert uploaded.status_code == 200, uploaded.text
    body = uploaded.json()
    assert body["module"] == "category-icons"
    assert body["mime"] == "image/png"
    assert body["public_url"].startswith("/api/media/")

    listed = requests.get(f"{API}/admin/media-assets", params={"q": body["id"]}, headers=H(admin_token))
    assert listed.status_code == 200, listed.text
    assert_admin_list_contract(listed.json())
    assert any(x["id"] == body["id"] for x in listed.json()["items"])
