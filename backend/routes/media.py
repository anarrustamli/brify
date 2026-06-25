"""Media upload / serve / delete.

Extracted from server.py (Phase 2 modular split).

Endpoints:
  * POST   /api/media
  * GET    /api/media/{asset_id}
  * DELETE /api/media/{asset_id}
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from starlette.responses import FileResponse

router = APIRouter(prefix="/api")

_deps: Dict[str, Any] = {}


def setup(*, db, get_current_user, require_admin_module, write_audit,
          new_id, now_iso, media_ext, allowed_exts_for_module,
          MEDIA_UPLOAD_DIR, MAX_MEDIA_FILE_SIZE) -> APIRouter:
    _deps.update(
        db=db,
        get_current_user=get_current_user,
        require_admin_module=require_admin_module,
        write_audit=write_audit,
        new_id=new_id,
        now_iso=now_iso,
        media_ext=media_ext,
        allowed_exts_for_module=allowed_exts_for_module,
        MEDIA_UPLOAD_DIR=MEDIA_UPLOAD_DIR,
        MAX_MEDIA_FILE_SIZE=MAX_MEDIA_FILE_SIZE,
    )
    _register()
    return router


def _register():
    db = _deps["db"]
    get_current_user = _deps["get_current_user"]
    require_admin_module = _deps["require_admin_module"]
    write_audit = _deps["write_audit"]
    new_id = _deps["new_id"]
    now_iso = _deps["now_iso"]
    media_ext = _deps["media_ext"]
    allowed_exts_for_module = _deps["allowed_exts_for_module"]
    MEDIA_UPLOAD_DIR = _deps["MEDIA_UPLOAD_DIR"]
    MAX_MEDIA_FILE_SIZE = _deps["MAX_MEDIA_FILE_SIZE"]

    @router.post("/media")
    async def upload_media(
        module: str = Form(...),
        entity_id: str = Form(""),
        alt: str = Form(""),
        file: UploadFile = File(...),
        user: dict = Depends(get_current_user),
    ):
        if module == "message-attachment":
            thread = await db.message_threads.find_one({"id": entity_id}, {"_id": 0})
            if not thread or user["id"] not in thread.get("participants", []):
                raise HTTPException(403, "Forbidden")
        elif module == "avatar":
            pass  # any authenticated user may upload their own profile picture
        elif user.get("role") not in ("admin", "provider"):
            raise HTTPException(403, "Forbidden")
        elif user.get("role") == "admin":
            require_admin_module(user, "media")

        name = Path(file.filename or "upload").name
        ext = media_ext(name)
        if ext not in allowed_exts_for_module(module):
            raise HTTPException(400, "Bu modul üçün media formatı dəstəklənmir.")
        content = await file.read()
        size = len(content)
        if size > MAX_MEDIA_FILE_SIZE:
            raise HTTPException(400, "Media faylı maksimum 15 MB ola bilər.")

        asset_id = new_id()
        target_dir = MEDIA_UPLOAD_DIR / module
        target_dir.mkdir(parents=True, exist_ok=True)
        stored_name = f"{asset_id}{ext}"
        path = target_dir / stored_name
        path.write_bytes(content)
        doc = {
            "id": asset_id,
            "owner_id": user["id"],
            "owner_role": user.get("role"),
            "module": module,
            "entity_id": entity_id,
            "name": name,
            "stored_name": stored_name,
            "storage_path": str(path),
            "public_url": f"/api/media/{asset_id}",
            "mime": file.content_type or "application/octet-stream",
            "size": size,
            "alt": alt,
            "status": "active",
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.media_assets.insert_one(doc)
        if user.get("role") == "admin":
            await write_audit(user, "media.create", "media_asset", asset_id, {}, doc)
        doc.pop("_id", None)
        return doc

    @router.get("/media/{asset_id}")
    async def serve_media(asset_id: str):
        doc = await db.media_assets.find_one({"id": asset_id, "status": "active", "deleted_at": {"$exists": False}}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Media not found")
        path = Path(doc.get("storage_path", ""))
        if not path.exists():
            raise HTTPException(404, "Media not found")
        return FileResponse(path, media_type=doc.get("mime") or "application/octet-stream", filename=doc.get("name") or path.name)

    @router.delete("/media/{asset_id}")
    async def delete_media(asset_id: str, user: dict = Depends(get_current_user)):
        doc = await db.media_assets.find_one({"id": asset_id, "deleted_at": {"$exists": False}}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Media not found")
        if user.get("role") != "admin" and doc.get("owner_id") != user.get("id"):
            raise HTTPException(403, "Forbidden")
        update = {"status": "deleted", "deleted_at": now_iso(), "deleted_by": user["id"], "updated_at": now_iso()}
        await db.media_assets.update_one({"id": asset_id}, {"$set": update})
        if user.get("role") == "admin":
            await write_audit(user, "media.delete", "media_asset", asset_id, doc, update)
        return {"ok": True}
