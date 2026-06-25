"""Production business routes for Brify.

This module wires production-grade features into the existing FastAPI app:

  * Provider verification submission + admin review queue
  * Project lifecycle (auto-created on proposal acceptance)
  * Protected reviews (require completed project)
  * Open brief discovery + unlock for providers
  * Lead lifecycle endpoints (view/unlock/expire) with plan-driven locking
  * Plan-aware billing endpoints (request upgrade, fetch invoices, plan status v2)
  * Admin plan management v2 (versioning + audit)
  * Admin billing actions (mark invoice paid, extend / cancel subscription)
  * Public dynamic /plans
  * Background jobs (subscription + lead expiry) + manual trigger for admins

All endpoints are mounted under the same `/api` prefix used by server.py.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from business_services import (
    PlanLimitService,
    SubscriptionService,
    PaymentProvider,
    now_iso,
    new_id,
    _now,
    month_window,
)

log = logging.getLogger("brify.routes")

router = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Pydantic models (must be module-level for FastAPI introspection)
# ---------------------------------------------------------------------------
class ProtectedReviewIn(BaseModel):
    project_id: str
    rating: float
    title: str
    text: str
    rating_quality: Optional[float] = None
    rating_communication: Optional[float] = None
    rating_deadline: Optional[float] = None
    rating_value: Optional[float] = None


class SubscriptionRequestIn(BaseModel):
    plan: str
    billing_cycle: Optional[str] = "monthly"


class PlanIn(BaseModel):
    name: str
    slug: str
    price: float = 0
    yearly_price: Optional[float] = 0
    currency: Optional[str] = "AZN"
    order: Optional[int] = 99
    popular: Optional[bool] = False
    active: Optional[bool] = True
    visible: Optional[bool] = True
    billing_cycle_options: Optional[List[str]] = None
    description: Optional[str] = ""
    cta_label: Optional[str] = ""
    admin_note: Optional[str] = ""
    limits: Optional[Dict[str, Any]] = None
    features: Optional[Dict[str, Any]] = None
    feature_list: Optional[List[str]] = None


# ---------------------------------------------------------------------------
# Dependency injection — bound at startup via init(deps)
# ---------------------------------------------------------------------------
_deps: Dict[str, Any] = {}


def init(
    *,
    db,
    get_current_user,
    require_role,
    write_audit,
    create_notification,
    require_admin_module,
) -> APIRouter:
    """Bind shared helpers from server.py into this module and return router."""
    _deps.update(
        db=db,
        get_current_user=get_current_user,
        require_role=require_role,
        write_audit=write_audit,
        create_notification=create_notification,
        require_admin_module=require_admin_module,
    )
    return router


def _db():
    return _deps["db"]


def _cu():
    return _deps["get_current_user"]


def _rr(*roles):
    return _deps["require_role"](*roles)


def _audit():
    return _deps["write_audit"]


def _notify():
    return _deps["create_notification"]


def _require_admin_module():
    return _deps["require_admin_module"]


def _limits() -> PlanLimitService:
    return PlanLimitService(_db())


def _subs() -> SubscriptionService:
    return SubscriptionService(_db())


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def _own_company(user: dict) -> dict:
    company = await _db().companies.find_one({"owner_id": user["id"]}, {"_id": 0})
    if not company:
        raise HTTPException(404, "Company not found")
    return company


def _strip(doc: Optional[dict]) -> Optional[dict]:
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc


# ===========================================================================
# 1. Plan status v2 + public plans
# ===========================================================================
@router.get("/public/plans")
async def public_plans():
    db = _db()
    items = await db.plans.find(
        {"$and": [{"$or": [{"active": True}, {"active": {"$exists": False}}]},
                   {"$or": [{"visible": True}, {"visible": {"$exists": False}}]}]},
        {"_id": 0},
    ).sort("order", 1).to_list(50)
    return items


@router.get("/me/plan-status-v2")
async def my_plan_status_v2(user: dict = Depends(lambda: None)):
    # Replaced at startup with a real require_role provider
    raise HTTPException(500, "not wired")


# Real plan-status endpoint (wired via dependency injection at register time)
def _register_provider_endpoints():
    require_role = _deps["require_role"]

    @router.get("/me/plan-usage")
    async def me_plan_usage(user: dict = Depends(require_role("provider"))):
        company = await _own_company(user)
        return await _limits().usage_summary(company)

    @router.get("/me/current-plan")
    async def me_current_plan(user: dict = Depends(require_role("provider"))):
        company = await _own_company(user)
        plan = await _limits()._company_plan_doc(company)
        sub = await _db().subscriptions.find_one(
            {"company_id": company["id"], "status": "active"},
            sort=[("current_period_end", -1)],
        )
        return {"plan": plan, "subscription": _strip(sub)}

    # ----- Verification -----
    @router.post("/me/verification/submit")
    async def submit_verification(body: dict, user: dict = Depends(require_role("provider"))):
        company = await _own_company(user)
        existing = await _db().verification_requests.find_one(
            {"company_id": company["id"], "status": {"$in": ["pending", "needs_more_info"]}}
        )
        if existing:
            raise HTTPException(409, "An open verification request already exists")
        doc = {
            "id": new_id(),
            "company_id": company["id"],
            "company_name": company.get("name", ""),
            "submitted_by": user["id"],
            "status": "pending",
            "legal_name": body.get("legal_name", "").strip(),
            "brand_name": body.get("brand_name", "").strip() or company.get("name", ""),
            "tax_id": body.get("tax_id", "").strip(),
            "registration_number": body.get("registration_number", "").strip(),
            "legal_address": body.get("legal_address", "").strip(),
            "business_email": body.get("business_email", "").strip(),
            "website": body.get("website", "").strip(),
            "phone": body.get("phone", "").strip(),
            "representative_name": body.get("representative_name", "").strip(),
            "representative_position": body.get("representative_position", "").strip(),
            "documents": body.get("documents", []) or [],
            "notes": body.get("notes", ""),
            "submitted_at": now_iso(),
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        if not doc["legal_name"]:
            raise HTTPException(400, "legal_name is required")
        if not doc["tax_id"]:
            raise HTTPException(400, "tax_id is required")
        await _db().verification_requests.insert_one(doc)
        await _notify()(user["id"], "verification_submitted", "Yoxlama tələbi göndərildi",
                        "Şirkətiniz üçün yoxlama tələbi yaradıldı.", entity_id=doc["id"],
                        href="/provider/profile")
        return _strip(doc)

    @router.get("/me/verification")
    async def my_verification(user: dict = Depends(require_role("provider"))):
        company = await _own_company(user)
        latest = await _db().verification_requests.find_one(
            {"company_id": company["id"]}, {"_id": 0}, sort=[("created_at", -1)],
        )
        return {"request": latest, "company_verified": company.get("verified", False)}

    # ----- Open briefs (provider discovery) -----
    @router.get("/me/open-briefs")
    async def discover_open_briefs(
        q: Optional[str] = None,
        category: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
        user: dict = Depends(require_role("provider")),
    ):
        company = await _own_company(user)
        # build filter
        now = now_iso()
        filt: Dict[str, Any] = {
            "visibility": "open",
            "status": {"$in": ["open", "active"]},
            "$or": [{"expires_at": {"$gt": now}}, {"expires_at": {"$exists": False}}],
        }
        if category:
            filt["category"] = category
        if q:
            filt["$or"] = filt.get("$or", []) + [{"title": {"$regex": q, "$options": "i"}}]
        skip = max(0, (page - 1) * limit)
        cursor = _db().briefs.find(filt, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
        items = await cursor.to_list(limit)
        total = await _db().briefs.count_documents(filt)

        # mark which briefs the provider has already viewed/unlocked
        own_leads = await _db().leads.find(
            {"company_id": company["id"], "brief_id": {"$in": [b["id"] for b in items]}},
            {"_id": 0, "brief_id": 1, "status": 1},
        ).to_list(len(items))
        own_lead_map = {l["brief_id"]: l for l in own_leads}

        # within-limit check
        within_limit, used, max_leads = await _limits().check_monthly_leads(company)

        out = []
        for b in items:
            lead = own_lead_map.get(b["id"])
            # Anonymize sensitive fields until unlock
            b_card = {
                "id": b["id"],
                "title": b.get("title", ""),
                "category": b.get("category", ""),
                "sector": b.get("sector", ""),
                "budget_min": b.get("budget_min"),
                "budget_max": b.get("budget_max"),
                "deadline": b.get("deadline"),
                "short_description": b.get("short_description", ""),
                "created_at": b.get("created_at"),
                "expires_at": b.get("expires_at"),
                "proposals_count": b.get("proposals_count", 0),
                "unlocked": bool(lead),
                "lead_status": (lead or {}).get("status"),
            }
            if lead:
                # include full details once unlocked
                b_card.update({
                    "description": b.get("description"),
                    "problem_description": b.get("problem_description"),
                    "expected_result": b.get("expected_result"),
                    "buyer_name": b.get("buyer_name"),
                    "special_requirements": b.get("special_requirements"),
                })
            out.append(b_card)
        return {
            "items": out,
            "page": page,
            "limit": limit,
            "total": total,
            "leads_quota": {"used": used, "limit": max_leads, "within_limit": within_limit},
        }

    @router.post("/me/open-briefs/{bid}/unlock")
    async def unlock_open_brief(bid: str, user: dict = Depends(require_role("provider"))):
        company = await _own_company(user)
        brief = await _db().briefs.find_one({"id": bid, "visibility": "open"}, {"_id": 0})
        if not brief:
            raise HTTPException(404, "Open brief not found")
        existing = await _db().leads.find_one(
            {"brief_id": bid, "company_id": company["id"]}, {"_id": 0}
        )
        if existing:
            return existing

        within_limit, used, max_leads = await _limits().check_monthly_leads(company)
        if not within_limit:
            raise HTTPException(402, f"Monthly lead limit reached ({used}/{max_leads}). Upgrade to unlock more briefs.")

        # create lead from open-brief unlock
        expires = (_now() + timedelta(days=7)).isoformat()
        lead = {
            "id": new_id(),
            "brief_id": bid,
            "company_id": company["id"],
            "buyer_id": brief.get("buyer_id"),
            "source": "open_brief",
            "status": "new",
            "sent_at": now_iso(),
            "expires_at": expires,
            "created_at": now_iso(),
        }
        await _db().leads.insert_one(lead)
        await _limits().increment_counter(company, "leads_received_count", 1)
        await _limits().increment_counter(company, "open_briefs_unlocked_count", 1)
        await _db().briefs.update_one({"id": bid}, {"$inc": {"unlocks_count": 1}})
        _strip(lead)
        return lead

    # ----- Lead lifecycle -----
    @router.put("/me/leads/{lead_id}/view")
    async def view_lead(lead_id: str, user: dict = Depends(require_role("provider"))):
        company = await _own_company(user)
        lead = await _db().leads.find_one({"id": lead_id, "company_id": company["id"]}, {"_id": 0})
        if not lead:
            raise HTTPException(404, "Lead not found")
        if lead.get("status") == "expired":
            raise HTTPException(409, "Lead has expired")
        if not lead.get("viewed_at"):
            await _db().leads.update_one(
                {"id": lead_id},
                {"$set": {"status": "viewed", "viewed_at": now_iso(), "updated_at": now_iso()}},
            )
        return await _db().leads.find_one({"id": lead_id}, {"_id": 0})

    @router.get("/me/projects")
    async def my_projects(user: dict = Depends(_cu())):
        db = _db()
        if user.get("role") == "buyer":
            items = await db.projects.find({"buyer_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
        else:
            company = await _own_company(user)
            items = await db.projects.find({"company_id": company["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
        return items

    @router.post("/projects/{pid}/complete")
    async def complete_project(pid: str, user: dict = Depends(_cu())):
        project = await _db().projects.find_one({"id": pid}, {"_id": 0})
        if not project:
            raise HTTPException(404, "Project not found")
        if project.get("buyer_id") != user["id"] and user.get("role") != "admin":
            raise HTTPException(403, "Forbidden")
        if project.get("status") == "completed":
            return project
        await _db().projects.update_one(
            {"id": pid},
            {"$set": {"status": "completed", "completed_at": now_iso(), "updated_at": now_iso()}},
        )
        # notify provider so they can request review
        await _notify()(
            project.get("provider_owner_id") or "",
            "project_completed",
            "Layihə tamamlandı",
            f"\"{project.get('brief_title', '')}\" layihəsi tamamlandı.",
            entity_id=pid, href="/provider/dashboard",
        )
        return await _db().projects.find_one({"id": pid}, {"_id": 0})

    # ----- Verified review creation -----
    @router.post("/reviews/verified")
    async def create_verified_review(payload: ProtectedReviewIn, user: dict = Depends(require_role("buyer"))):
        project = await _db().projects.find_one({"id": payload.project_id}, {"_id": 0})
        if not project:
            raise HTTPException(404, "Project not found")
        if project.get("buyer_id") != user["id"]:
            raise HTTPException(403, "Only the project buyer can leave a review")
        if project.get("status") != "completed":
            raise HTTPException(400, "Project must be completed before leaving a review")

        existing = await _db().reviews.find_one(
            {"project_id": payload.project_id, "user_id": user["id"]}
        )
        if existing:
            raise HTTPException(409, "You have already reviewed this project")

        doc = {
            "id": new_id(),
            "project_id": payload.project_id,
            "company_id": project["company_id"],
            "user_id": user["id"],
            "user_name": user.get("name", ""),
            "rating": float(payload.rating),
            "rating_quality": payload.rating_quality,
            "rating_communication": payload.rating_communication,
            "rating_deadline": payload.rating_deadline,
            "rating_value": payload.rating_value,
            "title": payload.title.strip(),
            "text": payload.text.strip(),
            "status": "published",
            "verified_project": True,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await _db().reviews.insert_one(doc)
        # recalculate average rating
        await _recompute_company_rating(project["company_id"])
        if project.get("provider_owner_id"):
            await _notify()(
                project["provider_owner_id"],
                "review_received",
                "Yeni rəy gəldi",
                f"{user.get('name', 'Buyer')} sizə {int(payload.rating)} ulduzlu rəy yazdı.",
                entity_id=doc["id"], href="/provider/reviews",
            )
        return _strip(doc)

    # ----- Subscription requests v2 -----
    class SubscriptionRequestIn(BaseModel):
        plan: str
        billing_cycle: Optional[str] = "monthly"

    @router.post("/me/subscription/request-upgrade")
    async def request_upgrade(body: SubscriptionRequestIn, user: dict = Depends(require_role("provider"))):
        company = await _own_company(user)
        if body.billing_cycle not in ("monthly", "yearly"):
            raise HTTPException(400, "billing_cycle must be monthly or yearly")
        result = await _subs().request_upgrade(company, body.plan, body.billing_cycle or "monthly")
        # initiate payment link
        provider = await PaymentProvider.for_company(_db())
        link_info = await provider.create_payment_link(result["invoice"])
        await _notify()(user["id"], "subscription_requested", "Plan yüksəltmə tələbi",
                        f"{body.plan.title()} planı üçün invoice yaradıldı.",
                        entity_id=result["subscription"]["id"], href="/provider/billing")
        return {**result, "payment": link_info}

    @router.get("/me/invoices")
    async def my_invoices(user: dict = Depends(require_role("provider"))):
        company = await _own_company(user)
        items = await _db().invoices.find({"company_id": company["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
        return items


async def _recompute_company_rating(company_id: str):
    pipeline = [
        {"$match": {"company_id": company_id, "status": "published"}},
        {"$group": {"_id": "$company_id", "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]
    out = await _db().reviews.aggregate(pipeline).to_list(1)
    if out:
        avg = round(out[0]["avg"] or 0, 2)
        cnt = out[0]["count"]
    else:
        avg, cnt = 0, 0
    await _db().companies.update_one({"id": company_id}, {"$set": {"rating": avg, "reviews_count": cnt}})


# ===========================================================================
# Admin routes
# ===========================================================================
def _register_admin_endpoints():
    require_role = _deps["require_role"]
    require_admin_module = _deps["require_admin_module"]

    # ---- Verification queue ----
    @router.get("/admin/verification/queue")
    async def verification_queue(status: Optional[str] = None, user: dict = Depends(require_role("admin"))):
        require_admin_module(user, "verification")
        q: Dict[str, Any] = {}
        if status:
            q["status"] = status
        items = await _db().verification_requests.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
        return items

    @router.post("/admin/verification/{rid}/approve")
    async def approve_verification(rid: str, body: dict, user: dict = Depends(require_role("admin"))):
        require_admin_module(user, "verification")
        req = await _db().verification_requests.find_one({"id": rid}, {"_id": 0})
        if not req:
            raise HTTPException(404, "Request not found")
        patch = {
            "status": "approved",
            "reviewed_by": user["id"],
            "reviewed_at": now_iso(),
            "admin_note": body.get("note", ""),
            "updated_at": now_iso(),
        }
        await _db().verification_requests.update_one({"id": rid}, {"$set": patch})
        await _db().companies.update_one(
            {"id": req["company_id"]},
            {"$set": {"verified": True, "verified_at": now_iso(), "verification_request_id": rid}},
        )
        await _audit()(user, "verification.approve", "verification_request", rid, req, patch)
        if req.get("submitted_by"):
            await _notify()(req["submitted_by"], "verification_approved", "Yoxlama təsdiqləndi",
                            "Şirkətiniz uğurla doğrulandı.", entity_id=rid, href="/provider/profile")
        return await _db().verification_requests.find_one({"id": rid}, {"_id": 0})

    @router.post("/admin/verification/{rid}/reject")
    async def reject_verification(rid: str, body: dict, user: dict = Depends(require_role("admin"))):
        require_admin_module(user, "verification")
        req = await _db().verification_requests.find_one({"id": rid}, {"_id": 0})
        if not req:
            raise HTTPException(404, "Request not found")
        reason = (body.get("reason") or "").strip()
        if not reason:
            raise HTTPException(400, "reason is required")
        patch = {
            "status": "rejected",
            "reviewed_by": user["id"],
            "reviewed_at": now_iso(),
            "rejection_reason": reason,
            "admin_note": body.get("note", ""),
            "updated_at": now_iso(),
        }
        await _db().verification_requests.update_one({"id": rid}, {"$set": patch})
        await _audit()(user, "verification.reject", "verification_request", rid, req, patch)
        if req.get("submitted_by"):
            await _notify()(req["submitted_by"], "verification_rejected", "Yoxlama rədd edildi",
                            f"Səbəb: {reason}", entity_id=rid, href="/provider/profile")
        return await _db().verification_requests.find_one({"id": rid}, {"_id": 0})

    @router.post("/admin/verification/{rid}/needs-info")
    async def request_more_info(rid: str, body: dict, user: dict = Depends(require_role("admin"))):
        require_admin_module(user, "verification")
        req = await _db().verification_requests.find_one({"id": rid}, {"_id": 0})
        if not req:
            raise HTTPException(404, "Request not found")
        patch = {
            "status": "needs_more_info",
            "admin_note": body.get("note", ""),
            "reviewed_by": user["id"],
            "reviewed_at": now_iso(),
            "updated_at": now_iso(),
        }
        await _db().verification_requests.update_one({"id": rid}, {"$set": patch})
        await _audit()(user, "verification.needs_info", "verification_request", rid, req, patch)
        if req.get("submitted_by"):
            await _notify()(req["submitted_by"], "verification_needs_more_info",
                            "Əlavə məlumat tələb olunur", body.get("note", ""), entity_id=rid,
                            href="/provider/profile")
        return await _db().verification_requests.find_one({"id": rid}, {"_id": 0})

    # ---- Plans v2 (versioned + audit) ----
    @router.post("/admin/plans")
    async def admin_create_plan(payload: PlanIn, user: dict = Depends(require_role("admin"))):
        require_admin_module(user, "billing")
        if await _db().plans.find_one({"slug": payload.slug}):
            raise HTTPException(409, "Plan slug already exists")
        doc = {
            "id": new_id(),
            "name": payload.name,
            "slug": payload.slug,
            "price": payload.price,
            "yearly_price": payload.yearly_price or 0,
            "currency": payload.currency or "AZN",
            "order": payload.order or 99,
            "popular": bool(payload.popular),
            "active": bool(payload.active),
            "visible": bool(payload.visible),
            "billing_cycle_options": payload.billing_cycle_options or ["monthly", "yearly"],
            "description": payload.description or "",
            "cta_label": payload.cta_label or "",
            "admin_note": payload.admin_note or "",
            "limits": payload.limits or {},
            "features": payload.features or {},
            "feature_list": payload.feature_list or [],
            "version": 1,
            "is_current": True,
            "created_by": user["id"],
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await _db().plans.insert_one(doc)
        await _save_plan_version(doc, user["id"], "create")
        await _audit()(user, "plan.create", "plan", doc["id"], {}, doc)
        return _strip(doc)

    @router.patch("/admin/plans/{pid}")
    async def admin_patch_plan(pid: str, body: dict, user: dict = Depends(require_role("admin"))):
        require_admin_module(user, "billing")
        old = await _db().plans.find_one({"id": pid}, {"_id": 0})
        if not old:
            raise HTTPException(404, "Plan not found")
        # bump version
        new_version = (old.get("version", 1) or 1) + 1
        patch = {k: v for k, v in body.items() if k in {
            "name", "slug", "price", "yearly_price", "currency", "order", "popular", "active",
            "visible", "billing_cycle_options", "description", "cta_label", "admin_note",
            "limits", "features", "feature_list",
        }}
        patch["version"] = new_version
        patch["updated_at"] = now_iso()
        patch["updated_by"] = user["id"]
        await _db().plans.update_one({"id": pid}, {"$set": patch})
        new_doc = await _db().plans.find_one({"id": pid}, {"_id": 0})
        await _save_plan_version(new_doc, user["id"], "update")
        await _audit()(user, "plan.update", "plan", pid, old, new_doc)
        return new_doc

    @router.post("/admin/plans/{pid}/duplicate")
    async def admin_duplicate_plan(pid: str, body: dict, user: dict = Depends(require_role("admin"))):
        require_admin_module(user, "billing")
        src = await _db().plans.find_one({"id": pid}, {"_id": 0})
        if not src:
            raise HTTPException(404, "Plan not found")
        new_slug = (body.get("slug") or (src.get("slug") + "-copy"))[:64]
        if await _db().plans.find_one({"slug": new_slug}):
            raise HTTPException(409, "Target slug already exists")
        new_doc = {**src, "id": new_id(), "slug": new_slug, "name": body.get("name") or (src.get("name") + " (Copy)"),
                   "active": False, "version": 1, "is_current": True,
                   "created_by": user["id"], "created_at": now_iso(), "updated_at": now_iso()}
        new_doc.pop("_id", None)
        await _db().plans.insert_one(new_doc)
        await _save_plan_version(new_doc, user["id"], "duplicate")
        await _audit()(user, "plan.duplicate", "plan", new_doc["id"], src, new_doc)
        return new_doc

    @router.post("/admin/plans/{pid}/activate")
    async def admin_activate_plan(pid: str, user: dict = Depends(require_role("admin"))):
        require_admin_module(user, "billing")
        await _db().plans.update_one({"id": pid}, {"$set": {"active": True, "updated_at": now_iso()}})
        await _audit()(user, "plan.activate", "plan", pid, {}, {"active": True})
        return {"ok": True}

    @router.post("/admin/plans/{pid}/deactivate")
    async def admin_deactivate_plan(pid: str, user: dict = Depends(require_role("admin"))):
        require_admin_module(user, "billing")
        await _db().plans.update_one({"id": pid}, {"$set": {"active": False, "updated_at": now_iso()}})
        await _audit()(user, "plan.deactivate", "plan", pid, {}, {"active": False})
        return {"ok": True}

    @router.get("/admin/plans/{pid}/subscribers")
    async def admin_plan_subscribers(pid: str, user: dict = Depends(require_role("admin"))):
        require_admin_module(user, "billing")
        plan = await _db().plans.find_one({"id": pid}, {"_id": 0})
        if not plan:
            raise HTTPException(404, "Plan not found")
        subs = await _db().subscriptions.find(
            {"plan": plan["slug"], "status": "active"}, {"_id": 0}
        ).sort("created_at", -1).to_list(500)
        return subs

    @router.get("/admin/plans/{pid}/versions")
    async def admin_plan_versions(pid: str, user: dict = Depends(require_role("admin"))):
        require_admin_module(user, "billing")
        items = await _db().subscription_plan_versions.find(
            {"plan_id": pid}, {"_id": 0}
        ).sort("version", -1).to_list(200)
        return items

    # ---- Admin billing actions ----
    @router.post("/admin/invoices/{iid}/mark-paid")
    async def admin_mark_invoice_paid(iid: str, body: dict, user: dict = Depends(require_role("admin"))):
        require_admin_module(user, "billing")
        payment = await _subs().mark_invoice_paid(
            iid,
            admin_user_id=user["id"],
            method=body.get("method", "manual_bank_transfer"),
            provider_name=body.get("provider", "manual"),
            transaction_id=body.get("transaction_id", ""),
            notes=body.get("notes", ""),
        )
        await _audit()(user, "invoice.mark_paid", "invoice", iid, {}, payment)
        return payment

    @router.post("/admin/subscriptions/{sid}/cancel")
    async def admin_cancel_subscription(sid: str, body: dict, user: dict = Depends(require_role("admin"))):
        require_admin_module(user, "billing")
        sub = await _subs().cancel_subscription(sid, by_admin_id=user["id"], reason=body.get("reason", ""))
        await _audit()(user, "subscription.cancel", "subscription", sid, {}, sub)
        return sub

    @router.post("/admin/subscriptions/{sid}/extend")
    async def admin_extend_subscription(sid: str, body: dict, user: dict = Depends(require_role("admin"))):
        require_admin_module(user, "billing")
        sub = await _db().subscriptions.find_one({"id": sid}, {"_id": 0})
        if not sub:
            raise HTTPException(404, "Subscription not found")
        days = int(body.get("days", 30))
        try:
            current_end = datetime.fromisoformat((sub.get("current_period_end") or now_iso()).replace("Z", "+00:00"))
        except Exception:
            current_end = _now()
        new_end = (current_end + timedelta(days=days)).isoformat()
        patch = {"current_period_end": new_end, "expires_at": new_end, "renews_at": new_end,
                 "status": "active", "updated_at": now_iso()}
        await _db().subscriptions.update_one({"id": sid}, {"$set": patch})
        await _db().companies.update_one({"id": sub["company_id"]}, {"$set": {"plan_expires_at": new_end}})
        await _audit()(user, "subscription.extend", "subscription", sid, sub, patch)
        return await _db().subscriptions.find_one({"id": sid}, {"_id": 0})

    @router.post("/admin/jobs/run-expiry-check")
    async def admin_run_expiry_check(user: dict = Depends(require_role("admin"))):
        from jobs_scheduler import run_jobs_once
        result = await run_jobs_once(_db())
        await _audit()(user, "jobs.run", "system", "expiry", {}, result)
        return result

    @router.get("/admin/payment-provider/status")
    async def admin_payment_provider_status(user: dict = Depends(require_role("admin"))):
        require_admin_module(user, "billing")
        provider = await PaymentProvider.for_company(_db())
        is_real = False
        if isinstance(provider, type) is False and provider.name != "manual":
            is_real = (
                (provider.name == "epoint" and bool(os.environ.get("EPOINT_PUBLIC_KEY") and os.environ.get("EPOINT_PRIVATE_KEY")))
                or (provider.name == "payriff" and bool(os.environ.get("PAYRIFF_MERCHANT_ID") and os.environ.get("PAYRIFF_SECRET_KEY")))
            )
        return {
            "provider": provider.name,
            "connected": is_real,
            "message": "Manual billing active" if not is_real else f"{provider.name.title()} gateway configured",
        }


async def _save_plan_version(plan_doc: dict, actor_id: str, action: str):
    """Persist a snapshot version of a plan into subscription_plan_versions."""
    version = plan_doc.get("version", 1)
    db = _db()
    snapshot = {
        "id": new_id(),
        "plan_id": plan_doc["id"],
        "version": version,
        "slug": plan_doc.get("slug"),
        "name": plan_doc.get("name"),
        "price": plan_doc.get("price"),
        "yearly_price": plan_doc.get("yearly_price"),
        "limits": plan_doc.get("limits", {}),
        "features": plan_doc.get("features", {}),
        "feature_list": plan_doc.get("feature_list", []),
        "is_current": True,
        "action": action,
        "effective_from": now_iso(),
        "actor_id": actor_id,
        "created_at": now_iso(),
    }
    # mark previous versions as not current
    await db.subscription_plan_versions.update_many(
        {"plan_id": plan_doc["id"]},
        {"$set": {"is_current": False}},
    )
    await db.subscription_plan_versions.insert_one(snapshot)


# ---------------------------------------------------------------------------
# Project auto-creation hook on proposal acceptance (called from server.py)
# ---------------------------------------------------------------------------
async def ensure_project_for_accepted_proposal(db, proposal: dict, brief: dict) -> dict:
    """Create or fetch a project for an accepted proposal."""
    existing = await db.projects.find_one({"proposal_id": proposal["id"]}, {"_id": 0})
    if existing:
        return existing
    company = await db.companies.find_one({"id": proposal.get("company_id")}, {"_id": 0})
    doc = {
        "id": new_id(),
        "brief_id": proposal.get("brief_id"),
        "lead_id": "",
        "proposal_id": proposal["id"],
        "buyer_id": brief.get("buyer_id"),
        "company_id": proposal.get("company_id"),
        "company_name": proposal.get("company_name") or (company or {}).get("name", ""),
        "provider_owner_id": (company or {}).get("owner_id", ""),
        "brief_title": brief.get("title", ""),
        "status": "active",
        "started_at": now_iso(),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.projects.insert_one(doc)
    doc.pop("_id", None)
    return doc


# Wire endpoint registration after init() is called
def finalize():
    _register_provider_endpoints()
    _register_admin_endpoints()
