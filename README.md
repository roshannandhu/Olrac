# Olrac Adverse - Advertising Platform

Olrac Adverse is a full-stack platform for booking ad slots on physical screens. There are two websites that use one shared backend and database:

- Client site: browse locations, view details, book ad slots
- Admin site: manage screens, bookings, analytics, invoices, and settings

This README is a full, step-by-step guide so anyone can run the project and understand how it works.

## What You Can Do In The Product

**Client site**

- Explore locations on a map and in card view
- Open a location detail page
- Submit a booking request
- Continue the conversation via WhatsApp

**Admin site**

- Log in with admin credentials
- Manage screens (add, edit, deactivate)
- Set location coordinates using a map or geocoding
- Approve or cancel bookings
- Download invoices as PDF or DOCX
- Configure invoice branding, signature, notes, and payment details
- View analytics and AI insights

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18 + Vite, Tailwind CSS, React Router |
| Maps | Leaflet + OpenStreetMap |
| Backend | FastAPI, SQLAlchemy, Pydantic v2 |
| Database | PostgreSQL |
| AI | Groq API |
| Email | SMTP |

## Project Structure (Simple Map)

- `backend/` FastAPI server, database models, routers, invoice services
- `backend/uploads/` Uploaded screen images
- `frontend/` Vite React app (client + admin)
- `frontend/src/pages/` All main pages

## How Client And Admin Sites Are Built

The frontend is a single codebase that builds into two separate sites:

- Client build goes to `frontend/dist/client`
- Admin build goes to `frontend/dist/admin`

During development:

- Client runs at `http://localhost:5173`
- Admin runs at `http://localhost:5174`

## Quick Start (Local)

### 1. Database

Create a local database:

```sql
CREATE DATABASE olrac_db;
```

### 2. Backend

```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

The backend auto-creates tables and seeds a default admin user:

- Email: `admin@olrac.com`
- Password: `admin123`

### 3. Frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev:client
```

Open client site: `http://localhost:5173`

In another terminal:

```bash
cd frontend
npm run dev:admin
```

Open admin site: `http://localhost:5174`

## Environment Variables (Explained Clearly)

### Backend (`backend/.env`)

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET_KEY` | Secret for signing JWTs |
| `JWT_ALGORITHM` | JWT algorithm (default `HS256`) |
| `JWT_EXPIRY_MINUTES` | JWT expiry in minutes |
| `GROQ_API_KEY` | Groq API key for AI features |
| `GROQ_MODEL` | Groq model name (default `llama3-70b-8192`) |
| `SMTP_HOST` / `SMTP_PORT` | Email server host and port |
| `SMTP_USER` / `SMTP_PASSWORD` | Email credentials |
| `WHATSAPP_ADMIN_NUMBER` | Default WhatsApp number |
| `CORS_ORIGINS` | Comma-separated list of allowed frontend origins |
| `CORS_ORIGIN_REGEX` | Regex for local dev origins |

### Frontend (`frontend/.env.local`)

| Variable | Description |
| --- | --- |
| `VITE_API_TARGET` | Dev proxy target (default `http://localhost:8000`) |
| `VITE_API_BASE_URL` | Optional production API base URL |
| `VITE_SITE_MODE` | `client` or `admin` |
| `VITE_ADMIN_SITE_URL` | Admin site URL for redirects |
| `VITE_CLIENT_SITE_URL` | Client site URL for redirects |

## Frontend Scripts

```bash
npm run dev:client   # Client site on :5173
npm run dev:admin    # Admin site on :5174
npm run build:client # Build client to dist/client
npm run build:admin  # Build admin to dist/admin
```

## Cloudflare Custom Domains

To expose the two frontend sites on your own domain with a Named Cloudflare Tunnel, use this mapping:

- `https://olrac.com` -> client frontend on `http://127.0.0.1:5173`
- `https://admin.olrac.com` -> admin frontend on `http://127.0.0.1:5174`

Before starting the tunnel, make sure the following local services are already running:

