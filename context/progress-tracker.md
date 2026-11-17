# Progress Tracker (agent updates after every feature)

## Current phase
P8 — Seed script (40 doctors, ~1500 patients, 12 months dates) (next) [🛑 CHECKPOINT 2 COMPLETED]

## Done
- [x] P1 Scaffold: TypeScript strict config, ESLint flat config, directory layout, env.ts (Zod-validated, JWT secrets >= 32 chars), db.ts (Mongoose connection & listeners), ApiError, asyncHandler, central errorHandler, notFound middleware, app.ts, server.ts, GET /api/health & GET /health. Verified with `npm run typecheck`, `npm run lint`, and curl test.
- [x] P2 Models + Indexes: Implemented User, Doctor, and Patient schemas with strict TypeScript interfaces. Annotated all 10 indexes across models with operational rationale comments. Added automatic lowercase synchronization for `nameLower` via setters, defaults, and pre-hooks to guarantee prefix regex queries leverage IXSCAN. Verified typecheck, lint, and instantiation test.
- [x] P3 Auth System [CHECKPOINT 1]: Implemented POST /login, POST /refresh, POST /logout, GET /me. Added dual JWT secrets (15-min access token + 7-day refresh token), httpOnly/secure/sameSite cookie handling, rate limiting (10 attempts / 15 min per IP), timing-attack mitigation with dummy bcrypt hash comparison, and requireAuth middleware. Idempotent seedAdmin script created. Audited by 6 specialized subagents.
- [x] P4 Utils & Middleware: Implemented Zod validation middleware (`validate.ts`) supporting body/query/params with `.strict()` and standard `{ error: { code: "VALIDATION_ERROR", ... } }` responses; `pagination.ts` with parameter coercion and 100-limit ceiling; and `escapeRegex.ts` preventing ReDoS and query manipulation.
- [x] P5 Doctors & Doctor-Patient Sub-Roster: Implemented POST /doctors, GET /doctors (with anchored search, specialty & hospital filters, date range, sorting, pagination), GET /doctors/:id, GET /doctors/:id/patients, POST /doctors/:id/patients, and DELETE /doctors/:id/patients/:patientId (with relationship validation). Audited by subagents and verified live against MongoDB Atlas.
- [x] P6 Patients Endpoints: Implemented GET /patients (with condition & doctor filters, search, admission date range, pagination), PATCH /patients/:id (partial update with doctor existence check and nameLower synchronization), and DELETE /patients/:id. Verified live against MongoDB Atlas.
- [x] P7 Dashboard Aggregations [CHECKPOINT 2]: Implemented GET /dashboard/summary (totalDoctors, totalPatients, avgPatientsPerDoctor), GET /dashboard/patients-per-doctor (top 10 via $group, $sort, $limit, $lookup), GET /dashboard/patients-over-time (time-series admissions by 7d, 30d, 12m ranges via $match on index + $dateToString), and GET /dashboard/conditions. 100% native MongoDB aggregation pipelines with zero in-memory loops.

## Decisions made
- Mounted health check at both `/api/health` and `/health` to satisfy both API specification and cloud platform root health probes.
- Configured Zod env schema to enforce minimum 32 characters on `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
- Scaffolding foundational error classes and handlers (`ApiError`, `errorHandler`, `asyncHandler`) during P1 to ensure immediate specification compliance.
- In Doctor and Patient models, implemented both a schema setter and default resolver for `nameLower` to ensure automatic lowercase synchronization without requiring manual service-level assignment.
- Avoided duplicate index warnings by declaring unique indexes exclusively via `schema.index(...)` rather than duplicating `unique: true` on path definitions.
- In `AuthService.login`, implemented constant-time comparison using a static dummy bcrypt hash when an email is not found, mitigating timing-based user enumeration.
- Enforced strict cookie scoping (`path: "/api/auth"`, `httpOnly: true`, dynamic `secure` and `sameSite` based on environment) to prevent client-side credential theft.
- Added public DNS resolvers (`8.8.8.8`, `1.1.1.1`) fallback in `src/config/db.ts` to solve Windows SRV DNS record query timeouts (`querySrv ECONNREFUSED`).
- Enhanced doctor prefix search with `$or` branches to match both raw names and `"Dr."`-prefixed variants, while keeping both branches anchored with `^` to guarantee MongoDB `IXSCAN` index usage.

## Known issues / next steps
- Checkpoint 2 completed (Phases 5, 6, and 7 complete and verified with live MongoDB Atlas database).
- Next: Phase 8 (Seed script with 40 doctors, ~1,500 patients, and 12-month admission date distribution).
- Stop and await user confirmation to proceed to Phase 8.
