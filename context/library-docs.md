# Library Docs (project-specific rules)

- **mongoose**: define indexes in schema; `autoIndex` on in dev, build indexes explicitly in prod via seed/boot. Use `.lean()` for reads.
- **zod**: one schema file per resource; use `.strict()`; coerce query numbers with `z.coerce.number()`.
- **jsonwebtoken**: separate secrets for access and refresh; set `expiresIn`.
- **bcrypt**: use `bcryptjs` if native build fails on Render.
- **express-rate-limit**: apply to login only; requires `trust proxy` on Render.
- **cors**: origin from `CLIENT_ORIGIN` env (comma-separated allowlist), `credentials: true`.
- **helmet**: defaults.
Before using any library above, load its installed skill first if one exists.
