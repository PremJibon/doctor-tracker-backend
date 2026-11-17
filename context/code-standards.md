# Code Standards

- TypeScript strict mode. No `any`. Export types from validators with `z.infer`.
- Files: camelCase for files, PascalCase for models/types. One responsibility per file.
- Async handlers wrapped with `asyncHandler`; throw `ApiError(status, code, message)`.
- Services return plain data; controllers shape the HTTP response.
- Use `.lean()` and explicit field projection on list queries.
- Use aggregation pipelines for analytics; never fetch all docs into memory.
- Comments explain WHY (especially every index and aggregation stage), not WHAT.
- Small commits, conventional messages (feat:, fix:, chore:, docs:).
- Lint + typecheck must pass before a phase is marked done.
