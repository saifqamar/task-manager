# 02 — Architecture

## System overview

```
                 HTTPS                          HTTP (proxy)
 Browser  ─────────────────▶  Netlify  ───────────────────────▶  EC2 (Elastic IP)
   │                         │  static React build              ┌───────────────────────────┐
   │  GET /                  │  /api/* → proxy (200 rewrite)    │ docker compose            │
   │  GET /api/tasks ────────┘                                  │  ┌─────────┐   ┌────────┐ │
   │                                                            │  │ api     │──▶│ db     │ │
   │                                                            │  │ Fastify │   │Postgres│ │
   │                                                            │  └────┬────┘   └────────┘ │
   │                                                            └───────┼───────────────────┘
   │                                                                    │ HTTPS
   │                                                                    ▼
   │                                                           api.openweathermap.org
```

The browser only ever talks to the Netlify origin. API calls use relative URLs (`/api/...`), so the same frontend build works locally (Vite dev proxy) and in production (Netlify proxy).

## Monorepo layout

```
/
├─ apps/
│  ├─ api/
│  │  ├─ prisma/
│  │  │  ├─ schema.prisma
│  │  │  └─ migrations/
│  │  ├─ src/
│  │  │  ├─ config/env.ts              # Zod-validated env, fails fast on boot
│  │  │  ├─ plugins/
│  │  │  │  ├─ prisma.ts               # decorates app with PrismaClient, disconnects on close
│  │  │  │  ├─ error-handler.ts        # maps errors → standard error body
│  │  │  │  └─ security.ts             # helmet, rate-limit, cors (dev only)
│  │  │  ├─ routes/
│  │  │  │  ├─ health.routes.ts
│  │  │  │  ├─ task.routes.ts
│  │  │  │  └─ weather.routes.ts
│  │  │  ├─ controllers/
│  │  │  │  ├─ task.controller.ts
│  │  │  │  └─ weather.controller.ts
│  │  │  ├─ services/
│  │  │  │  ├─ task.service.ts
│  │  │  │  └─ weather.service.ts
│  │  │  ├─ repositories/
│  │  │  │  └─ task.repository.ts
│  │  │  ├─ cache/
│  │  │  │  └─ memory-cache.ts
│  │  │  ├─ errors/app-error.ts        # AppError + NotFoundError, UpstreamError, ...
│  │  │  ├─ app.ts                     # buildApp(opts) — no listen; used by tests
│  │  │  └─ server.ts                  # buildApp + listen + graceful shutdown
│  │  ├─ test/
│  │  ├─ Dockerfile
│  │  └─ package.json
│  └─ web/
│     ├─ src/ (see 05-frontend)
│     └─ package.json
├─ packages/
│  └─ shared/
│     └─ src/
│        ├─ task.schema.ts             # Zod: Task, CreateTaskInput, UpdateTaskInput
│        ├─ weather.schema.ts          # Zod: Weather, WeatherQuery
│        ├─ error.schema.ts            # Zod: ApiError
│        └─ index.ts
├─ deploy/
│  ├─ docker-compose.prod.yml
│  └─ deploy.sh                        # run on EC2 by SSM
├─ netlify.toml                        # Netlify build + /api proxy
├─ .github/workflows/{ci.yml, deploy-api.yml}
├─ docs/specs/
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
└─ README.md
```

## Backend layering (MVC)

| Layer          | Responsibility                                                                             | Must NOT                      |
| -------------- | ------------------------------------------------------------------------------------------ | ----------------------------- |
| **Route**      | Declare method, URL, Zod schemas (params/body/response), bind controller                   | Contain logic                 |
| **Controller** | Read validated request, call service, set status code, send reply                          | Touch Prisma or cache         |
| **Service**    | Business rules, cache read/invalidate, throw domain errors (`NotFoundError`)               | Know about HTTP request/reply |
| **Repository** | Prisma queries only; translate Prisma "record not found" (P2025) to `null`/`NotFoundError` | Contain business rules        |
| **Model**      | Prisma schema + shared Zod types                                                           | —                             |

Dependencies are created in `buildApp()` and passed down (simple constructor/factory injection), so tests can swap the repository or `fetch`.

```
route ─▶ controller ─▶ service ─▶ repository ─▶ Prisma ─▶ Postgres
                          │
                          └──▶ memory-cache
```

## Request flow examples

**GET /api/tasks**

1. Route validates nothing (no input), controller calls `taskService.list()`.
2. Service checks cache key `tasks:all`. Hit → return. Miss → repository `findMany` ordered by `createdAt desc` → store in cache (TTL 60s) → return.

**PATCH /api/tasks/:id**

1. Route validates `id` (uuid) and body (`UpdateTaskInput`) → 400 on failure.
2. Service calls repository update; missing row → `NotFoundError` → 404.
3. On success service invalidates `tasks:all`, returns the updated task.

## Caching

`cache/memory-cache.ts` — a small generic class, no dependencies.

```ts
class MemoryCache<T> {
  constructor(opts: { ttlMs: number; maxEntries?: number });
  get(key: string): T | undefined; // expired entries treated as miss and removed
  set(key: string, value: T): void; // evicts oldest entry when maxEntries exceeded
  delete(key: string): void;
  clear(): void;
}
```

| Cache instance | Key                                  | TTL    | Max entries | Invalidated by               |
| -------------- | ------------------------------------ | ------ | ----------- | ---------------------------- |
| Task list      | `tasks:all`                          | 60 s   | 1           | Any create / update / delete |
| Weather        | `weather:<city lowercased, trimmed>` | 10 min | 100         | TTL only                     |

Known limitation (documented in README): per-process cache. With multiple API instances, writes on one instance would not invalidate others → use Redis or remove the cache. The 60 s TTL bounds staleness even then.

## Cross-cutting concerns

- **Config**: `config/env.ts` parses `process.env` with Zod (`DATABASE_URL`, `OPENWEATHER_API_KEY`, `PORT`, `HOST`, `NODE_ENV`, `LOG_LEVEL`, `CORS_ORIGIN?`). Invalid config → process exits with a clear message.
- **Logging**: Fastify's built-in pino; `pino-pretty` in development only. Request IDs on every log line.
- **Errors**: a single error handler plugin; see [04-api](04-api.md#errors).
- **Security**: `@fastify/helmet`; `@fastify/rate-limit` (global 100 req/min/IP, weather 30 req/min/IP); `trustProxy: true` so the real client IP from Netlify's `X-Forwarded-For` is used; CORS only enabled when `CORS_ORIGIN` is set (local dev without proxy).
- **Graceful shutdown**: on SIGTERM/SIGINT → `app.close()` (closes server, disconnects Prisma).
