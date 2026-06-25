"""Backend tests for Brify Phase-1 production features.

Covers:
  - Smoke: demo-login + existing endpoints
  - Provider verification submit/queue/approve/reject
  - Protected reviews (project -> complete -> review)
  - Subscription lifecycle (request-upgrade -> mark-paid -> active)
  - Admin plans v2 (CRUD/duplicate/activate/deactivate/versions/public)
  - Open brief marketplace (discovery + unlock)
  - Lead lifecycle (invite -> view -> proposal)
  - Payment provider status
  - Background jobs trigger
  - Audit + RBAC
"""
import os
import time
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


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
def _login(role: str) -> dict:
    r = requests.post(f"{API}/auth/demo-login", json={"role": role}, timeout=20)
    assert r.status_code == 200, f"demo-login {role} failed: {r.status_code} {r.text}"
    data = r.json()
    return {"token": data["token"], "user": data["user"]}


def _client(token: str) -> requests.Session:
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin():
    return _login("admin")


@pytest.fixture(scope="session")
def buyer():
    return _login("buyer")


@pytest.fixture(scope="session")
def provider():
    return _login("provider")


@pytest.fixture(scope="session")
def admin_c(admin):
    return _client(admin["token"])


@pytest.fixture(scope="session")
def buyer_c(buyer):
    return _client(buyer["token"])


@pytest.fixture(scope="session")
def provider_c(provider):
    return _client(provider["token"])


