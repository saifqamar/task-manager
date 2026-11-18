# 01 — Overview

## Goal

A small, production-shaped full stack task manager built as a take-home assessment. It should be simple in scope but show sound engineering: clear layering, validation, error handling, tests, containerisation and automated deployment.

## In scope

- Task CRUD: list, add, edit, delete, mark complete / incomplete
- Responsive single-page UI
- REST API backed by PostgreSQL
- In-memory read cache in front of the database
- OpenWeather integration (current weather by city), proxied through the API
- CI on every push / PR; CD of the API to AWS EC2
- Frontend hosted on Netlify

## Out of scope

- Authentication / multi-user (tasks are global). Documented as a future improvement.
- Pagination (task list is small). Documented as a future improvement.
- Assessment Step 4 (code review & architecture) — deferred.

## Assessment requirement mapping

| Requirement | Where it is met |
|---|---|
| Responsive list of tasks | [05-frontend](05-frontend.md) |
| Add / edit / delete / complete a task | [05-frontend](05-frontend.md), [04-api](04-api.md) |
| REST: get all / create / update / delete | [04-api](04-api.md) |
| Store tasks in a database | [03-database](03-database.md) (PostgreSQL) |
| GitHub repo, setup instructions, DB schema | Root `README.md` (generated from these specs) |
| Live demo URL | Netlify (frontend) + EC2 (API) — [07](07-infrastructure-deployment.md) |
| Step 3: public API, explanation, screenshot, commit | [06-weather-integration](06-weather-integration.md) |

## Tech stack

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces |
| Language | TypeScript (strict) everywhere |
| Backend | Node.js (current LTS), Fastify v5, simple MVC |
| Validation | Zod (shared between API and web) via `fastify-type-provider-zod` |
| ORM / DB | Prisma + PostgreSQL |
| Cache | Custom in-memory TTL cache (single file) |
| Frontend | React + Vite, shadcn/ui (Tailwind), Zustand |
| Tests | Vitest (+ Fastify `inject`, Testing Library) |
| Containers | Docker, Docker Compose |
| Hosting | API + Postgres: Docker on one EC2 instance · Web: Netlify |
| CI/CD | GitHub Actions, AWS via OIDC, images in ECR, deploy via SSM |

Exact package versions are pinned at scaffold time to the latest stable releases.

## Decision log

| # | Decision | Reason | Trade-off accepted |
|---|---|---|---|
| D1 | Simple MVC (+ service & repository layers), not modular monolith | One resource, four endpoints; modules would be empty ceremony | Would need restructuring if many domains were added |
| D2 | Fastify over Express | Developer familiarity; built-in schema validation, logging (pino), plugin encapsulation, speed | — |
| D3 | PostgreSQL + Prisma | Relational fit, typed client, migrations; `schema.prisma` doubles as schema docs | Prisma adds a generate step and binary engines in Docker |
| D4 | Postgres as source of truth, in-memory cache in front | Requirement says "store in a database"; cache demonstrates read optimisation | Cache is per-process; would need Redis with >1 instance |
| D5 | Postgres runs as a Docker container on the same EC2 as the API (no RDS) | Cost and simplicity for a demo | No managed backups/failover; data tied to the instance's EBS volume |
| D6 | Netlify proxies `/api/*` to EC2 | Browser sees same-origin HTTPS → no mixed-content block, no CORS, no domain/cert needed on EC2 | Netlify→EC2 hop is plain HTTP; EC2 port 80 is publicly reachable |
| D7 | Weather API called from backend, not browser | API key never shipped to client; server-side caching protects quota | Extra hop |
| D8 | Shared Zod schemas in `packages/shared` | One definition of validation + types for both apps | Workspace package must be bundled into the API build |
