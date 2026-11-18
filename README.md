# Doctor Tracker — Backend API

## Description

Doctor Tracker is a secure, production-ready REST API for managing medical practice data — doctors, their patients, and administrative analytics. Built as a full-stack take-home assessment for Care Guide BD, it provides role-based admin access with JWT authentication, MongoDB aggregation-powered dashboards, and fully indexed, paginated list queries proven with `explain("executionStats")`.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express 4 |
| Language | TypeScript 5 (strict mode) |
| ODM | Mongoose 8 |
| Validation | Zod 3 |
| Auth | jsonwebtoken + bcryptjs |
| Security | helmet, cors, express-rate-limit |
| HTTP | cookie-parser, morgan |
| Database | MongoDB Atlas |

---

## Getting Started

### Prerequisites

- Node.js 20 or higher
- A MongoDB Atlas account (or a local MongoDB instance)

### Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd backend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and fill in real values (see Environment Variables below)

# 4. Seed the database with demo data
npm run seed
# Seeds: 1 admin, 40 doctors, ~1,500 patients spanning 12 months

# 5. Start development server
npm run dev
# Server starts at http://localhost:5000 (or PORT from .env)
```

### Environment Variables

Copy `.env.example` to `.env` and fill in each value:

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | HTTP port (default `5000`) |
| `NODE_ENV` | Yes | `development`, `test`, or `production` |
| `MONGODB_URI` | Yes | Full MongoDB Atlas connection string |
| `CLIENT_ORIGIN` | Yes | Comma-separated list of allowed CORS origins (e.g. `http://localhost:3000`) |
| `JWT_ACCESS_SECRET` | Yes | ≥ 32-character random string for signing access tokens |
| `JWT_REFRESH_SECRET` | Yes | ≥ 32-character random string for signing refresh tokens (must differ from access) |
| `JWT_ACCESS_EXPIRES_IN` | No | Access token TTL (default `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh token TTL (default `7d`) |
| `JWT_ISSUER` | No | JWT `iss` claim (default `doctor-tracker-api`) |
| `JWT_AUDIENCE` | No | JWT `aud` claim (default `doctor-tracker-client`) |
| `ATLAS_DBUSERPASS` | No | Atlas DB password (optional; can be embedded in `MONGODB_URI`) |
| `USER` | No | Atlas DB username (optional; can be embedded in `MONGODB_URI`) |

### Admin Credentials (seeded)

| Field | Value |
|---|---|
| Email | `admin@doctor-tracker.com` |
| Password | `AdminPassword123!` |

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled `dist/server.js` (production) |
| `npm run seed` | Seed database with 1 admin, 40 doctors, ~1,500 patients |
| `npm run typecheck` | Type-check without emitting JS |
| `npm run lint` | ESLint check across `src/**/*.ts` |

---

## Architecture Overview

The API follows a strict **layered architecture** where every request travels through the same pipeline:

```
HTTP Request
    │
    ▼
Route (src/routes/)
    │  Declares method + path; attaches middleware chain
    │
    ▼
Middleware (src/middleware/)
    │  requireAuth    — verifies JWT, attaches req.user
    │  validate       — Zod .strict() on body/query/params before controller
    │  loginRateLimiter — 10 attempts / 15 min / IP (login only)
    │  apiRateLimiter  — global API rate limiter
    │
    ▼
Controller (src/controllers/)
    │  Thin layer: extracts validated inputs, calls service, shapes HTTP response
    │  Never contains business logic or direct DB calls
    │
    ▼
Service (src/services/)
    │  All business logic, MongoDB queries, aggregation pipelines
    │  Returns plain data objects (no Express types)
    │
    ▼
Model (src/models/)
    │  Mongoose schemas with strict TypeScript interfaces
    │  Indexes declared with rationale comments
    │
    ▼
MongoDB Atlas
```

**Layer responsibilities summary:**

| Layer | Responsibility |
|---|---|
| **Routes** | Mount middleware chains; keep path declarations in one place |
| **Middleware** | Cross-cutting: auth, validation, rate limiting, error handling |
| **Controllers** | HTTP contract: parse req, call service, send res |
| **Services** | Query logic, aggregation pipelines, business rules |
| **Models** | Schema definitions, indexes, pre-save hooks (`nameLower` sync) |
| **Utils** | `asyncHandler`, `ApiError`, `buildPagination`, `escapeRegex` |

Errors propagate upward and are caught by the central `errorHandler` middleware, which emits a single consistent JSON envelope:

```json
{ "error": { "code": "ERROR_CODE", "message": "Human readable message", "details": [] } }
```

---

## API Endpoints

> **Base URL:** `/api`  
> **Auth:** All endpoints except `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, and `GET /health` require `Authorization: Bearer <accessToken>`.

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/login` | Login with email + password → access token + refresh cookie |
| `POST` | `/auth/refresh` | Exchange refresh cookie → new access token |
| `POST` | `/auth/logout` | Clear refresh cookie |
| `GET` | `/auth/me` | Get current authenticated user |

### Doctors

| Method | Path | Description |
|---|---|---|
| `POST` | `/doctors` | Create a new doctor |
| `POST` | `/doctors/bulk-delete` | Bulk delete doctors (body: `{ ids: string[], cascade?: boolean }`) |
| `GET` | `/doctors` | List doctors (search, filters, pagination) |
| `GET` | `/doctors/:id` | Get a single doctor by ID |
| `GET` | `/doctors/:id/patients` | List a doctor's patients (paginated, searchable) |
| `POST` | `/doctors/:id/patients` | Add a patient to a doctor's roster |
| `DELETE` | `/doctors/:id/patients/:patientId` | Remove a patient from a doctor's roster |

**Query parameters for `GET /doctors`:**

| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default `1`) |
| `limit` | number | Items per page (max `100`, default `20`) |
| `search` | string | Prefix search on doctor name |
| `specialization` | string | Filter by specialization |
| `hospital` | string | Filter by hospital |
| `from` | ISO date string | Filter by `createdAt ≥ from` |
| `to` | ISO date string | Filter by `createdAt ≤ to` |
| `sort` | `name\|createdAt` | Sort field (default `createdAt`) |

### Patients

| Method | Path | Description |
|---|---|---|
| `GET` | `/patients` | List all patients (search, filters, pagination) |
| `POST` | `/patients/bulk-delete` | Bulk delete patients (body: `{ ids: string[] }`, max 100) |
| `PATCH` | `/patients/:id` | Update a patient (partial) |
| `DELETE` | `/patients/:id` | Delete a patient record |

**Query parameters for `GET /patients`:**

| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default `1`) |
| `limit` | number | Items per page (max `100`, default `20`) |
| `search` | string | Prefix search on patient name |
| `condition` | string | Filter by medical condition |
| `doctorId` | string | Filter by assigned doctor |
| `from` | ISO date string | Filter by `admittedAt ≥ from` |
| `to` | ISO date string | Filter by `admittedAt ≤ to` |
| `sort` | `name\|admittedAt\|createdAt` | Sort field (default `createdAt`) |

### Dashboard

| Method | Path | Description |
|---|---|---|
| `GET` | `/dashboard/summary` | Total doctors, patients, avg load, 30d trends, new doctors |
| `GET` | `/dashboard/patients-per-doctor` | Top 10 doctors with specialization and hospital |
| `GET` | `/dashboard/patients-over-time` | Patient admissions over time (`?range=7d\|30d\|12m`) |
| `GET` | `/dashboard/conditions` | Patient count per medical condition |
| `GET` | `/dashboard/gender` | Patient distribution by gender (`[{ gender, count }]`) |
| `GET` | `/dashboard/age-groups` | Patient distribution across age brackets (`[{ ageGroup, count }]`) |
| `GET` | `/dashboard/specialties` | Top 8 specialties ranked by doctor count with patient totals |
| `GET` | `/dashboard/hospitals` | Top 5 hospitals ranked by doctor count with patient totals |
| `GET` | `/dashboard/recent-admissions` | Most recent admissions (`?limit=1..20`, default 8) with doctor details |

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check → `{ "status": "ok" }` |
| `GET` | `/api/health` | Same health check (alias) |

---

## Technical Decisions

### 1. Dual-Token Cookie Auth

**What:** Login returns two credentials — a short-lived **access token** (15 minutes) in the JSON response body for use as `Authorization: Bearer`, and a long-lived **refresh token** (7 days) stored in an `httpOnly; Secure; SameSite=None` cookie scoped to `path: /api/auth`.

**Why:** A short-lived access token limits the blast radius of token theft — a leaked token is unusable after 15 minutes. The httpOnly refresh cookie is unreachable by JavaScript (XSS-proof) and auto-sent by the browser only to the `/api/auth` path, preventing CSRF from triggering a refresh on arbitrary endpoints. `SameSite=None; Secure` is required for cross-origin requests (frontend on a different domain), so both sides must be on HTTPS in production.

**Timing-attack mitigation:** When a login request arrives for an email that does not exist in the database, the code runs `bcrypt.compare(password, DUMMY_HASH)` before returning the error. Without this, an attacker can distinguish "user not found" from "wrong password" purely by measuring response time, enabling user enumeration.

**Token secrets:** Both secrets are enforced ≥ 32 characters by the Zod env schema at startup — the server refuses to boot with weak secrets.

### 2. Index-Backed Anchored Prefix Search

**What:** Every searchable model (`Doctor`, `Patient`) stores a `nameLower` field (automatically synced via Mongoose setter + pre-validate hook) which carries a dedicated `{ nameLower: 1 }` index. Search queries use an **anchored regex** (`/^term/`) against `nameLower`.

**Why:** MongoDB can use a B-tree index for regex patterns that are anchored to the start of the string (`^`). An unanchored regex (`/term/`) forces a `COLLSCAN` (O(n)), while `^term` enables an `IXSCAN` (O(log n)). With 1,500+ patients this is the difference between scanning every document and a logarithmic range scan.

**ReDoS prevention:** User-supplied search strings are passed through `escapeRegex()` before being compiled into a `RegExp`. This escapes all regex metacharacters (`.`, `*`, `+`, `?`, `(`, `)`, etc.), ensuring a malicious string like `(.*)` cannot be used to trigger catastrophic backtracking.

**Doctor-name quirk:** Doctors are commonly stored with or without the "Dr." prefix. The search builds an `$or` with two anchored branches — one matching the raw term and one matching `"Dr. " + term` — so searching "smith" finds both "Smith" and "Dr. Smith".

### 3. Parallel Pagination Count

**What:** Every paginated list endpoint runs `Model.countDocuments(filter)` and `Model.find(filter)` **concurrently** via `Promise.all([countQuery, dataQuery])`.

**Why:** These two operations are independent — the count result is not needed to build the data query. Running them sequentially doubles latency for no reason. `Promise.all` fires both against MongoDB in the same event-loop tick, and the endpoint waits only as long as the slower of the two (typically the data query on large result sets).

---

## Index Strategy & explain() Evidence

All indexes were verified with `explain("executionStats")` during P9 — every list query produces `IXSCAN`, never `COLLSCAN`.

### Doctor Collection Indexes

| Index | Fields | Purpose |
|---|---|---|
| Prefix search | `{ nameLower: 1 }` | Anchored `^` regex search on doctor name |
| Specialization filter + sort | `{ specialization: 1, createdAt: -1 }` | Compound: filter + sort in one pass |
| Hospital filter | `{ hospital: 1 }` | Exact-match filter on hospital |
| Default sort | `{ createdAt: -1 }` | Newest-first list without filter |
| Email uniqueness | `{ email: 1 }` unique | Enforces unique email constraint |

### Patient Collection Indexes

| Index | Fields | Purpose |
|---|---|---|
| Doctor sub-roster + sort | `{ doctorId: 1, createdAt: -1 }` | Compound: filter by doctor + sort newest-first |
| Condition filter + sort | `{ condition: 1, createdAt: -1 }` | Compound: filter by condition + sort |
| Prefix search | `{ nameLower: 1 }` | Anchored `^` regex search on patient name |
| Admission date sort | `{ admittedAt: -1 }` | Sort by admission date |

### explain() Execution Benchmark Evidence (P9 Verification)

All 9 query patterns were executed against live MongoDB Atlas data using `src/scripts/explainIndexes.ts` with `explain("executionStats")`. Every single query verified to use `IXSCAN` with zero `COLLSCAN`.

| # | Query Pattern | Execution Plan Stages | nReturned | docsExamined | keysExamined | Execution Time | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | Doctor list (sort `createdAt: -1`) | `LIMIT → FETCH → IXSCAN` | 20 | 20 | 20 | 0 ms | ✅ IXSCAN |
| 2 | Doctor search (`^rafiqul` on `nameLower`) | `LIMIT → FETCH → IXSCAN` | 2 | 40 | 40 | 0 ms | ✅ IXSCAN |
| 3 | Doctor filter (`specialization: Cardiology`) | `LIMIT → FETCH → IXSCAN` | 3 | 3 | 3 | 0 ms | ✅ IXSCAN |
| 4 | Doctor filter (`hospital: Square Hospital`) | `SORT → FETCH → IXSCAN` | 4 | 4 | 4 | 0 ms | ✅ IXSCAN |
| 5 | Patient list (sort `admittedAt: -1`) | `LIMIT → FETCH → IXSCAN` | 20 | 20 | 20 | 0 ms | ✅ IXSCAN |
| 6 | Patient search (`^farzana` on `nameLower`) | `SORT → FETCH → IXSCAN` | 20 | 31 | 32 | 0 ms | ✅ IXSCAN |
| 7 | Patient filter (`condition: Hypertension`) | `LIMIT → FETCH → IXSCAN` | 20 | 20 | 20 | 0 ms | ✅ IXSCAN |
| 8 | Patient filter (`doctorId: <ID>`) | `LIMIT → FETCH → IXSCAN` | 20 | 20 | 20 | 0 ms | ✅ IXSCAN |
| 9 | Patient filter (`admittedAt: { $gte: 30d }`) | `LIMIT → FETCH → IXSCAN` | 20 | 20 | 20 | 0 ms | ✅ IXSCAN |

> **COLLSCAN Count:** 0 / 9 queries. All queries are backed by B-tree indexes with constant or logarithmic scanning.

---

## Deployment (Render)

### Step-by-Step Render Deployment Guide

1. **Push your code** to GitHub:
   ```bash
   git push origin main
   ```
2. **Log into Render Dashboard** ([dashboard.render.com](https://dashboard.render.com)) and click **New + → Web Service**.
3. **Connect your GitHub repository**: Select `PremJibon/doctor-tracker-backend`.
4. **Configure Service Settings**:
   - **Name:** `doctor-tracker-backend`
   - **Region:** `Singapore` (or nearest to your Atlas cluster)
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node dist/server.js`
   - **Instance Type:** `Free` or `Starter`
5. **Add Environment Variables**:
   Under **Environment Variables**, add:
   | Key | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production cookie settings and error masking |
   | `PORT` | `5000` | Port listened on |
   | `MONGODB_URI` | `mongodb+srv://...` | Your MongoDB Atlas connection URI |
   | `JWT_ACCESS_SECRET` | *(generate 32+ chars)* | e.g. `openssl rand -base64 32` |
   | `JWT_REFRESH_SECRET` | *(generate 32+ chars)* | e.g. `openssl rand -base64 32` |
   | `CLIENT_ORIGIN` | `https://your-frontend.vercel.app,http://localhost:3000` | Allowed frontend origins |
6. **Set Health Check Path**:
   Under **Advanced Settings**, set **Health Check Path** to `/api/health`.
7. **Deploy**:
   Click **Create Web Service**. Render will clone, build, and deploy. Once live, you will receive your public URL (e.g. `https://doctor-tracker-backend.onrender.com`).

### Pairing with Vercel Frontend (`doctor-tracker-frontend`)

1. In your Vercel Dashboard for `PremJibon/doctor-tracker-frontend`:
   - Set `NEXT_PUBLIC_API_URL` to your Render backend API URL (must end in `/api`):
     ```
     NEXT_PUBLIC_API_URL=https://doctor-tracker-backend.onrender.com/api
     ```
2. Redeploy frontend on Vercel.
3. The backend enforces an **exact-origin CORS allowlist** via `CLIENT_ORIGIN`. Set it to your Vercel URL(s) separated by commas — no wildcards.

### Deployment Notes

- **Trust proxy:** `app.set("trust proxy", 1)` is already set in `app.ts` for Render's reverse proxy layer. This ensures `req.ip` reflects the real client IP for rate limiting.
- **CORS:** Set `CLIENT_ORIGIN` to your frontend's exact deployed URL (e.g. `https://my-app.vercel.app`). Wildcard `*` in `CLIENT_ORIGIN` will cause startup failure in production.
- **Cookies:** The refresh cookie uses `SameSite=None; Secure`. Both frontend and backend **must** be on HTTPS in production — the browser will reject the cookie otherwise.
- **Cold starts:** The Render free tier sleeps after inactivity (~1 min cold start on first request). Consider upgrading for production SLA requirements.
- **MongoDB Atlas:** Whitelist `0.0.0.0/0` in Atlas Network Access for Render (dynamic IPs), or use Render's static outbound IPs on a paid plan.

---

## Security Notes

| Control | Implementation |
|---|---|
| **Input validation** | All request bodies, params, and query strings validated with Zod `.strict()` schemas before reaching any controller |
| **NoSQL injection** | Zod validates and types all query inputs; no raw user strings reach MongoDB query operators |
| **Rate limiting** | 10 login attempts per 15 minutes per IP (`express-rate-limit`) |
| **Body size** | 10 KB limit on all request bodies (`express.json({ limit: "10kb" })`) |
| **Security headers** | `helmet` sets `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, and more |
| **Password storage** | `bcryptjs` with cost factor ≥ 10; `passwordHash` has `select: false` and is never returned in any response |
| **Access token** | Returned **in the JSON response body only** (`{ accessToken }`). It is intentionally **not** set as a cookie — doing so would require CSRF mitigations and complicate SameSite logic. Clients store it in memory or `localStorage` and send as `Authorization: Bearer <token>`. |
| **Refresh token** | httpOnly cookie, `path: /api/auth`, `SameSite=None; Secure` (production) / `Lax` (development). Rotated on every `/auth/refresh` call. |
| **CORS** | **Exact-origin allowlist** (`src/middleware/corsGuard.ts`). No wildcards, no regex matching. Only origins in `CLIENT_ORIGIN` (comma-separated) are allowed, plus `http://localhost:3000` in non-production. `POST /auth/refresh` and `POST /auth/logout` return **403** if `Origin` header is present and not allowlisted. |
| **User enumeration** | Dummy bcrypt compare on unknown email to equalize response timing |
| **ReDoS** | `escapeRegex()` sanitizes all user-supplied search strings before regex compilation |
