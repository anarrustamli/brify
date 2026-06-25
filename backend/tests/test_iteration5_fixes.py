"""Iteration-5 fix verification tests for Brify Phase-1.

Targets the three issues from iteration_4:
  FIX 1: admin_duplicate_plan ObjectId leak.
  FIX 2: verification submit validation order (400 before 409).
  FIX 3: create_proposal auto-creates lead for OPEN-visibility briefs.

Plus regressions:
  - /api/me/plan-status-v2 should not exist (was a stale placeholder).
  - Demo-login + existing endpoints still pass.
"""
import os
import uuid

import pytest
import requests


def _read_frontend_env():
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip()
    except FileNotFoundError:
        pass
    return ""


BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or _read_frontend_env()).rstrip("/")
if not BASE_URL:
    raise RuntimeError("REACT_APP_BACKEND_URL not set")
API = f"{BASE_URL}/api"


def _login(role: str) -> dict:
    r = requests.post(f"{API}/auth/demo-login", json={"role": role}, timeout=20)
    assert r.status_code == 200, f"demo-login {role} failed: {r.status_code} {r.text}"
    return r.json()


def _client(token: str) -> requests.Session:
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_c():
    return _client(_login("admin")["token"])


@pytest.fixture(scope="module")
def provider_c():
    return _client(_login("provider")["token"])


@pytest.fixture(scope="module")
def buyer_c():
    return _client(_login("buyer")["token"])


