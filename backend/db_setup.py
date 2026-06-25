"""Database indexes and data migrations for Brify production.

Runs on application startup. Idempotent — safe to call repeatedly.
Adds essential indexes for performance and back-fills new fields on existing
documents so that legacy data is compatible with the new business logic
(subscription periods, plan snapshots, lead expiry, plan-usage counters, etc.).
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict

log = logging.getLogger("brify.db_setup")


# ----------------------------------------------------------------------------
# Indexes
# ----------------------------------------------------------------------------
async def ensure_indexes(db) -> None:
    """Create production indexes. Idempotent."""

    async def _safe(coll, *args, **kwargs):
        try:
            await coll.create_index(*args, **kwargs)
        except Exception as exc:  # pragma: no cover - mongomock differences
            log.debug("index skip %s.%s: %s", coll.name, args, exc)

    # Users
    await _safe(db.users, "id", unique=True)
    await _safe(db.users, "email", unique=True)
    await _safe(db.users, "role")

    # Companies
    await _safe(db.companies, "id", unique=True)
    await _safe(db.companies, "owner_id")
    await _safe(db.companies, "slug", unique=True, sparse=True)
    await _safe(db.companies, "status")
    await _safe(db.companies, "plan")
    await _safe(db.companies, "verified")
    await _safe(db.companies, [("city", 1), ("status", 1)])
    await _safe(db.companies, [("rating", -1)])

    # Briefs
    await _safe(db.briefs, "id", unique=True)
    await _safe(db.briefs, "buyer_id")
    await _safe(db.briefs, "status")
    await _safe(db.briefs, "visibility")
    await _safe(db.briefs, [("status", 1), ("visibility", 1), ("created_at", -1)])
    await _safe(db.briefs, "expires_at")

    # Leads
    await _safe(db.leads, "id", unique=True)
    await _safe(db.leads, [("company_id", 1), ("status", 1)])
    await _safe(db.leads, [("brief_id", 1), ("company_id", 1)])
    await _safe(db.leads, "expires_at")
    await _safe(db.leads, "status")

    # Proposals
    await _safe(db.proposals, "id", unique=True)
    await _safe(db.proposals, [("brief_id", 1), ("company_id", 1)], unique=True)
    await _safe(db.proposals, "company_id")
    await _safe(db.proposals, "status")

    # Projects (new — created on proposal acceptance)
    await _safe(db.projects, "id", unique=True)
    await _safe(db.projects, [("buyer_id", 1), ("status", 1)])
    await _safe(db.projects, [("company_id", 1), ("status", 1)])
    await _safe(db.projects, "proposal_id")

    # Reviews
    await _safe(db.reviews, "id", unique=True)
    await _safe(db.reviews, "company_id")
    await _safe(db.reviews, "user_id")
    await _safe(db.reviews, "project_id", sparse=True)
    await _safe(db.reviews, "status")

    # Verification requests
    await _safe(db.verification_requests, "id", unique=True)
    await _safe(db.verification_requests, [("company_id", 1), ("status", 1)])
    await _safe(db.verification_requests, "status")

    # Subscriptions
    await _safe(db.subscriptions, "id", unique=True)
    await _safe(db.subscriptions, "company_id")
    await _safe(db.subscriptions, "status")
    await _safe(db.subscriptions, [("status", 1), ("current_period_end", 1)])

    # Invoices
    await _safe(db.invoices, "id", unique=True)
    await _safe(db.invoices, "invoice_no", unique=True, sparse=True)
    await _safe(db.invoices, "company_id")
    await _safe(db.invoices, "status")

    # Payments
    await _safe(db.payments, "id", unique=True)
    await _safe(db.payments, "invoice_id")
    await _safe(db.payments, "company_id")
    await _safe(db.payments, "status")
    await _safe(db.payments, "transaction_id", sparse=True)

    # Notifications
    await _safe(db.notifications, "id", unique=True)
    await _safe(db.notifications, [("user_id", 1), ("read", 1), ("created_at", -1)])

    # Audit logs
    await _safe(db.audit_logs, "id", unique=True)
    await _safe(db.audit_logs, [("entity_type", 1), ("entity_id", 1)])
    await _safe(db.audit_logs, "actor_id")
    await _safe(db.audit_logs, [("created_at", -1)])

    # Plan usage counters
    await _safe(db.plan_usage_counters, [("company_id", 1), ("period_start", -1)])
    await _safe(db.plan_usage_counters, [("company_id", 1), ("period_end", 1)])

    # Plan versions
    await _safe(db.subscription_plan_versions, "id", unique=True)
    await _safe(db.subscription_plan_versions, [("plan_id", 1), ("version", -1)])

    log.info("brify: indexes ensured")


# ----------------------------------------------------------------------------
# Migrations / backfills
# ----------------------------------------------------------------------------
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _month_window(now: datetime) -> tuple[str, str]:
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return start.isoformat(), end.isoformat()


async def run_migrations(db) -> None:
    """Backfill legacy data with new production fields.

    Safe / idempotent. Only adds missing fields, never destroys data.
    """
    now = datetime.now(timezone.utc)
    period_start, period_end = _month_window(now)

    # 1) Briefs: ensure visibility + expires_at
    async for brief in db.briefs.find({"$or": [{"visibility": {"$exists": False}}, {"expires_at": {"$exists": False}}]}):
        patch: Dict[str, Any] = {}
        if "visibility" not in brief:
            patch["visibility"] = "private" if brief.get("invited_companies") else "open"
        if "expires_at" not in brief:
            # default open briefs expire in 30 days from creation
            try:
                created = datetime.fromisoformat(brief.get("created_at", _now_iso()).replace("Z", "+00:00"))
            except Exception:
                created = now
            patch["expires_at"] = (created + timedelta(days=30)).isoformat()
        if patch:
            await db.briefs.update_one({"id": brief["id"]}, {"$set": patch})

    # 2) Leads: ensure source + status + expires_at
    async for lead in db.leads.find({"$or": [{"source": {"$exists": False}}, {"expires_at": {"$exists": False}}, {"status": {"$in": [None, ""]}}]}):
        patch = {}
        if not lead.get("source"):
            patch["source"] = "invited"
        if not lead.get("status"):
            patch["status"] = "new"
        if "expires_at" not in lead:
            try:
                created = datetime.fromisoformat(lead.get("created_at", lead.get("sent_at", _now_iso())).replace("Z", "+00:00"))
            except Exception:
                created = now
            patch["expires_at"] = (created + timedelta(days=7)).isoformat()
        if patch:
            await db.leads.update_one({"id": lead["id"]}, {"$set": patch})

    # 3) Subscriptions: ensure period dates + snapshot
    async for sub in db.subscriptions.find({"status": "active"}):
        if sub.get("current_period_end"):
            continue
        try:
            approved = datetime.fromisoformat(
                (sub.get("approved_at") or sub.get("created_at") or _now_iso()).replace("Z", "+00:00")
            )
        except Exception:
            approved = now
        cycle = sub.get("billing_cycle") or "monthly"
        period_days = 365 if cycle == "yearly" else 30
        cpe = approved + timedelta(days=period_days)
        plan_doc = await db.plans.find_one({"slug": sub.get("plan")}, {"_id": 0})
        patch = {
            "current_period_start": approved.isoformat(),
            "current_period_end": cpe.isoformat(),
            "expires_at": cpe.isoformat(),
            "renews_at": cpe.isoformat(),
            "starts_at": sub.get("starts_at") or approved.isoformat(),
            "billing_cycle": cycle,
            "auto_renew": sub.get("auto_renew", False),
        }
        if plan_doc and not sub.get("plan_snapshot"):
            patch["plan_snapshot"] = {
                "slug": plan_doc.get("slug"),
                "name": plan_doc.get("name"),
                "price": plan_doc.get("price"),
                "limits": plan_doc.get("limits", {}),
                "features": plan_doc.get("features", {}),
            }
        await db.subscriptions.update_one({"id": sub["id"]}, {"$set": patch})

    # 4) Plans: ensure version=1 + active flag + ensure default Free
    async for plan in db.plans.find({"version": {"$exists": False}}):
        await db.plans.update_one(
            {"id": plan["id"]},
            {"$set": {
                "version": 1,
                "is_current": True,
                "active": plan.get("active", True),
                "visible": plan.get("visible", True),
            }},
        )

    # 5) Companies: ensure subscription_id link (Free for those without)
    async for company in db.companies.find({"role": {"$ne": "buyer"}}):
        if company.get("subscription_id"):
            continue
        if not company.get("plan"):
            await db.companies.update_one({"id": company["id"]}, {"$set": {"plan": "free"}})
        # Ensure a current-month plan_usage_counter doc exists
        existing = await db.plan_usage_counters.find_one({"company_id": company["id"], "period_start": period_start})
        if not existing:
            await db.plan_usage_counters.insert_one({
                "id": company["id"] + ":" + period_start[:7],
                "company_id": company["id"],
                "plan_code": company.get("plan", "free"),
                "period_start": period_start,
                "period_end": period_end,
                "leads_received_count": 0,
                "open_briefs_unlocked_count": 0,
                "proposals_sent_count": 0,
                "storage_used_bytes": 0,
                "created_at": _now_iso(),
                "updated_at": _now_iso(),
            })

    # 6) Reviews: mark legacy reviews (without project_id) as legacy
    await db.reviews.update_many(
        {"project_id": {"$exists": False}},
        {"$set": {"legacy": True}},
    )

    log.info("brify: migrations completed")
