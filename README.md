# CAMPUS 404 — QR Treasure Hunt

A mobile-first campus treasure hunt web app. Teams register, scan physical QR codes,
solve clues in order, and race the clock for points on a live leaderboard.

**Stack:** React (Vite) + Express + MongoDB (Mongoose). Socket.IO for live leaderboard updates.

- `backend/` — REST API + admin panel endpoints (Express/Mongoose)
- `frontend/` — player + organizer web app (React/Vite)
---

## Architecture

```
frontend (React/Vite)  ──/api──▶  backend (Express)  ──▶  MongoDB (Atlas)
        │                                │
        └──── socket.io (leaderboard:update) ──▶ pushed to players
```

### Security model

- **The backend is the single source of truth** for points, progress, answer validation,
  event state and team identity. The frontend never decides scoring.
- Player authentication via JWT issued at registration/login.
- Admin routes require a separate admin JWT.
- Wrong scans **never reveal** which clue or location a QR belongs to.

### QR codes

- A QR encodes only a random ID (e.g. `X7K92P8L`) as a URL `{FRONTEND_URL}/scan/{qrId}`.
- `FRONTEND_URL` is configurable (see env), so the same backend works for any frontend domain.

### How players scan (3 ways)

Scanning requires a **logged-in team** — the scan page is protected, and the API rejects
any unauthenticated scan. A logged-out player who opens a scan URL (e.g. from a printed QR)
is sent to login first and returned to the scan afterwards, so the scan is always stored
against their team.

1. **Phone camera / Google Lens** — the printed QR contains the scan URL, so pointing the
   phone camera at it opens the app at `/scan/<QRID>` and the code is processed automatically.
2. **In-app camera scanner** — on the `/scan` page, tap **"Scan with camera"** (uses
   `html5-qrcode`; the browser asks for camera permission). The Scan page is lazy-loaded,
   so the camera library is only downloaded when a player opens it.
3. **Manual entry** — type the short code into the box on the `/scan` page.

### Scoring rules (backend-enforced)

- **Wrong scan penalty escalation:** scan #1 → 0, #2 → base, #3 → base+3, #4+ → base×2.
  Scores never go below 0 unless `allowNegativeScore` is enabled.
- **Hints:** each hint costs its configured penalty (deducted from the clue's base points).
- **Duplicate answer / repeated hint:** no penalty, no double-points.
- Sequential clue progression only — a team can only answer the current clue.

---

## Local development

Prerequisites: Node.js 18+ and MongoDB (local or Atlas connection string).

### 1. Backend

```bash
cd backend
cp .env.example .env          # fill in MONGODB_URI, JWT_SECRET, etc.
npm install
npm run seed                  # creates admin + 10 clues + QR records + sample teams
npm run dev                   # http://localhost:5000
```

Seed credentials:
- Admin: the `ADMIN_EMAIL`/`ADMIN_PASSWORD` from `.env` (default `admin@campus404.org` / `Admin@404!`)
- Sample teams: `demo1234` (see `backend/scripts/seed.js`)

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173 (proxies /api to :5000)
```

### 3. Generate and print QR codes

```bash
cd backend
npm run generate:qrs          # writes PNG/JSON per QR into backend/generated-qrcodes/
npm run print:qrs             # writes backend/qr-sheets.html — open + print
```

Or generate QRs from the Organizer UI → "QR Codes" tab (DB mode). The generated sheet
is gitignored.

### Tests (backend)

```bash
cd backend
npm test                      # Node built-in runner + mongodb-memory-server + supertest
```

18 tests cover: registration, login, auth guards, admin/player separation, correct/wrong/
duplicate scans, answer normalization + points, hints, bonus QRs, mission completion,
event-ended rejection, leaderboard ranking, audit logging.

---

## Organizer workflow (admin panel)

1. Log in at `/admin/login` with the admin credentials.
2. **Clues tab** — create clues (number, title, checkpoint, answer, hints, points).
3. **QR Codes tab** — generate a QR per clue, or use `npm run generate:qrs` / `print:qrs`.
4. **Overview tab** — start/pause/end the event, tune settings (duration, penalties,
   hint costs, bonus/trap/hint/checkpoint QRs, leaderboard visibility).
5. **Teams tab** — adjust points, unlock a clue, enable/disable, reset a team.
6. **Audit Log tab** — every admin action is recorded here.

Every admin write goes through `/api/admin/...` and writes an `AuditLog` entry.

---

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for step-by-step guides:

- **Backend:** Render (or Railway/Fly.io) + MongoDB Atlas
- **Frontend:** Vercel (or Netlify)
- Key env vars: `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL`/`CLIENT_URL`, `ADMIN_EMAIL`/`ADMIN_PASSWORD`, `ALLOW_RESET_EVENT`

Keep `ALLOW_RESET_EVENT=false` in production.

---

## Project layout

```
backend/
  src/
    config/env.js             # env parsing + validation
    models/                   # Event, Clue, QRCode, Team, Submission, QRScan, HintUse, AuditLog, Admin
    routes/                   # auth, game, admin, event, leaderboard, health
    controllers/              # gameController, adminController, authController, ...
    middleware/               # auth, adminAuth, rateLimiter, errorHandler, ...
    services/                 # gameService (core rules), eventService (lifecycle/settings)
    server.js                 # Express + Socket.IO entry, exports { app, server, start }
  scripts/
    seed.js                   # admin + clues + QR records + sample teams
    generateQRCodes.js        # QR images/JSON (DB + --offline mode)
    printQRCodes.js           # print sheet qr-sheets.html
  test/api.test.js            # 18 integration tests
frontend/
  src/
    api.js                    # API client + key storage
    auth.jsx                  # AuthProvider / useAuth
    pages/                    # Home, Register, Login, Dashboard, Scan, Leaderboard,
                              # AdminLogin, Admin (Overview/Teams/Clues/QR Codes/Audit)
```
