"""Iteration 7 — Phase 2 modular split regression tests.

Covers:
  * Admin generic resource CRUD (routes/admin_resources.py)
  * Admin specific routes still win over generic /{resource} (route ordering)
  * Audit log endpoint (moved into admin_resources)
  * Media upload/serve/delete (routes/media.py)
  * ALLOW_DEMO_LOGIN env flag behavior (toggle test)
"""
from __future__ import annotations

import io
import os
import subprocess
import time

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
# Use internal localhost for env-flag toggle tests so we don't have to wait for
# external ingress to pick up the supervisor restart.
LOCAL_URL = "http://localhost:8001"


# ---------- shared fixtures ----------


def _demo_login(role: str) -> str:
    r = requests.post(f"{BASE_URL}/api/auth/demo-login", json={"role": role}, timeout=20)
    assert r.status_code == 200, f"demo-login {role} failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_token() -> str:
    return _demo_login("admin")


@pytest.fixture(scope="module")
def buyer_token() -> str:
    return _demo_login("buyer")


@pytest.fixture(scope="module")
def provider_token() -> str:
    return _demo_login("provider")


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------- admin generic resource list ----------

GENERIC_RESOURCES = [
    "services", "portfolio", "proposals", "verification-requests", "subscriptions",
    "payments", "invoices", "reports", "complaints", "email-templates",
    "content-pages", "seo-pages", "faqs", "media-assets", "admin-roles", "ad-placements",
]


class TestAdminGenericResources:
    @pytest.mark.parametrize("resource", GENERIC_RESOURCES)
    def test_admin_can_list(self, admin_token, resource):
        r = requests.get(
            f"{BASE_URL}/api/admin/{resource}",
            headers=_auth_headers(admin_token),
            timeout=20,
        )
        assert r.status_code == 200, f"{resource} returned {r.status_code}: {r.text[:200]}"
        body = r.json()
        # Paginated shape: {items: [...], total, page, limit} or list
        assert isinstance(body, (dict, list))
        if isinstance(body, dict):
            assert "items" in body, f"{resource} missing items key"
            assert isinstance(body["items"], list)

    @pytest.mark.parametrize("resource", GENERIC_RESOURCES)
    def test_buyer_forbidden(self, buyer_token, resource):
        r = requests.get(
            f"{BASE_URL}/api/admin/{resource}",
            headers=_auth_headers(buyer_token),
            timeout=20,
        )
        assert r.status_code == 403, f"{resource} expected 403, got {r.status_code}"


class TestAdminFaqCrud:
    """POST/PUT against generic CRUD."""

    def test_create_then_update_faq(self, admin_token):
        payload = {
            "question": "TEST_iter7 — phase2 split?",
            "answer": "yes",
            "order": 999,
            "category": "general",
        }
        r = requests.post(
            f"{BASE_URL}/api/admin/faqs",
            json=payload,
            headers=_auth_headers(admin_token),
            timeout=20,
        )
        assert r.status_code == 200, f"POST faqs failed: {r.status_code} {r.text}"
        created = r.json()
        assert created["question"] == payload["question"]
        assert created["answer"] == payload["answer"]
        fid = created["id"]

        # update
        r2 = requests.put(
            f"{BASE_URL}/api/admin/faqs/{fid}",
            json={"answer": "yes (updated)"},
            headers=_auth_headers(admin_token),
            timeout=20,
        )
        assert r2.status_code == 200, f"PUT faqs failed: {r2.status_code} {r2.text}"
        updated = r2.json()
        assert updated["answer"] == "yes (updated)"
        # cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/faqs/{fid}",
            headers=_auth_headers(admin_token),
            timeout=20,
        )


# ---------- admin specific routes (must NOT match generic resource handler) ----------


class TestAdminSpecificRoutesWin:
    @pytest.mark.parametrize("path,expect_keys", [
        ("/api/admin/plans", ["items"]),
        ("/api/admin/companies", ["items"]),
        ("/api/admin/users", ["items"]),
        ("/api/admin/leads", ["items"]),
        ("/api/admin/briefs", ["items"]),
    ])
    def test_specific_admin_routes_paginated(self, admin_token, path, expect_keys):
        r = requests.get(f"{BASE_URL}{path}", headers=_auth_headers(admin_token), timeout=20)
        assert r.status_code == 200, f"{path} -> {r.status_code} {r.text[:200]}"
        body = r.json()
        assert isinstance(body, dict), f"{path} returned non-dict body: {type(body)}"
        for k in expect_keys:
            assert k in body, f"{path} missing key {k}: {list(body.keys())}"

    def test_admin_stats(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/admin/stats", headers=_auth_headers(admin_token), timeout=20)
        assert r.status_code == 200
        body = r.json()
        # admin/stats is a dict, NOT the generic {items: ...} shape from a 'stats' resource
        assert isinstance(body, dict)
        # should not be empty/items-only
        assert "items" not in body or len(body) > 1


# ---------- audit logs ----------


class TestAuditLogs:
    def test_audit_logs_list_paginated(self, admin_token):
        r = requests.get(
            f"{BASE_URL}/api/admin/audit-logs",
            headers=_auth_headers(admin_token),
            timeout=20,
        )
        assert r.status_code == 200, f"audit-logs returned {r.status_code}: {r.text[:200]}"
        body = r.json()
        assert isinstance(body, dict)
        assert "items" in body
        assert isinstance(body["items"], list)

    def test_audit_log_recorded_after_admin_write(self, admin_token):
        # create a FAQ (admin write)
        payload = {"question": "TEST_iter7_audit", "answer": "x", "order": 998, "category": "general"}
        r = requests.post(
            f"{BASE_URL}/api/admin/faqs",
            json=payload,
            headers=_auth_headers(admin_token),
            timeout=20,
        )
        assert r.status_code == 200
        fid = r.json()["id"]
        # tiny wait to ensure write_audit task done (it's awaited inline so should be fine)
        time.sleep(0.5)
        r2 = requests.get(
            f"{BASE_URL}/api/admin/audit-logs?entity_id={fid}",
            headers=_auth_headers(admin_token),
            timeout=20,
        )
        assert r2.status_code == 200
        items = r2.json().get("items", [])
        assert any(it.get("entity_id") == fid for it in items), \
            f"No audit log entry for fid={fid} (found {len(items)} items)"
        # cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/faqs/{fid}",
            headers=_auth_headers(admin_token),
            timeout=20,
        )


