"""Seed initial data for the B2B Marketplace."""
import os
import uuid
import bcrypt
from datetime import datetime, timezone, timedelta


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def days_ago(n: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=n)).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


CATEGORIES = [
    ("Digital Marketing", "digital-marketing", "TrendingUp", 1),
    ("SEO", "seo", "Search", 2),
    ("Social Media Marketing", "social-media", "Share2", 3),
    ("Web Development", "web-development", "Code", 4),
    ("Mobile App Development", "mobile-development", "Smartphone", 5),
    ("Software Development", "software-development", "Cpu", 6),
    ("Branding", "branding", "Palette", 7),
    ("Design", "design", "PenTool", 8),
    ("Video Production", "video-production", "Video", 9),
    ("PR", "pr", "Megaphone", 10),
    ("Consulting", "consulting", "Briefcase", 11),
    ("HR Services", "hr-services", "Users", 12),
    ("Accounting", "accounting", "Calculator", 13),
    ("Legal Services", "legal-services", "Scale", 14),
    ("Logistics", "logistics", "Truck", 15),
    ("Event Management", "event-management", "Calendar", 16),
    ("IT Support", "it-support", "Monitor", 17),
    ("Cybersecurity", "cybersecurity", "Shield", 18),
    ("Cloud Services", "cloud-services", "Cloud", 19),
    ("AI & Automation", "ai-automation", "Bot", 20),
]

INDUSTRIES = ["Fintech", "E-commerce", "Healthcare", "Education", "Real Estate", "Retail", "Telecom", "Logistics", "Energy", "Manufacturing"]
LOCATIONS = ["Bakı", "Gəncə", "Sumqayıt", "Mingəçevir", "Şəki"]
SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"]

