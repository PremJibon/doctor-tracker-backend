# Security Rules

- Passwords: bcrypt (cost >= 10). Generic "Invalid credentials" message (no user enumeration).
- Access token: JWT, 15 min. Refresh token: JWT, 7 days, httpOnly + Secure + SameSite=None cookie.
- `requireAuth` mounted on every router except auth login/refresh and health.
- helmet on; CORS allowlist from env (never "*" with credentials); rate-limit login (e.g. 10/15min/IP).
- Validate all input with Zod; reject unknown fields (`.strict()`).
- Escape regex input; never build queries from raw user objects (prevent NoSQL operator injection, e.g. `{ $ne: ... }`).
- Limit body size (e.g. 10kb). Cap `limit` query param at 100.
- Secrets only in env. `.env` is gitignored; `.env.example` has placeholders only.
- Error responses never leak stack traces in production.
