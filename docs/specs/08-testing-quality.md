# 08 — Testing & Quality

## Tooling

| Concern         | Tool                                                   |
| --------------- | ------------------------------------------------------ |
| Package manager | pnpm (workspaces, version pinned via `packageManager`) |
| Types           | TypeScript `strict`, shared `tsconfig.base.json`       |
| Lint            | ESLint (flat config, typescript-eslint, react-hooks)   |
| Format          | Prettier                                               |
| Tests           | Vitest (both apps)                                     |

Root scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `format`.

## API tests (`apps/api/test/`)

**Integration tests** — `buildApp()` + Fastify `app.inject()` against a real Postgres (local `taskapp_test` database or CI service container). Tables truncated between tests.

| Area                  | Cases                                                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| GET /api/tasks        | empty list; ordered newest first                                                                                                  |
| POST /api/tasks       | creates (201, persisted); trims title; `""` description → null; missing/blank title → 400; title > 200 → 400; unknown field → 400 |
| PATCH /api/tasks/:id  | update title; toggle completed; empty body → 400; invalid uuid → 400; unknown id → 404                                            |
| DELETE /api/tasks/:id | 204 then gone; unknown id → 404                                                                                                   |
| Cache                 | second GET served from cache (repository called once); write invalidates cache                                                    |
| Errors                | unknown route → 404 standard shape; malformed JSON → 400                                                                          |
| GET /health           | 200                                                                                                                               |

**Unit tests**

- `memory-cache`: get/set, TTL expiry (fake timers), max-entries eviction, clear.
- `weather.service` (stubbed `fetch`): success mapping; caching per city (case-insensitive); upstream 404 → `CITY_NOT_FOUND`; 401/500/timeout → `UPSTREAM_ERROR`; malformed upstream body → `UPSTREAM_ERROR`.

## Web tests (`apps/web/src/**/*.test.ts(x)`)

- `task-store`: optimistic toggle/delete update state immediately and roll back on API failure (API module mocked).
- `TaskItem` / `TaskForm` (Testing Library): toggling calls store; blank title blocked with message.

Kept deliberately light — the store holds the interesting logic.

## Definition of done (per feature)

- Matches the relevant spec (spec updated first if the design changed)
- Lint, typecheck and tests pass locally and in CI
- No secrets committed (`.env` git-ignored; `.env.example` provided)
- Conventional commit message (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `ci:`)