# ---------------------------------------------------------------------------
# FIX 1: admin duplicate plan returns serializable JSON; second dup -> 409
# ---------------------------------------------------------------------------
class TestFix1AdminDuplicatePlan:
    def test_duplicate_succeeds_and_serializable(self, admin_c):
        # Create base plan with a unique slug
        base_slug = f"TEST_dupbase_{uuid.uuid4().hex[:8]}"
        payload = {
            "name": "TEST Dup Base",
            "slug": base_slug,
            "price": 10.0,
            "limits": {"leads_monthly": 5},
            "feature_list": ["alpha"],
        }
        r = admin_c.post(f"{API}/admin/plans", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]

        # Duplicate to a unique target slug
        target_slug = f"{base_slug}_dup_{uuid.uuid4().hex[:6]}"
        r2 = admin_c.post(
            f"{API}/admin/plans/{pid}/duplicate",
            json={"slug": target_slug},
            timeout=15,
        )
        # Was 500 before fix; should now be 200 with clean JSON
        assert r2.status_code == 200, f"Expected 200, got {r2.status_code}: {r2.text}"
        dup = r2.json()
        # Body must be serializable (we already got JSON), and must not contain '_id'
        assert "_id" not in dup, f"ObjectId '_id' leaked: {dup}"
        assert dup["slug"] == target_slug
        assert dup.get("active") is False
        assert "id" in dup
        return target_slug, pid

    def test_duplicate_conflict_on_same_slug(self, admin_c):
        # Setup: create base, duplicate once, then duplicate again to same slug
        base_slug = f"TEST_dupbase2_{uuid.uuid4().hex[:8]}"
        r = admin_c.post(
            f"{API}/admin/plans",
            json={"name": "TEST DupBase2", "slug": base_slug, "price": 5.0},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        pid = r.json()["id"]

        target_slug = f"{base_slug}_dup_conflict"
        r2 = admin_c.post(
            f"{API}/admin/plans/{pid}/duplicate",
            json={"slug": target_slug},
            timeout=15,
        )
        assert r2.status_code == 200, r2.text

        # Second duplicate to same slug should 409
        r3 = admin_c.post(
            f"{API}/admin/plans/{pid}/duplicate",
            json={"slug": target_slug},
            timeout=15,
        )
        assert r3.status_code == 409, f"Expected 409 on dup conflict, got {r3.status_code}: {r3.text}"


# ---------------------------------------------------------------------------
# FIX 2: verification submit validates required fields BEFORE duplicate-check
# ---------------------------------------------------------------------------
class TestFix2VerificationValidationOrder:
    @pytest.fixture(autouse=True)
    def _seed_pending(self, provider_c, admin_c):
        """Ensure there IS a pending request first, so we test 400-before-409 ordering."""
        # Reset state: reject any pending/needs_more_info
        for status in ("pending", "needs_more_info"):
            q = admin_c.get(f"{API}/admin/verification/queue?status={status}", timeout=15)
            if q.status_code == 200:
                for item in q.json():
                    admin_c.post(
                        f"{API}/admin/verification/{item['id']}/reject",
                        json={"reason": "auto-reset"},
                        timeout=15,
                    )
        # Now create a fresh pending so the duplicate-check path is "live"
        payload = {
            "legal_name": f"TEST_Pending_{uuid.uuid4().hex[:6]}",
            "tax_id": f"TEST_TAX_{uuid.uuid4().hex[:6]}",
        }
        r = provider_c.post(f"{API}/me/verification/submit", json=payload, timeout=15)
        assert r.status_code in (200, 201), f"seed pending failed: {r.status_code} {r.text}"
        yield

    def test_empty_body_returns_400_legal_name_required(self, provider_c):
        r = provider_c.post(f"{API}/me/verification/submit", json={}, timeout=15)
        assert r.status_code == 400, f"Expected 400 (legal_name required), got {r.status_code}: {r.text}"
        body = r.json()
        # Message should mention legal_name
        msg = (body.get("detail") or body.get("message") or "").lower()
        assert "legal_name" in msg or "legal name" in msg, f"Unexpected error message: {body}"

    def test_only_legal_name_returns_400_tax_id_required(self, provider_c):
        r = provider_c.post(
            f"{API}/me/verification/submit",
            json={"legal_name": "TEST Only Legal"},
            timeout=15,
        )
        assert r.status_code == 400, f"Expected 400 (tax_id required), got {r.status_code}: {r.text}"
        body = r.json()
        msg = (body.get("detail") or body.get("message") or "").lower()
        assert "tax_id" in msg or "tax id" in msg, f"Unexpected error message: {body}"

    def test_valid_then_duplicate_returns_409(self, provider_c, admin_c):
        # The seed fixture created a pending. Submitting another valid one should 409.
        payload = {
            "legal_name": f"TEST_Dup_{uuid.uuid4().hex[:6]}",
            "tax_id": f"TEST_TAX_{uuid.uuid4().hex[:6]}",
        }
        r = provider_c.post(f"{API}/me/verification/submit", json=payload, timeout=15)
        assert r.status_code == 409, f"Expected 409 (already exists), got {r.status_code}: {r.text}"


# ---------------------------------------------------------------------------
# FIX 3: create_proposal auto-creates lead for OPEN-visibility brief
# ---------------------------------------------------------------------------
class TestFix3CreateProposalAutoLead:
    def test_open_brief_proposal_without_manual_unlock(self, provider_c):
        # Get an open brief from the marketplace
        r = provider_c.get(f"{API}/me/open-briefs", timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        items = body.get("items", [])
        if not items:
            pytest.skip("No open briefs available to test auto-lead-create")

        # Pick a brief that is NOT yet unlocked (so we exercise the auto-create path)
        target = None
        for it in items:
            if not it.get("unlocked"):
                target = it
                break
        if target is None:
            target = items[0]  # already unlocked; still expect proposal to succeed

        bid = target["id"]

        # Count leads BEFORE
        r_leads_before = provider_c.get(f"{API}/me/leads", timeout=15)
        leads_before = len(r_leads_before.json()) if r_leads_before.status_code == 200 else 0

        # POST proposal directly (no /unlock call first)
        proposal_payload = {
            "brief_id": bid,
            "title": f"TEST Auto Lead Proposal {uuid.uuid4().hex[:6]}",
            "text": "TEST auto-create lead path",
            "price": 100.0,
            "timeline": "7 days",
            "stages": [],
            "notes": "",
        }
        r_prop = provider_c.post(f"{API}/proposals", json=proposal_payload, timeout=20)

        # Expected outcomes:
        # 200/201 -> success (auto-lead-created)
        # 402 -> over monthly lead limit
        # Anything else (403 "must unlock", 500, etc.) is a regression
        assert r_prop.status_code in (200, 201, 402), (
            f"Unexpected status from proposal create: {r_prop.status_code} {r_prop.text}"
        )

        if r_prop.status_code == 402:
            pytest.skip("Provider is at monthly lead quota; auto-create path still gated correctly")

        # On success, leads_received_count should have incremented (best-effort)
        r_leads_after = provider_c.get(f"{API}/me/leads", timeout=15)
        if r_leads_after.status_code == 200:
            leads_after = len(r_leads_after.json())
            # Lead may have already existed (already unlocked); just assert >= before
            assert leads_after >= leads_before, "Lead count went down after proposal create"


# ---------------------------------------------------------------------------
# Regression: stale /me/plan-status-v2 route should be removed
# ---------------------------------------------------------------------------
class TestStalePlanStatusV2Removed:
    def test_plan_status_v2_not_exposed(self, provider_c):
        r = provider_c.get(f"{API}/me/plan-status-v2", timeout=10)
        # Should be 404 (not found) or 405 (method not allowed); definitely NOT 500
        assert r.status_code in (404, 405), (
            f"Expected route removed (404/405), got {r.status_code}: {r.text}"
        )


# ---------------------------------------------------------------------------
# Smoke: existing endpoints still pass
# ---------------------------------------------------------------------------
class TestExistingEndpointsRegression:
    def test_demo_login_admin(self):
        r = requests.post(f"{API}/auth/demo-login", json={"role": "admin"}, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["user"]["role"] == "admin"

    def test_plans_public_list(self):
        r = requests.get(f"{API}/plans", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_companies_public_list(self):
        r = requests.get(f"{API}/companies", timeout=10)
        assert r.status_code == 200

    def test_admin_stats(self, admin_c):
        r = admin_c.get(f"{API}/admin/stats", timeout=15)
        assert r.status_code == 200, r.text

    def test_buyer_dashboard(self, buyer_c):
        r = buyer_c.get(f"{API}/me/buyer-dashboard", timeout=15)
        assert r.status_code == 200, r.text

    def test_provider_analytics(self, provider_c):
        r = provider_c.get(f"{API}/me/analytics", timeout=15)
        assert r.status_code == 200, r.text
