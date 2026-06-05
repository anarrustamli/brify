from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import bcrypt
import jwt
import re
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, File, Form, UploadFile
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr


mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="BizMarket B2B Marketplace API")
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]
UPLOAD_DIR = ROOT_DIR / "uploads" / "briefs"
MEDIA_UPLOAD_DIR = ROOT_DIR / "uploads" / "media"
ALLOWED_BRIEF_ATTACHMENT_EXTS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg", ".zip"}
ALLOWED_MEDIA_EXTS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".zip"}
MAX_BRIEF_FILES = 5
MAX_BRIEF_FILE_SIZE = 10 * 1024 * 1024
MAX_BRIEF_TOTAL_SIZE = 25 * 1024 * 1024
MAX_MEDIA_FILE_SIZE = 15 * 1024 * 1024

COMPANY_STATUSES = {"active", "pending", "suspended", "rejected", "deleted"}
SERVICE_STATUSES = {"active", "pending", "approved", "rejected", "deleted"}
PORTFOLIO_STATUSES = {"active", "pending", "approved", "rejected", "published", "deleted"}
REVIEW_STATUSES = {"pending", "approved", "rejected", "deleted"}
BILLING_STATUSES = {"requested", "active", "paid", "rejected", "cancelled", "deleted"}

ADMIN_MODULES = {
    "companies": "Şirkətlər",
    "users": "İstifadəçilər",
    "categories": "Kateqoriyalar",
    "services": "Xidmətlər",
    "portfolio": "Portfolio",
    "briefs": "Brief-lər",
    "proposals": "Təkliflər",
    "leads": "Lead-lər",
    "reviews": "Rəylər",
    "verification": "Doğrulama",
    "billing": "Billing",
    "ads": "Reklamlar",
    "content": "Content",
    "seo": "SEO",
    "media": "Media",
    "reports": "Şikayətlər",
    "complaints": "Müraciətlər",
    "settings": "Tənzimləmələr",
    "roles": "Rollar",
    "audit": "Audit",
}

ADMIN_ROLE_PERMISSIONS = {
    "super_admin": ["*"],
    "admin": ["*"],
    "moderator": ["companies", "services", "portfolio", "reviews", "verification", "reports"],
    "sales_admin": ["companies", "leads", "billing", "ads"],
    "content_manager": ["categories", "content", "media", "seo"],
    "support_admin": ["users", "briefs", "leads", "reports", "complaints"],
}

ADMIN_RESOURCES = {
    "services": {"collection": "services", "module": "services", "search": ["name", "description", "company_name", "category"]},
    "portfolio": {"collection": "portfolio", "module": "portfolio", "search": ["title", "client_name", "description", "industry"]},
    "proposals": {"collection": "proposals", "module": "proposals", "search": ["title", "text", "company_name"]},
    "verification-requests": {"collection": "verification_requests", "module": "verification", "search": ["company_name", "status"]},
    "subscriptions": {"collection": "subscriptions", "module": "billing", "search": ["company_name", "plan", "status", "reference"]},
    "payments": {"collection": "payments", "module": "billing", "search": ["reference", "company_id", "status", "method", "description"]},
    "invoices": {"collection": "invoices", "module": "billing", "search": ["invoice_no", "company_id", "status", "description"]},
    "reports": {"collection": "reports", "module": "reports", "search": ["title", "reason", "status", "entity_type"]},
    "complaints": {"collection": "complaints", "module": "complaints", "search": ["title", "reason", "status", "company_name"]},
    "email-templates": {"collection": "email_templates", "module": "content", "search": ["name", "subject", "key"]},
    "content-pages": {"collection": "content_pages", "module": "content", "search": ["title", "slug", "body", "status"]},
    "seo-pages": {"collection": "seo_pages", "module": "seo", "search": ["title", "slug", "path", "seo_title"]},
    "faqs": {"collection": "faqs", "module": "content", "search": ["question", "answer", "category"]},
    "media-assets": {"collection": "media_assets", "module": "media", "search": ["id", "name", "module", "entity_id", "mime"]},
    "admin-roles": {"collection": "admin_roles", "module": "roles", "search": ["name", "key", "description"]},
}


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    # Prefer Authorization header over cookie to avoid stale-cookie role bleed
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("password_hash", None)
        user.pop("_id", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_role(*roles):
    async def checker(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return checker


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/",
    )


def clean_doc(doc: dict) -> dict:
    if doc is None:
        return None
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


def json_safe(value):
    if isinstance(value, dict):
        return {k: json_safe(v) for k, v in value.items() if k != "_id"}
    if isinstance(value, list):
        return [json_safe(item) for item in value]
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    return value


def new_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _admin_role(user: dict) -> str:
    if user.get("role") != "admin":
        return ""
    return user.get("admin_role") or "super_admin"


def _admin_allowed_modules(user: dict) -> List[str]:
    role = _admin_role(user)
    permissions = ADMIN_ROLE_PERMISSIONS.get(role, [])
    if "*" in permissions:
        return list(ADMIN_MODULES.keys())
    return permissions


def _require_admin_module(user: dict, module: str):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    if module not in _admin_allowed_modules(user):
        raise HTTPException(status_code=403, detail="Forbidden")


def _admin_projection(extra_exclude: Optional[dict] = None) -> dict:
    projection = {"_id": 0}
    if extra_exclude:
        projection.update(extra_exclude)
    return projection


def _parse_admin_sort(sort: Optional[str], default_field: str = "created_at"):
    if not sort:
        return [(default_field, -1)]
    direction = -1 if sort.startswith("-") else 1
    field = sort[1:] if sort.startswith("-") else sort
    return [(field, direction)]


async def admin_list_response(
    collection_name: str,
    page: int = 1,
    limit: int = 25,
    q: Optional[str] = None,
    status: Optional[str] = None,
    sort: Optional[str] = None,
    filters: Optional[dict] = None,
    search_fields: Optional[List[str]] = None,
    projection: Optional[dict] = None,
    include_deleted: bool = False,
    default_sort: str = "created_at",
):
    page = max(int(page or 1), 1)
    limit = min(max(int(limit or 25), 1), 100)
    query = dict(filters or {})
    if not include_deleted and "deleted_at" not in query:
        query["deleted_at"] = {"$exists": False}
    if status and status != "all":
        query["status"] = status
    if q:
        fields = search_fields or ["name", "title", "email", "slug", "status"]
        query["$or"] = [{field: {"$regex": re.escape(q), "$options": "i"}} for field in fields]
    total = await db[collection_name].count_documents(query)
    items = await (
        db[collection_name]
        .find(query, projection or {"_id": 0})
        .sort(_parse_admin_sort(sort, default_sort))
        .skip((page - 1) * limit)
        .limit(limit)
        .to_list(limit)
    )
    return {
        "items": [json_safe(clean_doc(item)) for item in items],
        "total": total,
        "page": page,
        "limit": limit,
        "filters": {k: v for k, v in {"q": q, "status": status, **(filters or {})}.items() if v not in (None, "")},
        "sort": sort or f"-{default_sort}",
    }


async def write_audit(
    actor: dict,
    action: str,
    entity_type: str,
    entity_id: str,
    old_value: Optional[dict] = None,
    new_value: Optional[dict] = None,
):
    doc = {
        "id": new_id(),
        "actor_id": actor.get("id", ""),
        "actor_name": actor.get("name", ""),
        "actor_email": actor.get("email", ""),
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "target": f"{entity_type}:{entity_id}",
        "old_value": old_value or {},
        "new_value": new_value or {},
        "created_at": now_iso(),
    }
    doc["old_value"] = json_safe(doc["old_value"])
    doc["new_value"] = json_safe(doc["new_value"])
    await db.audit_logs.insert_one(doc)
    doc.pop("_id", None)
    return doc


def _media_ext(filename: str) -> str:
    return Path(filename or "").suffix.lower()


def _allowed_media_exts_for_module(module: str):
    image_exts = {".png", ".jpg", ".jpeg", ".webp", ".svg"}
    doc_exts = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".zip"}
    module_map = {
        "company-logo": image_exts,
        "company-cover": image_exts,
        "portfolio-image": image_exts,
        "blog-image": image_exts,
        "category-icon": image_exts,
        "certificate": image_exts | {".pdf"},
        "verification-doc": image_exts | doc_exts,
        "brief-attachment": image_exts | doc_exts,
        "message-attachment": image_exts | doc_exts,
        "general": ALLOWED_MEDIA_EXTS,
    }
    return module_map.get(module, ALLOWED_MEDIA_EXTS)


def _brief_attachment_ext(filename: str) -> str:
    return Path(filename or "").suffix.lower()


def _public_attachment_meta(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "brief_id": doc["brief_id"],
        "name": doc["name"],
        "size": doc["size"],
        "content_type": doc.get("content_type", ""),
        "created_at": doc.get("created_at", ""),
    }


async def create_notification(user_id: str, type_: str, title: str, body: str = "", entity_id: str = "", href: str = ""):
    doc = {
        "id": new_id(),
        "user_id": user_id,
        "type": type_,
        "title": title,
        "body": body,
        "entity_id": entity_id,
        "href": href,
        "read": False,
        "created_at": now_iso(),
    }
    await db.notifications.insert_one(doc)
    doc.pop("_id", None)
    return doc


async def invite_company_to_brief(
    brief: dict,
    company_id: str,
    buyer: dict,
    service_id: str = "",
    portfolio_id: str = "",
    force: bool = False,
):
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(404, "Company not found")

    existing = await db.leads.find_one({"brief_id": brief["id"], "company_id": company_id}, {"_id": 0})
    if existing and not force:
        raise HTTPException(409, "Bu brief artıq bu şirkətə göndərilib")

    sent_at = now_iso()
    lead_doc = {
        "brief_id": brief["id"], "company_id": company_id,
        "buyer_id": buyer["id"], "status": "new", "sent_at": sent_at,
        "service_id": (service_id or existing.get("service_id", "")) if existing else (service_id or ""),
        "portfolio_id": (portfolio_id or existing.get("portfolio_id", "")) if existing else (portfolio_id or ""),
        "resend_count": (existing.get("resend_count", 0) + 1) if existing else 0,
    }
    if existing:
        await db.leads.update_one({"brief_id": brief["id"], "company_id": company_id}, {"$set": lead_doc})
    else:
        lead_doc.update({"id": new_id(), "created_at": sent_at})
        await db.leads.insert_one(lead_doc)
    await db.briefs.update_one({"id": brief["id"]}, {"$addToSet": {"invited_companies": company_id}})
    if company.get("owner_id"):
        await create_notification(
            company["owner_id"],
            "brief_invite",
            "Yeni brief dəvəti",
            f"{buyer.get('name', 'Buyer')} sizi \"{brief.get('title', 'Brief')}\" brief-inə dəvət etdi.",
            entity_id=brief["id"],
            href="/provider/leads",
        )
    return {"ok": True, "resent": bool(existing), "sent_at": sent_at}


