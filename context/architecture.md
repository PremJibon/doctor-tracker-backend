# Architecture

## Stack
Node 20+, Express, TypeScript, Mongoose, Zod, bcrypt, jsonwebtoken, helmet, cors,
cookie-parser, express-rate-limit, morgan, dotenv. DB: MongoDB Atlas.

## Layers (request flow)
Route -> middleware (auth, validate) -> controller (thin) -> service (logic + queries) -> model -> MongoDB
Errors bubble to a central error middleware that returns one consistent JSON shape.

## Folder structure
src/
  config/        env.ts (zod-validated), db.ts
  models/        User, Doctor, Patient
  controllers/   auth, doctors, patients, dashboard
  services/      same names; all query logic
  routes/        index.ts + one file per resource
  middleware/    requireAuth, validate, errorHandler, rateLimit, notFound
  validators/    zod schemas per resource
  utils/         asyncHandler, ApiError, pagination, escapeRegex
  scripts/       seed.ts
  app.ts         express app (no listen)
  server.ts      connect db + listen

## Data models
User:    name, email(unique), passwordHash, role="admin", createdAt
Doctor:  name, nameLower, specialization, hospital, phone, email(unique), createdAt
Patient: name, nameLower, age, gender, phone, condition, doctorId(ref Doctor), admittedAt, createdAt

## Indexes (comment the reason for each in the model file)
Doctor:  {nameLower:1}, {specialization:1,createdAt:-1}, {hospital:1}, {createdAt:-1}, unique {email:1}
Patient: {doctorId:1,createdAt:-1}, {condition:1,createdAt:-1}, {nameLower:1}, {admittedAt:-1}

## Search strategy
Store `nameLower`. Search with an ANCHORED prefix regex (`^term`) on `nameLower` so the index is used.
Always escape user input before building a regex.

## Pagination
Offset pagination (page, limit<=100) with `countDocuments` run in parallel with the page query.
Response: { data, meta:{ page, limit, total, totalPages } }.
Scale note for README: switch to cursor pagination beyond ~100k rows.

## Deployment
Render free tier (sleeps when idle, ~1 min cold start). Frontend is on another domain, so:
CORS allowlist from env + credentials:true, refresh cookie SameSite=None; Secure.
Set `app.set("trust proxy", 1)` behind Render.