# ---------------------------------------------------------------------------
# Smoke + existing endpoints preservation
# ---------------------------------------------------------------------------
class TestSmoke:
    def test_demo_login_admin(self, admin):
        assert admin["user"]["role"] == "admin"
        assert isinstance(admin["token"], str) and len(admin["token"]) > 20

    def test_demo_login_buyer(self, buyer):
        assert buyer["user"]["role"] == "buyer"

    def test_demo_login_provider(self, provider):
        assert provider["user"]["role"] == "provider"

    def test_existing_plans(self):
        r = requests.get(f"{API}/plans", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_existing_companies(self):
        r = requests.get(f"{API}/companies", timeout=10)
        assert r.status_code == 200

    def test_existing_categories(self):
        r = requests.get(f"{API}/categories", timeout=10)
        assert r.status_code == 200

    def test_buyer_dashboard(self, buyer_c):
        r = buyer_c.get(f"{API}/me/buyer-dashboard", timeout=15)
        assert r.status_code == 200, r.text

    def test_me_analytics(self, provider_c):
        r = provider_c.get(f"{API}/me/analytics", timeout=15)
        assert r.status_code == 200, r.text


# ---------------------------------------------------------------------------
# Public + Plan status
# ---------------------------------------------------------------------------
class TestPublicPlansAndStatus:
    def test_public_plans(self):
        r = requests.get(f"{API}/public/plans", timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        for p in items:
            # active+visible only
            assert p.get("active", True) is not False
            assert p.get("visible", True) is not False

    def test_me_plan_usage(self, provider_c):
        r = provider_c.get(f"{API}/me/plan-usage", timeout=15)
        assert r.status_code == 200, r.text

    def test_me_current_plan(self, provider_c):
        r = provider_c.get(f"{API}/me/current-plan", timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "plan" in body


# ---------------------------------------------------------------------------
# Provider Verification
# ---------------------------------------------------------------------------
class TestVerification:
    @pytest.fixture(autouse=True)
    def _reset_pending(self, provider_c, admin_c):
        """Reject any pending verifications so 400 tests aren't blocked by 409."""
        queue = admin_c.get(f"{API}/admin/verification/queue?status=pending", timeout=15)
        if queue.status_code == 200:
            for item in queue.json():
                admin_c.post(f"{API}/admin/verification/{item['id']}/reject",
                              json={"reason": "auto-reset for tests"}, timeout=15)
        # also clear needs_more_info
        q2 = admin_c.get(f"{API}/admin/verification/queue?status=needs_more_info", timeout=15)
        if q2.status_code == 200:
            for item in q2.json():
                admin_c.post(f"{API}/admin/verification/{item['id']}/reject",
                              json={"reason": "auto-reset"}, timeout=15)
        yield

    def test_submit_requires_legal_name(self, provider_c):
        r = provider_c.post(f"{API}/me/verification/submit",
                            json={"tax_id": "TEST_999"}, timeout=15)
        assert r.status_code == 400

    def test_submit_requires_tax_id(self, provider_c):
        r = provider_c.post(f"{API}/me/verification/submit",
                            json={"legal_name": "TEST Legal"}, timeout=15)
        assert r.status_code == 400

    def test_full_flow(self, provider_c, admin_c, provider):
        # Step 0: reset any pending so test is repeatable
        # Trigger a get
        r0 = provider_c.get(f"{API}/me/verification", timeout=10)
        assert r0.status_code == 200

        # Step 1: submit
        payload = {
            "legal_name": f"TEST_Legal_{uuid.uuid4().hex[:6]}",
            "tax_id": f"TEST_TAX_{uuid.uuid4().hex[:6]}",
            "registration_number": "TEST_REG",
            "business_email": "test@example.com",
        }
        r = provider_c.post(f"{API}/me/verification/submit", json=payload, timeout=15)
        # If already pending from earlier run, reset by rejecting via admin
        if r.status_code == 409:
            queue = admin_c.get(f"{API}/admin/verification/queue?status=pending", timeout=15).json()
            for item in queue:
                admin_c.post(f"{API}/admin/verification/{item['id']}/reject",
                             json={"reason": "test reset"}, timeout=15)
            r = provider_c.post(f"{API}/me/verification/submit", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        sub = r.json()
        assert sub["status"] == "pending"
        rid = sub["id"]

        # Step 2: duplicate -> 409
        r2 = provider_c.post(f"{API}/me/verification/submit", json=payload, timeout=15)
        assert r2.status_code == 409, r2.text

        # Step 3: provider can see latest
        r3 = provider_c.get(f"{API}/me/verification", timeout=10)
        assert r3.status_code == 200
        assert r3.json()["request"]["id"] == rid

        # Step 4: admin sees it in queue
        rq = admin_c.get(f"{API}/admin/verification/queue?status=pending", timeout=15)
        assert rq.status_code == 200
        ids = [x["id"] for x in rq.json()]
        assert rid in ids

        # Step 5: reject WITHOUT reason -> 400
        r_rej_bad = admin_c.post(f"{API}/admin/verification/{rid}/reject",
                                  json={}, timeout=15)
        assert r_rej_bad.status_code == 400

        # Step 6: approve -> company.verified=true
        r_app = admin_c.post(f"{API}/admin/verification/{rid}/approve",
                              json={"note": "ok"}, timeout=15)
        assert r_app.status_code == 200, r_app.text
        assert r_app.json()["status"] == "approved"

        # Step 7: provider verification doc shows company_verified true
        r_v = provider_c.get(f"{API}/me/verification", timeout=10)
        assert r_v.status_code == 200
        assert r_v.json()["company_verified"] is True


# ---------------------------------------------------------------------------
# Protected Reviews + Projects
# ---------------------------------------------------------------------------
class TestProtectedReviews:
    def test_review_requires_existing_project(self, buyer_c):
        # fake project id -> 404
        r = buyer_c.post(f"{API}/reviews/verified",
                         json={"project_id": "doesnotexist-xyz",
                               "rating": 5, "title": "TEST", "text": "TEST"},
                         timeout=15)
        assert r.status_code == 404, r.text

    def test_full_chain(self, buyer_c, provider_c, admin_c):
        # find a brief from buyer
        buyer_dash = buyer_c.get(f"{API}/me/buyer-dashboard", timeout=15).json()
        # Pick the first brief id we can find
        briefs = buyer_dash.get("briefs") or buyer_dash.get("recent_briefs") or []
        # Fallback: list briefs
        if not briefs:
            r = buyer_c.get(f"{API}/me/briefs", timeout=15)
            if r.status_code == 200:
                briefs = r.json()
        if not briefs:
            pytest.skip("No existing briefs for buyer to test review chain")

        brief = briefs[0]
        brief_id = brief.get("id")

        # Find a proposal for this brief
        # Use provider proposals or briefs.proposals listing
        proposals = []
        r_pr = provider_c.get(f"{API}/me/proposals", timeout=15)
        if r_pr.status_code == 200:
            proposals = [p for p in r_pr.json() if p.get("brief_id") == brief_id]
        if not proposals:
            # try buyer side proposals on brief
            r_bp = buyer_c.get(f"{API}/briefs/{brief_id}/proposals", timeout=15)
            if r_bp.status_code == 200:
                proposals = r_bp.json()
        if not proposals:
            pytest.skip(f"No proposals for brief {brief_id}")

        proposal_id = proposals[0]["id"]

        # accept proposal -> should auto-create project
        r_acc = buyer_c.put(f"{API}/proposals/{proposal_id}/status",
                             json={"status": "accepted"}, timeout=15)
        assert r_acc.status_code in (200, 409), r_acc.text

        # fetch projects
        r_pj = buyer_c.get(f"{API}/me/projects", timeout=15)
        assert r_pj.status_code == 200, r_pj.text
        projects = r_pj.json()
        # find project for this brief
        proj = next((p for p in projects if p.get("brief_id") == brief_id), None)
        if not proj:
            pytest.skip("Project not auto-created (proposal may already be accepted to a different project)")

        pid = proj["id"]

        # complete project
        r_cp = buyer_c.post(f"{API}/projects/{pid}/complete", timeout=15)
        assert r_cp.status_code == 200, r_cp.text
        assert r_cp.json()["status"] == "completed"

        # post verified review
        review_payload = {
            "project_id": pid,
            "rating": 5,
            "title": "TEST verified",
            "text": "TEST review text",
        }
        r_rev = buyer_c.post(f"{API}/reviews/verified", json=review_payload, timeout=15)
        # Could be 200 if first time, or 409 if seeded duplicate
        assert r_rev.status_code in (200, 409), r_rev.text

        if r_rev.status_code == 200:
            # second time -> 409
            r_rev2 = buyer_c.post(f"{API}/reviews/verified", json=review_payload, timeout=15)
            assert r_rev2.status_code == 409, r_rev2.text


# ---------------------------------------------------------------------------
# Subscription lifecycle
# ---------------------------------------------------------------------------
class TestSubscriptionLifecycle:
    def test_request_upgrade_and_mark_paid(self, provider_c, admin_c):
        r = provider_c.post(f"{API}/me/subscription/request-upgrade",
                             json={"plan": "pro", "billing_cycle": "monthly"}, timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "subscription" in body
        assert "invoice" in body
        assert body["subscription"]["status"] in ("pending_payment", "active")
        assert body.get("payment", {}).get("provider") in ("manual", "epoint", "payriff")

        invoice_id = body["invoice"]["id"]
        # mark paid by admin
        r_paid = admin_c.post(f"{API}/admin/invoices/{invoice_id}/mark-paid",
                               json={"transaction_id": "TEST_TXN_1"}, timeout=20)
        assert r_paid.status_code == 200, r_paid.text

        # provider current plan should now reflect Pro
        time.sleep(0.5)
        r_cur = provider_c.get(f"{API}/me/current-plan", timeout=15)
        assert r_cur.status_code == 200
        cur = r_cur.json()
        sub = cur.get("subscription") or {}
        # subscription should be active OR plan should be pro
        if sub:
            assert sub.get("status") == "active", sub
            assert sub.get("current_period_end") is not None

    def test_request_upgrade_invalid_cycle(self, provider_c):
        r = provider_c.post(f"{API}/me/subscription/request-upgrade",
                             json={"plan": "pro", "billing_cycle": "weekly"}, timeout=15)
        assert r.status_code == 400


# ---------------------------------------------------------------------------
# Admin-managed plans v2
# ---------------------------------------------------------------------------
class TestAdminPlansV2:
    def test_full_flow(self, admin_c):
        # create plan starter (tolerant)
        slug = f"TEST_starter_{uuid.uuid4().hex[:6]}"
        payload = {
            "name": "TEST Starter",
            "slug": slug,
            "price": 9.99,
            "limits": {"leads_monthly": 5},
            "feature_list": ["one", "two"],
        }
        r = admin_c.post(f"{API}/admin/plans", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        plan = r.json()
        pid = plan["id"]
        assert plan["version"] == 1

        # duplicate slug -> 409
        r2 = admin_c.post(f"{API}/admin/plans", json=payload, timeout=15)
        assert r2.status_code == 409

        # patch -> version bumps
        r3 = admin_c.patch(f"{API}/admin/plans/{pid}",
                            json={"price": 12.5}, timeout=15)
        assert r3.status_code == 200, r3.text
        assert r3.json()["version"] == 2
        assert r3.json()["price"] == 12.5

        # versions history
        r4 = admin_c.get(f"{API}/admin/plans/{pid}/versions", timeout=15)
        assert r4.status_code == 200
        versions = r4.json()
        assert len(versions) >= 2

        # deactivate
        r5 = admin_c.post(f"{API}/admin/plans/{pid}/deactivate", timeout=15)
        assert r5.status_code == 200
        # public/plans should now hide it
        pp = requests.get(f"{API}/public/plans", timeout=15).json()
        assert all(p.get("slug") != slug for p in pp)

        # activate
        r6 = admin_c.post(f"{API}/admin/plans/{pid}/activate", timeout=15)
        assert r6.status_code == 200
        pp2 = requests.get(f"{API}/public/plans", timeout=15).json()
        assert any(p.get("slug") == slug for p in pp2)

        # duplicate -> returns plan with active=false
        r7 = admin_c.post(f"{API}/admin/plans/{pid}/duplicate",
                           json={"slug": slug + "-dup"}, timeout=15)
        assert r7.status_code == 200, r7.text
        dup = r7.json()
        assert dup["active"] is False
        assert dup["slug"] == slug + "-dup"


# ---------------------------------------------------------------------------
# Open brief marketplace
# ---------------------------------------------------------------------------
class TestOpenBriefs:
    def test_list_and_unlock(self, provider_c):
        r = provider_c.get(f"{API}/me/open-briefs", timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "items" in body
        assert "leads_quota" in body
        items = body["items"]
        for it in items:
            # anonymized fields until unlocked
            if not it.get("unlocked"):
                assert "description" not in it or it["description"] in (None, "")
                assert "buyer_name" not in it or it["buyer_name"] in (None, "")

        if not items:
            pytest.skip("No open briefs to unlock")

        target = items[0]
        bid = target["id"]
        prev_unlocked = target.get("unlocked", False)

        r_unl = provider_c.post(f"{API}/me/open-briefs/{bid}/unlock", timeout=20)
        # If at limit -> 402, accept
        if r_unl.status_code == 402:
            return
        assert r_unl.status_code == 200, r_unl.text
        lead = r_unl.json()
        assert lead.get("brief_id") == bid

        # GET again - should show unlocked=true with full details
        r2 = provider_c.get(f"{API}/me/open-briefs", timeout=15)
        assert r2.status_code == 200
        items2 = {i["id"]: i for i in r2.json()["items"]}
        if bid in items2:
            assert items2[bid]["unlocked"] is True


# ---------------------------------------------------------------------------
# Payment provider status
# ---------------------------------------------------------------------------
class TestPaymentProviderStatus:
    def test_manual(self, admin_c):
        r = admin_c.get(f"{API}/admin/payment-provider/status", timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        # When no real keys: provider may be 'manual'
        assert body.get("provider") in ("manual", "epoint", "payriff")
        # If no env keys, connected should be False
        has_keys = bool(os.environ.get("EPOINT_PUBLIC_KEY")) or bool(os.environ.get("PAYRIFF_MERCHANT_ID"))
        if not has_keys:
            assert body.get("connected") is False
            assert "Manual" in body.get("message", "") or "manual" in body.get("message", "")


# ---------------------------------------------------------------------------
# Background jobs
# ---------------------------------------------------------------------------
class TestBackgroundJobs:
    def test_run_expiry_admin(self, admin_c):
        r = admin_c.post(f"{API}/admin/jobs/run-expiry-check", timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        # Expected keys
        for k in ("subscription_expiry", "lead_expiry", "brief_expiry"):
            assert k in body, f"missing key {k} in {body}"

    def test_run_expiry_non_admin_forbidden(self, provider_c):
        r = provider_c.post(f"{API}/admin/jobs/run-expiry-check", timeout=15)
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# Audit + permissions
# ---------------------------------------------------------------------------
class TestAuditAndPermissions:
    def test_buyer_forbidden_admin(self, buyer_c):
        r = buyer_c.get(f"{API}/admin/verification/queue", timeout=15)
        assert r.status_code == 403

    def test_provider_forbidden_admin(self, provider_c):
        r = provider_c.get(f"{API}/admin/verification/queue", timeout=15)
        assert r.status_code == 403

    def test_audit_logs_list(self, admin_c):
        r = admin_c.get(f"{API}/admin/audit-logs", timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        # could be list or paginated dict
        items = body if isinstance(body, list) else body.get("items", [])
        assert isinstance(items, list)


# ---------------------------------------------------------------------------
# Data migrations (smoke - via API surfaces)
# ---------------------------------------------------------------------------
class TestMigrations:
    def test_leads_have_required_fields(self, provider_c):
        r = provider_c.get(f"{API}/me/leads", timeout=15)
        assert r.status_code == 200
        for lead in r.json():
            assert "status" in lead
            # expires_at or sent_at should exist
            assert "expires_at" in lead or "sent_at" in lead

    def test_briefs_visibility_field(self):
        r = requests.get(f"{API}/briefs", timeout=15)
        if r.status_code != 200:
            pytest.skip("Public /briefs not available")
        briefs = r.json()
        items = briefs if isinstance(briefs, list) else briefs.get("items", [])
        for b in items[:5]:
            # migration ensures visibility key exists
            assert "visibility" in b or "status" in b