# ------- Schemas -------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str
    company_name: Optional[str] = None
    sector: Optional[str] = None
    phone: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class DemoLoginIn(BaseModel):
    role: str


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    password: str


# ------- Auth endpoints -------
@api_router.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower().strip()
    if payload.role not in ("buyer", "provider"):
        raise HTTPException(400, "Invalid role")
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(400, "Email already registered")
    user_id = new_id()
    user_doc = {
        "id": user_id, "email": email, "password_hash": hash_password(payload.password),
        "name": payload.name, "role": payload.role, "phone": payload.phone,
        "verified": False, "created_at": now_iso(),
    }
    await db.users.insert_one(user_doc)

    if payload.role == "provider":
        cid = new_id()
        await db.companies.insert_one({
            "id": cid, "owner_id": user_id,
            "name": payload.company_name or payload.name,
            "slug": (payload.company_name or payload.name).lower().replace(" ", "-") + "-" + cid[:6],
            "sector": payload.sector, "slogan": "", "about": "", "location": "Bakı",
            "founded_year": None, "company_size": "1-10",
            "legal_type": "llc", "vat_payer": False,
            "categories": [], "industries": [], "website": "", "email": email,
            "phone": payload.phone or "", "social": {}, "languages": ["az"],
            "logo_url": "", "cover_url": "",
            "rating": 0, "review_count": 0, "response_time": "24 saat",
            "verified": False, "featured": False, "sponsored": False,
            "status": "pending", "plan": "free", "profile_completion": 30,
            "views_month": 0, "shortlist_count": 0,
            "created_at": now_iso(),
        })

    if payload.role == "buyer":
        await db.buyer_profiles.insert_one({
            "id": new_id(), "user_id": user_id,
            "company_name": payload.company_name or "", "sector": payload.sector or "",
            "location": "Bakı", "created_at": now_iso(),
        })

    token = create_access_token(user_id, email, payload.role)
    set_auth_cookie(response, token)
    return {"token": token, "user": clean_doc(user_doc)}


@api_router.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(401, "Email və ya şifrə yanlışdır")
    token = create_access_token(user["id"], user["email"], user["role"])
    set_auth_cookie(response, token)
    return {"token": token, "user": clean_doc(user)}


@api_router.post("/auth/demo-login")
async def demo_login(payload: DemoLoginIn, response: Response):
    mapping = {
        "buyer": os.environ.get("DEMO_BUYER_EMAIL", "buyer@bizmarket.az"),
        "provider": os.environ.get("DEMO_PROVIDER_EMAIL", "provider@bizmarket.az"),
        "admin": os.environ.get("ADMIN_EMAIL", "admin@bizmarket.az"),
    }
    email = mapping.get(payload.role)
    if not email:
        raise HTTPException(400, "Invalid demo role")
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(404, "Demo user not found")
    token = create_access_token(user["id"], user["email"], user["role"])
    set_auth_cookie(response, token)
    return {"token": token, "user": clean_doc(user)}


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api_router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordIn):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email, "deleted_at": {"$exists": False}}, {"_id": 0})
    # Always return ok to avoid account enumeration; local/dev includes token for testable flow.
    if not user:
        return {"ok": True, "reset_token": ""}
    token = new_id()
    doc = {
        "id": new_id(),
        "token": token,
        "user_id": user["id"],
        "email": email,
        "used": False,
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        "created_at": now_iso(),
    }
    await db.password_resets.insert_one(doc)
    return {"ok": True, "reset_token": token}


@api_router.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordIn):
    reset = await db.password_resets.find_one({"token": payload.token, "used": False}, {"_id": 0})
    if not reset or reset.get("expires_at", "") < now_iso():
        raise HTTPException(400, "Reset link etibarsızdır və ya vaxtı bitib")
    if len(payload.password or "") < 8:
        raise HTTPException(400, "Şifrə minimum 8 simvol olmalıdır")
    await db.users.update_one({"id": reset["user_id"]}, {"$set": {"password_hash": hash_password(payload.password), "updated_at": now_iso()}})
    await db.password_resets.update_one({"token": payload.token}, {"$set": {"used": True, "used_at": now_iso()}})
    return {"ok": True}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api_router.put("/me/user")
async def update_my_profile(body: dict, user: dict = Depends(get_current_user)):
    allowed = {"name", "phone"}
    update = {k: v for k, v in body.items() if k in allowed}
    if not update:
        raise HTTPException(400, "Nothing to update")
    update["updated_at"] = now_iso()
    await db.users.update_one({"id": user["id"]}, {"$set": update})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return updated


@api_router.post("/auth/change-password")
async def change_password(body: dict, user: dict = Depends(get_current_user)):
    current_pw = body.get("current_password", "")
    new_pw = body.get("new_password", "")
    if not current_pw or not new_pw:
        raise HTTPException(400, "current_password and new_password are required")
    if len(new_pw) < 6:
        raise HTTPException(400, "New password must be at least 6 characters")
    db_user = await db.users.find_one({"id": user["id"]})
    if not verify_password(current_pw, db_user.get("password_hash", "")):
        raise HTTPException(400, "Cari şifrə yanlışdır")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_password(new_pw), "updated_at": now_iso()}})
    return {"ok": True}


# ------- Categories -------
@api_router.get("/categories")
async def list_categories():
    return await db.categories.find({"active": {"$ne": False}, "deleted_at": {"$exists": False}}, {"_id": 0}).sort("order", 1).to_list(500)


@api_router.get("/categories/tree")
async def category_tree():
    cats = await db.categories.find({"active": {"$ne": False}, "deleted_at": {"$exists": False}}, {"_id": 0}).sort("order", 1).to_list(500)
    parents = [c for c in cats if not c.get("parent_slug")]
    children_by_parent = {}
    for c in cats:
        parent = c.get("parent_slug")
        if parent:
            children_by_parent.setdefault(parent, []).append(c)
    return [{**parent_cat, "children": children_by_parent.get(parent_cat["slug"], [])} for parent_cat in parents]


@api_router.get("/categories/{slug}")
async def get_category(slug: str):
    cat = await db.categories.find_one({"slug": slug}, {"_id": 0})
    if not cat:
        raise HTTPException(404, "Category not found")
    return cat


class CategoryIn(BaseModel):
    name: str
    slug: str
    icon: Optional[str] = "Briefcase"
    description: Optional[str] = ""
    order: Optional[int] = 100
    active: Optional[bool] = True
    parent_slug: Optional[str] = None
    color: Optional[str] = "#3b82f6"
    seo_title: Optional[str] = ""
    seo_description: Optional[str] = ""


@api_router.post("/admin/categories")
async def create_category(payload: CategoryIn, user: dict = Depends(require_role("admin"))):
    _require_admin_module(user, "categories")
    doc = {"id": new_id(), **payload.dict(), "created_at": now_iso()}
    await db.categories.insert_one(doc)
    await write_audit(user, "category.create", "category", doc["id"], {}, doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/admin/categories/{cid}")
async def update_category(cid: str, payload: CategoryIn, user: dict = Depends(require_role("admin"))):
    _require_admin_module(user, "categories")
    old = await db.categories.find_one({"id": cid}, {"_id": 0})
    update = {**payload.dict(), "updated_at": now_iso()}
    await db.categories.update_one({"id": cid}, {"$set": update})
    await write_audit(user, "category.update", "category", cid, old or {}, update)
    return {"ok": True}


@api_router.delete("/admin/categories/{cid}")
async def delete_category(cid: str, user: dict = Depends(require_role("admin"))):
    _require_admin_module(user, "categories")
    old = await db.categories.find_one({"id": cid}, {"_id": 0})
    await db.categories.update_one({"id": cid}, {"$set": {"deleted_at": now_iso(), "deleted_by": user["id"], "active": False}})
    await write_audit(user, "category.delete", "category", cid, old or {}, {"deleted_at": True})
    return {"ok": True}


# ------- Sectors -------
class SectorIn(BaseModel):
    name: str
    slug: str
    description: Optional[str] = ""
    order: Optional[int] = 100
    active: Optional[bool] = True


@api_router.get("/sectors")
async def list_sectors(include_inactive: bool = False):
    query = {"deleted_at": {"$exists": False}} if include_inactive else {"active": {"$ne": False}, "deleted_at": {"$exists": False}}
    items = await db.sectors.find(query, {"_id": 0}).sort("order", 1).to_list(500)
    if items:
        return items

    names = sorted(n for n in await db.companies.distinct("industries") if isinstance(n, str) and n.strip())
    return [
        {
            "id": f"derived-{idx}",
            "name": name,
            "slug": name.lower().replace(" ", "-"),
            "description": "",
            "order": 100 + idx,
            "active": True,
        }
        for idx, name in enumerate(names)
    ]


@api_router.post("/admin/sectors")
async def create_sector(payload: SectorIn, user: dict = Depends(require_role("admin"))):
    _require_admin_module(user, "categories")
    existing = await db.sectors.find_one({"slug": payload.slug})
    if existing:
        raise HTTPException(400, "Sector slug already exists")
    doc = {"id": new_id(), **payload.dict(), "created_at": now_iso()}
    await db.sectors.insert_one(doc)
    await write_audit(user, "sector.create", "sector", doc["id"], {}, doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/admin/sectors/{sid}")
async def update_sector(sid: str, payload: SectorIn, user: dict = Depends(require_role("admin"))):
    _require_admin_module(user, "categories")
    old = await db.sectors.find_one({"id": sid}, {"_id": 0})
    update = {**payload.dict(), "updated_at": now_iso()}
    await db.sectors.update_one({"id": sid}, {"$set": update})
    await write_audit(user, "sector.update", "sector", sid, old or {}, update)
    return {"ok": True}


@api_router.delete("/admin/sectors/{sid}")
async def delete_sector(sid: str, user: dict = Depends(require_role("admin"))):
    _require_admin_module(user, "categories")
    old = await db.sectors.find_one({"id": sid}, {"_id": 0})
    await db.sectors.update_one({"id": sid}, {"$set": {"deleted_at": now_iso(), "deleted_by": user["id"], "active": False}})
    await write_audit(user, "sector.delete", "sector", sid, old or {}, {"deleted_at": True})
    return {"ok": True}


# ------- Companies -------
@api_router.get("/companies")
async def list_companies(
    q: Optional[str] = None, category: Optional[str] = None, location: Optional[str] = None,
    verified: Optional[bool] = None, min_rating: Optional[float] = None, size: Optional[str] = None,
    industry: Optional[str] = None, sector: Optional[str] = None, legal_type: Optional[str] = None,
    vat_payer: Optional[bool] = None, sort: Optional[str] = "sponsored", page: int = 1, limit: int = 12,
):
    query = {"status": "active", "deleted_at": {"$exists": False}}
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    if category:
        query["categories"] = category
    if location:
        query["location"] = location
    if verified is not None:
        query["verified"] = verified
    if min_rating:
        query["rating"] = {"$gte": min_rating}
    if size:
        query["company_size"] = size
    if industry or sector:
        query["industries"] = industry or sector
    if legal_type:
        query["legal_type"] = legal_type
    if vat_payer is not None:
        query["vat_payer"] = vat_payer

    sort_map = {
        "rating": [("rating", -1)],
        "newest": [("created_at", -1)],
        "reviews": [("review_count", -1)],
        "sponsored": [("sponsored", -1), ("featured", -1), ("rating", -1)],
    }
    sort_spec = sort_map.get(sort or "sponsored", sort_map["sponsored"])
    skip = (page - 1) * limit
    total = await db.companies.count_documents(query)
    items = await db.companies.find(query, {"_id": 0}).sort(sort_spec).skip(skip).limit(limit).to_list(limit)
    return {"items": items, "total": total, "page": page, "limit": limit}


@api_router.get("/companies/{slug}")
async def get_company(slug: str):
    company = await db.companies.find_one({"$or": [{"slug": slug}, {"id": slug}]}, {"_id": 0})
    if not company:
        raise HTTPException(404, "Company not found")
    services = await db.services.find({"company_id": company["id"]}, {"_id": 0}).to_list(100)
    portfolio = await db.portfolio.find({"company_id": company["id"]}, {"_id": 0}).to_list(100)
    reviews = await db.reviews.find({"company_id": company["id"], "status": "approved"}, {"_id": 0}).sort("created_at", -1).to_list(50)
    team = await db.team_members.find({"company_id": company["id"]}, {"_id": 0}).to_list(50)
    certs = await db.certificates.find({"company_id": company["id"]}, {"_id": 0}).to_list(50)
    return {**company, "services": services, "portfolio": portfolio, "reviews": reviews, "team": team, "certificates": certs}


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    slogan: Optional[str] = None
    short_description: Optional[str] = None
    about: Optional[str] = None
    location: Optional[str] = None
    founded_year: Optional[int] = None
    company_size: Optional[str] = None
    legal_type: Optional[str] = None
    vat_payer: Optional[bool] = None
    categories: Optional[List[str]] = None
    industries: Optional[List[str]] = None
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    address: Optional[str] = None
    maps_url: Optional[str] = None
    social: Optional[dict] = None
    languages: Optional[List[str]] = None
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None
    branches: Optional[List[dict]] = None
    service_countries: Optional[List[str]] = None
    tax_number: Optional[str] = None
    statistics: Optional[dict] = None
    sections: Optional[dict] = None
    full_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    subcategories: Optional[dict] = None  # {parent_slug: [sub_slug, ...]}


@api_router.get("/me/company")
async def get_my_company(user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]}, {"_id": 0})
    if not company:
        raise HTTPException(404, "Company not found")
    return company


