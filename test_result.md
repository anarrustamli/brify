#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

user_problem_statement: |
  Upgrade existing Brify B2B services marketplace (Azerbaijan) to production-grade.
  Backend: FastAPI, ~3000-line server.py, 38 collections, JWT.
  Frontend: React 19 + Router 7 + Tailwind + Shadcn.
  PHASE 1 FOCUS: backend production logic — plan limits, subscription lifecycle,
  verification, review protection, lead expiry, open briefs, admin-managed plans,
  background jobs, indexes/migrations. Manual billing now; Payriff/Epoint
  stubs prepared. AZ + EN. Preserve all existing business flows.

backend:
  - task: "Production wiring (indexes, migrations, jobs scheduler)"
    implemented: true
    working: true
    file: "/app/backend/db_setup.py, /app/backend/jobs_scheduler.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Added on-startup index creation, backfill migrations (briefs visibility/expiry, leads source/expiry, subscription periods, plan usage counters), and a 15-min background jobs scheduler covering subscription expiry, lead expiry, brief expiry, and 7/3/1-day expiry notifications."

  - task: "PlanLimitService + usage counters + storage enforcement"
    implemented: true
    working: true
    file: "/app/backend/business_services.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "PlanLimitService reads limits from active subscription snapshot first, then plan doc. New plan_usage_counters collection tracks monthly leads_received_count, open_briefs_unlocked_count, proposals_sent_count, storage_used_bytes. Existing _check_plan_limit still works."

  - task: "Subscription lifecycle (request → invoice → mark paid → activate → expire)"
    implemented: true
    working: true
    file: "/app/backend/business_services.py, /app/backend/business_routes.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "SubscriptionService.request_upgrade creates invoice + pending sub. mark_invoice_paid activates subscription + sets period_end + plan snapshot + downgrades company on expiry. POST /me/subscription/request-upgrade + POST /admin/invoices/{id}/mark-paid + POST /admin/subscriptions/{id}/extend|cancel. Smoke test confirmed full flow works."

  - task: "Payment provider abstraction (manual + payriff/epoint stubs)"
    implemented: true
    working: true
    file: "/app/backend/business_services.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "PaymentProvider.for_company() picks manual/epoint/payriff based on settings. Manual returns bank instructions. Epoint/Payriff stubs report not_configured when keys missing — no fake 'connected' UI. /admin/payment-provider/status reports honest state."

  - task: "Verification flow (provider submit, admin approve/reject/needs-info)"
    implemented: true
    working: true
    file: "/app/backend/business_routes.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "POST /me/verification/submit (one open request rule), GET /me/verification, GET /admin/verification/queue?status=..., POST /admin/verification/{id}/(approve|reject|needs-info). Approval flips company.verified, sets verified_at, sends notification. Tested end-to-end."

  - task: "Protected reviews (require completed project + auto project creation)"
    implemented: true
    working: true
    file: "/app/backend/business_routes.py, /app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Project doc created automatically when buyer accepts proposal (update_proposal_status patched). New POST /projects/{id}/complete (buyer-only) + POST /reviews/verified (project must be completed, one review per project). Existing /reviews endpoint remains for legacy compatibility."

  - task: "Open brief marketplace (provider discovery + unlock)"
    implemented: true
    working: true
    file: "/app/backend/business_routes.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "GET /me/open-briefs lists visibility=open briefs with anonymized fields until unlock + leads quota. POST /me/open-briefs/{bid}/unlock creates lead, bumps counter, enforces lead limit, returns 402 if over."

  - task: "Lead lifecycle (lock-on-limit, expiry, view/proposal_sent/accepted)"
    implemented: true
    working: true
    file: "/app/backend/server.py, /app/backend/business_routes.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "invite_company_to_brief now sets expires_at + checks lead limit (creates locked lead if over). create_proposal requires non-locked, non-expired lead. PUT /me/leads/{id}/view sets viewed_at + viewed status. Lead expiry handled by jobs scheduler."

  - task: "Admin-managed plans v2 (versioned, audit logged)"
    implemented: true
    working: true
    file: "/app/backend/business_routes.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "POST /admin/plans (create), PATCH /admin/plans/{id} (versioned update), POST /admin/plans/{id}/(duplicate|activate|deactivate), GET subscribers + versions. New collection subscription_plan_versions stores each snapshot. GET /public/plans returns active+visible plans dynamically. Existing /api/plans + /api/admin/plans (PUT) preserved for backward compatibility."

