# Olrac Adverse — Advertising Platform

Olrac Adverse is a full-stack platform for booking ad slots on physical screens across locations. One shared FastAPI backend powers two separate React frontends built from the same codebase.

- **Client site** (`olracad.com`) — public-facing: browse locations on a map, view screen details, submit booking requests
- **Admin site** (`admin.olracad.com`) — admin-only: manage screens, review bookings, send quotations, download invoices, view AI analytics, configure settings

---

## What You Can Do

**Client site**
- Explore screen locations on an interactive map and card view
- View screen details, pricing, and available slots
- Submit a booking request with ad content
- WhatsApp handoff for quick confirmation

**Admin site**
- Log in with admin credentials
- Add, edit, and deactivate screens
- Set screen location with a map picker or auto-geocoding
- Review, approve, or cancel bookings
- Send quotations to clients (PDF or email)
- Download invoices as PDF or DOCX
- Configure invoice branding, payment details, notes, signature
- View AI-powered revenue insights and booking analytics

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite, Tailwind CSS, React Router, Framer Motion |
| Maps | Leaflet + OpenStreetMap |
| Backend | FastAPI, SQLAlchemy, Pydantic v2, Gunicorn |
| Database | PostgreSQL |
| PDF Generation | Playwright (Chromium) |
| AI | Groq API (llama3-70b-8192) |
| Email | SMTP (Gmail) |
| Deployment | AWS EC2 + Nginx + Let's Encrypt |
| CI/CD | GitHub Actions (auto-deploy on push to main) |

---

## Project Structure

```
olrac/
  backend/
    app/
      main.py              # FastAPI app entry point
      config.py            # All env vars
      models.py            # SQLAlchemy ORM models
      schemas.py           # Pydantic request/response schemas
      database.py          # DB engine + session
      default_admin.py     # Seeds default admin on first boot
      schema_maintenance.py# Runtime ALTER TABLE migrations
      routers/
        auth_router.py     # Login, OTP password reset
        screens_router.py  # Public screens API
        bookings_router.py # Public booking submission
        admin_router.py    # All admin CRUD + invoice endpoints
        ai_router.py       # AI text polish + insights
        public_settings_router.py
      invoice_service.py   # PDF + DOCX invoice generation
      quotation_service.py # Quotation data attached to bookings
      ai_service.py        # Groq API integration
      email_service.py     # SMTP email sending
      otp_service.py       # In-memory OTP store
      settings_service.py  # Read/write SystemSettings JSON
    uploads/               # Uploaded screen images/videos
    requirements.txt
    .env.example
  frontend/
    src/
      pages/               # All pages (Landing, Locations, Booking, Admin*)
      components/          # Shared + admin-specific UI components
      context/             # Auth + PublicSettings context
      utils/siteMode.js    # isAdminSite, adminPath() helpers
      api/axios.js         # Axios instance with JWT + proxy
    package.json
  .github/
    workflows/
      deploy.yml           # GitHub Actions CI/CD
  DEPLOYMENT_GUIDE.txt     # Full EC2 + GoDaddy deployment guide
```

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL running locally

### 1. Database

```sql
CREATE DATABASE olrac_db;
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL and other values in .env
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8001
```

Tables are created automatically on startup. A default admin is seeded:
- Email: `admin@olrac.com`
- Password: `admin123`

For PDF invoice generation, install Playwright once:

```bash
python -m playwright install chromium
```

### 3. Frontend

