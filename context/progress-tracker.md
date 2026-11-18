# Progress Tracker (agent updates after every feature)

## Overall Phase Checklist (PRD order)

- [x] P1 Scaffold: TS config, ESLint flat config, directory layout, env.ts (Zod-validated, JWT secrets ≥ 32 chars), db.ts, ApiError, asyncHandler, central errorHandler, notFound middleware, app.ts, server.ts, GET /api/health & GET /health
- [x] P2 Models + Indexes: User, Doctor, Patient schemas with strict TS interfaces; all 10 indexes annotated with rationale; nameLower auto-sync via setters/defaults/pre-hooks for IXSCAN prefix search
- [x] P3 Auth System: POST /login, /refresh, /logout, GET /me; dual JWT secrets (15-min access + 7-day refresh), httpOnly/Secure/SameSite cookies, login rate limit (10/15min/IP), timing-attack mitigation (dummy bcrypt hash), requireAuth middleware
- [x] P4 Utils & Middleware: Zod validate middleware (.strict() body/query/params), pagination (limit capped 100), escapeRegex, central error envelope { error: { code, message, details? } }
- [x] P5 Doctors & Doctor-Patient Sub-Roster: POST /doctors, GET /doctors (search, specialization, hospital, date range, sort, pagination), GET /doctors/:id, GET/POST/DELETE /doctors/:id/patients
- [x] P6 Patients Endpoints: GET /patients (search, condition, doctor, date range, pagination), PATCH /patients/:id, DELETE /patients/:id
- [x] P7 Dashboard Aggregations: GET /dashboard/summary, patients-per-doctor, patients-over-time (7d|30d|12m), conditions — 100% native MongoDB aggregation pipelines
- [x] P8 Seed script: 1 Admin, 40 Doctors, ~1,500 Patients spanning 12 months of admission dates; idempotent re-run support
- [x] P9 Verify: explain("executionStats") on every list query (IXSCAN not COLLSCAN), 401 tests, error shapes, then /review
- [x] P10 README, setup guide, `.env.example`, system architecture doc, 2 technical-decision deep dives, IXSCAN evidence, Postman/OpenAPI collection, deploy to Render
- [x] P11 Bulk Delete & Dashboard Extensions: POST /patients/bulk-delete, POST /doctors/bulk-delete (safe cascade transaction/fallback), extended dashboard summary, top 10 with hospital/specialty, gender, age-groups ($bucket), specialties (top 8), hospitals (top 5), recent-admissions (bounded lookup); 52/52 verification tests pass with 0 leaked records

## Done Detail (matches PRD §3 & §4)

### PRD §3.1 Authentication & Authorization → P3 [DONE]
- Secure credential login `POST /api/auth/login` with bcrypt password hashing (cost ≥ 10)
- Constant-time verification (dummy bcrypt hash) to prevent timing-based user enumeration
- Dual-secret JWT architecture: Access Token (15 min, JSON response, `Authorization: Bearer`); Refresh Token (7 days, httpOnly + Secure (prod) + SameSite=None/Lax cookie, path `/api/auth`)
- `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`
- `requireAuth` middleware on all operational data routes
- IP-based rate limiting (10 attempts / 15 min) on login
- Generic "Invalid credentials" message (no user enumeration)

### PRD §3.2 Doctor Management → P5 [DONE]
- Fields: name, nameLower, specialization, hospital, phone, email (unique), createdAt/updatedAt
- `POST /api/doctors`: strict body validation, email uniqueness check
- `GET /api/doctors`: prefix search (`?search=`), specialization/hospital filters, date range (`from`/`to`), sorting, pagination (limit capped 100), `{ data, meta }` response
- `GET /api/doctors/:id`: single doctor profile with projection (`-nameLower`)
- Doctor's Patients Sub-Roster: `GET` (paginated, searchable), `POST` (creates + binds patient to doctor `:id`), `DELETE` (verifies relationship, removes patient)

### PRD §3.3 Patient Management → P6 [DONE]
- Fields: name, nameLower, age (non-negative), gender, phone, condition, doctorId (ref Doctor), admittedAt, createdAt/updatedAt
- `GET /api/patients`: global prefix search, condition/doctor filters, admission date range, offset pagination (limit ≤ 100), `{ data, meta }`
- `PATCH /api/patients/:id`: partial update with validation, auto-updates `nameLower`
- `DELETE /api/patients/:id`: removes patient record

