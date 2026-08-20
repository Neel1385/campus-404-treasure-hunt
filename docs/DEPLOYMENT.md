# Deployment Guide — CAMPUS 404

Production stack: **MongoDB Atlas** (database) + **Render** (Express API) + **Vercel** (React frontend).

---

## 1. MongoDB Atlas (database)

1. Create a free cluster at <https://www.mongodb.com/atlas>.
2. Database → Database Access → add a user with a strong password.
3. Network Access → allow access from the deployment provider's IP range (or `0.0.0.0/0`
   for Render's shared IPs).
4. Connect → get the connection string:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/campus404`
   - Set **`retryWrites=true`** stays in the string; keep it.
   - The database name (`campus404`) is appended by the app from `MONGODB_URI`, so
     choose one and keep it consistent.

---

## 2. Render (backend API)

1. Push the repo to GitHub.
2. Render → New → **Web Service** → select the repo.
3. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Add the environment variables (Render → Environment):

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `10000` (Render injects this automatically — do not override) |
| `MONGODB_URI` | your Atlas connection string |
| `JWT_SECRET` | long random string (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
| `JWT_EXPIRES_IN` | `7d` |
| `CLIENT_URL` | `https://<your-frontend-domain>.vercel.app` |
| `FRONTEND_URL` | `https://<your-frontend-domain>.vercel.app` |
| `ADMIN_EMAIL` | organizer login email |
| `ADMIN_PASSWORD` | strong admin password |
| `ADMIN_NAME` | `Event Organizer` |
| `ALLOW_RESET_EVENT` | `false` |

   > `FRONTEND_URL` is what gets baked into QR code URLs. Set it to your **final**
   > production frontend URL before generating physical QRs, so codes point to the
   > right place forever.

5. Deploy. Note the service URL, e.g. `https://campus404-api.onrender.com`.

### Seeding the production database

Seed once from your machine (or a Render **Cron Job** shell):

```bash
cd backend
MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/campus404" \
JWT_SECRET="<same-as-above>" \
ADMIN_EMAIL="<same-as-above>" \
ADMIN_PASSWORD="<same-as-above>" \
npm run seed -- --admin-only
```

`--admin-only` creates just the admin account (no demo clues/teams). Create clues and
QRs from the organizer UI instead so they target production URLs.

---

## 3. Vercel (frontend)

1. New project → import the repo.
2. Set **Root Directory:** `frontend`.
3. Framework preset: **Vite** (Vercel auto-detects).
4. Add env var:

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | `https://campus404-api.onrender.com/api` |

   - Do **not** set `VITE_API_URL` for a pure local dev flow (the Vite proxy handles it).
   - If omitted in production, the app falls back to `/api` on the same origin, so
     only set it when the API lives on a different domain.

5. Deploy. Your production URL is now `https://<your-frontend-domain>.vercel.app`.

---

## 4. Post-deploy checklist

- [ ] `https://<api>/health` returns `{ "success": true }`
- [ ] Admin login works at `/admin/login`
- [ ] Scan a test QR → URL resolves to `https://<frontend>/scan/<QRID>`
- [ ] Wrong-scan penalties and clue locking behave correctly
- [ ] Audit log records every admin action
- [ ] `ALLOW_RESET_EVENT` is `false`

---

## Notes & gotchas

- **CORS:** the backend reads `CLIENT_URL` (and `FRONTEND_URL`) for allowed origins. If a
  request is blocked by CORS, confirm these match your frontend origin exactly (no
  trailing slash).
- **Rate limiting:** login/register/scan endpoints are rate-limited. If a team appears
  blocked during the event, check the limits in `backend/src/middleware/rateLimiter.js`.
- **Clock:** pausing the event freezes the countdown; resuming extends `endTime` by the
  paused duration. The server computes remaining time — never the client.
- **Socket.IO:** the API emits `leaderboard:update` on game events. If your hosting
  provider needs sticky sessions for multi-instance deploys, keep the API on a single
  instance (default for Render free/standard).
- **Always use HTTPS** in production URLs — modern QR scanners will not open `http://`.
