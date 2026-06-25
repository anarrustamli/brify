"""Generic admin resource CRUD + audit log.

Extracted from server.py (Phase 2 modular split). The legacy single-file
endpoints are removed once this router is mounted from server.py.

Endpoints:
  * GET    /api/admin/audit-logs
  * GET    /api/admin/{resource}
  * POST   /api/admin/{resource}
  * PUT    /api/admin/{resource}/{rid}
  * DELETE /api/admin/{resource}/{rid}

The {resource} routes are intentionally registered LAST in the router
group so that more specific admin routes (e.g. /admin/plans, declared
in server.py / business_routes.py) match first.
"""
from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException

router = APIRouter(prefix="/api")

_deps: Dict[str, Any] = {}


def setup(*, db, require_role, require_admin_module, admin_list_response,
          write_audit, new_id, now_iso, ADMIN_RESOURCES) -> APIRouter:
    _deps.update(
        db=db,
        require_role=require_role,
        require_admin_module=require_admin_module,
        admin_list_response=admin_list_response,
        write_audit=write_audit,
        new_id=new_id,
        now_iso=now_iso,
        ADMIN_RESOURCES=ADMIN_RESOURCES,
    )
    _register()
    return router


def _resource_config(resource: str) -> dict:
    config = _deps["ADMIN_RESOURCES"].get(resource)
    if not config:
        raise HTTPException(404, "Admin resource not found")
    return config


def _register():
    require_role = _deps["require_role"]
    require_admin_module = _deps["require_admin_module"]
    admin_list_response = _deps["admin_list_response"]
    write_audit = _deps["write_audit"]
    new_id = _deps["new_id"]
    now_iso = _deps["now_iso"]
    db = _deps["db"]

    @router.get("/admin/audit-logs")
    async def audit_logs(
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        q: Optional[str] = None,
        page: int = 1,
        limit: int = 25,
        sort: Optional[str] = None,
        user: dict = Depends(require_role("admin")),
    ):
        require_admin_module(user, "audit")
        filters = {}
        if entity_type:
            filters["entity_type"] = entity_type
        if entity_id:
            filters["entity_id"] = entity_id
        return await admin_list_response(
            "audit_logs",
            page=page,
            limit=limit,
            q=q,
            sort=sort,
            filters=filters,
            search_fields=["action", "entity_type", "entity_id", "actor_email", "target"],
            include_deleted=True,
        )

    @router.get("/admin/{resource}")
    async def admin_generic_list(
        resource: str,
        status: Optional[str] = None,
        q: Optional[str] = None,
        page: int = 1,
        limit: int = 25,
        sort: Optional[str] = None,
        user: dict = Depends(require_role("admin")),
    ):
        config = _resource_config(resource)
        require_admin_module(user, config["module"])
        default_sort = "order" if resource in ("faqs", "admin-roles") else "created_at"
        return await admin_list_response(
            config["collection"],
            page=page,
            limit=limit,
            q=q,
            status=status,
            sort=sort,
            search_fields=config.get("search"),
            default_sort=default_sort,
        )

    @router.post("/admin/{resource}")
    async def admin_generic_create(resource: str, body: dict, user: dict = Depends(require_role("admin"))):
        config = _resource_config(resource)
        require_admin_module(user, config["module"])
        doc = {
            "id": body.get("id") or new_id(),
            "created_at": now_iso(),
            "updated_at": now_iso(),
            **body,
        }
        doc.setdefault("status", "draft" if resource in ("content-pages", "seo-pages", "email-templates") else "active")
        if resource == "ad-placements":
            doc.setdefault("active", True)
            doc.setdefault("period", "ay")
        await db[config["collection"]].insert_one(doc)
        await write_audit(user, f"{resource}.create", resource.rstrip("s"), doc["id"], {}, doc)
        doc.pop("_id", None)
        return doc

    @router.put("/admin/{resource}/{rid}")
    async def admin_generic_update(resource: str, rid: str, body: dict, user: dict = Depends(require_role("admin"))):
        config = _resource_config(resource)
        require_admin_module(user, config["module"])
        old = await db[config["collection"]].find_one({"id": rid}, {"_id": 0})
        if not old:
            if resource not in ("content-pages", "seo-pages", "faqs", "email-templates", "admin-roles"):
                raise HTTPException(404, "Item not found")
            created = {"id": rid, "created_at": now_iso(), "updated_at": now_iso(), **body}
            created.setdefault("slug", rid)
            created.setdefault("status", "draft")
            await db[config["collection"]].insert_one(created)
            await write_audit(user, f"{resource}.create", resource.rstrip("s"), rid, {}, created)
            created.pop("_id", None)
            return created
        update = {**body, "updated_at": now_iso()}
        await db[config["collection"]].update_one({"id": rid}, {"$set": update})
        await write_audit(user, f"{resource}.update", resource.rstrip("s"), rid, old, update)
        updated = await db[config["collection"]].find_one({"id": rid}, {"_id": 0})
        return updated

    @router.delete("/admin/{resource}/{rid}")
    async def admin_generic_delete(resource: str, rid: str, user: dict = Depends(require_role("admin"))):
        config = _resource_config(resource)
        require_admin_module(user, config["module"])
        old = await db[config["collection"]].find_one({"id": rid}, {"_id": 0})
        if not old:
            raise HTTPException(404, "Item not found")
        update = {"deleted_at": now_iso(), "deleted_by": user["id"], "status": "deleted"}
        await db[config["collection"]].update_one({"id": rid}, {"$set": update})
        await write_audit(user, f"{resource}.delete", resource.rstrip("s"), rid, old, update)
        return {"ok": True}