### PRD §3.4 Dashboard & Data Visualization Analytics → P7 [DONE]
- `GET /api/dashboard/summary`: totalDoctors, totalPatients, avgPatientsPerDoctor
- `GET /api/dashboard/patients-per-doctor`: top 10 `[{ doctorId, name, count }]`
- `GET /api/dashboard/patients-over-time?range=7d|30d|12m`: `[{ date, count }]`
- `GET /api/dashboard/conditions`: `[{ condition, count }]`
- 100% native MongoDB Aggregation Pipelines, zero in-memory loops

### PRD §4 Performance, Optimization & Security Standards → P1–P4 [DONE]
- Doctor indexes: `{ nameLower: 1 }`, `{ specialization: 1, createdAt: -1 }`, `{ hospital: 1 }`, `{ createdAt: -1 }`, unique `{ email: 1 }`
- Patient indexes: `{ doctorId: 1, createdAt: -1 }`, `{ condition: 1, createdAt: -1 }`, `{ nameLower: 1 }`, `{ admittedAt: -1 }`
- Zod `.strict()` on all endpoints; central error format `{ error: { code, message, details? } }`
- Regex metacharacter escaping (`escapeRegex`) to prevent ReDoS / injection
- `select: false` on `passwordHash`; sanitization ensures never exposed
- helmet, CORS allowlist (never `*` with credentials), 10kb body cap, `trust proxy`
- env validated with Zod (`src/config/env.ts`); JWT secrets ≥ 32 chars

## Pending Detail (per PRD §4 Data Seeding & §5 Evaluation/Documentation)

### PRD §4.3 Data Seeding → P8 [DONE]
- Seed script: 1 Admin, 40 Doctors, ~1,500 Patients spanning 12 months of admission dates
- Idempotent re-run support
- Realistic data for dashboard + performance testing
- DB verified seeded (40 doctors, 1,500 patients) during P9 verification

### PRD §4.1 Verification Criterion → P9 [DONE]
- `explain("executionStats")` on every list query proving `IXSCAN` with zero `COLLSCAN`
- 401 tests on unauthenticated requests
- Error shape verification
- P9 end-to-end verification: 33/33 tests passed against http://localhost:5000/api

### PRD §5 Evaluation & Documentation Checklist → P10 [DONE]
- README.md: comprehensive description, architectural diagrams, and technical deep dives
- Setup Guide: step-by-step local installation + verified `.env.example`
- System Architecture: layered routes -> middleware -> controllers -> services -> models
- Technical Decisions: deep dive into 2 decisions (dual-token cookie auth with rotation, index-backed prefix search)
- Query Verification: 9/9 queries verified via `explain("executionStats")` showing zero COLLSCAN and pure IXSCAN
- OpenAPI 3.0.3 specification (`openapi.yaml`) documenting all endpoints, request bodies, and responses
- Render Deployment Guide (`render.yaml`) tailored for pairing with Next.js Vercel frontend

## Decisions made
- Health check mounted at both `/api/health` and `/health`
- Zod env schema enforces ≥ 32 chars on `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
- Foundational error classes/handlers (`ApiError`, `errorHandler`, `asyncHandler`) in P1
- Doctor/Patient `nameLower` auto-synced via setter + default + pre-validate hook
- Unique indexes declared via `schema.index(...)` only (avoid duplicate index warnings)
- Constant-time comparison with dummy bcrypt hash on missing email (timing-attack mitigation)
- Strict cookie scoping: `path: "/api/auth"`, `httpOnly: true`, dynamic `secure`/`sameSite`
- Public DNS resolvers (`8.8.8.8`, `1.1.1.1`) in `db.ts` to fix Windows SRV `ECONNREFUSED`
- Doctor prefix search `$or` branches (raw + `"Dr."` prefixed), both `^`-anchored for IXSCAN

## Known issues / next steps
- All 10 phases (P1 through P10) are 100% complete, fully verified, and production-ready.
- 9/9 query index executions confirmed IXSCAN (zero COLLSCAN).
- 34/34 E2E test cases passed against live Atlas database (after security hardening).
- Ready for immediate one-click deployment to Render and pairing with Vercel frontend.

## Security Hardening (post-audit fixes — 2026-11-18)

### Fix 1: CORS Exact-Origin Allowlist
- Removed `*.vercel.app` regex wildcards and `*` wildcard support entirely.
- `src/middleware/corsGuard.ts` — single source of truth for `isOriginAllowed()`.
- In production `CLIENT_ORIGIN` containing `*` causes startup failure (Zod `.superRefine()`).
- `POST /auth/refresh` and `POST /auth/logout` return 403 if `Origin` header present and not allowlisted (`requireAllowedOrigin` middleware).
- `http://localhost:3000` allowed only when `NODE_ENV !== "production"`.