@api_router.put("/me/company")
async def update_my_company(payload: CompanyUpdate, user: dict = Depends(require_role("provider"))):
    data = {k: v for k, v in payload.dict().items() if v is not None}
    # Try to extract lat/lng from maps_url if not explicitly provided
    if data.get("maps_url") and ("latitude" not in data or "longitude" not in data):
        import re
        m = re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', data["maps_url"]) or re.search(r'!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)', data["maps_url"]) or re.search(r'q=(-?\d+\.\d+),(-?\d+\.\d+)', data["maps_url"])
        if m:
            data["latitude"] = float(m.group(1))
            data["longitude"] = float(m.group(2))
    company = await db.companies.find_one({"owner_id": user["id"]})
    if not company:
        raise HTTPException(404, "Company not found")
    merged = {**company, **data}
    completion = 15
    for k, w in {"logo_url": 10, "cover_url": 5, "about": 15, "slogan": 5, "website": 5,
                 "phone": 5, "categories": 10, "industries": 5, "founded_year": 5,
                 "company_size": 5, "location": 10, "social": 5}.items():
        v = merged.get(k)
        if v and (not isinstance(v, (list, dict)) or len(v) > 0):
            completion += w
    completion = min(completion, 100)
    data["profile_completion"] = completion
    await db.companies.update_one({"owner_id": user["id"]}, {"$set": data})
    return {"ok": True, "profile_completion": completion}


# ------- Services -------
class ServiceIn(BaseModel):
    name: str
    category: str
    subcategory: Optional[str] = ""
    description: str
    price_min: float
    price_max: float
    timeline: str
    deliverables: Optional[List[str]] = []
    technologies: Optional[List[str]] = []
    industries: Optional[List[str]] = []
    status: Optional[str] = "active"


@api_router.get("/services")
async def list_services(
    q: Optional[str] = None, category: Optional[str] = None,
    min_price: Optional[float] = None, max_price: Optional[float] = None,
    sponsored: Optional[bool] = None,
    verified: Optional[bool] = None, legal_type: Optional[str] = None, vat_payer: Optional[bool] = None,
    location: Optional[str] = None, timeline: Optional[str] = None,
    sort: Optional[str] = "sponsored", page: int = 1, limit: int = 12,
):
    query = {"status": "active"}
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    if category:
        query["category"] = category
    if sponsored is not None:
        query["sponsored"] = sponsored
    if min_price is not None:
        query["price_max"] = {"$gte": min_price}
    if max_price is not None:
        query["price_min"] = {"$lte": max_price}
    if timeline:
        query["timeline"] = {"$regex": timeline, "$options": "i"}
    company_query = {"status": "active"}
    if verified is not None:
        company_query["verified"] = verified
    if legal_type:
        company_query["legal_type"] = legal_type
    if vat_payer is not None:
        company_query["vat_payer"] = vat_payer
    if location:
        company_query["location"] = location
    if len(company_query) > 1:
        company_ids = [c["id"] for c in await db.companies.find(company_query, {"_id": 0, "id": 1}).to_list(1000)]
        if not company_ids:
            return {"items": [], "total": 0, "page": page, "limit": limit}
        query["company_id"] = {"$in": company_ids}
    sort_map = {
        "rating": [("company_rating", -1)],
        "newest": [("created_at", -1)],
        "sponsored": [("sponsored", -1), ("featured", -1)],
    }
    sort_spec = sort_map.get(sort or "sponsored", sort_map["sponsored"])
    skip = (page - 1) * limit
    total = await db.services.count_documents(query)
    items = await db.services.find(query, {"_id": 0}).sort(sort_spec).skip(skip).limit(limit).to_list(limit)
    company_ids = list({item.get("company_id") for item in items if item.get("company_id")})
    companies = await db.companies.find({"id": {"$in": company_ids}}, {"_id": 0, "id": 1, "slug": 1, "legal_type": 1, "vat_payer": 1, "location": 1}).to_list(1000) if company_ids else []
    company_map = {c["id"]: c for c in companies}
    portfolio_counts = {
        cid: await db.portfolio.count_documents({"company_id": cid, "visibility": {"$ne": "private"}})
        for cid in company_ids
    }
    for item in items:
        company = company_map.get(item.get("company_id"), {})
        item["company_slug"] = company.get("slug", item.get("company_slug", ""))
        item["company_legal_type"] = company.get("legal_type", item.get("company_legal_type"))
        item["company_vat_payer"] = company.get("vat_payer", item.get("company_vat_payer", False))
        item["company_location"] = company.get("location", item.get("company_location", ""))
        item["company_portfolio_count"] = portfolio_counts.get(item.get("company_id"), 0)
    return {"items": items, "total": total, "page": page, "limit": limit}


