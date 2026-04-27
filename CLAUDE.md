# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

Olrac Adverse is an advertising platform for booking ad slots on physical screens. One shared FastAPI backend serves two separate React frontends built from the same codebase:

- **Client site** (`:5173`) — public-facing: browse locations on a map, view screen details, submit bookings
- **Admin site** (`:5174`) — admin-only: manage screens, review bookings, download invoices, view AI analytics, configure settings

## Commands

### Backend

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

Requires a running PostgreSQL instance and a configured `backend/.env` (copy from `backend/.env.example`). Tables are created automatically on startup; `schema_maintenance.py` runs ALTER TABLE migrations for columns added after the initial schema.

### Frontend

```bash
cd frontend
npm install --legacy-peer-deps   # must use --legacy-peer-deps
npm run dev:client               # client at http://localhost:5173
npm run dev:admin                # admin at http://localhost:5174
npm run build:client             # outputs to dist/client
npm run build:admin              # outputs to dist/admin
```

For PDF invoice generation, run once:

```bash
python -m playwright install
```

## Architecture

### Dual-site frontend from one codebase

`VITE_SITE_MODE` (or `--mode client/admin` flag) controls which site is built. `frontend/src/utils/siteMode.js` exposes `isAdminSite` and helpers used throughout the app. `App.jsx` renders `<AdminRoutes>` or `<ClientRoutes>` based on this flag. The Vite config reads the mode to set the dev server port and build output directory.

### Backend structure

```
backend/app/
  main.py              — FastAPI app, lifespan (table creation + admin seed), CORS, router registration
  config.py            — All env vars; JWT secret auto-generates to .jwt_secret if not set
  models.py            — SQLAlchemy ORM: User, Screen, Booking, SystemSettings
  schemas.py           — Pydantic v2 request/response schemas
  schema_maintenance.py — Runtime ALTER TABLE migrations (no Alembic)
  database.py          — Engine + SessionLocal
  default_admin.py     — Seeds admin@olrac.com / admin123 on first boot
  auth.py / deps.py    — JWT auth, FastAPI dependency injection
  routers/
    auth_router.py        — POST /api/auth/login, password reset OTP flow
    screens_router.py     — GET /api/screens (public), /api/screens/config/public
    bookings_router.py    — POST /api/bookings (public booking submission)
    admin_router.py       — All /api/admin/* routes (screens CRUD, bookings management, invoice download, settings)
    ai_router.py          — POST /api/ai/polish (public), admin insights
    public_settings_router — GET /api/screens/config/public
  invoice_service.py   — PDF (Playwright) and DOCX invoice generation
  quotation_service.py — Quotation data attached to bookings
  ai_service.py        — Groq API integration (llama3-70b-8192 by default)
  otp_service.py       — In-memory OTP store for email OTP flows
  email_service.py     — SMTP email sending
  slot_sync_service.py — Syncs booked_slots count on Screen from confirmed bookings
  settings_service.py  — Read/write SystemSettings (stored as JSON in DB)
```

### Frontend structure

```
frontend/src/
  api/axios.js         — Axios instance; base URL is /api (proxied to backend in dev); attaches JWT from localStorage; 401 → redirect to /login
  context/
    auth-context.js / AuthProvider.jsx  — JWT auth state, login/logout
    PublicSettingsContext.jsx           — Fetches /api/screens/config/public; caches in localStorage
  utils/siteMode.js    — isAdminSite, adminPath(), getPostLoginPath()
  pages/               — All pages (Landing, Locations, LocationDetail, Booking, Login, AdminDashboard, AdminBookings, AdminScreens, AdminSettings, AdminInsights)
  components/admin/    — Admin-specific UI components
```

### Database schema notes

- No Alembic. New columns are added via `schema_maintenance.py` on startup using raw ALTER TABLE. When adding a new column to a model, also add the migration there.
- `Booking.billing_cycle` is deprecated (kept for parsing). Use `duration_label`, `duration_days`, `duration_hours` instead.
- `Booking.selected_screen_ids` / `selected_screens` support multi-screen bookings.
- `SystemSettings.config` is a freeform JSON blob that holds all configurable settings (invoice branding, WhatsApp template, booking durations, etc.).

### Key behaviors

- **AI failures are non-blocking** — ad text polishing and insights calls catch exceptions and degrade gracefully.
- **Authentication** — JWT stored in `localStorage` as `olrac_token`. Admin routes use `ProtectedRoute adminOnly`. The client site has no login; `/login` redirects to `/locations`.
- **Uploads** — Screen images/videos are stored in `backend/uploads/` and served at `/uploads` via `StaticFiles`.
- **CORS** — Dev origins are whitelisted by regex; production origins are listed in `CORS_ORIGINS` env var.
- **OTP** — In-memory store (`otp_service.py`); restarting the backend invalidates all pending OTPs.

## Environment Variables

Backend (`backend/.env`): `DATABASE_URL`, `JWT_SECRET_KEY`, `GROQ_API_KEY`, `SMTP_*`, `WHATSAPP_ADMIN_NUMBER`, `CORS_ORIGINS`, `DEFAULT_ADMIN_*`

Frontend (`frontend/.env.local`): `VITE_API_TARGET` (dev proxy target, default `http://localhost:8000`), `VITE_SITE_MODE` (`client` or `admin`), `VITE_ADMIN_SITE_URL`, `VITE_CLIENT_SITE_URL`
