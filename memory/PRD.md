# Brify — B2B Services Marketplace SaaS (Azerbaijan)

## Problem Statement
Upgrade existing Brify B2B services marketplace (Clutch / GoodFirms-style, AZN currency) into a real production-grade platform.
Two-sided marketplace: Buyer searches → shortlists → compares → publishes brief → providers respond with proposals → buyer accepts → project → verified review. Monetization via provider subscriptions.

User-facing brand: **Brify**. Internal variable names may still say BizMarket where renaming is risky.

## Architecture

### Backend (FastAPI + Motor MongoDB)
- `server.py` — original 3000-line single file, all existing routes preserved
- `business_services.py` — PlanLimitService, SubscriptionService, PaymentProvider abstraction
- `business_routes.py` — verification, projects, protected reviews, open briefs, lead lifecycle, admin plan v2, admin billing actions, jobs trigger
- `db_setup.py` — startup indexes + idempotent migrations
- `jobs_scheduler.py` — async background runner (15-min interval) for subscription/lead/brief expiry
- `seed_data.py` — bootstraps demo users, plans, companies, briefs, leads, proposals, blog

### Frontend (React 19 + Router 7 + Tailwind + shadcn/radix + sonner)
- `pages/{public,auth,buyer,provider,admin}` — role-based
- New pages: `provider/Verification`, `provider/OpenBriefs`, `buyer/Projects`, `admin/Verification`
- Rebuilt: `provider/Billing` (tabs, usage progress, invoices, manual payment instructions)
- Enhanced: `provider/Leads` (handles locked/expired states with upgrade CTA)
- `lib/i18n` — AZ + EN (RU retained from previous build)

## User Personas / Roles
- Buyer — search, compare, brief, proposals, accept/reject, complete project, verified review
- Provider — profile, services, portfolio, leads, open-brief unlock, proposals, verification, billing
- Admin sub-roles: super_admin, moderator, sales_admin, support_admin, content_manager — module-level access enforced on both backend (`_require_admin_module`) and frontend (sidebar filtered by /admin/me/permissions)

## Demo Credentials (`/app/memory/test_credentials.md`)
- Admin: `admin@bizmarket.az / Admin123!`
- Buyer: `buyer@bizmarket.az / Buyer123!`
- Provider: `provider@bizmarket.az / Provider123!`

## Phase 1 — Implemented (Feb 2026)

### Production business logic (NEW)
- **Plan limits** — PlanLimitService reads from active subscription's plan_snapshot first, falls back to plans collection. Per-company custom_limits override available. Lead/service/portfolio/branch/storage limits enforced. New `plan_usage_counters` collection tracks monthly leads, open brief unlocks, proposals sent, storage bytes per period.
- **Subscription lifecycle** — POST `/me/subscription/request-upgrade` creates a `pending_payment` subscription + invoice with bank-transfer instructions. Admin POST `/admin/invoices/{id}/mark-paid` activates the subscription, sets `current_period_end`, stores plan_snapshot. `expire_due_subscriptions` job downgrades expired subs to Free. Admin can `extend|cancel` subscriptions.
- **Payment provider abstraction** — `PaymentProvider.for_company(db)` selects manual / epoint / payriff based on settings. Manual returns bank instructions. Epoint and Payriff stubs report `not_configured` until credentials are added — no fake "connected" UI. `/admin/payment-provider/status` reports honest state.
- **Verification flow** — Provider POST `/me/verification/submit` (validates required fields first, rejects duplicate-open with 409). Admin queue at `/admin/verification/queue?status=...` with approve / reject (reason required) / needs-more-info actions, all audit-logged and notified in-app. Approval flips `company.verified=true`.
- **Protected reviews** — Project doc auto-created when buyer accepts a proposal. Buyer POST `/projects/{id}/complete` → POST `/reviews/verified` (must be project owner + project completed + no duplicate). Company rating recomputed via aggregation. Existing `/reviews` endpoint preserved as legacy.
- **Open brief marketplace** — Provider GET `/me/open-briefs` lists visibility=open briefs with sensitive fields hidden until unlock. POST `/me/open-briefs/{id}/unlock` creates a lead (counts against monthly limit). Auto-unlock also happens when provider sends a proposal directly to an open brief.
- **Lead lifecycle** — invite_company_to_brief sets `expires_at = +7d` and creates lead in `locked` status when monthly limit exceeded. create_proposal blocks on locked/expired leads. PUT `/me/leads/{id}/view` records viewed_at.
- **Admin-managed plans v2** — POST `/admin/plans` (create), PATCH (versioned), `/duplicate|/activate|/deactivate|/subscribers|/versions`. New `subscription_plan_versions` collection captures each snapshot. Public `/public/plans` returns active+visible plans dynamically.
- **Background jobs** — 15-min scheduler runs subscription_expiry, lead_expiry, brief_expiry, and 7/3/1-day expiry notifications. Manual trigger via POST `/admin/jobs/run-expiry-check`.
- **Indexes + migrations** — Idempotent on startup. Backfills missing visibility/expires_at on briefs, source/expires_at/status on leads, current_period_end/plan_snapshot on active subscriptions, plan_usage_counters for existing companies, legacy=true on reviews without project_id.

