"""
Regression coverage for the marketplace UX/data refresh.

These tests cover the API contract used by the new filter, notification,
brief-invite, dynamic sector, and public portfolio screens.
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


def test_admin_can_manage_dynamic_sectors(admin_token):
    slug = f"test-sector-{uuid.uuid4().hex[:8]}"
    payload = {"name": "TEST Sector", "slug": slug, "description": "Created by tests", "order": 7, "active": True}

    created = requests.post(f"{API}/admin/sectors", json=payload, headers=H(admin_token))
    assert created.status_code == 200, created.text
    body = created.json()
    assert body["slug"] == slug
    assert body["active"] is True

    public_list = requests.get(f"{API}/sectors")
    assert public_list.status_code == 200
    assert any(s["slug"] == slug for s in public_list.json())

    updated = requests.put(f"{API}/admin/sectors/{body['id']}", json={**payload, "name": "TEST Sector Updated"}, headers=H(admin_token))
    assert updated.status_code == 200, updated.text

    deleted = requests.delete(f"{API}/admin/sectors/{body['id']}", headers=H(admin_token))
    assert deleted.status_code == 200


def test_company_legal_vat_and_sector_filters(admin_token, provider_token, provider_company):
    unique_sector = f"TEST Sector {uuid.uuid4().hex[:6]}"
    payload = {
        **provider_company,
        "legal_type": "llc",
        "vat_payer": True,
        "industries": [unique_sector],
    }
    update = requests.put(f"{API}/me/company", json=payload, headers=H(provider_token))
    assert update.status_code == 200, update.text

    requests.put(f"{API}/admin/companies/{provider_company['id']}/status", json={"status": "active"}, headers=H(admin_token))

    filtered = requests.get(
        f"{API}/companies",
        params={"legal_type": "llc", "vat_payer": "true", "industry": unique_sector, "limit": 20},
    )
    assert filtered.status_code == 200
    items = filtered.json()["items"]
    assert any(c["id"] == provider_company["id"] for c in items)
    match = next(c for c in items if c["id"] == provider_company["id"])
    assert match["legal_type"] == "llc"
    assert match["vat_payer"] is True


def test_service_search_supports_company_legal_vat_filters(provider_token, provider_company):
    payload = {
        **provider_company,
        "legal_type": "llc",
        "vat_payer": True,
    }
    update = requests.put(f"{API}/me/company", json=payload, headers=H(provider_token))
    assert update.status_code == 200, update.text

    mine = requests.get(f"{API}/me/services", headers=H(provider_token))
    assert mine.status_code == 200
    assert mine.json(), "provider needs at least one service fixture"
    service = mine.json()[0]
    sid = service["id"]

    excluded = requests.get(f"{API}/services", params={"q": service["name"], "vat_payer": "false", "limit": 50})
    assert excluded.status_code == 200
    assert all(s["id"] != sid for s in excluded.json()["items"])

    included = requests.get(f"{API}/services", params={"q": service["name"], "legal_type": "llc", "vat_payer": "true", "limit": 50})
    assert included.status_code == 200
    items = included.json()["items"]
    match = next(s for s in items if s["id"] == sid)
    assert match["company_legal_type"] == "llc"
    assert match["company_vat_payer"] is True


def test_existing_brief_can_invite_company_and_create_notification(buyer_token, provider_token, provider_company):
    brief = requests.post(
        f"{API}/briefs",
        json={
            "title": f"TEST Invite {uuid.uuid4().hex[:6]}",
            "category": "veb-sayt",
            "budget_min": 1000,
            "budget_max": 3000,
            "description": "Need a test proposal",
            "visibility": "selected",
        },
        headers=H(buyer_token),
    )
    assert brief.status_code == 200, brief.text
    bid = brief.json()["id"]

    invite = requests.post(f"{API}/briefs/{bid}/invite", json={"company_id": provider_company["id"]}, headers=H(buyer_token))
    assert invite.status_code == 200, invite.text
    assert invite.json()["ok"] is True

    leads = requests.get(f"{API}/me/leads", headers=H(provider_token))
    assert leads.status_code == 200
    assert any(l["brief_id"] == bid and l["company_id"] == provider_company["id"] for l in leads.json())

    notifications = requests.get(f"{API}/notifications", headers=H(provider_token))
    assert notifications.status_code == 200
    body = notifications.json()
    assert body["unread_count"] >= 1
    note = next(n for n in body["items"] if n.get("entity_id") == bid)
    assert note["type"] == "brief_invite"
    assert note["read"] is False

    mark = requests.put(f"{API}/notifications/{note['id']}/read", headers=H(provider_token))
    assert mark.status_code == 200


def test_brief_invite_preserves_context_and_duplicate_requires_force(buyer_token, provider_token, provider_company):
    service = requests.get(f"{API}/me/services", headers=H(provider_token)).json()[0]
    portfolio_items = requests.get(f"{API}/me/portfolio", headers=H(provider_token))
    assert portfolio_items.status_code == 200
    assert portfolio_items.json(), "provider needs at least one portfolio fixture"
    pid = portfolio_items.json()[0]["id"]
    brief = requests.post(
        f"{API}/briefs",
        json={
            "title": f"TEST Context Brief {uuid.uuid4().hex[:6]}",
            "category": "veb-sayt",
            "budget_min": 1000,
            "budget_max": 3000,
            "description": "Need a contextual invite",
            "visibility": "selected",
        },
        headers=H(buyer_token),
    )
    assert brief.status_code == 200, brief.text
    bid = brief.json()["id"]

    payload = {"company_id": provider_company["id"], "service_id": service["id"], "portfolio_id": pid}
    invite = requests.post(f"{API}/briefs/{bid}/invite", json=payload, headers=H(buyer_token))
    assert invite.status_code == 200, invite.text

    leads = requests.get(f"{API}/me/leads", headers=H(provider_token))
    assert leads.status_code == 200
    lead = next(l for l in leads.json() if l["brief_id"] == bid and l["company_id"] == provider_company["id"])
    assert lead["service_id"] == service["id"]
    assert lead["portfolio_id"] == pid
    assert lead["sent_at"]

    duplicate = requests.post(f"{API}/briefs/{bid}/invite", json=payload, headers=H(buyer_token))
    assert duplicate.status_code == 409

    forced = requests.post(f"{API}/briefs/{bid}/invite", json={**payload, "force": True}, headers=H(buyer_token))
    assert forced.status_code == 200
    assert forced.json()["ok"] is True


def test_brief_can_be_edited_until_provider_replies(buyer_token, provider_token, provider_company):
    brief = requests.post(
        f"{API}/briefs",
        json={
            "title": f"TEST Editable Brief {uuid.uuid4().hex[:6]}",
            "category": "veb-sayt",
            "budget_min": 1200,
            "budget_max": 3200,
            "description": "Original summary",
            "short_description": "Original summary",
            "project_background": "Original background",
            "visibility": "selected",
        },
        headers=H(buyer_token),
    )
    assert brief.status_code == 200, brief.text
    bid = brief.json()["id"]

    invite = requests.post(f"{API}/briefs/{bid}/invite", json={"company_id": provider_company["id"]}, headers=H(buyer_token))
    assert invite.status_code == 200, invite.text

    edit_payload = {
        **brief.json(),
        "title": "TEST Editable Brief Updated",
        "description": "Updated summary",
        "short_description": "Updated summary",
        "project_background": "Updated background",
    }
    updated = requests.put(f"{API}/briefs/{bid}", json=edit_payload, headers=H(buyer_token))
    assert updated.status_code == 200, updated.text
    updated_body = updated.json()
    assert updated_body["title"] == "TEST Editable Brief Updated"
    assert updated_body["edited_at"]
    assert updated_body["edit_count"] == 1

    leads = requests.get(f"{API}/me/leads", headers=H(provider_token))
    assert leads.status_code == 200
    lead = next(l for l in leads.json() if l["brief_id"] == bid and l["company_id"] == provider_company["id"])
    assert lead["brief_edited"] is True
    assert lead["brief_edited_at"] == updated_body["edited_at"]
    assert lead["brief"]["title"] == "TEST Editable Brief Updated"
    assert lead["brief"]["edited_at"] == updated_body["edited_at"]

    proposal = requests.post(
        f"{API}/proposals",
        json={"brief_id": bid, "title": "TEST Proposal", "text": "We can help", "price": 2500, "timeline": "2 həftə"},
        headers=H(provider_token),
    )
    assert proposal.status_code == 200, proposal.text

    locked = requests.put(f"{API}/briefs/{bid}", json={**edit_payload, "title": "Should not update"}, headers=H(buyer_token))
    assert locked.status_code == 409


def test_brief_attachments_are_validated_and_access_controlled(buyer_token, provider_token, provider_company):
    brief = requests.post(
        f"{API}/briefs",
        json={
            "title": f"TEST Attachment Brief {uuid.uuid4().hex[:6]}",
            "category": "veb-sayt",
            "budget_min": 1000,
            "budget_max": 3000,
            "description": "Attachment coverage",
            "visibility": "selected",
        },
        headers=H(buyer_token),
    )
    assert brief.status_code == 200, brief.text
    bid = brief.json()["id"]

    upload = requests.post(
        f"{API}/briefs/{bid}/attachments",
        files={"files": ("brief-spec.pdf", b"%PDF-1.4\n%test", "application/pdf")},
        headers=HB(buyer_token),
    )
    assert upload.status_code == 200, upload.text
    file_meta = upload.json()["items"][0]
    assert file_meta["name"] == "brief-spec.pdf"
    assert file_meta["size"] > 0

    invalid = requests.post(
        f"{API}/briefs/{bid}/attachments",
        files={"files": ("virus.exe", b"not allowed", "application/octet-stream")},
        headers=HB(buyer_token),
    )
    assert invalid.status_code == 400

    requests.post(f"{API}/briefs/{bid}/invite", json={"company_id": provider_company["id"]}, headers=H(buyer_token))

    provider_files = requests.get(f"{API}/briefs/{bid}/attachments", headers=H(provider_token))
    assert provider_files.status_code == 200
    assert provider_files.json()["items"][0]["id"] == file_meta["id"]

    download = requests.get(f"{API}/briefs/{bid}/attachments/{file_meta['id']}/download", headers=H(provider_token))
    assert download.status_code == 200
    assert download.content.startswith(b"%PDF")

    other_email = f"other_provider_{uuid.uuid4().hex[:8]}@bizmarket.az"
    other = requests.post(
        f"{API}/auth/register",
        json={"email": other_email, "password": "Pass123!", "name": "Other Provider", "role": "provider", "company_name": "Other Provider"},
    )
    assert other.status_code == 200, other.text
    other_token = other.json()["token"]
    denied = requests.get(f"{API}/briefs/{bid}/attachments", headers=H(other_token))
    assert denied.status_code == 403


def test_messages_support_delivery_and_shared_media(buyer_token):
    threads = requests.get(f"{API}/me/messages", headers=H(buyer_token))
    assert threads.status_code == 200
    assert threads.json(), "expected seeded buyer message thread"
    tid = threads.json()[0]["id"]

    upload = requests.post(
        f"{API}/media",
        data={"module": "message-attachment", "entity_id": tid},
        files={"file": ("chat-spec.pdf", b"%PDF-1.4\nchat", "application/pdf")},
        headers=HB(buyer_token),
    )
    assert upload.status_code == 200, upload.text
    attachment = upload.json()

    sent = requests.post(
        f"{API}/messages",
        json={"thread_id": tid, "text": "Salam 😊", "attachments": [attachment]},
        headers=H(buyer_token),
    )
    assert sent.status_code == 200, sent.text
    body = sent.json()
    assert body["status"] == "sent"
    assert body["delivered_at"]
    assert body["attachments"][0]["id"] == attachment["id"]

    detail = requests.get(f"{API}/messages/{tid}", headers=H(buyer_token))
    assert detail.status_code == 200
    data = detail.json()
    assert any(m["id"] == body["id"] for m in data["messages"])
    assert any(item["id"] == attachment["id"] for item in data["shared_media"])


def test_public_portfolio_search_and_detail(provider_token, provider_company):
    def portfolio_payload_from(item):
        payload = {
            key: item.get(key, "")
            for key in [
                "title", "client_name", "industry", "service_type", "project_duration",
                "description", "problem", "solution", "result", "metrics", "image_url",
                "gallery", "video_url", "website_url", "link", "visibility",
            ]
        }
        if not isinstance(payload.get("gallery"), list):
            payload["gallery"] = []
        return payload

    title = f"TEST Portfolio Search {uuid.uuid4().hex[:6]}"
    payload = {
        "title": title,
        "client_name": "TEST Client",
        "industry": "Fintech",
        "service_type": "SEO",
        "description": "Public searchable item",
        "visibility": "public",
    }
    created = requests.post(
        f"{API}/me/portfolio",
        json=payload,
        headers=H(provider_token),
    )
    created_new = created.status_code == 200
    original = None
    if created_new:
        pid = created.json()["id"]
    else:
        assert created.status_code == 402, created.text
        mine = requests.get(f"{API}/me/portfolio", headers=H(provider_token))
        assert mine.status_code == 200
        assert mine.json(), "provider needs at least one portfolio fixture when plan limit is reached"
        original = mine.json()[0]
        pid = original["id"]
        restored_payload = portfolio_payload_from(original)
        update = requests.put(f"{API}/me/portfolio/{pid}", json={**restored_payload, **payload}, headers=H(provider_token))
        assert update.status_code == 200, update.text

    listing = requests.get(f"{API}/portfolio", params={"q": "Portfolio Search", "industry": "Fintech", "sort": "newest"})
    assert listing.status_code == 200
    items = listing.json()["items"]
    assert any(i["id"] == pid and i["company_id"] == provider_company["id"] for i in items)
    assert all(i["visibility"] == "public" for i in items)

    detail = requests.get(f"{API}/portfolio/{pid}")
    assert detail.status_code == 200
    body = detail.json()
    assert body["id"] == pid
    assert body["company"]["id"] == provider_company["id"]

    if created_new:
        requests.delete(f"{API}/me/portfolio/{pid}", headers=H(provider_token))
    elif original:
        requests.put(f"{API}/me/portfolio/{pid}", json=portfolio_payload_from(original), headers=H(provider_token))