- Backend on `http://127.0.0.1:8001`
- Client frontend on `http://127.0.0.1:5173`
- Admin frontend on `http://127.0.0.1:5174`

Authenticate `cloudflared` and create the tunnel:

```powershell
.tools\cloudflared.exe tunnel login
.tools\cloudflared.exe tunnel create olrac-sites
.tools\cloudflared.exe tunnel route dns olrac-sites olrac.com
.tools\cloudflared.exe tunnel route dns olrac-sites admin.olrac.com
```

Use the tunnel UUID returned by `tunnel create` and start the tunnel with the helper script:

```powershell
powershell -ExecutionPolicy Bypass -File .tools\start-olrac-cloudflare.ps1 -TunnelId <YOUR_TUNNEL_UUID>
```

The helper script writes `.tools/olrac-tunnel-config.local.yml` and runs a tunnel with this ingress:

- `olrac.com` -> `127.0.0.1:5173`
- `admin.olrac.com` -> `127.0.0.1:5174`

If your credentials file is not in the default Cloudflare location, pass it explicitly:

```powershell
powershell -ExecutionPolicy Bypass -File .tools\start-olrac-cloudflare.ps1 -TunnelId <YOUR_TUNNEL_UUID> -CredentialsFile C:\Users\YOUR_USER\.cloudflared\<YOUR_TUNNEL_UUID>.json
```

## Core User Flows (Easy Overview)

**Client flow**

1. Open `/locations`
2. Map shows all locations with markers
3. Click card to zoom map to that location
4. Click marker to highlight that card
5. Open details and submit booking form
6. WhatsApp handoff for quick confirmation

**Admin flow**

1. Login at `/login` on admin site
2. Add a new screen with price and slots
3. Set latitude/longitude using the map or autofill
4. Review bookings and download invoices
5. Update invoice branding and payment settings

## Maps: How It Works

- Map uses Leaflet with OpenStreetMap tiles
- All locations appear automatically on load (auto-zoom)
- Card hover highlights marker
- Card click centers map on that location
- Marker click scrolls to the card
- Search filters cards and updates map markers

## Admin Screens: Adding A Location Correctly

1. Open Admin -> Screens
2. Fill name, area, description, prices, slots
3. Use **Auto-fill from area** to get coordinates
4. Adjust pin manually on the map if needed
5. Save, then the location appears on the client map

## Invoices: What Can Be Customized

Admin Settings -> Invoice includes:

- Invoice title and prefix
- Logo and seal
- Primary color
- Signature name and title
- Payment terms, notes, footer note
- Bank name, account name/number, IFSC, UPI

Invoices can be downloaded in **PDF** or **DOCX**.

For PDF generation, install Playwright browsers once:

```bash
python -m playwright install
```

## AI Features

- Public ad text polishing: `/api/ai/polish`
- Admin-only insights and revenue summaries
- AI failures do not block bookings

## API Overview (Key Endpoints)

Base URL: `http://localhost:8000`

- `GET /api/screens` Public list of screens
- `GET /api/screens/{id}` Screen details
- `POST /api/bookings` Create booking
- `POST /api/auth/login` Admin login
- `GET /api/admin/screens` Admin screens list
- `POST /api/admin/screens` Create screen
- `PUT /api/admin/screens/{id}` Update screen
- `POST /api/admin/bookings/{id}/status` Update booking status
- `GET /api/admin/bookings/{id}/invoice` Download invoice
- `POST /api/ai/polish` AI ad text polish

## Deployment Notes (Simple)

- Build the client and admin separately
- Serve `frontend/dist/client` and `frontend/dist/admin`
- Both sites must proxy `/api` and `/uploads` to the same backend
- Or set `VITE_API_BASE_URL` to a hosted API domain

## Troubleshooting (Common Issues)

**Port already in use**

Stop the existing process or change the port.

**Map has no markers**

Make sure each screen has `latitude` and `longitude` in Admin -> Screens.

**Invoice PDF fails**

Run `python -m playwright install` and try again.

**CORS errors**

Add your frontend URL to `CORS_ORIGINS` in `backend/.env` and restart the backend.
