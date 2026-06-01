from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr


mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="BizMarket B2B Marketplace API")
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]


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


def new_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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
        "buyer": os.environ.get("DEMO_BUYER_EMAIL"),
        "provider": os.environ.get("DEMO_PROVIDER_EMAIL"),
        "admin": os.environ.get("ADMIN_EMAIL"),
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


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ------- Categories -------
@api_router.get("/categories")
async def list_categories():
    return await db.categories.find({}, {"_id": 0}).sort("order", 1).to_list(200)


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
    seo_title: Optional[str] = ""
    seo_description: Optional[str] = ""


@api_router.post("/admin/categories")
async def create_category(payload: CategoryIn, user: dict = Depends(require_role("admin"))):
    doc = {"id": new_id(), **payload.dict(), "created_at": now_iso()}
    await db.categories.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/admin/categories/{cid}")
async def update_category(cid: str, payload: CategoryIn, user: dict = Depends(require_role("admin"))):
    await db.categories.update_one({"id": cid}, {"$set": payload.dict()})
    return {"ok": True}


@api_router.delete("/admin/categories/{cid}")
async def delete_category(cid: str, user: dict = Depends(require_role("admin"))):
    await db.categories.delete_one({"id": cid})
    return {"ok": True}


# ------- Companies -------
@api_router.get("/companies")
async def list_companies(
    q: Optional[str] = None, category: Optional[str] = None, location: Optional[str] = None,
    verified: Optional[bool] = None, min_rating: Optional[float] = None, size: Optional[str] = None,
    industry: Optional[str] = None, sort: Optional[str] = "sponsored", page: int = 1, limit: int = 12,
):
    query = {"status": "active"}
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
    if industry:
        query["industries"] = industry

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
    reviews = await db.reviews.find({"company_id": company["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
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
    branches: Optional[List[str]] = None
    service_countries: Optional[List[str]] = None
    tax_number: Optional[str] = None
    statistics: Optional[dict] = None
    sections: Optional[dict] = None


@api_router.get("/me/company")
async def get_my_company(user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]}, {"_id": 0})
    if not company:
        raise HTTPException(404, "Company not found")
    return company


@api_router.put("/me/company")
async def update_my_company(payload: CompanyUpdate, user: dict = Depends(require_role("provider"))):
    data = {k: v for k, v in payload.dict().items() if v is not None}
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
    sort: Optional[str] = "sponsored", page: int = 1, limit: int = 12,
):
    query = {"status": "active"}
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    if category:
        query["category"] = category
    if min_price is not None:
        query["price_max"] = {"$gte": min_price}
    if max_price is not None:
        query["price_min"] = {"$lte": max_price}
    sort_map = {
        "rating": [("company_rating", -1)],
        "newest": [("created_at", -1)],
        "sponsored": [("sponsored", -1), ("featured", -1)],
    }
    sort_spec = sort_map.get(sort or "sponsored", sort_map["sponsored"])
    skip = (page - 1) * limit
    total = await db.services.count_documents(query)
    items = await db.services.find(query, {"_id": 0}).sort(sort_spec).skip(skip).limit(limit).to_list(limit)
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
    doc = {
        "id": new_id(), "company_id": company["id"], "company_name": company["name"],
        "company_logo": company.get("logo_url", ""), "company_rating": company.get("rating", 0),
        "company_verified": company.get("verified", False), "sponsored": False, "featured": False,
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


@api_router.get("/me/portfolio")
async def my_portfolio(user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    if not company:
        return []
    return await db.portfolio.find({"company_id": company["id"]}, {"_id": 0}).to_list(200)


@api_router.post("/me/portfolio")
async def create_portfolio(payload: PortfolioIn, user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    doc = {"id": new_id(), "company_id": company["id"], "created_at": now_iso(), **payload.dict()}
    await db.portfolio.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.delete("/me/portfolio/{pid}")
async def delete_portfolio(pid: str, user: dict = Depends(require_role("provider"))):
    company = await db.companies.find_one({"owner_id": user["id"]})
    await db.portfolio.delete_one({"id": pid, "company_id": company["id"]})
    return {"ok": True}


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
    description: str
    expected_result: Optional[str] = ""
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
            await db.leads.insert_one({
                "id": new_id(), "brief_id": doc["id"], "company_id": cid,
                "buyer_id": user["id"], "status": "new", "created_at": now_iso(),
            })
    return doc


@api_router.get("/me/briefs")
async def my_briefs(user: dict = Depends(require_role("buyer"))):
    return await db.briefs.find({"buyer_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api_router.get("/briefs/{bid}")
async def get_brief(bid: str, user: dict = Depends(get_current_user)):
    brief = await db.briefs.find_one({"id": bid}, {"_id": 0})
    if not brief:
        raise HTTPException(404, "Brief not found")
    proposals = await db.proposals.find({"brief_id": bid}, {"_id": 0}).to_list(100)
    return {**brief, "proposals": proposals}


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
    doc = {
        "id": new_id(), "company_id": company["id"], "company_name": company["name"],
        "company_logo": company.get("logo_url", ""), "company_rating": company.get("rating", 0),
        "status": "pending", "created_at": now_iso(), **payload.dict(),
    }
    await db.proposals.insert_one(doc)
    await db.briefs.update_one({"id": payload.brief_id}, {"$inc": {"proposals_count": 1}})
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
    await db.proposals.update_one({"id": pid}, {"$set": {"status": status}})
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
    return {**thread, "messages": msgs}


class MessageIn(BaseModel):
    thread_id: Optional[str] = None
    recipient_id: Optional[str] = None
    text: str


@api_router.post("/messages")
async def send_message(payload: MessageIn, user: dict = Depends(get_current_user)):
    tid = payload.thread_id
    if not tid and payload.recipient_id:
        existing = await db.message_threads.find_one({"participants": {"$all": [user["id"], payload.recipient_id]}})
        if existing:
            tid = existing["id"]
        else:
            tid = new_id()
            await db.message_threads.insert_one({
                "id": tid, "participants": [user["id"], payload.recipient_id],
                "last_message": payload.text[:100], "updated_at": now_iso(), "created_at": now_iso(),
            })
    msg = {
        "id": new_id(), "thread_id": tid, "sender_id": user["id"],
        "sender_name": user["name"], "text": payload.text, "created_at": now_iso(),
    }
    await db.messages.insert_one(msg)
    await db.message_threads.update_one({"id": tid}, {"$set": {"last_message": payload.text[:100], "updated_at": now_iso()}})
    msg.pop("_id", None)
    return msg


# ------- Plans / Ads / Blog -------
@api_router.get("/plans")
async def list_plans():
    return await db.plans.find({}, {"_id": 0}).sort("order", 1).to_list(50)


@api_router.get("/ads")
async def list_ads(placement: Optional[str] = None):
    q = {"status": "active"}
    if placement:
        q["placement"] = placement
    return await db.ads.find(q, {"_id": 0}).sort("priority", -1).to_list(50)


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
@api_router.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_role("admin"))):
    return {
        "providers": await db.companies.count_documents({}),
        "active_providers": await db.companies.count_documents({"status": "active"}),
        "buyers": await db.users.count_documents({"role": "buyer"}),
        "pending_verifications": await db.verification_requests.count_documents({"status": "pending"}),
        "pending_companies": await db.companies.count_documents({"status": "pending"}),
        "leads": await db.leads.count_documents({}),
        "briefs": await db.briefs.count_documents({}),
        "proposals": await db.proposals.count_documents({}),
        "ads_active": await db.ads.count_documents({"status": "active"}),
        "revenue_month": 12450,
    }


@api_router.get("/admin/companies")
async def admin_companies(status: Optional[str] = None, user: dict = Depends(require_role("admin"))):
    q = {}
    if status:
        q["status"] = status
    return await db.companies.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@api_router.put("/admin/companies/{cid}/status")
async def update_company_status(cid: str, body: dict, user: dict = Depends(require_role("admin"))):
    if body.get("status") not in ("active", "pending", "suspended", "rejected"):
        raise HTTPException(400, "Invalid status")
    await db.companies.update_one({"id": cid}, {"$set": {"status": body["status"]}})
    return {"ok": True}


@api_router.put("/admin/companies/{cid}/feature")
async def feature_company(cid: str, body: dict, user: dict = Depends(require_role("admin"))):
    await db.companies.update_one({"id": cid}, {"$set": {"featured": bool(body.get("featured", True))}})
    return {"ok": True}


@api_router.put("/admin/companies/{cid}/verify")
async def verify_company(cid: str, body: dict, user: dict = Depends(require_role("admin"))):
    await db.companies.update_one({"id": cid}, {"$set": {"verified": bool(body.get("verified", True))}})
    return {"ok": True}


@api_router.get("/admin/users")
async def admin_users(user: dict = Depends(require_role("admin"))):
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)


@api_router.get("/admin/reviews")
async def admin_reviews(user: dict = Depends(require_role("admin"))):
    return await db.reviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api_router.put("/admin/reviews/{rid}")
async def admin_update_review(rid: str, body: dict, user: dict = Depends(require_role("admin"))):
    await db.reviews.update_one({"id": rid}, {"$set": {"status": body.get("status", "approved")}})
    return {"ok": True}


@api_router.get("/admin/leads")
async def admin_leads(user: dict = Depends(require_role("admin"))):
    return await db.leads.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api_router.get("/admin/briefs")
async def admin_briefs(user: dict = Depends(require_role("admin"))):
    return await db.briefs.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


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
async def admin_ads(user: dict = Depends(require_role("admin"))):
    return await db.ads.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api_router.post("/admin/ads")
async def create_ad(payload: AdIn, user: dict = Depends(require_role("admin"))):
    doc = {"id": new_id(), "impressions": 0, "clicks": 0, "created_at": now_iso(), **payload.dict()}
    await db.ads.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.delete("/admin/ads/{aid}")
async def delete_ad(aid: str, user: dict = Depends(require_role("admin"))):
    await db.ads.delete_one({"id": aid})
    return {"ok": True}


@api_router.get("/admin/plans")
async def admin_plans(user: dict = Depends(require_role("admin"))):
    return await db.plans.find({}, {"_id": 0}).sort("order", 1).to_list(50)


@api_router.put("/admin/plans/{pid}")
async def admin_update_plan(pid: str, body: dict, user: dict = Depends(require_role("admin"))):
    await db.plans.update_one({"id": pid}, {"$set": body})
    return {"ok": True}


@api_router.get("/admin/settings")
async def get_settings(user: dict = Depends(require_role("admin"))):
    s = await db.settings.find_one({"id": "main"}, {"_id": 0})
    return s or {}


@api_router.put("/admin/settings")
async def update_settings(body: dict, user: dict = Depends(require_role("admin"))):
    await db.settings.update_one({"id": "main"}, {"$set": body}, upsert=True)
    return {"ok": True}


@api_router.get("/admin/integrations")
async def get_integrations(user: dict = Depends(require_role("admin"))):
    return await db.integrations.find({}, {"_id": 0}).to_list(100)


@api_router.put("/admin/integrations/{key}")
async def update_integration(key: str, body: dict, user: dict = Depends(require_role("admin"))):
    body["key"] = key
    body["updated_at"] = now_iso()
    await db.integrations.update_one({"key": key}, {"$set": body}, upsert=True)
    return {"ok": True}


@api_router.get("/admin/audit-logs")
async def audit_logs(user: dict = Depends(require_role("admin"))):
    return await db.audit_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)


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
        "monthly_views": [120, 180, 220, 280, 320, 380, 450, 520, 580, 620, 700, 780],
        "monthly_leads": [5, 8, 12, 15, 18, 22, 28, 32, 35, 38, 42, 48],
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
    allow_origins=["*"],
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