# ---------- media ----------


# A minimal valid 1x1 PNG
_PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06"
    b"\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xcf\xc0\xc0\xc0\x00"
    b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)


class TestMediaEndpoints:
    def test_anonymous_get_unknown_returns_404(self):
        r = requests.get(f"{BASE_URL}/api/media/does-not-exist-xyz", timeout=20)
        assert r.status_code == 404

    def test_upload_avatar_get_delete(self, buyer_token):
        # upload
        files = {"file": ("test.png", io.BytesIO(_PNG_BYTES), "image/png")}
        data = {"module": "avatar", "entity_id": "", "alt": "TEST_iter7_avatar"}
        r = requests.post(
            f"{BASE_URL}/api/media",
            files=files,
            data=data,
            headers=_auth_headers(buyer_token),
            timeout=30,
        )
        assert r.status_code == 200, f"upload returned {r.status_code}: {r.text[:200]}"
        body = r.json()
        for k in ("id", "public_url", "storage_path"):
            assert k in body, f"missing {k} in upload response: {body.keys()}"
        asset_id = body["id"]
        assert body["public_url"] == f"/api/media/{asset_id}"

        # GET file bytes
        rg = requests.get(f"{BASE_URL}/api/media/{asset_id}", timeout=20)
        assert rg.status_code == 200, f"GET media returned {rg.status_code}"
        assert rg.content[:8] == b"\x89PNG\r\n\x1a\n", "served bytes are not the PNG we uploaded"

        # DELETE as owner
        rd = requests.delete(
            f"{BASE_URL}/api/media/{asset_id}",
            headers=_auth_headers(buyer_token),
            timeout=20,
        )
        assert rd.status_code == 200, f"DELETE returned {rd.status_code}: {rd.text[:200]}"

        # GET after delete should be 404
        rg2 = requests.get(f"{BASE_URL}/api/media/{asset_id}", timeout=20)
        assert rg2.status_code == 404


# ---------- ALLOW_DEMO_LOGIN env flag ----------


class TestAllowDemoLoginFlag:
    def test_demo_login_enabled_by_default_in_env(self):
        # env currently true — demo-login should return 200
        r = requests.post(f"{LOCAL_URL}/api/auth/demo-login", json={"role": "buyer"}, timeout=20)
        assert r.status_code == 200, f"expected 200 with ALLOW_DEMO_LOGIN=true, got {r.status_code}"

    def test_demo_login_returns_404_when_flag_false(self):
        """Toggle ALLOW_DEMO_LOGIN=false, restart backend, verify 404, restore true."""
        env_path = "/app/backend/.env"
        original = open(env_path).read()
        try:
            new = original.replace("ALLOW_DEMO_LOGIN=true", "ALLOW_DEMO_LOGIN=false")
            assert new != original, ".env didn't contain ALLOW_DEMO_LOGIN=true"
            with open(env_path, "w") as f:
                f.write(new)
            subprocess.run(
                ["sudo", "supervisorctl", "restart", "backend"],
                check=False,
                capture_output=True,
                timeout=30,
            )
            # wait for backend
            for _ in range(30):
                try:
                    if requests.get(f"{LOCAL_URL}/api/plans", timeout=2).status_code == 200:
                        break
                except Exception:
                    pass
                time.sleep(1)
            r = requests.post(f"{LOCAL_URL}/api/auth/demo-login", json={"role": "buyer"}, timeout=20)
            assert r.status_code == 404, f"expected 404 with ALLOW_DEMO_LOGIN=false, got {r.status_code} {r.text}"
        finally:
            with open(env_path, "w") as f:
                f.write(original)
            subprocess.run(
                ["sudo", "supervisorctl", "restart", "backend"],
                check=False,
                capture_output=True,
                timeout=30,
            )
            for _ in range(30):
                try:
                    if requests.get(f"{LOCAL_URL}/api/plans", timeout=2).status_code == 200:
                        break
                except Exception:
                    pass
                time.sleep(1)
            # Sanity restored
            r2 = requests.post(f"{LOCAL_URL}/api/auth/demo-login", json={"role": "buyer"}, timeout=20)
            assert r2.status_code == 200, f"failed to restore ALLOW_DEMO_LOGIN=true: {r2.status_code}"
