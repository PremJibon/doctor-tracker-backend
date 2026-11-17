# Doctor Tracker — Backend (Express + MongoDB + TypeScript)

Standalone REST API for a take-home assessment. Graded on: code structure,
query optimization, auth, REST design, scalability. A separate Next.js repo consumes this API.

## Read Before Anything Else

Read in this exact order before any implementation:

1. context/project-overview.md
2. context/architecture.md
3. context/api-spec.md
4. context/security-rules.md
5. context/code-standards.md
6. context/library-docs.md
7. context/build-plan.md
8. context/progress-tracker.md

## Rules That Never Change

- Never hardcode secrets, URLs or magic strings. All config comes from validated env (`src/config/env.ts`).
- Every request body, params and query is validated with Zod BEFORE reaching a controller.
- Controllers are thin. Business and query logic lives in `services/`. No DB calls in controllers.
- Every list query is paginated, projected, `.lean()`, and backed by an index. Prove it with `explain("executionStats")`.
- Never return `passwordHash`. Never log secrets or tokens.
- Update `progress-tracker.md` and `api-spec.md` after every feature.
- Before using any third-party library, load its installed skill (if one exists), then read `context/library-docs.md`.
- If the same problem persists after one corrective prompt, stop immediately and run /recover.
- Do not build anything outside the spec. No frontend code in this repo.

## Skills (installed in the workspace skills folder)

At the start of every session, list installed skills with their one-line descriptions.
Then route by task:

- Planning / spec / breaking down work -> planning and spec skills (addyosmani), /architect
- Building incrementally + tests -> incremental-implementation and TDD skills
- Auth, validation, CORS, headers, secrets -> security skills (SecuritySkills + addyosmani security)
- Before finishing a phase -> /review and the code-review skill
- Something broke -> debugging skill, then /recover
- Multi-session work -> /remember save, then /remember restore next session

Skills are workflows, not suggestions. Follow their steps and verification.

## Available Commands

- `/architect` — before any complex feature. Think before building.
- `/review` — before a phase is marked done, or when something feels off.
- `/recover` — when something breaks after one failed correction.
- `/remember save` — when a feature spans multiple sessions.
- `/remember restore` — when returning after a multi-session feature.