@api_router.get("/services/{sid}")
async def get_service(sid: str):
    s = await db.services.find_one({"id": sid}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Service not found")
    company = await db.companies.find_one({"id": s["company_id"]}, {"_id": 0})
    return {**s, "company": company}


@api_router.get("/me/services")
async def my_services(user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    if not company:
        return []
    return await db.services.find({"company_id": company["id"]}, {"_id": 0}).to_list(200)


@api_router.post("/me/services")
async def create_service(payload: ServiceIn, user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    if not company:
        raise HTTPException(404, "Company not found")
    current = await db.services.count_documents({"company_id": company["id"]})
    await _check_plan_limit(company, "services", current)
    doc = {
        "id": new_id(), "company_id": company["id"], "company_name": company["name"],
        "company_logo": company.get("logo_url", ""), "company_rating": company.get("rating", 0),
        "company_verified": company.get("verified", False), "sponsored": False, "featured": False,
        "company_slug": company.get("slug", ""), "company_legal_type": company.get("legal_type"),
        "company_vat_payer": company.get("vat_payer", False), "company_location": company.get("location", ""),
        "views": 0, "clicks": 0, "created_at": now_iso(), **payload.dict(),
    }
    await db.services.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/me/services/{sid}")
async def update_service(sid: str, payload: ServiceIn, user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    await db.services.update_one({"id": sid, "company_id": company["id"]}, {"$set": payload.dict()})
    return {"ok": True}


@api_router.delete("/me/services/{sid}")
async def delete_service(sid: str, user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    await db.services.delete_one({"id": sid, "company_id": company["id"]})
    return {"ok": True}


# ------- Portfolio -------
class PortfolioIn(BaseModel):
    title: str
    client_name: str
    industry: Optional[str] = ""
    service_type: Optional[str] = ""
    project_duration: Optional[str] = ""
    description: Optional[str] = ""
    problem: Optional[str] = ""
    solution: Optional[str] = ""
    result: Optional[str] = ""
    metrics: Optional[str] = ""
    image_url: Optional[str] = ""
    gallery: Optional[List[str]] = []
    video_url: Optional[str] = ""
    website_url: Optional[str] = ""
    link: Optional[str] = ""
    visibility: Optional[str] = "public"


@api_router.get("/portfolio")
async def list_public_portfolio(
    q: Optional[str] = None, category: Optional[str] = None, industry: Optional[str] = None,
    company_id: Optional[str] = None, sort: Optional[str] = "newest", page: int = 1, limit: int = 12,
):
    query = {
        "visibility": {"$ne": "private"},
        "deleted_at": {"$exists": False},
        "$or": [{"status": {"$exists": False}}, {"status": {"$in": ["active", "approved", "published"]}}],
    }
    if q:
        status_or = query.pop("$or")
        query["$and"] = [
            {"$or": status_or},
            {"$or": [
                {"title": {"$regex": q, "$options": "i"}},
                {"client_name": {"$regex": q, "$options": "i"}},
                {"description": {"$regex": q, "$options": "i"}},
            ]},
        ]
    if category:
        query["service_type"] = {"$regex": category, "$options": "i"}
    if industry:
        query["industry"] = industry
    if company_id:
        query["company_id"] = company_id
    sort_map = {
        "newest": [("created_at", -1)],
        "oldest": [("created_at", 1)],
        "title": [("title", 1)],
    }
    sort_spec = sort_map.get(sort or "newest", sort_map["newest"])
    skip = (page - 1) * limit
    total = await db.portfolio.count_documents(query)
    items = await db.portfolio.find(query, {"_id": 0}).sort(sort_spec).skip(skip).limit(limit).to_list(limit)
    company_ids = list({i["company_id"] for i in items})
    companies = await db.companies.find({"id": {"$in": company_ids}}, {"_id": 0, "id": 1, "name": 1, "slug": 1, "logo_url": 1, "verified": 1}).to_list(100)
    by_id = {c["id"]: c for c in companies}
    return {"items": [{**i, "company": by_id.get(i["company_id"])} for i in items], "total": total, "page": page, "limit": limit}


@api_router.get("/portfolio/{pid}")
async def get_public_portfolio(pid: str):
    item = await db.portfolio.find_one({
        "id": pid,
        "visibility": {"$ne": "private"},
        "deleted_at": {"$exists": False},
        "$or": [{"status": {"$exists": False}}, {"status": {"$in": ["active", "approved", "published"]}}],
    }, {"_id": 0})
    if not item:
        raise HTTPException(404, "Portfolio not found")
    company = await db.companies.find_one({"id": item["company_id"]}, {"_id": 0})
    return {**item, "company": company}


@api_router.get("/me/portfolio")
async def my_portfolio(user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    if not company:
        return []
    return await db.portfolio.find({"company_id": company["id"]}, {"_id": 0}).to_list(200)


@api_router.post("/me/portfolio")
async def create_portfolio(payload: PortfolioIn, user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    current = await db.portfolio.count_documents({"company_id": company["id"]})
    await _check_plan_limit(company, "portfolio", current)
    doc = {"id": new_id(), "company_id": company["id"], "created_at": now_iso(), **payload.dict()}
    await db.portfolio.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.delete("/me/portfolio/{pid}")
async def delete_portfolio(pid: str, user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    await db.portfolio.delete_one({"id": pid, "company_id": company["id"]})
    return {"ok": True}


@api_router.get("/me/plan-status")
async def my_plan_status(user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    if not company:
        raise HTTPException(404, "Company not found")
    plan = await db.plans.find_one({"slug": company.get("plan", "free")}, {"_id": 0})
    if not plan:
        plan = {"slug": "free", "limits": {}, "features": []}
    limits = plan.get("limits", {}) or {}
    services = await db.services.count_documents({"company_id": company["id"]})
    portfolio = await db.portfolio.count_documents({"company_id": company["id"]})
    case_studies = await db.case_studies.count_documents({"company_id": company["id"]})
    team = await db.team_members.count_documents({"company_id": company["id"]})
    certs = await db.certificates.count_documents({"company_id": company["id"]})
    awards = await db.awards.count_documents({"company_id": company["id"]})
    return {
        "plan": plan,
        "usage": {
            "services": services,
            "portfolio": portfolio,
            "case_studies": case_studies,
            "team": team,
            "certifications": certs,
            "awards": awards,
        },
    }


def _limit_or_unlimited(plan: dict, key: str) -> Optional[int]:
    """Return None if unlimited, else the int limit."""
    limits = (plan or {}).get("limits", {}) or {}
    v = limits.get(key)
    if v is None or v == -1:
        return None
    return int(v)


async def _check_plan_limit(company: dict, key: str, current_count: int):
    # Per-company custom override beats plan
    custom = (company or {}).get("custom_limits") or {}
    if key in custom:
        limit = custom[key]
        if limit is None or limit == -1:
            return
        if current_count >= int(limit):
            raise HTTPException(402, f"Plan limit reached: {key} ({limit}). Planı yüksəldin.")
        return
    plan = await db.plans.find_one({"slug": company.get("plan", "free")})
    limit = _limit_or_unlimited(plan, key)
    if limit is not None and current_count >= limit:
        raise HTTPException(402, f"Plan limit reached: {key} ({limit}). Planı yüksəldin.")



@api_router.get("/me/portfolio/{pid}")
async def get_my_portfolio_item(pid: str, user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    item = await db.portfolio.find_one({"id": pid, "company_id": company["id"]}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Portfolio not found")
    return item


@api_router.put("/me/portfolio/{pid}")
async def update_portfolio(pid: str, payload: PortfolioIn, user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    await db.portfolio.update_one({"id": pid, "company_id": company["id"]}, {"$set": payload.dict()})
    return {"ok": True}


@api_router.get("/me/services/{sid}")
async def get_my_service(sid: str, user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    s = await db.services.find_one({"id": sid, "company_id": company["id"]}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Service not found")
    return s


# ------- Case Studies -------
class CaseStudyIn(BaseModel):
    title: str
    client_name: str
    industry: Optional[str] = ""
    challenge: str
    solution: str
    results: str
    metrics: Optional[str] = ""
    before_after: Optional[str] = ""
    cover_url: Optional[str] = ""
    images: Optional[List[str]] = []
    attachments: Optional[List[str]] = []
    visibility: Optional[str] = "public"


@api_router.get("/me/case-studies")
async def my_case_studies(user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    if not company:
        return []
    return await db.case_studies.find({"company_id": company["id"]}, {"_id": 0}).to_list(200)


@api_router.get("/me/case-studies/{cid}")
async def get_case_study(cid: str, user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    item = await db.case_studies.find_one({"id": cid, "company_id": company["id"]}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Case study not found")
    return item


@api_router.post("/me/case-studies")
async def create_case_study(payload: CaseStudyIn, user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    doc = {"id": new_id(), "company_id": company["id"], "created_at": now_iso(), **payload.dict()}
    await db.case_studies.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/me/case-studies/{cid}")
async def update_case_study(cid: str, payload: CaseStudyIn, user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    await db.case_studies.update_one({"id": cid, "company_id": company["id"]}, {"$set": payload.dict()})
    return {"ok": True}


@api_router.delete("/me/case-studies/{cid}")
async def delete_case_study(cid: str, user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    await db.case_studies.delete_one({"id": cid, "company_id": company["id"]})
    return {"ok": True}


# ------- Team -------
class TeamMemberIn(BaseModel):
    name: str
    role: str
    bio: Optional[str] = ""
    photo_url: Optional[str] = ""
    linkedin: Optional[str] = ""
    email: Optional[str] = ""
    sort_order: Optional[int] = 0


@api_router.get("/me/team")
async def my_team(user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    if not company:
        return []
    return await db.team_members.find({"company_id": company["id"]}, {"_id": 0}).sort("sort_order", 1).to_list(200)


@api_router.get("/me/team/{tid}")
async def get_team_member(tid: str, user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    item = await db.team_members.find_one({"id": tid, "company_id": company["id"]}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Team member not found")
    return item


@api_router.post("/me/team")
async def create_team_member(payload: TeamMemberIn, user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    doc = {"id": new_id(), "company_id": company["id"], "created_at": now_iso(), **payload.dict()}
    await db.team_members.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/me/team/{tid}")
async def update_team_member(tid: str, payload: TeamMemberIn, user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    await db.team_members.update_one({"id": tid, "company_id": company["id"]}, {"$set": payload.dict()})
    return {"ok": True}


@api_router.delete("/me/team/{tid}")
async def delete_team_member(tid: str, user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    await db.team_members.delete_one({"id": tid, "company_id": company["id"]})
    return {"ok": True}


# ------- Certificates -------
class CertificateIn(BaseModel):
    name: str
    issuer: str
    issue_date: Optional[str] = ""
    expiry_date: Optional[str] = ""
    image_url: Optional[str] = ""


@api_router.get("/me/certificates")
async def my_certificates(user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    if not company:
        return []
    return await db.certificates.find({"company_id": company["id"]}, {"_id": 0}).to_list(200)


@api_router.post("/me/certificates")
async def create_certificate(payload: CertificateIn, user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    doc = {"id": new_id(), "company_id": company["id"], "status": "active", **payload.dict()}
    await db.certificates.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.delete("/me/certificates/{cid}")
async def delete_certificate(cid: str, user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    await db.certificates.delete_one({"id": cid, "company_id": company["id"]})
    return {"ok": True}


# ------- Awards -------
class AwardIn(BaseModel):
    name: str
    organization: str
    year: int
    description: Optional[str] = ""


@api_router.get("/me/awards")
async def my_awards(user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    if not company:
        return []
    return await db.awards.find({"company_id": company["id"]}, {"_id": 0}).sort("year", -1).to_list(200)


@api_router.post("/me/awards")
async def create_award(payload: AwardIn, user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    doc = {"id": new_id(), "company_id": company["id"], **payload.dict()}
    await db.awards.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.delete("/me/awards/{aid}")
async def delete_award(aid: str, user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    await db.awards.delete_one({"id": aid, "company_id": company["id"]})
    return {"ok": True}


# ------- Provider Reviews -------
@api_router.get("/me/reviews")
async def my_reviews(user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    if not company:
        return []
    return await db.reviews.find({"company_id": company["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)




# ------- Briefs / RFQs -------
class BriefIn(BaseModel):
    title: str
    category: str
    subcategory: Optional[str] = ""
    sector: Optional[str] = ""
    budget_min: float
    budget_max: float
    deadline: Optional[str] = ""
    no_deadline: Optional[bool] = False
    short_description: Optional[str] = ""
    description: str
    project_background: Optional[str] = ""
    problem_description: Optional[str] = ""
    expected_result: Optional[str] = ""
    special_requirements: Optional[str] = ""
    deadline_note: Optional[str] = ""
    additional_note: Optional[str] = ""
    visibility: Optional[str] = "open"
    invited_companies: Optional[List[str]] = []


@api_router.post("/briefs")
async def create_brief(payload: BriefIn, user: dict = Depends(require_role("buyer"))):
    doc = {
        "id": new_id(), "buyer_id": user["id"], "buyer_name": user["name"],
        "status": "open", "proposals_count": 0, "created_at": now_iso(),
        **payload.dict(),
    }
    await db.briefs.insert_one(doc)
    doc.pop("_id", None)
    if payload.invited_companies:
        for cid in payload.invited_companies:
            await invite_company_to_brief(doc, cid, user)
    return doc


@api_router.get("/me/briefs")
async def my_briefs(user: dict = Depends(require_role("buyer"))):
    return await db.briefs.find({"buyer_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api_router.put("/briefs/{bid}")
async def update_brief(bid: str, payload: BriefIn, user: dict = Depends(require_role("buyer"))):
    brief = await db.briefs.find_one({"id": bid}, {"_id": 0})
    if not brief:
        raise HTTPException(404, "Brief not found")
    if brief.get("buyer_id") != user["id"]:
        raise HTTPException(403, "Forbidden")

    proposal_count = await db.proposals.count_documents({"brief_id": bid})
    if proposal_count > 0:
        raise HTTPException(409, "Provider cavabı gəldiyi üçün brief redaktə edilə bilməz")

    edited_at = now_iso()
    update_doc = payload.dict()
    update_doc.pop("invited_companies", None)
    update_doc.update({
        "updated_at": edited_at,
        "edited_at": edited_at,
        "edited_by": user["id"],
        "edit_count": int(brief.get("edit_count", 0) or 0) + 1,
        "proposals_count": proposal_count,
    })
    await db.briefs.update_one({"id": bid}, {"$set": update_doc})
    await db.leads.update_many(
        {"brief_id": bid},
        {"$set": {"brief_edited": True, "brief_edited_at": edited_at}},
    )
    updated = await db.briefs.find_one({"id": bid}, {"_id": 0})
    return updated


class BriefInviteIn(BaseModel):
    company_id: str
    service_id: Optional[str] = ""
    portfolio_id: Optional[str] = ""
    force: Optional[bool] = False


@api_router.post("/briefs/{bid}/invite")
async def invite_brief_company(bid: str, payload: BriefInviteIn, user: dict = Depends(require_role("buyer"))):
    brief = await db.briefs.find_one({"id": bid}, {"_id": 0})
    if not brief:
        raise HTTPException(404, "Brief not found")
    if brief.get("buyer_id") != user["id"]:
        raise HTTPException(403, "Forbidden")
    return await invite_company_to_brief(
        brief,
        payload.company_id,
        user,
        service_id=payload.service_id or "",
        portfolio_id=payload.portfolio_id or "",
        force=bool(payload.force),
    )


@api_router.get("/briefs/{bid}")
async def get_brief(bid: str, user: dict = Depends(get_current_user)):
    brief = await db.briefs.find_one({"id": bid}, {"_id": 0})
    if not brief:
        raise HTTPException(404, "Brief not found")
    proposals = await db.proposals.find({"brief_id": bid}, {"_id": 0}).to_list(100)
    attachments = []
    try:
        await _require_brief_attachment_access(bid, user)
        attachment_docs = await db.brief_attachments.find({"brief_id": bid}, {"_id": 0}).sort("created_at", -1).to_list(20)
        attachments = [_public_attachment_meta(item) for item in attachment_docs]
    except HTTPException:
        attachments = []
    return {**brief, "proposals": proposals, "attachments": attachments}


async def _require_brief_attachment_access(bid: str, user: dict, upload: bool = False):
    brief = await db.briefs.find_one({"id": bid}, {"_id": 0})
    if not brief:
        raise HTTPException(404, "Brief not found")
    if user.get("role") == "buyer" and brief.get("buyer_id") == user.get("id"):
        return brief
    if upload:
        raise HTTPException(403, "Forbidden")
    if user.get("role") == "provider":
        company = await db.companies.find_one({"owner_id": user["id"]}, {"_id": 0})
        if company:
            lead = await db.leads.find_one({"brief_id": bid, "company_id": company["id"]}, {"_id": 0})
            if lead:
                return brief
    raise HTTPException(403, "Forbidden")


@api_router.post("/briefs/{bid}/attachments")
async def upload_brief_attachments(
    bid: str,
    files: List[UploadFile] = File(...),
    user: dict = Depends(require_role("buyer")),
):
    await _require_brief_attachment_access(bid, user, upload=True)
    existing = await db.brief_attachments.find({"brief_id": bid}, {"_id": 0}).to_list(20)
    if len(existing) + len(files) > MAX_BRIEF_FILES:
        raise HTTPException(400, "Maksimum 5 fayl əlavə edə bilərsiniz.")

    existing_total = sum(int(item.get("size", 0)) for item in existing)
    new_items = []
    for upload in files:
        name = Path(upload.filename or "attachment").name
        ext = _brief_attachment_ext(name)
        if ext not in ALLOWED_BRIEF_ATTACHMENT_EXTS:
            raise HTTPException(400, "Bu fayl formatı dəstəklənmir.")
        content = await upload.read()
        size = len(content)
        if size > MAX_BRIEF_FILE_SIZE:
            raise HTTPException(400, "Bir fayl maksimum 10 MB ola bilər.")
        existing_total += size
        if existing_total > MAX_BRIEF_TOTAL_SIZE:
            raise HTTPException(400, "Ümumi fayl həcmi maksimum 25 MB ola bilər.")

        file_id = new_id()
        target_dir = UPLOAD_DIR / bid
        target_dir.mkdir(parents=True, exist_ok=True)
        stored_name = f"{file_id}{ext}"
        path = target_dir / stored_name
        path.write_bytes(content)
        doc = {
            "id": file_id,
            "brief_id": bid,
            "buyer_id": user["id"],
            "name": name,
            "stored_name": stored_name,
            "path": str(path),
            "size": size,
            "content_type": upload.content_type or "application/octet-stream",
            "created_at": now_iso(),
        }
        await db.brief_attachments.insert_one(doc)
        doc.pop("_id", None)
        new_items.append(_public_attachment_meta(doc))
    return {"items": new_items}


@api_router.get("/briefs/{bid}/attachments")
async def list_brief_attachments(bid: str, user: dict = Depends(get_current_user)):
    await _require_brief_attachment_access(bid, user)
    items = await db.brief_attachments.find({"brief_id": bid}, {"_id": 0}).sort("created_at", -1).to_list(20)
    return {"items": [_public_attachment_meta(item) for item in items]}


@api_router.get("/briefs/{bid}/attachments/{file_id}/download")
async def download_brief_attachment(bid: str, file_id: str, user: dict = Depends(get_current_user)):
    await _require_brief_attachment_access(bid, user)
    doc = await db.brief_attachments.find_one({"brief_id": bid, "id": file_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "File not found")
    path = Path(doc["path"])
    if not path.exists():
        raise HTTPException(404, "File not found")
    return FileResponse(path, media_type=doc.get("content_type") or "application/octet-stream", filename=doc["name"])


# ------- Proposals -------
class ProposalIn(BaseModel):
    brief_id: str
    title: str
    text: str
    price: float
    timeline: str
    stages: Optional[List[str]] = []
    notes: Optional[str] = ""


@api_router.post("/proposals")
async def create_proposal(payload: ProposalIn, user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    if not company:
        raise HTTPException(404, "Company not found")
    brief = await db.briefs.find_one({"id": payload.brief_id}, {"_id": 0, "title": 1, "buyer_id": 1})
    if not brief:
        raise HTTPException(404, "Brief not found")
    existing = await db.proposals.find_one({"brief_id": payload.brief_id, "company_id": company["id"]})
    if existing:
        raise HTTPException(400, "Bu brief üçün artıq təklif göndərmisiniz")
    doc = {
        "id": new_id(), "company_id": company["id"], "company_name": company["name"],
        "company_logo": company.get("logo_url", ""), "company_rating": company.get("rating", 0),
        "brief_title": brief.get("title", ""), "buyer_id": brief.get("buyer_id", ""),
        "status": "pending", "created_at": now_iso(), **payload.dict(),
    }
    await db.proposals.insert_one(doc)
    await db.briefs.update_one({"id": payload.brief_id}, {"$inc": {"proposals_count": 1}})
    # Notify buyer
    if brief.get("buyer_id"):
        await create_notification(
            brief["buyer_id"], "new_proposal", "Yeni təklif gəldi",
            f"{company['name']} \"{brief.get('title', 'Brief')}\" üçün təklif göndərdi.",
            entity_id=payload.brief_id, href="/buyer/proposals",
        )
    doc.pop("_id", None)
    return doc


@api_router.get("/me/proposals/received")
async def proposals_received(user: dict = Depends(require_role("buyer"))):
    briefs = await db.briefs.find({"buyer_id": user["id"]}).to_list(500)
    brief_ids = [b["id"] for b in briefs]
    return await db.proposals.find({"brief_id": {"$in": brief_ids}}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api_router.get("/me/proposals/sent")
async def proposals_sent(user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    if not company:
        return []
    return await db.proposals.find({"company_id": company["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api_router.put("/proposals/{pid}/status")
async def update_proposal_status(pid: str, body: dict, user: dict = Depends(get_current_user)):
    status = body.get("status")
    if status not in ("accepted", "rejected", "viewed"):
        raise HTTPException(400, "Invalid status")
    proposal = await db.proposals.find_one({"id": pid}, {"_id": 0})
    if not proposal:
        raise HTTPException(404, "Proposal not found")
    await db.proposals.update_one({"id": pid}, {"$set": {"status": status}})
    # Notify provider when buyer accepts/rejects
    if status in ("accepted", "rejected") and proposal.get("company_id"):
        company = await db.companies.find_one({"id": proposal["company_id"]}, {"_id": 0, "owner_id": 1})
        if company and company.get("owner_id"):
            label = "qəbul edildi" if status == "accepted" else "rədd edildi"
            brief_title = proposal.get("brief_title", "Brief")
            await create_notification(
                company["owner_id"], f"proposal_{status}",
                f"Təklifiniz {label}",
                f"\"{brief_title}\" üçün göndərdiyiniz təklif {label}.",
                entity_id=pid, href="/provider/proposals",
            )
    return {"ok": True}


# ------- Leads -------
@api_router.get("/me/leads")
async def my_leads(user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    if not company:
        return []
    leads = await db.leads.find({"company_id": company["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    out = []
    for l in leads:
        brief = await db.briefs.find_one({"id": l["brief_id"]}, {"_id": 0})
        if brief:
            attachment_docs = await db.brief_attachments.find({"brief_id": l["brief_id"]}, {"_id": 0}).sort("created_at", -1).to_list(20)
            brief["attachments"] = [_public_attachment_meta(item) for item in attachment_docs]
        out.append({**l, "brief": brief})
    return out


# ------- Shortlist -------
@api_router.post("/me/shortlist/{cid}")
async def add_shortlist(cid: str, user: dict = Depends(require_role("buyer"))):
    await db.shortlists.update_one(
        {"user_id": user["id"], "company_id": cid},
        {"$set": {"user_id": user["id"], "company_id": cid, "created_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True}


@api_router.delete("/me/shortlist/{cid}")
async def remove_shortlist(cid: str, user: dict = Depends(require_role("buyer"))):
    await db.shortlists.delete_one({"user_id": user["id"], "company_id": cid})
    return {"ok": True}


@api_router.get("/me/shortlist")
async def get_shortlist(user: dict = Depends(require_role("buyer"))):
    items = await db.shortlists.find({"user_id": user["id"]}).to_list(200)
    cids = [i["company_id"] for i in items]
    return await db.companies.find({"id": {"$in": cids}}, {"_id": 0}).to_list(200)


# ------- Compare snapshots -------
class CompareSnapshotIn(BaseModel):
    title: str
    company_ids: Optional[List[str]] = []
    companies: Optional[List[dict]] = []
    item_type: Optional[str] = "company"
    item_ids: Optional[List[str]] = []
    items: Optional[List[dict]] = []


@api_router.get("/me/compare-snapshots")
async def my_compare_snapshots(user: dict = Depends(require_role("buyer"))):
    return await db.compare_snapshots.find({"user_id": user["id"], "deleted_at": {"$exists": False}}, {"_id": 0}).sort("created_at", -1).to_list(50)


@api_router.post("/me/compare-snapshots")
async def create_compare_snapshot(payload: CompareSnapshotIn, user: dict = Depends(require_role("buyer"))):
    data = payload.dict()
    data["item_type"] = data.get("item_type") or "company"
    if data["item_type"] == "company":
        data["item_ids"] = data.get("item_ids") or data.get("company_ids") or []
        data["items"] = data.get("items") or data.get("companies") or []
    elif data["item_type"] not in ("service", "portfolio"):
        raise HTTPException(400, "Invalid compare type")
    if not data.get("item_ids"):
        raise HTTPException(400, "Compare items required")
    doc = {"id": new_id(), "user_id": user["id"], "created_at": now_iso(), **data}
    await db.compare_snapshots.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.delete("/me/compare-snapshots/{sid}")
async def delete_compare_snapshot(sid: str, user: dict = Depends(require_role("buyer"))):
    await db.compare_snapshots.update_one({"id": sid, "user_id": user["id"]}, {"$set": {"deleted_at": now_iso()}})
    return {"ok": True}


# ------- Notifications -------
@api_router.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user), limit: int = 20):
    items = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    unread = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"items": items, "unread_count": unread}


@api_router.put("/notifications/{nid}/read")
async def mark_notification_read(nid: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True, "read_at": now_iso()}})
    return {"ok": True}


@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True, "read_at": now_iso()}})
    return {"ok": True}


# ------- Reviews -------
class ReviewIn(BaseModel):
    company_id: str
    rating: float
    title: str
    text: str
    quality: Optional[float] = 5
    communication: Optional[float] = 5
    deadline: Optional[float] = 5
    result: Optional[float] = 5


@api_router.post("/reviews")
async def create_review(payload: ReviewIn, user: dict = Depends(require_role("buyer"))):
    doc = {
        "id": new_id(), "user_id": user["id"], "user_name": user["name"],
        "status": "pending", "created_at": now_iso(), **payload.dict(),
    }
    await db.reviews.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ------- Messages -------
@api_router.get("/me/messages")
async def my_messages(user: dict = Depends(get_current_user)):
    return await db.message_threads.find({"participants": user["id"]}, {"_id": 0}).sort("updated_at", -1).to_list(200)


@api_router.get("/messages/{tid}")
async def get_thread(tid: str, user: dict = Depends(get_current_user)):
    thread = await db.message_threads.find_one({"id": tid}, {"_id": 0})
    if not thread or user["id"] not in thread.get("participants", []):
        raise HTTPException(404, "Thread not found")
    msgs = await db.messages.find({"thread_id": tid}, {"_id": 0}).sort("created_at", 1).to_list(500)
    shared_media = []
    seen_media = set()
    for msg in msgs:
        for item in msg.get("attachments", []) or []:
            media_id = item.get("id")
            if media_id and media_id not in seen_media:
                seen_media.add(media_id)
                shared_media.append(item)
    return {**thread, "messages": msgs, "shared_media": shared_media}


class MessageIn(BaseModel):
    thread_id: Optional[str] = None
    recipient_id: Optional[str] = None
    text: Optional[str] = ""
    attachments: Optional[List[dict]] = []


@api_router.post("/messages")
async def send_message(payload: MessageIn, user: dict = Depends(get_current_user)):
    tid = payload.thread_id
    text = (payload.text or "").strip()
    attachments = payload.attachments or []
    if not text and not attachments:
        raise HTTPException(400, "Mesaj və ya fayl tələb olunur")
    if not tid and payload.recipient_id:
        existing = await db.message_threads.find_one({"participants": {"$all": [user["id"], payload.recipient_id]}})
        if existing:
            tid = existing["id"]
        else:
            tid = new_id()
            await db.message_threads.insert_one({
                "id": tid, "participants": [user["id"], payload.recipient_id],
                "last_message": text[:100] if text else f"{len(attachments)} fayl göndərildi", "updated_at": now_iso(), "created_at": now_iso(),
            })
    thread = await db.message_threads.find_one({"id": tid}, {"_id": 0}) if tid else None
    if not thread or user["id"] not in thread.get("participants", []):
        raise HTTPException(404, "Thread not found")
    delivered_at = now_iso()
    last_message = text[:100] if text else f"{len(attachments)} fayl göndərildi"
    msg = {
        "id": new_id(), "thread_id": tid, "sender_id": user["id"],
        "sender_name": user["name"], "text": text, "attachments": attachments,
        "status": "sent", "delivered_at": delivered_at, "created_at": delivered_at,
    }
    await db.messages.insert_one(msg)
    await db.message_threads.update_one({"id": tid}, {"$set": {"last_message": last_message, "updated_at": delivered_at}})
    # Notify other participants
    for recipient_id in thread.get("participants", []):
        if recipient_id != user["id"]:
            await create_notification(
                recipient_id, "new_message", "Yeni mesaj",
                f"{user['name']}: {last_message}",
                entity_id=tid, href="/buyer/messages" if user.get("role") == "provider" else "/provider/messages",
            )
    msg.pop("_id", None)
    return msg


# ------- Plans / Ads / Blog -------
@api_router.get("/plans")
async def list_plans():
    return await db.plans.find({}, {"_id": 0}).sort("order", 1).to_list(50)


@api_router.get("/ads")
async def list_ads(placement: Optional[str] = None):
    q = {"status": "active", "deleted_at": {"$exists": False}}
    if placement:
        q["placement"] = placement
    return await db.ads.find(q, {"_id": 0}).sort("priority", -1).to_list(50)


@api_router.post("/me/subscription-requests")
async def request_subscription_change(body: dict, user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]}, {"_id": 0})
    if not company:
        raise HTTPException(404, "Company not found")
    plan = body.get("plan")
    if not plan:
        raise HTTPException(400, "plan is required")
    doc = {
        "id": new_id(),
        "company_id": company["id"],
        "company_name": company.get("name", ""),
        "current_plan": company.get("plan", "free"),
        "plan": plan,
        "amount": body.get("amount", 0),
        "currency": "AZN",
        "status": "requested",
        "source": "provider_dashboard",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.subscriptions.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/me/billing")
async def my_billing(user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]}, {"_id": 0})
    if not company:
        raise HTTPException(404, "Company not found")
    q = {"company_id": company["id"], "deleted_at": {"$exists": False}}
    return {
        "subscriptions": await db.subscriptions.find(q, {"_id": 0}).sort("created_at", -1).to_list(100),
        "payments": await db.payments.find(q, {"_id": 0}).sort("created_at", -1).to_list(100),
        "invoices": await db.invoices.find(q, {"_id": 0}).sort("created_at", -1).to_list(100),
    }


@api_router.post("/me/advertising-requests")
async def request_advertising(body: dict, user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]}, {"_id": 0})
    if not company:
        raise HTTPException(404, "Company not found")
    placement = body.get("placement") or body.get("title") or "Provider placement"
    doc = {
        "id": new_id(),
        "title": f"{company.get('name', 'Provider')} - {placement}",
        "company_id": company["id"],
        "company_name": company.get("name", ""),
        "placement": placement,
        "price": body.get("price", 0),
        "description": body.get("description", ""),
        "status": "pending",
        "priority": 1,
        "impressions": 0,
        "clicks": 0,
        "source": "provider_dashboard",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.ads.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/blog")
async def list_blog(limit: int = 20):
    return await db.blog_posts.find({"status": "published"}, {"_id": 0}).sort("created_at", -1).to_list(limit)


@api_router.get("/blog/{slug}")
async def get_post(slug: str):
    post = await db.blog_posts.find_one({"slug": slug}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Post not found")
    return post


# ------- Public read-only listings for company sub-resources -------
@api_router.get("/public/companies/{cid}/case-studies")
async def public_case_studies(cid: str):
    return await db.case_studies.find({"company_id": cid, "visibility": {"$ne": "private"}}, {"_id": 0}).sort("created_at", -1).to_list(100)


@api_router.get("/public/companies/{cid}/awards")
async def public_awards(cid: str):
    return await db.awards.find({"company_id": cid}, {"_id": 0}).sort("year", -1).to_list(100)


# ------- Admin -------
@api_router.get("/admin/me/permissions")
async def admin_permissions(user: dict = Depends(require_role("admin"))):
    role = _admin_role(user)
    modules = _admin_allowed_modules(user)
    return {
        "role": role,
        "can_manage_all": "*" in ADMIN_ROLE_PERMISSIONS.get(role, []),
        "modules": {module: ADMIN_MODULES.get(module, module) for module in modules},
        "permissions": ADMIN_ROLE_PERMISSIONS.get(role, []),
    }


@api_router.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_role("admin"))):
    from datetime import datetime as _dt
    paid_items = await db.payments.find({"status": {"$in": ["paid", "succeeded"]}}, {"_id": 0, "amount": 1, "created_at": 1}).to_list(5000)

    # Build last-6-months revenue chart
    now_dt = _dt.now()
    month_labels = ["Yan", "Fev", "Mar", "Apr", "May", "İyn", "İyl", "Avq", "Sen", "Okt", "Noy", "Dek"]
    monthly: dict = {}
    for i in range(5, -1, -1):
        mo = (now_dt.month - 1 - i) % 12 + 1
        yr = now_dt.year - ((now_dt.month - 1 - i) // 12 + (1 if (now_dt.month - 1 - i) < 0 else 0))
        key = f"{yr}-{mo:02d}"
        monthly[key] = {"m": month_labels[mo - 1], "revenue": 0}
    for item in paid_items:
        created = item.get("created_at", "")
        if created and len(created) >= 7:
            key = created[:7]
            if key in monthly:
                monthly[key]["revenue"] += float(item.get("amount", 0) or 0)
    revenue_chart = list(monthly.values())

    return {
        "providers": await db.companies.count_documents({}),
        "active_providers": await db.companies.count_documents({"status": "active"}),
        "buyers": await db.users.count_documents({"role": "buyer"}),
        "pending_verifications": await db.verification_requests.count_documents({"status": "pending"}),
        "pending_companies": await db.companies.count_documents({"status": "pending"}),
        "services": await db.services.count_documents({"deleted_at": {"$exists": False}}),
        "portfolio": await db.portfolio.count_documents({"deleted_at": {"$exists": False}}),
        "leads": await db.leads.count_documents({}),
        "briefs": await db.briefs.count_documents({}),
        "proposals": await db.proposals.count_documents({}),
        "ads_active": await db.ads.count_documents({"status": "active"}),
        "subscriptions": await db.subscriptions.count_documents({"deleted_at": {"$exists": False}}),
        "payments": await db.payments.count_documents({"deleted_at": {"$exists": False}}),
        "invoices": await db.invoices.count_documents({"deleted_at": {"$exists": False}}),
        "reports": await db.reports.count_documents({"status": {"$in": ["new", "pending", "open"]}}),
        "media_assets": await db.media_assets.count_documents({"deleted_at": {"$exists": False}}),
        "revenue_month": sum(float(item.get("amount", 0) or 0) for item in paid_items),
        "revenue_chart": revenue_chart,
    }


@api_router.get("/admin/companies")
async def admin_companies(
    status: Optional[str] = None,
    q: Optional[str] = None,
    page: int = 1,
    limit: int = 25,
    sort: Optional[str] = None,
    user: dict = Depends(require_role("admin")),
):
    _require_admin_module(user, "companies")
    return await admin_list_response(
        "companies",
        page=page,
        limit=limit,
        q=q,
        status=status,
        sort=sort,
        search_fields=["name", "email", "sector", "location", "plan", "status"],
    )


@api_router.put("/admin/companies/{cid}/status")
async def update_company_status(cid: str, body: dict, user: dict = Depends(require_role("admin"))):
    if body.get("status") not in COMPANY_STATUSES:
        raise HTTPException(400, "Invalid status")
    _require_admin_module(user, "companies")
    old = await db.companies.find_one({"id": cid}, {"_id": 0, "status": 1})
    await db.companies.update_one({"id": cid}, {"$set": {"status": body["status"]}})
    await write_audit(user, "company.status.update", "company", cid, {"status": old.get("status") if old else None}, {"status": body["status"]})
    return {"ok": True}


@api_router.put("/admin/companies/{cid}/feature")
async def feature_company(cid: str, body: dict, user: dict = Depends(require_role("admin"))):
    _require_admin_module(user, "companies")
    old = await db.companies.find_one({"id": cid}, {"_id": 0, "featured": 1})
    value = bool(body.get("featured", True))
    await db.companies.update_one({"id": cid}, {"$set": {"featured": value}})
    await write_audit(user, "company.feature.update", "company", cid, {"featured": old.get("featured") if old else None}, {"featured": value})
    return {"ok": True}


@api_router.put("/admin/companies/{cid}/plan")
async def assign_plan(cid: str, body: dict, user: dict = Depends(require_role("admin"))):
    _require_admin_module(user, "billing")
    plan = body.get("plan")
    if not plan:
        raise HTTPException(400, "plan is required")
    old = await db.companies.find_one({"id": cid}, {"_id": 0, "plan": 1, "custom_limits": 1})
    update = {"plan": plan}
    # Optional per-company limit override (custom enterprise)
    if "custom_limits" in body and isinstance(body["custom_limits"], dict):
        update["custom_limits"] = body["custom_limits"]
    await db.companies.update_one({"id": cid}, {"$set": update})
    await write_audit(user, "company.plan.update", "company", cid, old or {}, update)
    return {"ok": True}


@api_router.put("/admin/companies/{cid}/verify")
async def verify_company(cid: str, body: dict, user: dict = Depends(require_role("admin"))):
    _require_admin_module(user, "verification")
    old = await db.companies.find_one({"id": cid}, {"_id": 0, "verified": 1})
    value = bool(body.get("verified", True))
    await db.companies.update_one({"id": cid}, {"$set": {"verified": value}})
    await write_audit(user, "company.verify.update", "company", cid, {"verified": old.get("verified") if old else None}, {"verified": value})
    return {"ok": True}


@api_router.get("/admin/users")
async def admin_users(
    status: Optional[str] = None,
    q: Optional[str] = None,
    page: int = 1,
    limit: int = 25,
    sort: Optional[str] = None,
    user: dict = Depends(require_role("admin")),
):
    _require_admin_module(user, "users")
    return await admin_list_response(
        "users",
        page=page,
        limit=limit,
        q=q,
        status=status,
        sort=sort,
        search_fields=["name", "email", "role"],
        projection=_admin_projection({"password_hash": 0}),
    )


@api_router.post("/admin/users")
async def admin_create_user(body: dict, user: dict = Depends(require_role("admin"))):
    _require_admin_module(user, "users")
    email = (body.get("email") or "").lower().strip()
    role = body.get("role", "buyer")
    if not email:
        raise HTTPException(400, "email is required")
    if role not in ("buyer", "provider", "admin"):
        raise HTTPException(400, "Invalid role")
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    doc = {
        "id": new_id(),
        "email": email,
        "password_hash": hash_password(body.get("password") or "Temp123!"),
        "name": body.get("name") or email.split("@")[0],
        "role": role,
        "status": body.get("status", "active"),
        "verified": bool(body.get("verified", False)),
        "phone": body.get("phone", ""),
        "admin_role": body.get("admin_role", "super_admin") if role == "admin" else body.get("admin_role", ""),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.users.insert_one(doc)
    if role == "buyer":
        await db.buyer_profiles.insert_one({"id": new_id(), "user_id": doc["id"], "company_name": body.get("company_name", ""), "sector": body.get("sector", ""), "location": "Bakı", "created_at": now_iso()})
    await write_audit(user, "user.create", "user", doc["id"], {}, {k: v for k, v in doc.items() if k != "password_hash"})
    return clean_doc(doc)


@api_router.put("/admin/users/{uid}")
async def admin_update_user(uid: str, body: dict, user: dict = Depends(require_role("admin"))):
    _require_admin_module(user, "users")
    old = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
    if not old:
        raise HTTPException(404, "User not found")
    allowed = {"name", "email", "role", "status", "verified", "phone", "admin_role"}
    update = {k: v for k, v in body.items() if k in allowed}
    if "email" in update:
        update["email"] = update["email"].lower().strip()
    if "role" in update and update["role"] not in ("buyer", "provider", "admin"):
        raise HTTPException(400, "Invalid role")
    if body.get("password"):
        update["password_hash"] = hash_password(body["password"])
    update["updated_at"] = now_iso()
    await db.users.update_one({"id": uid}, {"$set": update})
    safe_update = {k: v for k, v in update.items() if k != "password_hash"}
    await write_audit(user, "user.update", "user", uid, old, safe_update)
    return await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})


@api_router.delete("/admin/users/{uid}")
async def admin_delete_user(uid: str, user: dict = Depends(require_role("admin"))):
    _require_admin_module(user, "users")
    old = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
    if not old:
        raise HTTPException(404, "User not found")
    update = {"status": "deleted", "deleted_at": now_iso(), "deleted_by": user["id"], "updated_at": now_iso()}
    await db.users.update_one({"id": uid}, {"$set": update})
    await write_audit(user, "user.delete", "user", uid, old, update)
    return {"ok": True}


@api_router.get("/admin/reviews")
async def admin_reviews(status: Optional[str] = None, q: Optional[str] = None, page: int = 1, limit: int = 25, sort: Optional[str] = None, user: dict = Depends(require_role("admin"))):
    _require_admin_module(user, "reviews")
    return await admin_list_response("reviews", page=page, limit=limit, q=q, status=status, sort=sort, search_fields=["title", "text", "user_name", "status"])


@api_router.put("/admin/reviews/{rid}")
async def admin_update_review(rid: str, body: dict, user: dict = Depends(require_role("admin"))):
    _require_admin_module(user, "reviews")
    old = await db.reviews.find_one({"id": rid}, {"_id": 0, "status": 1})
    status = body.get("status", "approved")
    if status not in REVIEW_STATUSES:
        raise HTTPException(400, "Invalid status")
    await db.reviews.update_one({"id": rid}, {"$set": {"status": status, "updated_at": now_iso()}})
    await write_audit(user, "review.status.update", "review", rid, {"status": old.get("status") if old else None}, {"status": status})
    return {"ok": True}


@api_router.get("/admin/leads")
async def admin_leads(status: Optional[str] = None, q: Optional[str] = None, page: int = 1, limit: int = 25, sort: Optional[str] = None, user: dict = Depends(require_role("admin"))):
    _require_admin_module(user, "leads")
    return await admin_list_response("leads", page=page, limit=limit, q=q, status=status, sort=sort, search_fields=["company_id", "brief_id", "status"])


@api_router.get("/admin/briefs")
async def admin_briefs(status: Optional[str] = None, q: Optional[str] = None, page: int = 1, limit: int = 25, sort: Optional[str] = None, user: dict = Depends(require_role("admin"))):
    _require_admin_module(user, "briefs")
    return await admin_list_response("briefs", page=page, limit=limit, q=q, status=status, sort=sort, search_fields=["title", "description", "buyer_name", "category"])


class AdIn(BaseModel):
    title: str
    image_url: Optional[str] = ""
    link: Optional[str] = ""
    placement: str
    start_date: Optional[str] = ""
    end_date: Optional[str] = ""
    status: Optional[str] = "active"
    priority: Optional[int] = 1
    target_category: Optional[str] = ""
    target_location: Optional[str] = ""


@api_router.get("/admin/ads")
async def admin_ads(status: Optional[str] = None, q: Optional[str] = None, page: int = 1, limit: int = 25, sort: Optional[str] = None, user: dict = Depends(require_role("admin"))):
    _require_admin_module(user, "ads")
    return await admin_list_response("ads", page=page, limit=limit, q=q, status=status, sort=sort, search_fields=["title", "placement", "status"])


@api_router.post("/admin/ads")
async def create_ad(payload: AdIn, user: dict = Depends(require_role("admin"))):
    _require_admin_module(user, "ads")
    doc = {"id": new_id(), "impressions": 0, "clicks": 0, "created_at": now_iso(), **payload.dict()}
    await db.ads.insert_one(doc)
    await write_audit(user, "ad.create", "ad", doc["id"], {}, doc)
    doc.pop("_id", None)
    return doc


@api_router.delete("/admin/ads/{aid}")
async def delete_ad(aid: str, user: dict = Depends(require_role("admin"))):
    _require_admin_module(user, "ads")
    old = await db.ads.find_one({"id": aid}, {"_id": 0})
    await db.ads.update_one({"id": aid}, {"$set": {"deleted_at": now_iso(), "deleted_by": user["id"], "status": "deleted"}})
    await write_audit(user, "ad.delete", "ad", aid, old or {}, {"deleted_at": True})
    return {"ok": True}


@api_router.get("/admin/plans")
async def admin_plans(status: Optional[str] = None, q: Optional[str] = None, page: int = 1, limit: int = 50, sort: Optional[str] = "order", user: dict = Depends(require_role("admin"))):
    _require_admin_module(user, "billing")
    return await admin_list_response("plans", page=page, limit=limit, q=q, status=status, sort=sort, search_fields=["name", "slug"], default_sort="order")


@api_router.put("/admin/plans/{pid}")
async def admin_update_plan(pid: str, body: dict, user: dict = Depends(require_role("admin"))):
    _require_admin_module(user, "billing")
    old = await db.plans.find_one({"id": pid}, {"_id": 0})
    update = {**body, "updated_at": now_iso()}
    await db.plans.update_one({"id": pid}, {"$set": update})
    await write_audit(user, "plan.update", "plan", pid, old or {}, update)
    return {"ok": True}


@api_router.post("/admin/billing/subscriptions/{sid}/approve")
async def approve_subscription_request(sid: str, body: dict, user: dict = Depends(require_role("admin"))):
    _require_admin_module(user, "billing")
    sub = await db.subscriptions.find_one({"id": sid}, {"_id": 0})
    if not sub:
        raise HTTPException(404, "Subscription not found")
    approved_at = now_iso()
    invoice_id = new_id()
    payment_id = new_id()
    amount = float(sub.get("amount", 0) or 0)
    invoice = {
        "id": invoice_id,
        "invoice_no": f"INV-{invoice_id[:8].upper()}",
        "subscription_id": sid,
        "company_id": sub["company_id"],
        "company_name": sub.get("company_name", ""),
        "amount": amount,
        "currency": sub.get("currency", "AZN"),
        "status": "paid",
        "description": f"{sub.get('plan', 'plan')} plan invoice",
        "created_at": approved_at,
        "updated_at": approved_at,
    }
    payment = {
        "id": payment_id,
        "reference": f"PAY-{payment_id[:8].upper()}",
        "subscription_id": sid,
        "invoice_id": invoice_id,
        "company_id": sub["company_id"],
        "company_name": sub.get("company_name", ""),
        "amount": amount,
        "currency": sub.get("currency", "AZN"),
        "status": "paid",
        "method": "manual",
        "description": f"{sub.get('plan', 'plan')} plan approved",
        "created_at": approved_at,
        "updated_at": approved_at,
    }
    update = {
        "status": "active",
        "approved_at": approved_at,
        "approved_by": user["id"],
        "approval_note": body.get("note", ""),
        "invoice_id": invoice_id,
        "payment_id": payment_id,
        "updated_at": approved_at,
    }
    await db.invoices.insert_one(invoice)
    await db.payments.insert_one(payment)
    await db.subscriptions.update_one({"id": sid}, {"$set": update})
    await db.companies.update_one({"id": sub["company_id"]}, {"$set": {"plan": sub.get("plan", "free")}})
    await write_audit(user, "subscription.approve", "subscription", sid, sub, update)
    updated = await db.subscriptions.find_one({"id": sid}, {"_id": 0})
    return updated


@api_router.post("/admin/billing/subscriptions/{sid}/reject")
async def reject_subscription_request(sid: str, body: dict, user: dict = Depends(require_role("admin"))):
    _require_admin_module(user, "billing")
    sub = await db.subscriptions.find_one({"id": sid}, {"_id": 0})
    if not sub:
        raise HTTPException(404, "Subscription not found")
    update = {"status": "rejected", "rejected_at": now_iso(), "rejected_by": user["id"], "rejection_note": body.get("note", ""), "updated_at": now_iso()}
    await db.subscriptions.update_one({"id": sid}, {"$set": update})
    await write_audit(user, "subscription.reject", "subscription", sid, sub, update)
    return await db.subscriptions.find_one({"id": sid}, {"_id": 0})


@api_router.get("/admin/settings")
async def get_settings(user: dict = Depends(require_role("admin"))):
    s = await db.settings.find_one({"id": "main"}, {"_id": 0})
    return s or {}


@api_router.put("/admin/settings")
async def update_settings(body: dict, user: dict = Depends(require_role("admin"))):
    _require_admin_module(user, "settings")
    old = await db.settings.find_one({"id": "main"}, {"_id": 0})
    await db.settings.update_one({"id": "main"}, {"$set": body}, upsert=True)
    await write_audit(user, "settings.update", "settings", "main", old or {}, body)
    return {"ok": True}


@api_router.get("/admin/integrations")
async def get_integrations(user: dict = Depends(require_role("admin"))):
    return await db.integrations.find({}, {"_id": 0}).to_list(100)


@api_router.put("/admin/integrations/{key}")
async def update_integration(key: str, body: dict, user: dict = Depends(require_role("admin"))):
    _require_admin_module(user, "settings")
    old = await db.integrations.find_one({"key": key}, {"_id": 0})
    body["key"] = key
    body["updated_at"] = now_iso()
    await db.integrations.update_one({"key": key}, {"$set": body}, upsert=True)
    await write_audit(user, "integration.update", "integration", key, old or {}, body)
    return {"ok": True}


@api_router.get("/admin/audit-logs")
async def audit_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    q: Optional[str] = None,
    page: int = 1,
    limit: int = 25,
    sort: Optional[str] = None,
    user: dict = Depends(require_role("admin")),
):
    _require_admin_module(user, "audit")
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


def _admin_resource_config(resource: str) -> dict:
    config = ADMIN_RESOURCES.get(resource)
    if not config:
        raise HTTPException(404, "Admin resource not found")
    return config


@api_router.get("/admin/{resource}")
async def admin_generic_list(
    resource: str,
    status: Optional[str] = None,
    q: Optional[str] = None,
    page: int = 1,
    limit: int = 25,
    sort: Optional[str] = None,
    user: dict = Depends(require_role("admin")),
):
    config = _admin_resource_config(resource)
    _require_admin_module(user, config["module"])
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


@api_router.post("/admin/{resource}")
async def admin_generic_create(resource: str, body: dict, user: dict = Depends(require_role("admin"))):
    config = _admin_resource_config(resource)
    _require_admin_module(user, config["module"])
    doc = {
        "id": body.get("id") or new_id(),
        "created_at": now_iso(),
        "updated_at": now_iso(),
        **body,
    }
    doc.setdefault("status", "draft" if resource in ("content-pages", "seo-pages", "email-templates") else "active")
    await db[config["collection"]].insert_one(doc)
    await write_audit(user, f"{resource}.create", resource.rstrip("s"), doc["id"], {}, doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/admin/{resource}/{rid}")
async def admin_generic_update(resource: str, rid: str, body: dict, user: dict = Depends(require_role("admin"))):
    config = _admin_resource_config(resource)
    _require_admin_module(user, config["module"])
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


@api_router.delete("/admin/{resource}/{rid}")
async def admin_generic_delete(resource: str, rid: str, user: dict = Depends(require_role("admin"))):
    config = _admin_resource_config(resource)
    _require_admin_module(user, config["module"])
    old = await db[config["collection"]].find_one({"id": rid}, {"_id": 0})
    if not old:
        raise HTTPException(404, "Item not found")
    update = {"deleted_at": now_iso(), "deleted_by": user["id"], "status": "deleted"}
    await db[config["collection"]].update_one({"id": rid}, {"$set": update})
    await write_audit(user, f"{resource}.delete", resource.rstrip("s"), rid, old, update)
    return {"ok": True}


async def _published_content_by_slug(slug: str):
    page = await db.content_pages.find_one(
        {"slug": slug, "status": "published", "deleted_at": {"$exists": False}},
        {"_id": 0},
    )
    if not page:
        raise HTTPException(404, "Page not found")
    return page


@api_router.get("/content/home")
async def public_home_content():
    return await _published_content_by_slug("home")


@api_router.get("/content/provider-landing")
async def public_provider_landing_content():
    return await _published_content_by_slug("provider-landing")


@api_router.get("/content/pages/{slug}")
async def public_content_page(slug: str):
    return await _published_content_by_slug(slug)


@api_router.post("/contact")
async def submit_contact(body: dict):
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip()
    message = (body.get("message") or "").strip()
    if not name or not email or not message:
        raise HTTPException(400, "Ad, email və mesaj tələb olunur")
    doc = {"id": new_id(), "name": name, "email": email, "message": message, "status": "new", "created_at": now_iso()}
    await db.contact_submissions.insert_one(doc)
    return {"ok": True}


@api_router.get("/faqs")
async def public_faqs(category: Optional[str] = None):
    query = {"status": {"$in": ["active", "published"]}, "deleted_at": {"$exists": False}}
    if category:
        query["category"] = category
    return await db.faqs.find(query, {"_id": 0}).sort("order", 1).to_list(200)


@api_router.get("/seo-pages/{slug}")
async def public_seo_page(slug: str):
    page = await db.seo_pages.find_one(
        {"slug": slug, "status": {"$in": ["active", "published"]}, "deleted_at": {"$exists": False}},
        {"_id": 0},
    )
    if not page:
        raise HTTPException(404, "SEO page not found")
    return page


@api_router.post("/media")
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
    elif user.get("role") not in ("admin", "provider"):
        raise HTTPException(403, "Forbidden")
    elif user.get("role") == "admin":
        _require_admin_module(user, "media")

    name = Path(file.filename or "upload").name
    ext = _media_ext(name)
    if ext not in _allowed_media_exts_for_module(module):
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


@api_router.get("/media/{asset_id}")
async def serve_media(asset_id: str):
    doc = await db.media_assets.find_one({"id": asset_id, "status": "active", "deleted_at": {"$exists": False}}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Media not found")
    path = Path(doc.get("storage_path", ""))
    if not path.exists():
        raise HTTPException(404, "Media not found")
    return FileResponse(path, media_type=doc.get("mime") or "application/octet-stream", filename=doc.get("name") or path.name)


@api_router.delete("/media/{asset_id}")
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


# ------- Provider analytics & buyer dashboard -------
@api_router.get("/me/analytics")
async def my_analytics(user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    if not company:
        return {}
    services_count = await db.services.count_documents({"company_id": company["id"]})
    portfolio_count = await db.portfolio.count_documents({"company_id": company["id"]})
    leads_count = await db.leads.count_documents({"company_id": company["id"]})
    proposals_sent_count = await db.proposals.count_documents({"company_id": company["id"]})
    accepted = await db.proposals.count_documents({"company_id": company["id"], "status": "accepted"})
    all_services = await db.services.find({"company_id": company["id"]}).to_list(200)
    return {
        "profile_views": company.get("views_month", 0),
        "shortlist_count": company.get("shortlist_count", 0),
        "service_views": sum(s.get("views", 0) for s in all_services),
        "services": services_count,
        "portfolio": portfolio_count,
        "leads": leads_count,
        "proposals_sent": proposals_sent_count,
        "accepted": accepted,
        "win_rate": round((accepted / proposals_sent_count * 100) if proposals_sent_count else 0, 1),
        "monthly_views": company.get("monthly_views") or [],
        "monthly_leads": company.get("monthly_leads") or [],
    }


@api_router.get("/me/buyer-dashboard")
async def buyer_dashboard(user: dict = Depends(require_role("buyer"))):
    active_briefs = await db.briefs.count_documents({"buyer_id": user["id"], "status": "open"})
    briefs = await db.briefs.find({"buyer_id": user["id"]}).to_list(500)
    brief_ids = [b["id"] for b in briefs]
    proposals_count = await db.proposals.count_documents({"brief_id": {"$in": brief_ids}})
    shortlist_count = await db.shortlists.count_documents({"user_id": user["id"]})
    recent_briefs = await db.briefs.find({"buyer_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    threads = await db.message_threads.count_documents({"participants": user["id"]})
    return {
        "active_briefs": active_briefs,
        "proposals_count": proposals_count,
        "shortlist_count": shortlist_count,
        "messages": threads,
        "recent_briefs": recent_briefs,
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=os.environ.get("CORS_ORIGIN_REGEX", r"https?://.*"),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup_seed():
    from seed_data import run_seed
    try:
        await run_seed(db)
    except Exception as e:
        logger.exception(f"Seed error: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
