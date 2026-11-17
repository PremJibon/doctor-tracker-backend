# Progress Tracker (agent updates after every feature)

## Current phase
P3 — Auth: login/refresh/logout/me, requireAuth, rate limit, seed admin (next)

## Done
- [x] P1 Scaffold: TypeScript strict config, ESLint flat config, directory layout, env.ts (Zod-validated, JWT secrets >= 32 chars), db.ts (Mongoose connection & listeners), ApiError, asyncHandler, central errorHandler, notFound middleware, app.ts, server.ts, GET /api/health & GET /health. Verified with `npm run typecheck`, `npm run lint`, and curl test.
- [x] P2 Models + Indexes: Implemented User, Doctor, and Patient schemas with strict TypeScript interfaces. Annotated all 10 indexes across models with operational rationale comments. Added automatic lowercase synchronization for `nameLower` via setters, defaults, and pre-hooks to guarantee prefix regex queries leverage IXSCAN. Verified typecheck, lint, and instantiation test.

## Decisions made
- Mounted health check at both `/api/health` and `/health` to satisfy both API specification and cloud platform root health probes.
- Configured Zod env schema to enforce minimum 32 characters on `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
- Scaffolding foundational error classes and handlers (`ApiError`, `errorHandler`, `asyncHandler`) during P1 to ensure immediate specification compliance.
- In Doctor and Patient models, implemented both a schema setter and default resolver for `nameLower` to ensure automatic lowercase synchronization without requiring manual service-level assignment.
- Avoided duplicate index warnings by declaring unique indexes exclusively via `schema.index(...)` rather than duplicating `unique: true` on path definitions.

## Known issues / next steps
- Run `/architect` pre-implementation thinking for Phase 3 (Auth system).
- Proceed to Phase 3 (P3): Auth routes, JWT generation (15m access / 7d refresh in httpOnly Secure cookie), `requireAuth` middleware, rate limiting (10 attempts / 15 min), and admin seed. STOP at Checkpoint 1 after P3.
