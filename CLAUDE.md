# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Requirements live in `Промпт для вишлиста.md` (in Russian) and are authoritative. The README covers deployment and how things work.

Decisions made with the owner, beyond the spec:

- Guests can **reserve** a gift ("я подарю это"). One reservation per gift, and only the device that made it can remove it. Reservations are **hidden from the admin**, so they never appear in the admin API.
- Likes are visible only to the guest who made them. The admin sees only like counts.
- The public page shows **only the nearest** holiday. With no upcoming holiday, it shows all active gifts.
- Photos can be uploaded (normalized to WebP plus a `_t` thumbnail in `/data/uploads`) or given as an external URL.

## Commands

```bash
# backend (Python 3.13 venv in backend/.venv)
cd backend && .venv/bin/python -m pytest                 # tests
cd backend && .venv/bin/alembic revision --autogenerate -m "msg"   # new migration
cd backend && .venv/bin/uvicorn app.main:app --reload    # dev server :8000

# frontend
cd frontend && npm run dev     # :5173, proxies /api /uploads /g to :8000
cd frontend && npm run build   # tsc + vite
cd frontend && npm run lint    # oxlint

# full stack
docker compose up -d --build   # needs .env (see .env.example)
```

## Architecture

- There is one container, built in multiple stages: Vite builds the SPA, then FastAPI serves `/api`, `/uploads`, `/g/<token>` and the SPA (catch-all → `index.html`). Uvicorn runs **one worker** on purpose, because of SQLite and the in-memory login rate limit.
- `backend/app`:
  - `models.py` — SQLAlchemy 2 models
  - `schemas.py` — Pydantic
  - `holidays.py` — next-occurrence logic
  - `routers/public.py` — public routes
  - `routers/admin.py` — admin routes; every route except login and logout requires the admin cookie
  - `main.py` — device-cookie middleware and static serving
- All schema changes go through Alembic (`render_as_batch=True` for SQLite). Tests run the migrations.
- The public API must never include `desire`; there is a test for this. Gifts come out sorted by desire, with the device's liked gifts first. Each gift has a `rank` field so the client can re-sort after a like without seeing desire levels.
- `frontend/src`:
  - `pages/PublicPage.tsx` — public page
  - `pages/admin/*` — admin tabs: gifts, holidays, links + QR
  - `lib/holidayThemes.ts` — theme metadata
  - `index.css` — theme CSS variables
  - `lib/qrCard.ts` — QR card rendering
- Holiday themes: `none, new_year, birthday, valentine, feb23, march8, halloween, anniversary`. To add a theme, update the `Theme` Literal in `schemas.py`, `types.ts`, `HOLIDAY_THEMES`, and the CSS blocks for light and dark.

## Deployment constraint

The Compose stack exposes exactly one port, bound to `127.0.0.1`. Caddy runs outside Compose on the host and proxies the domain to that port. Do not publish other ports or bind the host side to `0.0.0.0`.
