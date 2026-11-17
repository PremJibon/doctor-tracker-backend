# Progress Tracker (agent updates after every feature)

## Current phase
P2 — Models + indexes (next)

## Done
- [x] P1 Scaffold: TypeScript strict config, ESLint flat config, directory layout, env.ts (Zod-validated, JWT secrets >= 32 chars), db.ts (Mongoose connection & listeners), ApiError, asyncHandler, central errorHandler, notFound middleware, app.ts, server.ts, GET /api/health & GET /health. Verified with `npm run typecheck`, `npm run lint`, and curl test.

## Decisions made
- Mounted health check at both `/api/health` and `/health` to satisfy both API specification and cloud platform root health probes.
- Configured Zod env schema to enforce minimum 32 characters on `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
- Scaffolding foundational error classes and handlers (`ApiError`, `errorHandler`, `asyncHandler`) during P1 to ensure immediate specification compliance.

## Known issues / next steps
- Proceed to Phase 2 (P2): Create Mongoose schemas for User, Doctor, and Patient with required compound and single-field indexes annotated with rationale comments.
