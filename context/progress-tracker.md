# Progress Tracker (agent updates after every feature)

## Current phase
P5 — Doctors + doctor's patients endpoints (next) [🛑 CHECKPOINT 1 COMPLETED]

## Done
- [x] P1 Scaffold: TypeScript strict config, ESLint flat config, directory layout, env.ts (Zod-validated, JWT secrets >= 32 chars), db.ts (Mongoose connection & listeners), ApiError, asyncHandler, central errorHandler, notFound middleware, app.ts, server.ts, GET /api/health & GET /health. Verified with `npm run typecheck`, `npm run lint`, and curl test.
- [x] P2 Models + Indexes: Implemented User, Doctor, and Patient schemas with strict TypeScript interfaces. Annotated all 10 indexes across models with operational rationale comments. Added automatic lowercase synchronization for `nameLower` via setters, defaults, and pre-hooks to guarantee prefix regex queries leverage IXSCAN. Verified typecheck, lint, and instantiation test.
- [x] P3 Auth System [CHECKPOINT 1]: Implemented POST /login, POST /refresh, POST /logout, GET /me. Added dual JWT secrets (15-min access token + 7-day refresh token), httpOnly/secure/sameSite cookie handling, rate limiting (10 attempts / 15 min per IP), timing-attack mitigation with dummy bcrypt hash comparison, and requireAuth middleware. Idempotent seedAdmin script created. Audited by 6 specialized subagents.
- [x] P4 Utils & Middleware: Implemented Zod validation middleware (`validate.ts`) supporting body/query/params with `.strict()` and standard `{ error: { code: "VALIDATION_ERROR", ... } }` responses; `pagination.ts` with parameter coercion and 100-limit ceiling; and `escapeRegex.ts` preventing ReDoS and query manipulation.

## Decisions made
- Mounted health check at both `/api/health` and `/health` to satisfy both API specification and cloud platform root health probes.
- Configured Zod env schema to enforce minimum 32 characters on `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
- Scaffolding foundational error classes and handlers (`ApiError`, `errorHandler`, `asyncHandler`) during P1 to ensure immediate specification compliance.
- In Doctor and Patient models, implemented both a schema setter and default resolver for `nameLower` to ensure automatic lowercase synchronization without requiring manual service-level assignment.
- Avoided duplicate index warnings by declaring unique indexes exclusively via `schema.index(...)` rather than duplicating `unique: true` on path definitions.
- In `AuthService.login`, implemented constant-time comparison using a static dummy bcrypt hash when an email is not found, mitigating timing-based user enumeration.
- Enforced strict cookie scoping (`path: "/api/auth"`, `httpOnly: true`, dynamic `secure` and `sameSite` based on environment) to prevent client-side credential theft.

## Known issues / next steps
- Checkpoint 1 reached (Phase 3 & Phase 4 complete).
- Run `/architect` before Phase 5 (Doctors + doctor's patients endpoints).
- Proceed to Phase 5 upon user approval.