```bash
cd frontend
npm install --legacy-peer-deps

npm run dev:client   # Client site -> http://localhost:5173
npm run dev:admin    # Admin site  -> http://localhost:5174
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET_KEY` | Secret for signing JWTs (`openssl rand -hex 32`) |
| `JWT_ALGORITHM` | `HS256` |
| `JWT_EXPIRY_MINUTES` | Token lifetime in minutes |
| `GROQ_API_KEY` | Groq API key for AI features |
| `GROQ_MODEL` | Model name (default `llama3-70b-8192`) |
| `SMTP_HOST` / `SMTP_PORT` | Email server |
| `SMTP_USER` / `SMTP_PASSWORD` | Email credentials (use Gmail App Password) |
| `SMTP_FROM_NAME` | Display name for emails |
| `WHATSAPP_ADMIN_NUMBER` | Admin WhatsApp number (international format) |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |
| `CORS_ORIGIN_REGEX` | Regex for dev origins |
| `DEFAULT_ADMIN_EMAIL` | Seeded admin email |
| `DEFAULT_ADMIN_PASSWORD` | Seeded admin password |
| `DEFAULT_ADMIN_SYNC_PASSWORD` | `true` to update password on restart |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `VITE_API_TARGET` | Dev proxy target (default `http://localhost:8001`) |
| `VITE_SITE_MODE` | `client` or `admin` |
| `VITE_API_BASE_URL` | Production API base URL |
| `VITE_CLIENT_SITE_URL` | Client site URL |
| `VITE_ADMIN_SITE_URL` | Admin site URL |

---

## Frontend Scripts

```bash
npm run dev:client    # Dev server for client site on :5173
npm run dev:admin     # Dev server for admin site on :5174
npm run build:client  # Production build -> dist/client
npm run build:admin   # Production build -> dist/admin
```

---

## Dual-Site Architecture

The entire frontend is one codebase that builds into two separate sites. `VITE_SITE_MODE` (set to `client` or `admin`) controls which site is built. `src/utils/siteMode.js` exposes `isAdminSite` and helpers used throughout. `App.jsx` renders `<AdminRoutes>` or `<ClientRoutes>` based on this flag.

---

## Key Behaviors

- **No Alembic** — new DB columns are added via `schema_maintenance.py` ALTER TABLE on startup
- **AI failures are non-blocking** — polishing and insights calls degrade gracefully
- **OTP store is in-memory** — restarting the backend invalidates pending OTPs
- **Uploads** — screen images/videos stored in `backend/uploads/`, served at `/uploads`
- **JWT** — stored in `localStorage` as `olrac_token`, admin routes use `ProtectedRoute adminOnly`

---

## API Overview

Base URL (dev): `http://localhost:8001`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/screens` | Public list of screens |
| `GET` | `/api/screens/{id}` | Screen details |
| `POST` | `/api/bookings` | Submit booking |
| `POST` | `/api/auth/login` | Admin login |
| `GET` | `/api/admin/screens` | Admin screens list |
| `POST` | `/api/admin/screens` | Create screen |
| `PUT` | `/api/admin/screens/{id}` | Update screen |
| `POST` | `/api/admin/bookings/{id}/status` | Update booking status |
| `GET` | `/api/admin/bookings/{id}/invoice` | Download invoice |
| `POST` | `/api/admin/bookings/{id}/send-quotation` | Send quotation email |
| `POST` | `/api/ai/polish` | AI ad text polishing |
| `GET` | `/api/admin/insights` | AI analytics |
| `GET` | `/health` | Health check |

Full interactive docs at: `http://localhost:8001/docs`

---

## Deployment

Deployed on AWS EC2 with GoDaddy domain `olracad.com`. See **DEPLOYMENT_GUIDE.txt** for the full step-by-step guide covering:

- EC2 server setup and PostgreSQL
- Backend systemd service (Gunicorn + UvicornWorker)
- Nginx configuration for all 3 subdomains
- GoDaddy DNS setup
- Let's Encrypt SSL
- GitHub Actions CI/CD (auto-deploy on push to main)

**Production URLs:**

| Site | URL |
|------|-----|
| Client | https://olracad.com |
| Admin | https://admin.olracad.com |
| API | https://api.olracad.com |

---

## Troubleshooting

**Port already in use**
Stop the existing process or change the port in the uvicorn command.

**Map has no markers**
Ensure each screen has `latitude` and `longitude` set in Admin → Screens.

**Invoice PDF fails**
Run `python -m playwright install chromium` and restart the backend.

**CORS errors in dev**
Add your frontend URL to `CORS_ORIGINS` in `backend/.env` and restart.

**OTP not working after backend restart**
In-memory OTPs are cleared on restart — request a new OTP.
