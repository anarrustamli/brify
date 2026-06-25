"""Background scheduler for Brify production jobs.

Runs as an asyncio task started by FastAPI's startup event. Iterates once per
interval and processes scheduled work:

  * subscription_expiry_check       — downgrade expired subscriptions
  * subscription_expiring_notify    — notify providers 7/3/1 days before expiry
  * lead_expiry_check               — mark un-responded leads as expired
  * brief_expiry_check              — close expired open briefs
  * usage_counter_period_reset      — implicit (handled by month_window keying)
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import timedelta
from typing import Any, Dict

from business_services import SubscriptionService, now_iso, _now

log = logging.getLogger("brify.jobs")

DEFAULT_INTERVAL = 60 * 15  # 15 minutes


_runner_started = False
_stop = False


async def run_jobs_once(db) -> Dict[str, Any]:
    """Single-pass execution of all maintenance jobs. Safe to call manually."""
    results: Dict[str, Any] = {}
    try:
        results["subscription_expiry"] = await _subscription_expiry(db)
    except Exception as exc:
        log.exception("sub expiry: %s", exc)
        results["subscription_expiry"] = {"error": str(exc)}
    try:
        results["subscription_expiring_notify"] = await _subscription_expiring_notify(db)
    except Exception as exc:
        log.exception("sub expiring notify: %s", exc)
        results["subscription_expiring_notify"] = {"error": str(exc)}
    try:
        results["lead_expiry"] = await _lead_expiry(db)
    except Exception as exc:
        log.exception("lead expiry: %s", exc)
        results["lead_expiry"] = {"error": str(exc)}
    try:
        results["brief_expiry"] = await _brief_expiry(db)
    except Exception as exc:
        log.exception("brief expiry: %s", exc)
        results["brief_expiry"] = {"error": str(exc)}
    return results


async def _subscription_expiry(db) -> Dict[str, Any]:
    svc = SubscriptionService(db)
    n = await svc.expire_due_subscriptions()
    return {"expired_count": n}


async def _subscription_expiring_notify(db) -> Dict[str, Any]:
    """Notify provider owners 7/3/1 days before expiry."""
    now = _now()
    notified = 0
    for days_left in (7, 3, 1):
        window_start = (now + timedelta(days=days_left - 1)).isoformat()
        window_end = (now + timedelta(days=days_left)).isoformat()
        cursor = db.subscriptions.find({
            "status": "active",
            "current_period_end": {"$gte": window_start, "$lt": window_end},
        })
        async for sub in cursor:
            key = f"expiring_{days_left}d"
            if sub.get("notifications_sent", {}).get(key):
                continue
            company = await db.companies.find_one({"id": sub["company_id"]}, {"_id": 0, "owner_id": 1, "name": 1})
            if not company or not company.get("owner_id"):
                continue
            await db.notifications.insert_one({
                "id": uuid.uuid4().hex,
                "user_id": company["owner_id"],
                "type": "subscription_expiring",
                "title": f"Abunəliyiniz {days_left} gün sonra bitir",
                "body": f"{company.get('name', 'Şirkətiniz')} üçün cari abunəliyiniz {days_left} gün sonra başa çatır.",
                "entity_id": sub["id"],
                "href": "/provider/billing",
                "read": False,
                "created_at": now_iso(),
            })
            await db.subscriptions.update_one(
                {"id": sub["id"]},
                {"$set": {f"notifications_sent.{key}": now_iso()}},
            )
            notified += 1
    return {"notified": notified}


async def _lead_expiry(db) -> Dict[str, Any]:
    now_str = now_iso()
    cursor = db.leads.find({
        "status": {"$in": ["new", "viewed"]},
        "expires_at": {"$lt": now_str},
    })
    expired = 0
    async for lead in cursor:
        await db.leads.update_one(
            {"id": lead["id"]},
            {"$set": {"status": "expired", "expired_at": now_str, "updated_at": now_str}},
        )
        expired += 1
    return {"expired": expired}


async def _brief_expiry(db) -> Dict[str, Any]:
    now_str = now_iso()
    cursor = db.briefs.find({
        "status": "open",
        "visibility": "open",
        "expires_at": {"$lt": now_str},
    })
    closed = 0
    async for brief in cursor:
        await db.briefs.update_one(
            {"id": brief["id"]},
            {"$set": {"status": "closed", "closed_reason": "expired", "closed_at": now_str, "updated_at": now_str}},
        )
        closed += 1
    return {"closed": closed}


async def _runner(db, interval: int):
    global _stop
    log.info("brify: jobs runner started (interval=%ss)", interval)
    while not _stop:
        try:
            res = await run_jobs_once(db)
            if any(isinstance(v, dict) and v.get("error") for v in res.values()):
                log.warning("jobs partial errors: %s", res)
        except Exception as exc:
            log.exception("jobs runner: %s", exc)
        await asyncio.sleep(interval)


def start_runner(db, interval: int = DEFAULT_INTERVAL) -> None:
    """Idempotently start the background job runner."""
    global _runner_started, _stop
    if _runner_started:
        return
    _stop = False
    _runner_started = True
    loop = asyncio.get_event_loop()
    loop.create_task(_runner(db, interval))


def stop_runner() -> None:
    global _stop  # noqa: F824 — kept for clarity; future code may re-assign
    _stop = True
