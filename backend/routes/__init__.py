"""Brify route modules — per-domain FastAPI routers.

This package implements the spec Phase 2 modular split. Each module
declares its own `APIRouter` and a `setup(deps)` function that captures
the shared helpers from `server.py` (db, require_role, audit, etc.)
via a thin dependency-injection mechanism, returning the configured
router for mounting.

Mounted from server.py with explicit priority over the legacy
`/api/{generic}` fallbacks.

Current modules:
  * admin_resources — generic admin/{resource} CRUD + audit log
  * media           — file upload, serve, delete
  * (Future: marketplace, briefs, billing, etc.)
"""
