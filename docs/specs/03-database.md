# 03 — Database

## Engine

PostgreSQL (official `postgres` Docker image, current major, `-alpine` variant) — same image locally, in CI and on EC2.

## Prisma schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Task {
  id          String   @id @default(uuid()) @db.Uuid
  title       String   @db.VarChar(200)
  description String?  @db.VarChar(1000)
  completed   Boolean  @default(false)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt      @map("updated_at")

  @@index([createdAt])
  @@map("tasks")
}
```

> The generator/config block is adjusted at scaffold time to match the current Prisma major version's conventions.

## Resulting table (for the README)

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | no | generated | Primary key |
| `title` | `varchar(200)` | no | — | Trimmed, 1–200 chars (enforced by API) |
| `description` | `varchar(1000)` | yes | `NULL` | Optional |
| `completed` | `boolean` | no | `false` | |
| `created_at` | `timestamp(3)` | no | `now()` | Indexed; list order |
| `updated_at` | `timestamp(3)` | no | — | Set by Prisma on every update |

## Decisions

- **UUID ids** — not guessable/enumerable, safe to expose in URLs.
- **snake_case columns via `@map`** — idiomatic SQL, camelCase in TypeScript.
- **Index on `created_at`** — the only query is "all tasks ordered by newest first". No index on `completed`: filtering is client-side and the table is tiny; an index would be added with server-side filtering/pagination.
- **Length limits at both DB and API level** — DB is the last line of defence.

## Migrations

- Created locally: `pnpm --filter api prisma migrate dev --name <name>`; migration SQL committed to git.
- Applied in production on container start: `prisma migrate deploy` (idempotent, never generates new migrations).
- CI test job applies migrations to a fresh Postgres service container before tests.

## Seed

`prisma/seed.ts` inserts 3–4 example tasks for local development and the demo. Runs only on demand (`pnpm --filter api db:seed`), never automatically in production.

## Persistence on EC2

Postgres data lives in a named Docker volume (`pgdata`) on the instance's EBS root volume. It survives container restarts, redeploys and instance reboots; it does **not** survive instance termination. Acceptable for a demo; noted in README with the upgrade path (scheduled `pg_dump` to S3, or RDS).