### Frontend
- Provider Billing v2 — plan grid with monthly/yearly toggle, usage progress bars, invoice history, manual payment instructions card
- Provider Verification page — submit form, status banner (pending / needs_more_info / approved / rejected), rejection reason display
- Provider Open Briefs marketplace — quota banner, unlock button, locked vs unlocked detail display
- Buyer Projects page — complete-project + verified-review dialogs (1-5 stars + title + text)
- Admin Verification queue — tabbed by status, action dialog with reason/note fields
- Provider Leads — handles locked (upgrade CTA) and expired (informational) states, days-until-expiry badge
- Branding normalized — "BizMarket" → "Brify" across user-facing pages

## Backlog (P1 / P2)

### P1 — Next iteration
- Backend modular refactor: split server.py and business_routes.py into per-domain modules (`api/v1/*.py` + `modules/*/service.py`) per spec Phase 2
- Email notifications (Resend / SendGrid / SMTP) — currently in-app only
- Real Payriff + Epoint integrations once credentials provided
- File upload UI for verification documents (currently free-form `documents` array)
- Full EN i18n coverage on new pages (Verification, Projects, Open Briefs, Billing v2 — currently AZ labels)
- Admin Plans page upgrade: create/edit/version-history UI (backend endpoints ready)
- Search ranking: verified + featured + response-rate boost (backend signals exist)
- SEO meta tags + dynamic sitemap.xml + JSON-LD on public profiles
- Storage limit enforcement on `/media` upload path (counter exists, hook not yet wired)

### P2 — Marketing & growth
- Provider onboarding wizard (multi-step)
- Buyer onboarding (brief wizard polish)
- Featured-placement carousel + boost analytics
- 2FA for admin / super_admin
- Refund / dispute admin workflow
- Public review reply moderation queue

## How to Run
Backend (already running via supervisor):
```
/root/.venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```
Frontend:
```
cd /app/frontend && yarn start  # supervisor manages this
```
Required env (`/app/backend/.env`):
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=brify_db
JWT_SECRET=...   # ≥32 chars
JOBS_INTERVAL_SECONDS=900  # optional
```
For Payriff / Epoint:
```
PAYRIFF_MERCHANT_ID=...
PAYRIFF_SECRET_KEY=...
EPOINT_PUBLIC_KEY=...
EPOINT_PRIVATE_KEY=...
```

## Test Results
- New Phase-1 production suite: **26/28 pass** (2 env-driven skips)
- iteration_5 targeted fixes: **13/13 pass**
- Legacy regression: **34/35 pass** (1 pre-existing /api/blog shape assertion, intentional)
- Total: **73/75 non-skipped (97%)**