SAMPLE_COMPANIES = [
    {"name": "Nexora Digital", "slogan": "Sayt və rəqəmsal həllər üçün etibarlı tərəfdaş", "cats": ["digital-marketing", "seo", "web-development"], "rating": 4.8, "reviews": 47, "size": "51-200", "verified": True, "featured": True, "sponsored": True, "industries": ["E-commerce", "Fintech"], "logo": "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=200&h=200&fit=crop", "cover": "https://images.pexels.com/photos/3184325/pexels-photo-3184325.jpeg?w=1200&h=400&fit=crop"},
    {"name": "Bakı Software Studio", "slogan": "Müəssisə üçün xüsusi software həlləri", "cats": ["software-development", "mobile-development"], "rating": 4.9, "reviews": 62, "size": "51-200", "verified": True, "featured": True, "sponsored": False, "industries": ["Fintech", "Healthcare"], "logo": "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200&h=200&fit=crop", "cover": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=400&fit=crop"},
    {"name": "Caspian Brand Lab", "slogan": "Brendlərin gücü ilə bizneslər qururuq", "cats": ["branding", "design"], "rating": 4.7, "reviews": 38, "size": "11-50", "verified": True, "featured": False, "sponsored": True, "industries": ["Retail", "E-commerce"], "logo": "https://images.unsplash.com/photo-1567446537708-ac4aa75c9c28?w=200&h=200&fit=crop", "cover": "https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?w=1200&h=400&fit=crop"},
    {"name": "AzPromo Marketing", "slogan": "Performans marketinqi və lead generation", "cats": ["digital-marketing", "social-media"], "rating": 4.6, "reviews": 54, "size": "11-50", "verified": True, "featured": False, "sponsored": False, "industries": ["E-commerce", "Education"], "logo": "https://images.unsplash.com/photo-1551434678-e076c223a692?w=200&h=200&fit=crop", "cover": "https://images.pexels.com/photos/265087/pexels-photo-265087.jpeg?w=1200&h=400&fit=crop"},
    {"name": "Visionary Web", "slogan": "Müasir veb saytlar və e-commerce", "cats": ["web-development", "design"], "rating": 4.5, "reviews": 29, "size": "11-50", "verified": False, "featured": False, "sponsored": False, "industries": ["E-commerce", "Retail"], "logo": "https://images.unsplash.com/photo-1572177812156-58036aae439c?w=200&h=200&fit=crop", "cover": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=400&fit=crop"},
    {"name": "DataPulse Analytics", "slogan": "Data-driven biznes qərarları", "cats": ["consulting", "ai-automation"], "rating": 4.9, "reviews": 71, "size": "51-200", "verified": True, "featured": True, "sponsored": True, "industries": ["Fintech", "Telecom"], "logo": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&h=200&fit=crop", "cover": "https://images.pexels.com/photos/669610/pexels-photo-669610.jpeg?w=1200&h=400&fit=crop"},
    {"name": "Pixel Foundry", "slogan": "UI/UX dizayn və mobil tətbiqlər", "cats": ["mobile-development", "design"], "rating": 4.7, "reviews": 43, "size": "11-50", "verified": True, "featured": False, "sponsored": False, "industries": ["Healthcare", "Education"], "logo": "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=200&h=200&fit=crop", "cover": "https://images.unsplash.com/photo-1559028012-481c04fa702d?w=1200&h=400&fit=crop"},
    {"name": "Cloud Forge", "slogan": "Cloud miqrasiya və DevOps həlləri", "cats": ["cloud-services", "it-support"], "rating": 4.8, "reviews": 36, "size": "11-50", "verified": True, "featured": True, "sponsored": False, "industries": ["Telecom", "Manufacturing"], "logo": "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=200&h=200&fit=crop", "cover": "https://images.pexels.com/photos/1148820/pexels-photo-1148820.jpeg?w=1200&h=400&fit=crop"},
    {"name": "Cyber Shield Az", "slogan": "Kibertəhlükəsizlik və audit", "cats": ["cybersecurity", "it-support"], "rating": 4.9, "reviews": 28, "size": "11-50", "verified": True, "featured": False, "sponsored": True, "industries": ["Fintech", "Energy"], "logo": "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=200&h=200&fit=crop", "cover": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&h=400&fit=crop"},
    {"name": "AzVideo Production", "slogan": "Reklam çarxları və korporativ video", "cats": ["video-production", "pr"], "rating": 4.6, "reviews": 51, "size": "11-50", "verified": True, "featured": False, "sponsored": False, "industries": ["Retail", "E-commerce"], "logo": "https://images.unsplash.com/photo-1551817958-95e9ec0eba3a?w=200&h=200&fit=crop", "cover": "https://images.pexels.com/photos/2873486/pexels-photo-2873486.jpeg?w=1200&h=400&fit=crop"},
    {"name": "Talent Bridge HR", "slogan": "HR konsaltinqi və işə qəbul", "cats": ["hr-services", "consulting"], "rating": 4.5, "reviews": 22, "size": "11-50", "verified": True, "featured": False, "sponsored": False, "industries": ["Manufacturing", "Telecom"], "logo": "https://images.unsplash.com/photo-1521737852567-6949f3f9f2b5?w=200&h=200&fit=crop", "cover": "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?w=1200&h=400&fit=crop"},
    {"name": "Legal Partners", "slogan": "Korporativ hüquq və biznes konsaltinqi", "cats": ["legal-services", "consulting"], "rating": 4.7, "reviews": 33, "size": "1-10", "verified": True, "featured": False, "sponsored": False, "industries": ["Real Estate", "Fintech"], "logo": "https://images.unsplash.com/photo-1589994965851-a8f479c573a9?w=200&h=200&fit=crop", "cover": "https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?w=1200&h=400&fit=crop"},
]


SAMPLE_SERVICES_TPL = [
    ("SEO Audit və Optimizasiya", "seo", "Texniki SEO, açar söz analizi və saytın optimallaşdırılması", 1500, 5000, "2-4 həftə"),
    ("Korporativ Veb Sayt Hazırlanması", "web-development", "Müasir, sürətli və SEO uyğun korporativ saytlar", 3000, 12000, "4-8 həftə"),
    ("Mobile App MVP", "mobile-development", "iOS və Android üçün MVP tətbiq inkişafı", 8000, 25000, "8-12 həftə"),
    ("Brending Paketi", "branding", "Loqo, brend kitabı, vizual identifikasiya", 2500, 8000, "3-5 həftə"),
    ("Facebook və Instagram Reklamları", "social-media", "Performans hədəfli sosial media kampaniyaları", 1200, 4500, "Aylıq"),
    ("UI/UX Dizayn", "design", "Web və mobil tətbiqlər üçün istifadəçi təcrübəsi", 2000, 7000, "3-6 həftə"),
    ("Korporativ Video", "video-production", "Reklam çarxları, məhsul videosu", 1800, 6500, "2-3 həftə"),
    ("DevOps və Cloud Miqrasiya", "cloud-services", "AWS/Azure miqrasiya və CI/CD pipeline", 4000, 15000, "4-6 həftə"),
    ("Kibertəhlükəsizlik Auditi", "cybersecurity", "Penetration testing və zəiflik analizi", 3500, 10000, "3-4 həftə"),
    ("HR Konsaltinqi", "hr-services", "İşə qəbul, qiymətləndirmə və təlim", 1500, 5000, "Aylıq"),
]

PORTFOLIO_TPL = [
    ("Bank Mobil Tətbiqi Yenilənməsi", "Tech Bank", "Fintech", "Köhnəlmiş UX və zəif performans", "Sıfırdan yenidən dizayn və native arxitektura", "30% daha sürətli, 4.8 rating", "User retention +42%"),
    ("E-commerce Saytın Yenilənməsi", "AzShop", "E-commerce", "Aşağı konversiya nisbəti", "UX optimizasiya və A/B test", "Konversiya 2x artdı", "Aylıq gəlir +180%"),
    ("Marketinq Kampaniyası", "Healthcare Pro", "Healthcare", "Brend tanınma azlığı", "Multi-channel content strategiyası", "Lead 5x artdı", "ROI 320%"),
]

BLOG_POSTS = [
    {"title": "Agentlik necə seçilir? 7 vacib meyar", "slug": "agentlik-nece-secilir", "excerpt": "B2B xidmət bazarında agentlik seçərkən portfolio, qiymət, kommunikasiya və digər meyarlara fokuslanın.", "cover": "https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?w=1200&h=600&fit=crop"},
    {"title": "B2B xidmət bazarında düzgün provider seçimi", "slug": "duzgun-provider-secimi", "excerpt": "Düzgün provider seçimi biznesinizin uğurunun açarıdır. Hansı suallar verməlisiniz?", "cover": "https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?w=1200&h=600&fit=crop"},
    {"title": "SEO agentliyi seçərkən nələrə baxmaq lazımdır?", "slug": "seo-agentliyi-seciminin-meyarlari", "excerpt": "Real nəticələr, şəffaf hesabat və sahə təcrübəsi - SEO uğurunun açarı.", "cover": "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=1200&h=600&fit=crop"},
    {"title": "Software development şirkəti necə seçilməlidir?", "slug": "software-development-sirketi-secimi", "excerpt": "Tech stack, metodologiya, ekspertiza və portfolio - software partner seçimində kritik faktorlar.", "cover": "https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?w=1200&h=600&fit=crop"},
]

PLANS = [
    {"id": new_id(), "name": "Free", "slug": "free", "price": 0, "period": "ay", "order": 1, "popular": False, "limits": {"services": 3, "portfolio": 3, "team": 1, "leads": 5, "featured": False, "verified": False, "analytics": "basic", "support": "email"}, "features": ["3 xidmət", "3 portfolio", "Aylıq 5 lead", "Əsas analitika"]},
    {"id": new_id(), "name": "Pro", "slug": "pro", "price": 99, "period": "ay", "order": 2, "popular": True, "limits": {"services": 15, "portfolio": 20, "team": 5, "leads": 50, "featured": False, "verified": True, "analytics": "advanced", "support": "priority email"}, "features": ["15 xidmət", "20 portfolio", "Aylıq 50 lead", "Verified badge", "Geniş analitika", "5 komanda üzvü"]},
    {"id": new_id(), "name": "Premium", "slug": "premium", "price": 249, "period": "ay", "order": 3, "popular": False, "limits": {"services": 50, "portfolio": 100, "team": 20, "leads": 200, "featured": True, "verified": True, "analytics": "advanced+", "support": "phone + email"}, "features": ["50 xidmət", "100 portfolio", "Aylıq 200 lead", "Featured placement", "Premium analitika", "20 komanda üzvü", "Telefon dəstəyi"]},
    {"id": new_id(), "name": "Enterprise", "slug": "enterprise", "price": 599, "period": "ay", "order": 4, "popular": False, "limits": {"services": -1, "portfolio": -1, "team": -1, "leads": -1, "featured": True, "verified": True, "analytics": "custom", "support": "dedicated"}, "features": ["Limitsiz xidmət", "Limitsiz portfolio", "Limitsiz lead", "Featured + Carousel", "Custom analitika", "Dedicated manager", "API access"]},
]

ADS = [
    {"title": "İlk lead-iniz pulsuz", "image_url": "https://images.pexels.com/photos/7693721/pexels-photo-7693721.jpeg?w=1200&h=200&fit=crop", "link": "/provider", "placement": "homepage-top", "priority": 10, "status": "active", "start_date": now_iso(), "end_date": days_ago(-30)},
    {"title": "Pro plana keçin və 30% endirim qazanın", "image_url": "https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=600&fit=crop", "link": "/pricing", "placement": "sidebar", "priority": 5, "status": "active", "start_date": now_iso(), "end_date": days_ago(-30)},
    {"title": "Markaların güvəndiyi platforma", "image_url": "https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?w=1200&h=200&fit=crop", "link": "/companies", "placement": "search-top", "priority": 8, "status": "active", "start_date": now_iso(), "end_date": days_ago(-30)},
]


async def run_seed(db):
    # Indexes
    try:
        await db.users.create_index("email", unique=True)
        await db.companies.create_index("slug")
        await db.categories.create_index("slug", unique=True)
        await db.services.create_index("company_id")
        await db.briefs.create_index("buyer_id")
        await db.proposals.create_index("brief_id")
        await db.shortlists.create_index([("user_id", 1), ("company_id", 1)], unique=True)
    except Exception as e:
        print(f"Index creation: {e}")

    if await db.users.count_documents({}) > 0:
        # Re-seed only if forced - but check admin exists
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@bizmarket.az")
        admin = await db.users.find_one({"email": admin_email})
        if admin:
            # Ensure search-inline and sidebar ads exist (idempotent)
            await _ensure_search_ads(db)
            await _write_test_credentials()
            return

    print("Seeding initial data...")

    # ----- Categories -----
    if await db.categories.count_documents({}) == 0:
        for name, slug, icon, order in CATEGORIES:
            await db.categories.insert_one({
                "id": new_id(),
                "name": name,
                "slug": slug,
                "icon": icon,
                "order": order,
                "active": True,
                "description": f"{name} sahəsində aparıcı şirkətlər və xidmətlər.",
                "seo_title": f"{name} şirkətləri Azərbaycanda | BizMarket",
                "seo_description": f"Azərbaycanın ən yaxşı {name.lower()} agentliklərini tapın və müqayisə edin.",
                "created_at": now_iso(),
            })

    # ----- Plans -----
    if await db.plans.count_documents({}) == 0:
        await db.plans.insert_many([dict(p) for p in PLANS])

    # ----- Users (admin, demo buyer, demo provider) -----
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@bizmarket.az")
    admin_pass = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    buyer_email = os.environ.get("DEMO_BUYER_EMAIL", "buyer@bizmarket.az")
    buyer_pass = os.environ.get("DEMO_BUYER_PASSWORD", "Buyer123!")
    provider_email = os.environ.get("DEMO_PROVIDER_EMAIL", "provider@bizmarket.az")
    provider_pass = os.environ.get("DEMO_PROVIDER_PASSWORD", "Provider123!")

    admin_id = new_id()
    buyer_id = new_id()
    provider_id = new_id()

    await db.users.insert_many([
        {"id": admin_id, "email": admin_email, "password_hash": hash_password(admin_pass), "name": "Platform Admin", "role": "admin", "verified": True, "created_at": now_iso()},
        {"id": buyer_id, "email": buyer_email, "password_hash": hash_password(buyer_pass), "name": "Aysel Məmmədova", "role": "buyer", "phone": "+994 50 123 4567", "verified": True, "created_at": now_iso()},
        {"id": provider_id, "email": provider_email, "password_hash": hash_password(provider_pass), "name": "Elnur Hüseynov", "role": "provider", "phone": "+994 55 987 6543", "verified": True, "created_at": now_iso()},
    ])

    await db.buyer_profiles.insert_one({
        "id": new_id(), "user_id": buyer_id, "company_name": "TechRetail LLC", "sector": "E-commerce", "location": "Bakı", "created_at": now_iso()
    })

    # ----- Companies -----
    company_ids = []
    for idx, c in enumerate(SAMPLE_COMPANIES):
        owner_id = provider_id if idx == 0 else new_id()  # Demo provider owns first company
        if idx > 0:
            # Create a placeholder owner user for each
            await db.users.insert_one({
                "id": owner_id,
                "email": f"owner{idx}@example.az",
                "password_hash": hash_password("Provider123!"),
                "name": f"Owner {idx}",
                "role": "provider",
                "verified": True,
                "created_at": now_iso(),
            })
        cid = new_id()
        company_ids.append(cid)
        await db.companies.insert_one({
            "id": cid,
            "owner_id": owner_id,
            "name": c["name"],
            "slug": c["name"].lower().replace(" ", "-").replace(".", ""),
            "slogan": c["slogan"],
            "about": f"{c['name']} - peşəkar komandası və müştəri yönümlü yanaşması ilə Azərbaycanın qabaqcıl şirkətlərindən biridir. 50+ uğurlu layihə, beynəlxalq standartlar və innovativ həllər.",
            "location": LOCATIONS[idx % len(LOCATIONS)],
            "founded_year": 2015 + (idx % 8),
            "company_size": c["size"],
            "categories": c["cats"],
            "industries": c["industries"],
            "website": f"https://{c['name'].lower().replace(' ', '')}.az",
            "email": f"hello@{c['name'].lower().replace(' ', '')}.az",
            "phone": f"+994 12 {500 + idx:03d} {1000 + idx * 7:04d}",
            "social": {"linkedin": f"https://linkedin.com/company/{c['name'].lower().replace(' ', '-')}", "facebook": ""},
            "languages": ["az", "en", "ru"][:2 + (idx % 2)],
            "logo_url": c["logo"],
            "cover_url": c["cover"],
            "rating": c["rating"],
            "review_count": c["reviews"],
            "response_time": ["1 saat", "3 saat", "6 saat", "24 saat"][idx % 4],
            "verified": c["verified"],
            "featured": c["featured"],
            "sponsored": c["sponsored"],
            "status": "active",
            "plan": ["free", "pro", "premium"][idx % 3],
            "profile_completion": 75 + (idx % 25),
            "views_month": 200 + idx * 47,
            "shortlist_count": 12 + idx * 3,
            "created_at": days_ago(120 - idx * 5),
        })

        # Services for company
        for j, (sname, scat, sdesc, pmin, pmax, tl) in enumerate(SAMPLE_SERVICES_TPL[:3 + (idx % 3)]):
            if scat not in c["cats"]:
                continue
            await db.services.insert_one({
                "id": new_id(),
                "company_id": cid,
                "company_name": c["name"],
                "company_logo": c["logo"],
                "company_rating": c["rating"],
                "company_verified": c["verified"],
                "name": sname,
                "category": scat,
                "subcategory": "",
                "description": sdesc,
                "price_min": pmin,
                "price_max": pmax,
                "timeline": tl,
                "deliverables": ["Strategiya sənədi", "Aylıq hesabat", "Optimizasiya"],
                "technologies": ["Google Analytics", "Ahrefs", "Figma"],
                "industries": c["industries"],
                "status": "active",
                "sponsored": c["sponsored"] and j == 0,
                "featured": c["featured"] and j == 0,
                "views": 50 + j * 23,
                "clicks": 8 + j * 4,
                "created_at": days_ago(60 - j * 3),
            })

        # Portfolio
        for k, (ptitle, pclient, pind, prob, sol, res, met) in enumerate(PORTFOLIO_TPL):
            await db.portfolio.insert_one({
                "id": new_id(),
                "company_id": cid,
                "title": ptitle,
                "client_name": pclient,
                "industry": pind,
                "service_type": c["cats"][0] if c["cats"] else "",
                "problem": prob,
                "solution": sol,
                "result": res,
                "metrics": met,
                "image_url": f"https://images.unsplash.com/photo-{['1551434678-e076c223a692', '1454165804606-c3d57bc86b40', '1556761175-5973dc0f32e7', '1551288049-bebda4e38f71'][(idx + k) % 4]}?w=800&h=500&fit=crop",
                "link": "",
                "visibility": "public",
                "created_at": days_ago(30 - k * 5),
            })

        # Reviews
        for r in range(min(c["reviews"], 5)):
            await db.reviews.insert_one({
                "id": new_id(),
                "company_id": cid,
                "user_id": buyer_id if r == 0 else new_id(),
                "user_name": ["Aysel M.", "Rəşad Q.", "Lalə H.", "Anar S.", "Səbinə R."][r],
                "rating": [5, 5, 4, 5, 4][r],
                "title": ["Mükəmməl iş!", "Çox peşəkar komanda", "Vaxtında çatdırılma", "Yenidən işləyəcəyik", "Yaxşı kommunikasiya"][r],
                "text": "Komanda olduqca peşəkar yanaşdı, vaxtında bütün öhdəlikləri yerinə yetirdilər. Nəticədən çox razıyıq və gələcəkdə də əməkdaşlıq etməyi planlaşdırırıq.",
                "quality": 5, "communication": 5, "deadline": 4, "result": 5,
                "status": "approved",
                "created_at": days_ago(30 - r * 6),
            })

        # Team
        team_names = ["Aydan Əliyeva", "Rəşad Quliyev", "Lalə Həsənova", "Anar Səfərov"]
        team_roles = ["CEO", "CTO", "Design Lead", "Marketing Director"]
        for t in range(3):
            await db.team_members.insert_one({
                "id": new_id(),
                "company_id": cid,
                "name": team_names[t],
                "role": team_roles[t],
                "photo_url": f"https://images.unsplash.com/photo-{['1494790108377-be9c29b29330', '1500648767791-00dcc994a43e', '1438761681033-6461ffad8d80'][t]}?w=200&h=200&fit=crop",
                "linkedin": "",
                "email": "",
            })

        # Certificates
        if c["verified"]:
            for cert_name in ["ISO 9001:2015", "Google Partner"]:
                await db.certificates.insert_one({
                    "id": new_id(),
                    "company_id": cid,
                    "name": cert_name,
                    "issuer": "International Standards Org",
                    "expiry_date": "2027-12-31",
                    "status": "active",
                })

    # ----- Briefs by demo buyer -----
    brief1 = new_id()
    await db.briefs.insert_one({
        "id": brief1,
        "buyer_id": buyer_id,
        "buyer_name": "Aysel Məmmədova",
        "title": "E-commerce saytımız üçün SEO və performance optimallaşdırma",
        "category": "seo",
        "subcategory": "",
        "sector": "E-commerce",
        "budget_min": 3000, "budget_max": 8000,
        "deadline": "2026-04-30",
        "description": "Saytımızın trafiki son 6 ayda azalıb. Texniki SEO auditi və açar söz strategiyası lazımdır. Həmçinin Core Web Vitals optimallaşdırması gözlənilir.",
        "expected_result": "Organic trafik 50% artım, Top 10 sıralama hədəf açar sözlərində",
        "visibility": "open",
        "invited_companies": [],
        "status": "open",
        "proposals_count": 0,
        "created_at": days_ago(7),
    })

    brief2 = new_id()
    await db.briefs.insert_one({
        "id": brief2,
        "buyer_id": buyer_id,
        "buyer_name": "Aysel Məmmədova",
        "title": "Mobil tətbiq üçün UI/UX dizayn",
        "category": "design",
        "subcategory": "",
        "sector": "E-commerce",
        "budget_min": 2000, "budget_max": 6000,
        "deadline": "2026-05-15",
        "description": "iOS və Android üçün mobil tətbiqimizin yenidən dizaynı. Müasir, sürətli və konversiya yönümlü UX.",
        "expected_result": "Hazır Figma faylları, design system, prototype",
        "visibility": "selected",
        "invited_companies": company_ids[:3],
        "status": "open",
        "proposals_count": 0,
        "created_at": days_ago(3),
    })

    # Create proposals for first brief from 3 companies
    for i, cid in enumerate(company_ids[:3]):
        company = await db.companies.find_one({"id": cid})
        await db.proposals.insert_one({
            "id": new_id(),
            "brief_id": brief1,
            "company_id": cid,
            "company_name": company["name"],
            "company_logo": company["logo_url"],
            "company_rating": company["rating"],
            "title": f"Hərtərəfli SEO və performance paketi - {company['name']}",
            "text": "Saytınızı tam audit edib, 90 günlük strategiya hazırlayacağıq. Texniki SEO, content strategiyası və link-building daxildir.",
            "price": [5500, 6800, 7200][i],
            "timeline": ["8 həftə", "10 həftə", "12 həftə"][i],
            "stages": ["Audit", "Strategiya", "İmplementasiya", "Optimizasiya", "Hesabat"],
            "notes": "Aylıq hesabatlar və real-time dashboard daxildir.",
            "status": ["pending", "viewed", "pending"][i],
            "created_at": days_ago(5 - i),
        })
        await db.briefs.update_one({"id": brief1}, {"$inc": {"proposals_count": 1}})

    # Create leads for demo provider's company
    demo_company = await db.companies.find_one({"owner_id": provider_id})
    if demo_company:
        for i, b_id in enumerate([brief1, brief2]):
            await db.leads.insert_one({
                "id": new_id(),
                "brief_id": b_id,
                "company_id": demo_company["id"],
                "buyer_id": buyer_id,
                "status": ["new", "viewed"][i],
                "created_at": days_ago(5 - i),
            })

    # Shortlists
    for cid in company_ids[1:5]:
        await db.shortlists.insert_one({
            "id": new_id(),
            "user_id": buyer_id,
            "company_id": cid,
            "created_at": days_ago(10),
        })

    # Message thread between demo buyer and demo provider
    if demo_company:
        tid = new_id()
        await db.message_threads.insert_one({
            "id": tid,
            "participants": [buyer_id, provider_id],
            "buyer_name": "Aysel Məmmədova",
            "provider_name": demo_company["name"],
            "company_id": demo_company["id"],
            "last_message": "Salam, brief-i nəzərdən keçirə bildiniz?",
            "updated_at": days_ago(1),
            "created_at": days_ago(5),
        })
        msgs = [
            (buyer_id, "Aysel", "Salam, sizin SEO təklifiniz çox xoşumuza gəldi."),
            (provider_id, "Elnur", "Salam, təşəkkür edirik! Hansı suallarınız var?"),
            (buyer_id, "Aysel", "Aylıq hesabatların formatı barədə məlumat verə bilərsiniz?"),
            (provider_id, "Elnur", "Əlbəttə, sizə nümunə hesabat göndərəcəyik."),
            (buyer_id, "Aysel", "Salam, brief-i nəzərdən keçirə bildiniz?"),
        ]
        for i, (sid, sname, text) in enumerate(msgs):
            await db.messages.insert_one({
                "id": new_id(),
                "thread_id": tid,
                "sender_id": sid,
                "sender_name": sname,
                "text": text,
                "created_at": days_ago(5 - i),
            })

    # Blog posts
    if await db.blog_posts.count_documents({}) == 0:
        for i, p in enumerate(BLOG_POSTS):
            await db.blog_posts.insert_one({
                "id": new_id(),
                "title": p["title"],
                "slug": p["slug"],
                "excerpt": p["excerpt"],
                "cover_url": p["cover"],
                "content": "<h2>Giriş</h2><p>B2B xidmət bazarında düzgün partnyor seçimi biznesinizin uğurunun açarıdır. Bu yazıda əsas meyarları və praktiki məsləhətləri paylaşırıq.</p><h2>Əsas meyarlar</h2><p>Portfolio, müştəri rəyləri, kommunikasiya keyfiyyəti və sahə təcrübəsi - bunlar diqqət edilməli olan əsas faktorlardır. Düzgün seçim sayəsində layihələrinizin uğur şansı dəfələrlə artır.</p><h2>Praktiki məsləhətlər</h2><p>Həmişə bir neçə agentlikdən təklif alın, müqayisə edin və soruşduğunuz suallar konkret olsun. Brief-iniz nə qədər dəqiq olsa, alacağınız təkliflər o qədər keyfiyyətli olacaq.</p>",
                "author": "BizMarket Team",
                "status": "published",
                "tags": ["B2B", "Marketplace", "Seçim"],
                "created_at": days_ago(30 - i * 5),
            })

    # Ads
    if await db.ads.count_documents({}) == 0:
        for a in ADS:
            await db.ads.insert_one({"id": new_id(), "impressions": 1250, "clicks": 38, "created_at": now_iso(), **a})

    # Settings
    await db.settings.update_one({"id": "main"}, {"$set": {
        "id": "main",
        "site_name": "BizMarket",
        "default_language": "az",
        "currency": "AZN",
        "commission_rate": 5,
        "review_rules": "Yalnız tamamlanmış layihələrdən sonra rəy yazıla bilər.",
        "verification_rules": "Şirkət qeydiyyat sənədi, biznes email və sayt tələb olunur.",
        "maintenance_mode": False,
    }}, upsert=True)

    # Integration placeholders
    if await db.integrations.count_documents({}) == 0:
        for key, name in [
            ("payment", "Payment Provider"),
            ("smtp", "Email SMTP"),
            ("sms", "SMS / OTP"),
            ("oauth_google", "Google OAuth"),
            ("oauth_linkedin", "LinkedIn OAuth"),
            ("storage", "File Storage"),
            ("analytics", "Analytics"),
            ("ai", "AI API"),
            ("map", "Map / Location"),
        ]:
            await db.integrations.insert_one({
                "id": new_id(),
                "key": key,
                "name": name,
                "configured": False,
                "masked_fields": {},
                "updated_at": now_iso(),
            })

    # Audit logs
    if await db.audit_logs.count_documents({}) == 0:
        for i in range(8):
            await db.audit_logs.insert_one({
                "id": new_id(),
                "actor": "admin@bizmarket.az",
                "action": ["company.approved", "user.suspended", "ad.created", "category.updated", "review.deleted"][i % 5],
                "target": ["Nexora Digital", "spammer@x.az", "Homepage Banner", "Digital Marketing", "Review #1234"][i % 5],
                "created_at": days_ago(i),
            })

    print("Seed completed.")
    await _ensure_search_ads(db)
    await _write_test_credentials()


async def _ensure_search_ads(db):
    """Ensure search-inline and sidebar ads exist (idempotent)."""
    INLINE_ADS = [
        {
            "title": "Pro plana keçin və 30% endirim qazanın",
            "subtitle": "Premium görünürlük və limitsiz lead-lər",
            "image_url": "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=400&fit=crop",
            "link": "/pricing",
            "placement": "search-inline",
            "cta": "Planlara bax",
        },
        {
            "title": "Şirkətinizi sponsorlu edin",
            "subtitle": "Axtarış nəticələrində öncə görün, lead-ləri 3x artırın",
            "image_url": "https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?w=800&h=400&fit=crop",
            "link": "/provider/advertising",
            "placement": "search-inline",
            "cta": "Reklam et",
        },
    ]
    SIDEBAR_BANNERS = [
        {
            "title": "Featured Sponsor",
            "subtitle": "Markaların güvəndiyi B2B platforma",
            "image_url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=600&fit=crop",
            "link": "/pricing",
            "placement": "search-sidebar",
            "cta": "Provider ol",
        },
    ]
    for ad in INLINE_ADS + SIDEBAR_BANNERS:
        existing = await db.ads.find_one({"placement": ad["placement"], "title": ad["title"]})
        if not existing:
            await db.ads.insert_one({
                "id": new_id(),
                "status": "active",
                "priority": 7,
                "impressions": 0,
                "clicks": 0,
                "start_date": now_iso(),
                "end_date": days_ago(-60),
                "created_at": now_iso(),
                **ad,
            })


async def _write_test_credentials():
    content = f"""# Test Credentials

## Admin
- Email: {os.environ.get('ADMIN_EMAIL', 'admin@bizmarket.az')}
- Password: {os.environ.get('ADMIN_PASSWORD', 'Admin123!')}
- Role: admin

## Demo Buyer
- Email: {os.environ.get('DEMO_BUYER_EMAIL', 'buyer@bizmarket.az')}
- Password: {os.environ.get('DEMO_BUYER_PASSWORD', 'Buyer123!')}
- Role: buyer

## Demo Provider
- Email: {os.environ.get('DEMO_PROVIDER_EMAIL', 'provider@bizmarket.az')}
- Password: {os.environ.get('DEMO_PROVIDER_PASSWORD', 'Provider123!')}
- Role: provider

## Auth Endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/demo-login  body: {{"role":"buyer|provider|admin"}}
- POST /api/auth/logout
- GET  /api/auth/me
"""
    try:
        import os as _os
        _os.makedirs("/app/memory", exist_ok=True)
        with open("/app/memory/test_credentials.md", "w") as f:
            f.write(content)
    except Exception as e:
        print(f"Could not write test creds: {e}")
