# BizMarket - B2B Services Marketplace SaaS (Azerbaijan)

## Problem Statement
Build a full-stack B2B Services Marketplace SaaS platform (like Clutch.co + Sortlist + Fiverr Business) in Azerbaijani with EN/RU support, AZN currency, JWT auth (with demo accounts), MongoDB real CRUD + seed data, placeholder integrations in admin.

## Architecture
- **Backend**: FastAPI + Motor (MongoDB async) + JWT (bcrypt)
- **Frontend**: React 19 + React Router 7 + Tailwind + Shadcn UI + Sonner + Recharts
- **Auth**: JWT Bearer tokens (localStorage) + httpOnly cookie fallback
- **Single file backend**: /app/backend/server.py (all routes), /app/backend/seed_data.py (12 companies, 20 categories, 4 plans, sample briefs/proposals/reviews/team/portfolio/ads/blog)

## User Personas / Roles
- Logged-out visitor (browse, search, view profiles)
- Buyer (search, shortlist, compare, brief, proposals, messages)
- Provider (company profile, services, portfolio, leads, proposals, analytics, billing)
- Admin (companies/users/categories/reviews/ads/plans/integrations/audit)

## Demo Credentials (in /app/memory/test_credentials.md)
- Admin: admin@bizmarket.az / Admin123!
- Buyer: buyer@bizmarket.az / Buyer123!
- Provider: provider@bizmarket.az / Provider123!

## Implemented (Feb 2026)
- Public: Home (hero search, categories, featured, CTAs), Services search, Companies search, Category, Company public profile (cover/logo/tabs/services/portfolio/reviews/team/certs), Service detail, Pricing (4 plans + add-ons), Blog list+detail, Buyer/Provider landings, About, Contact, FAQ, Terms
- Auth: Login (with 3 demo buttons), Register choice page, Buyer register, Provider register, Forgot password (placeholder)
- Buyer dashboard: Overview widgets, Shortlist, Compare table, Create brief, My briefs, Brief detail (with accept/reject proposals), Received proposals, Messages (full thread UI), Settings
- Provider dashboard: Overview (profile completion + stats), Company profile edit, Services CRUD, Portfolio CRUD, Leads (with proposal modal), Proposals sent, Analytics (charts), Advertising marketplace, Billing (plans + history), Settings
- Admin panel: Dashboard (stats + charts), Companies (approve/suspend/verify/feature), Users, Categories CRUD, Reviews moderation, Leads, Briefs, Ads CRUD, Plans price editor, Settings, Integrations (masked credentials), Audit logs
- Multi-language: AZ/EN/RU (header switch, dictionary in /app/frontend/src/lib/i18n.jsx)
- All 35/35 backend tests passed

## Next Action Items (P1/P2)
- P1: Provider verification flow page (apply with documents)
- P1: Search saved searches + email alerts
- P1: Review invite flow (provider invites client to leave review)
- P1: Sponsored ad inline cards in search results (currently only top banner)
- P2: Real Stripe billing integration
- P2: Real email/SMS notifications
- P2: SEO landing pages for /az/baku/category combinations
- P2: Team management for provider
- P2: Buyer onboarding wizard (multi-step)
