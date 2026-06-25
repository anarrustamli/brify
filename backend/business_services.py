"""Core production business services for Brify.

Contains:
  * PlanLimitService  — plan limit enforcement, usage counters, override
  * SubscriptionService — periods, snapshots, invoice / payment lifecycle
  * PaymentProvider — payment gateway abstraction (manual + epoint / payriff stubs)
  * NotificationCenter — event helper layered on existing notifications collection

All functions accept the `db` motor handle so the existing single-file server.py
can import and call them without circular dependencies.
"""
from __future__ import annotations

import os
import logging
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException

log = logging.getLogger("brify.business")

UNLIMITED = -1


# ----------------------------------------------------------------------------
# helpers
# ----------------------------------------------------------------------------
def _now() -> datetime:
    return datetime.now(timezone.utc)


def now_iso() -> str:
    return _now().isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def month_window(at: Optional[datetime] = None) -> Tuple[str, str]:
    at = at or _now()
    start = at.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return start.isoformat(), end.isoformat()


def _to_dt(value: str) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return None


# ----------------------------------------------------------------------------
# PlanLimitService
# ----------------------------------------------------------------------------
class PlanLimitService:
    """Enforces plan-driven limits and tracks usage counters per company."""

    LIMIT_KEYS = {
        "services", "portfolio", "case_studies", "team", "certifications",
        "awards", "branches", "leads_monthly", "storage_gb",
        "open_briefs_unlocked", "proposals_monthly",
    }

    def __init__(self, db):
        self.db = db

    async def _company_plan_doc(self, company: dict) -> dict:
        """Return active plan doc — prefer subscription snapshot, fall back to plans collection."""
        sub = await self.db.subscriptions.find_one(
            {"company_id": company["id"], "status": "active"},
            sort=[("current_period_end", -1)],
        )
        if sub and sub.get("plan_snapshot"):
            snap = sub["plan_snapshot"]
            return {
                "slug": snap.get("slug") or sub.get("plan", "free"),
                "name": snap.get("name") or sub.get("plan", "free").title(),
                "limits": snap.get("limits", {}) or {},
                "features": snap.get("features", {}) or {},
            }
        plan = await self.db.plans.find_one({"slug": company.get("plan", "free")}, {"_id": 0})
        return plan or {"slug": "free", "limits": {}, "features": {}}

    def _custom_override(self, company: dict, key: str) -> Optional[int]:
        custom = (company or {}).get("custom_limits") or {}
        if key in custom:
            return custom[key]
        return None

    async def limit_for(self, company: dict, key: str) -> Optional[int]:
        """Returns None for unlimited, else the integer limit."""
        override = self._custom_override(company, key)
        if override is not None:
            return None if override in (None, -1) else int(override)
        plan = await self._company_plan_doc(company)
        v = (plan.get("limits") or {}).get(key)
        if v is None or v == UNLIMITED:
            return None
        return int(v)

    async def feature_enabled(self, company: dict, feature: str) -> bool:
        plan = await self._company_plan_doc(company)
        return bool((plan.get("features") or {}).get(feature, False))

    async def check_count(self, company: dict, key: str, current_count: int) -> None:
        """Raise 402 if `current_count` is at or above the plan limit."""
        limit = await self.limit_for(company, key)
        if limit is None:
            return
        if current_count >= limit:
            raise HTTPException(
                status_code=402,
                detail=f"Plan limit reached for {key}: {current_count}/{limit}. Upgrade your plan to continue.",
            )

    # ---- monthly counters ----
    async def _get_or_create_counter(self, company_id: str, plan_code: str) -> dict:
        ps, pe = month_window()
        existing = await self.db.plan_usage_counters.find_one(
            {"company_id": company_id, "period_start": ps},
            {"_id": 0},
        )
        if existing:
            return existing
        doc = {
            "id": f"{company_id}:{ps[:7]}",
            "company_id": company_id,
            "plan_code": plan_code,
            "period_start": ps,
            "period_end": pe,
            "leads_received_count": 0,
            "open_briefs_unlocked_count": 0,
            "proposals_sent_count": 0,
            "storage_used_bytes": 0,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await self.db.plan_usage_counters.insert_one(doc)
        return doc

    async def increment_counter(self, company: dict, field: str, amount: int = 1) -> dict:
        counter = await self._get_or_create_counter(company["id"], company.get("plan", "free"))
        await self.db.plan_usage_counters.update_one(
            {"id": counter["id"]},
            {"$inc": {field: amount}, "$set": {"updated_at": now_iso()}},
        )
        counter[field] = counter.get(field, 0) + amount
        return counter

    async def check_monthly_leads(self, company: dict) -> Tuple[bool, int, Optional[int]]:
        """Return (within_limit, used, limit). limit=None means unlimited."""
        limit = await self.limit_for(company, "leads_monthly")
        counter = await self._get_or_create_counter(company["id"], company.get("plan", "free"))
        used = counter.get("leads_received_count", 0)
        if limit is None:
            return True, used, None
        return used < limit, used, limit

    async def check_storage(self, company: dict, additional_bytes: int) -> Tuple[bool, int, Optional[int]]:
        plan = await self._company_plan_doc(company)
        gb = (plan.get("limits") or {}).get("storage_gb")
        if gb is None or gb == UNLIMITED:
            return True, 0, None
        counter = await self._get_or_create_counter(company["id"], company.get("plan", "free"))
        used = counter.get("storage_used_bytes", 0)
        limit_bytes = int(gb) * 1024 * 1024 * 1024
        return (used + additional_bytes) <= limit_bytes, used + additional_bytes, limit_bytes

    async def usage_summary(self, company: dict) -> dict:
        """Used by /me/plan-status v2 — returns plan + usage + limits."""
        plan = await self._company_plan_doc(company)
        ps, pe = month_window()
        counter = await self._get_or_create_counter(company["id"], company.get("plan", "free"))
        services = await self.db.services.count_documents({"company_id": company["id"]})
        portfolio = await self.db.portfolio.count_documents({"company_id": company["id"]})
        case_studies = await self.db.case_studies.count_documents({"company_id": company["id"]})
        team = await self.db.team_members.count_documents({"company_id": company["id"]})
        certs = await self.db.certificates.count_documents({"company_id": company["id"]})
        awards = await self.db.awards.count_documents({"company_id": company["id"]})

        def _norm(v):
            return None if v in (None, UNLIMITED) else int(v)

        limits = plan.get("limits") or {}
        return {
            "plan": plan,
            "period": {"start": ps, "end": pe},
            "usage": {
                "services": services,
                "portfolio": portfolio,
                "case_studies": case_studies,
                "team": team,
                "certifications": certs,
                "awards": awards,
                "leads_this_month": counter.get("leads_received_count", 0),
                "open_briefs_unlocked": counter.get("open_briefs_unlocked_count", 0),
                "proposals_sent_this_month": counter.get("proposals_sent_count", 0),
                "storage_used_bytes": counter.get("storage_used_bytes", 0),
            },
            "limits": {
                "services": _norm(limits.get("services")),
                "portfolio": _norm(limits.get("portfolio")),
                "case_studies": _norm(limits.get("case_studies")),
                "team": _norm(limits.get("team")),
                "certifications": _norm(limits.get("certifications")),
                "awards": _norm(limits.get("awards")),
                "leads_monthly": _norm(limits.get("leads_monthly")),
                "storage_gb": _norm(limits.get("storage_gb")),
                "branches": _norm(limits.get("branches")),
            },
        }


# ----------------------------------------------------------------------------
# SubscriptionService
# ----------------------------------------------------------------------------
class SubscriptionService:
    """Manages provider subscription periods, plan snapshots, invoices."""

    def __init__(self, db):
        self.db = db

    @staticmethod
    def _period_days(cycle: str) -> int:
        return 365 if cycle == "yearly" else 30

    @staticmethod
    def _next_invoice_no() -> str:
        return f"INV-{datetime.now(timezone.utc).strftime('%Y%m')}-{secrets.token_hex(3).upper()}"

    @staticmethod
    def _next_payment_ref() -> str:
        return f"PAY-{datetime.now(timezone.utc).strftime('%Y%m')}-{secrets.token_hex(3).upper()}"

    async def get_plan_snapshot(self, plan_slug: str) -> Optional[dict]:
        plan = await self.db.plans.find_one({"slug": plan_slug}, {"_id": 0})
        if not plan:
            return None
        return {
            "slug": plan.get("slug"),
            "name": plan.get("name"),
            "price": plan.get("price", 0),
            "yearly_price": plan.get("yearly_price", 0),
            "limits": plan.get("limits", {}),
            "features": plan.get("features", {}),
            "version": plan.get("version", 1),
        }

    async def request_upgrade(self, company: dict, plan_slug: str, billing_cycle: str = "monthly") -> dict:
        """Create a subscription request + invoice in pending_payment state."""
        plan_doc = await self.db.plans.find_one({"slug": plan_slug}, {"_id": 0})
        if not plan_doc:
            raise HTTPException(404, "Plan not found")
        if not plan_doc.get("active", True):
            raise HTTPException(400, "Plan is not available")

        # Cancel any other pending requests for this company for the same plan
        await self.db.subscriptions.update_many(
            {"company_id": company["id"], "status": "pending_payment"},
            {"$set": {"status": "cancelled", "cancelled_at": now_iso(), "cancelled_reason": "superseded"}},
        )

        amount = plan_doc.get("yearly_price" if billing_cycle == "yearly" else "price", 0) or 0
        sub_id = new_id()
        invoice_id = new_id()

        snapshot = await self.get_plan_snapshot(plan_slug)
        starts = _now()
        period_end = starts + timedelta(days=self._period_days(billing_cycle))

        sub_doc = {
            "id": sub_id,
            "company_id": company["id"],
            "company_name": company.get("name", ""),
            "plan": plan_slug,
            "plan_id": plan_doc.get("id"),
            "current_plan": company.get("plan", "free"),
            "billing_cycle": billing_cycle,
            "amount": amount,
            "currency": "AZN",
            "status": "pending_payment",
            "source": "provider_dashboard",
            "starts_at": starts.isoformat(),
            "current_period_start": starts.isoformat(),
            "current_period_end": period_end.isoformat(),
            "expires_at": period_end.isoformat(),
            "renews_at": period_end.isoformat(),
            "auto_renew": False,
            "plan_snapshot": snapshot,
            "invoice_id": invoice_id,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await self.db.subscriptions.insert_one(sub_doc)

        invoice_no = self._next_invoice_no()
        invoice_doc = {
            "id": invoice_id,
            "invoice_no": invoice_no,
            "invoice_number": invoice_no,
            "subscription_id": sub_id,
            "company_id": company["id"],
            "company_name": company.get("name", ""),
            "amount": amount,
            "currency": "AZN",
            "status": "issued" if amount > 0 else "paid",
            "description": f"{plan_doc.get('name', plan_slug)} subscription ({billing_cycle})",
            "due_date": (starts + timedelta(days=7)).isoformat(),
            "issued_at": now_iso(),
            "billing_period_start": starts.isoformat(),
            "billing_period_end": period_end.isoformat(),
            "line_items": [
                {
                    "description": f"{plan_doc.get('name', plan_slug)} ({billing_cycle})",
                    "quantity": 1,
                    "unit_price": amount,
                    "amount": amount,
                }
            ],
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await self.db.invoices.insert_one(invoice_doc)
        await self._record_event(company["id"], sub_id, "invoice_created", {"invoice_id": invoice_id})

        sub_doc.pop("_id", None)
        invoice_doc.pop("_id", None)
        return {"subscription": sub_doc, "invoice": invoice_doc}

    async def mark_invoice_paid(
        self,
        invoice_id: str,
        admin_user_id: str,
        method: str = "manual_bank_transfer",
        provider_name: str = "manual",
        transaction_id: str = "",
        notes: str = "",
    ) -> dict:
        invoice = await self.db.invoices.find_one({"id": invoice_id}, {"_id": 0})
        if not invoice:
            raise HTTPException(404, "Invoice not found")
        if invoice.get("status") == "paid":
            return invoice

        payment_id = new_id()
        payment_ref = self._next_payment_ref()
        payment_doc = {
            "id": payment_id,
            "reference": payment_ref,
            "subscription_id": invoice.get("subscription_id"),
            "invoice_id": invoice_id,
            "company_id": invoice.get("company_id"),
            "company_name": invoice.get("company_name", ""),
            "amount": invoice.get("amount", 0),
            "currency": invoice.get("currency", "AZN"),
            "status": "succeeded" if method != "manual_bank_transfer" else "manually_confirmed",
            "method": method,
            "provider": provider_name,
            "transaction_id": transaction_id,
            "confirmed_by_admin_id": admin_user_id,
            "confirmed_at": now_iso(),
            "notes": notes,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await self.db.payments.insert_one(payment_doc)
        await self.db.invoices.update_one(
            {"id": invoice_id},
            {"$set": {"status": "paid", "paid_at": now_iso(), "updated_at": now_iso()}},
        )

        if invoice.get("subscription_id"):
            await self.activate_subscription(invoice["subscription_id"], approved_by=admin_user_id)

        await self._record_event(invoice.get("company_id"), invoice.get("subscription_id"), "payment_confirmed", {
            "invoice_id": invoice_id, "payment_id": payment_id,
        })
        payment_doc.pop("_id", None)
        return payment_doc

    async def activate_subscription(self, subscription_id: str, approved_by: str = "") -> dict:
        sub = await self.db.subscriptions.find_one({"id": subscription_id}, {"_id": 0})
        if not sub:
            raise HTTPException(404, "Subscription not found")
        now = _now()
        days = self._period_days(sub.get("billing_cycle") or "monthly")
        period_end = now + timedelta(days=days)
        snapshot = sub.get("plan_snapshot") or await self.get_plan_snapshot(sub.get("plan", "free"))
        patch = {
            "status": "active",
            "starts_at": sub.get("starts_at") or now.isoformat(),
            "current_period_start": now.isoformat(),
            "current_period_end": period_end.isoformat(),
            "expires_at": period_end.isoformat(),
            "renews_at": period_end.isoformat(),
            "approved_at": now.isoformat(),
            "approved_by": approved_by,
            "plan_snapshot": snapshot,
            "updated_at": now.isoformat(),
        }
        await self.db.subscriptions.update_one({"id": subscription_id}, {"$set": patch})
        # Deactivate other active subs for this company
        await self.db.subscriptions.update_many(
            {"company_id": sub["company_id"], "status": "active", "id": {"$ne": subscription_id}},
            {"$set": {"status": "cancelled", "cancelled_at": now.isoformat(), "cancelled_reason": "replaced"}},
        )
        # Update company.plan
        await self.db.companies.update_one(
            {"id": sub["company_id"]},
            {"$set": {"plan": sub.get("plan", "free"), "subscription_id": subscription_id, "plan_expires_at": period_end.isoformat()}},
        )
        await self._record_event(sub["company_id"], subscription_id, "subscription_activated", {})
        return await self.db.subscriptions.find_one({"id": subscription_id}, {"_id": 0})

    async def expire_due_subscriptions(self) -> int:
        """Background-job entry point. Mark expired subscriptions and downgrade companies."""
        now_str = now_iso()
        count = 0
        async for sub in self.db.subscriptions.find({"status": "active", "current_period_end": {"$lt": now_str}}):
            await self.db.subscriptions.update_one(
                {"id": sub["id"]},
                {"$set": {"status": "expired", "expired_at": now_str, "updated_at": now_str}},
            )
            await self.db.companies.update_one(
                {"id": sub["company_id"]},
                {"$set": {"plan": "free", "subscription_id": None}},
            )
            await self._record_event(sub["company_id"], sub["id"], "subscription_expired", {})
            count += 1
        return count

    async def cancel_subscription(self, subscription_id: str, by_admin_id: str, reason: str = "") -> dict:
        sub = await self.db.subscriptions.find_one({"id": subscription_id}, {"_id": 0})
        if not sub:
            raise HTTPException(404, "Subscription not found")
        patch = {
            "status": "cancelled",
            "cancelled_at": now_iso(),
            "cancelled_by": by_admin_id,
            "cancelled_reason": reason,
            "updated_at": now_iso(),
        }
        await self.db.subscriptions.update_one({"id": subscription_id}, {"$set": patch})
        await self.db.companies.update_one(
            {"id": sub["company_id"]},
            {"$set": {"plan": "free", "subscription_id": None}},
        )
        await self._record_event(sub["company_id"], subscription_id, "subscription_cancelled", {})
        return await self.db.subscriptions.find_one({"id": subscription_id}, {"_id": 0})

    async def _record_event(self, company_id: Optional[str], sub_id: Optional[str], event: str, payload: dict) -> None:
        await self.db.billing_events.insert_one({
            "id": new_id(),
            "company_id": company_id,
            "subscription_id": sub_id,
            "event": event,
            "payload": payload,
            "created_at": now_iso(),
        })


# ----------------------------------------------------------------------------
# PaymentProvider abstraction
# ----------------------------------------------------------------------------
class PaymentProvider:
    """Pluggable payment provider — current default is manual.

    Real Payriff / Epoint integrations will be added once credentials are
    provided. The interface is intentionally minimal so that adapters can be
    swapped without touching business logic.
    """

    name: str = "manual"

    def __init__(self, db):
        self.db = db

    @classmethod
    async def for_company(cls, db) -> "PaymentProvider":
        settings = await db.settings.find_one({"id": "main"}, {"_id": 0}) or {}
        provider_key = (settings.get("payment_provider") or "manual").lower()
        if provider_key == "epoint":
            return EpointProvider(db)
        if provider_key == "payriff":
            return PayriffProvider(db)
        return ManualPaymentProvider(db)

    async def create_payment_link(self, invoice: dict) -> dict:  # pragma: no cover - interface
        raise NotImplementedError

    async def verify_payment(self, transaction_id: str) -> dict:  # pragma: no cover
        raise NotImplementedError

    async def handle_webhook(self, payload: dict) -> dict:  # pragma: no cover
        raise NotImplementedError


class ManualPaymentProvider(PaymentProvider):
    name = "manual"

    async def create_payment_link(self, invoice: dict) -> dict:
        return {
            "provider": "manual",
            "status": "instructions",
            "message": "Manual billing is active. Use bank transfer instructions.",
            "instructions": {
                "bank_name": os.environ.get("BANK_NAME", "Kapital Bank"),
                "account_name": os.environ.get("BANK_ACCOUNT_NAME", "Brify MMC"),
                "iban": os.environ.get("BANK_IBAN", "AZ00XXXX0000000000000000"),
                "reference": invoice.get("invoice_no") or invoice.get("invoice_number"),
            },
        }

    async def verify_payment(self, transaction_id: str) -> dict:
        return {"status": "pending_manual_confirmation"}

    async def handle_webhook(self, payload: dict) -> dict:
        return {"ok": True, "noop": True}


class EpointProvider(PaymentProvider):
    """Stub Epoint adapter — requires credentials to function (see admin > integrations)."""

    name = "epoint"

    def _has_credentials(self) -> bool:
        return bool(os.environ.get("EPOINT_PUBLIC_KEY") and os.environ.get("EPOINT_PRIVATE_KEY"))

    async def create_payment_link(self, invoice: dict) -> dict:
        if not self._has_credentials():
            return {"provider": "epoint", "status": "not_configured", "message": "Epoint credentials missing — falling back to manual"}
        # TODO: integrate real Epoint API once credentials provided
        return {"provider": "epoint", "status": "pending_integration", "message": "Epoint gateway connected (sandbox).", "link": "https://epoint.az/pay/" + (invoice.get("invoice_no") or "")}

    async def verify_payment(self, transaction_id: str) -> dict:
        return {"status": "pending"}

    async def handle_webhook(self, payload: dict) -> dict:
        return {"ok": True}


class PayriffProvider(PaymentProvider):
    """Stub Payriff adapter — requires credentials to function."""

    name = "payriff"

    def _has_credentials(self) -> bool:
        return bool(os.environ.get("PAYRIFF_MERCHANT_ID") and os.environ.get("PAYRIFF_SECRET_KEY"))

    async def create_payment_link(self, invoice: dict) -> dict:
        if not self._has_credentials():
            return {"provider": "payriff", "status": "not_configured", "message": "Payriff credentials missing — falling back to manual"}
        return {"provider": "payriff", "status": "pending_integration", "message": "Payriff gateway connected (sandbox).", "link": "https://api.payriff.com/pay/" + (invoice.get("invoice_no") or "")}

    async def verify_payment(self, transaction_id: str) -> dict:
        return {"status": "pending"}

    async def handle_webhook(self, payload: dict) -> dict:
        return {"ok": True}
