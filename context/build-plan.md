# Build Plan (do in order; run /architect before phases 3, 5, 6)

- [x] P1 Scaffold: TS config, eslint, folder structure, env.ts, db.ts, app/server, /health
- [x] P2 Models + indexes (comments for each index)
- [x] P3 Auth: login/refresh/logout/me, requireAuth, rate limit, seed admin
- [x] P4 Utils + middleware: asyncHandler, ApiError, validate, errorHandler, pagination
- [x] P5 Doctors + doctor's patients endpoints
- [x] P6 Patients endpoints
- [x] P7 Dashboard aggregations
- [x] P8 Seed script (40 doctors, ~1500 patients, 12 months of dates)
- [x] P9 Verify: explain() on every list query, 401 tests, error shapes; /review
- [x] P10 README, .env.example, Postman/openapi collection, deploy to Render

Each phase ends with: run it, test it, update trackers, commit.