frontend:
  - task: "Provider Billing v2 (plan grid + usage progress + invoices + payment instructions)"
    implemented: true
    working: true
    file: "/app/frontend/src/pages/provider/Billing.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Rebuilt with tabs (Planlar/İstifadə/Faktura), monthly/yearly toggle, plan-status snapshot, period_end + expiring warning, payment_instructions display when manual gateway, real /me/invoices integration."

  - task: "Provider Verification page (submit + status banner)"
    implemented: true
    working: true
    file: "/app/frontend/src/pages/provider/Verification.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "New page mounted at /provider/verification with status banner (pending/needs_more_info/approved/rejected), rejection reason display, form prefilled from latest request."

  - task: "Provider Open Briefs marketplace"
    implemented: true
    working: true
    file: "/app/frontend/src/pages/provider/OpenBriefs.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Mounted at /provider/open-briefs. Lists open briefs with anonymized fields until unlock, shows quota banner, unlock button. Disabled when monthly limit reached."

  - task: "Buyer Projects page (complete project + verified review)"
    implemented: true
    working: true
    file: "/app/frontend/src/pages/buyer/Projects.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Mounted at /buyer/projects. Lists projects (auto-created on proposal accept). Active → 'Tamamla'. Completed → 'Verified rəy yaz'. Review modal collects 1-5 star + title + text."

  - task: "Admin Verification queue (approve/reject/needs-info with dialog)"
    implemented: true
    working: true
    file: "/app/frontend/src/pages/admin/Verification.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Replaces generic ResourcePage at /admin/verification. Tabs by status, request detail card, action dialog. Rejection requires reason."

  - task: "Provider Leads page handles locked/expired statuses"
    implemented: true
    working: true
    file: "/app/frontend/src/pages/provider/Leads.jsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Locked leads show upgrade CTA. Expired leads show explanatory message. Send-proposal button hidden for terminal/locked states. Shows days-until-expiry badge."

  - task: "Frontend branding (BizMarket → Brify)"
    implemented: true
    working: true
    file: "/app/frontend/src/"
    stuck_count: 0
    priority: "low"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "User-facing references updated. Backend variable names preserved per spec to avoid risk."

metadata:
  created_by: "main_agent"
  version: "2.0"
  test_sequence: 0
  run_ui: true

test_plan:
  current_focus:
    - "Subscription lifecycle (request → invoice → mark paid → activate → expire)"
    - "Protected reviews (require completed project + auto project creation)"
    - "Verification flow (provider submit, admin approve/reject/needs-info)"
    - "Lead lifecycle (lock-on-limit, expiry, view/proposal_sent/accepted)"
    - "Open brief marketplace (provider discovery + unlock)"
    - "Admin-managed plans v2 (versioned, audit logged)"
    - "Provider Billing v2 (plan grid + usage progress + invoices + payment instructions)"
    - "Buyer Projects page (complete project + verified review)"
  stuck_tasks: []
  test_all: true
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Phase 1 production logic implementation complete. New backend modules:
      db_setup.py (indexes + migrations), business_services.py (PlanLimitService +
      SubscriptionService + PaymentProvider), business_routes.py (verification,
      projects, protected reviews, open briefs, lead lifecycle, plan v2, admin
      billing actions), jobs_scheduler.py (background tasks).

      Existing single-file server.py preserved; only minimal patches:
      * invite_company_to_brief — adds expires_at + plan lead limit check
      * create_proposal — requires non-locked, non-expired lead + bumps counters
      * update_proposal_status — auto-creates project on accept + updates lead status
      * startup hook — indexes/migrations/jobs runner
      * router include order — explicit routes win over /admin/{resource} fallback

      All smoke tests pass:
      - provider demo-login + plan-usage + current-plan
      - submit verification + admin queue + approve flow
      - subscription upgrade request → invoice → mark-paid → active w/ snapshot
      - admin plan create + list (slug "starter" appeared)
      - open briefs discovery + leads quota
      - jobs run-expiry-check returns counts

      Frontend wired: Billing v2, Verification, Open Briefs, Projects, Admin
      Verification with action dialog. Branding normalized to Brify.

      Test credentials (in /app/memory/test_credentials.md):
        admin@bizmarket.az / Admin123!
        buyer@bizmarket.az / Buyer123!
        provider@bizmarket.az / Provider123!

      Please validate end-to-end. Focus tests on:
      1. Provider can submit verification, admin approves, verified badge flips.
      2. Buyer creates brief invited to provider; provider sees lead with expires_at.
      3. Provider sends proposal → buyer accepts → project auto-created → buyer
         completes → buyer leaves verified review → company.rating recomputes.
      4. Provider requests upgrade → invoice created → admin marks paid → plan
         changes to "pro" with current_period_end set; company.plan reflects it.
      5. Admin creates a new plan via POST /admin/plans, then GET /public/plans
         includes it; plan_versions records version=1.
      6. Provider hits monthly lead limit → next invite creates lead in "locked"
         status; provider sees lock + upgrade CTA.
      7. Open brief flow: buyer publishes open brief, provider sees it in
         /me/open-briefs (anonymized), unlocks (consumes 1 lead), sees full
         details.
      8. Existing flows still work: login, search companies, shortlist,
         compare, send brief invite, admin dashboard stats, audit logs.
