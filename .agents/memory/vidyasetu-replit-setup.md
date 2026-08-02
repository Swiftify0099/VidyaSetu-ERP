---
name: VidyaSetu Replit setup
description: Durable setup decisions for running the VidyaSetu ERP source tree on Replit
---

The repository's active source is the root `frontend/` and `backend/` directories. Artifact copies can be stale or deleted; workflows should run from the root source tree.

**Why:** The Docker project was uploaded with a `DATABASE_URL` pointing at localhost, while Replit injects managed PostgreSQL through the `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE` variables.

**How to apply:** `backend/app/core/config.py` preserves Docker URLs for local use but replaces localhost database URLs with Replit's runtime PG variables when `PGHOST` is present. Do not expose or manually recreate the managed database secret.

The old Docker Alembic schema was behind the current ORM. Forward-only compatibility migrations reconcile auth, settings, model columns, and legacy required columns without dropping existing tables. The seed script resolves the current academic year by `is_current=True` instead of assuming database ID 1.

**Why:** Login and seed operations otherwise fail on missing `password_hash`, missing current model fields, legacy `permissions.name`, and hardcoded academic-year foreign keys.

**How to apply:** Run `cd backend && PYTHONPATH=. python -m alembic upgrade head && PYTHONPATH=. python -m app.modules.seeds.seed` before starting the backend.

Replit frontend defaults: use same-origin `/api/v1`; if a Replit preview sees a Docker-style `VITE_API_URL` containing localhost, the frontend overrides it with `/api/v1`. Vite must run on `0.0.0.0:5000` with `allowedHosts: true`.

**Why:** The Replit preview iframe cannot reach a browser-local Docker localhost URL, and Vite rejects the proxied Replit hostname unless hosts are allowed.

**How to apply:** Keep the `VidyaSetu ERP` workflow serving Vite on port 5000 and FastAPI on port 8000; verify `/api/v1/health` and `/api/v1/auth/login`.