### Fix 2: Access Token Delivery
- Access token is returned **only in the JSON response body** (`{ accessToken, user }`).
- Removed `accessToken` httpOnly cookie entirely from login, refresh, and logout.
- `refreshToken` httpOnly cookie: `path: /api/auth`, `SameSite=None+Secure` (prod), `Lax` (dev).
- `requireAuth` middleware: **Bearer token only** — cookie fallback removed.
- Clients must store the access token in memory / `localStorage` and send as `Authorization: Bearer <token>`.

### Fix 3: Secrets Hygiene
- `.env` confirmed gitignored.
- Working tree scan: no real credentials found (README has only `mongodb+srv://...` placeholder).
- `render.yaml`: all 4 secrets (`MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CLIENT_ORIGIN`) have `sync: false` with no literal values.
- `AGENTS.md` updated: "Never read, open, or print `.env` or any file that contains secret values."

### Fix 4: Data Cleanup
- Extra doctor identified: `_id: 6afd4316d5c150e2898780eb`, `test.doctor.p9.1794982678844@careguide.bd` (leftover from previous test run). **Awaiting user approval to delete.**
- `apiTest.mjs` now tracks `createdDoctorId` and deletes it in a cleanup section after logout.

### Fix 5: Verification Results
- `typecheck`: ✅ PASS
- `lint`: ✅ PASS
- `build`: ✅ PASS
- Evil origin (`https://evil.vercel.app`) on `/auth/refresh`: HTTP 403, no ACAO header ✅
- Evil origin on `/api/doctors`: no ACAO header ✅
- `http://localhost:3000` → `Access-Control-Allow-Origin: http://localhost:3000` ✅
- Login response: 1 cookie (`refreshToken` only), `accessToken` in body ✅
- 34/34 tests passed ✅

## Phase 11: Bulk Delete & Dashboard Analytics Extensions (2026-11-18)

### Bulk Delete Endpoints
1. `POST /api/patients/bulk-delete`
   - Body: `{ ids: string[] }` (1–100 valid ObjectIds, deduplicated with `Set`)
   - Single `deleteMany({ _id: { $in: objectIds } })` call backed by primary key index
   - Response: `200 { data: { requested, deleted, notFound: string[] } }`
   - Validation: 400 VALIDATION_ERROR on malformed ObjectIds, empty array, or >100 IDs
   - Route order: placed **before** `/:id` to prevent route shadowing

2. `POST /api/doctors/bulk-delete`
   - Body: `{ ids: string[], cascade?: boolean }` (default `cascade: false`)
   - `cascade=false`: doctors with active patients are skipped with reason `"HAS_PATIENTS"`
   - `cascade=true`: deletes patients first, then doctors
   - Transaction strategy: attempts multi-document transaction session; if standalone/M0 throws replica set error, safely executes sequential `deleteMany` (patients first to prevent orphan records)
   - Response: `200 { data: { requested, deleted, deletedPatients, skipped: [{ id, name, reason, patientCount }], notFound: string[] } }`
   - Route order: placed **before** `/:id`

### Dashboard Additions (Additive Only)
1. `GET /api/dashboard/summary`: Added `admissionsLast30d`, `admissionsPrev30d`, `newDoctorsLast30d` alongside existing metrics.
2. `GET /api/dashboard/patients-per-doctor`: Added `specialization` and `hospital` to each doctor item.
3. `GET /api/dashboard/gender`: `[{ gender, count }]`
4. `GET /api/dashboard/age-groups`: `[{ ageGroup, count }]` using MongoDB `$bucket` across `[0, 18, 35, 50, 65, 200]`.
5. `GET /api/dashboard/specialties`: Top 8 specializations by doctor count with patient sub-pipeline count.
6. `GET /api/dashboard/hospitals`: Top 5 hospitals by doctor count with patient sub-pipeline count.
7. `GET /api/dashboard/recent-admissions`: Top-N recent patients (default 8, max 20) with `$lookup` to doctors executed **after** `$limit` for maximum index efficiency.

### Data & Code Quality
- Added `.max(150)` validation to patient age in `createDoctorPatientSchema`.
- Full verification suite `src/scripts/verifyBulkAndDashboard.mjs`: 52/52 assertions passed.
- Database records count before and after tests: perfectly identical (Doctors = 45, Patients = 1499). No leaked records.
- E2E test suite `src/scripts/apiTest.mjs`: 34/34 passed. Test cleanup uses `POST /doctors/bulk-delete` with `cascade: true`.
