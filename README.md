# Task Manager — Full Stack Assessment

A small, production-shaped task manager: React + Vite + shadcn/ui + Zustand on the front, Fastify + Prisma + PostgreSQL on the back, with an OpenWeather integration, Docker, and CI/CD to AWS EC2.

|               |                                                                   |
| ------------- | ----------------------------------------------------------------- |
| **Live demo** | _https://&lt;site&gt;.netlify.app_ (to be added after deployment) |

![App screenshot](docs/screenshots/app.png)

## Features

- List, add, edit, delete tasks and mark them complete
- Filter by All / Active / Completed with live counts
- Optimistic updates with automatic rollback on failure
- Responsive (mobile-first), keyboard and screen-reader friendly, light/dark via system preference
- Current weather for any city (OpenWeather), proxied and cached by the API

## Tech stack

| Layer    | Tech                                                           |
| -------- | -------------------------------------------------------------- |
| Monorepo | pnpm workspaces — `apps/api`, `apps/web`, `packages/shared`    |
| Frontend | React, Vite, Tailwind CSS, shadcn/ui, Zustand                  |
| Backend  | Node.js 22, Fastify 5, Zod (via `fastify-type-provider-zod`)   |
| Database | PostgreSQL 17, Prisma ORM                                      |
| Shared   | Zod schemas + types used by both API and web                   |
| Testing  | Vitest, Fastify `inject`, Testing Library                      |
| Infra    | Docker, GitHub Actions, AWS (ECR, EC2, SSM, IAM OIDC), Netlify |

## Architecture

```
Browser ──HTTPS──▶ Netlify ──(static React app)
                     │
                     └─ /api/* proxy ──HTTP──▶ EC2 ─ docker compose ─┬─ api (Fastify) ──▶ OpenWeather
                                                                     └─ db  (Postgres)
```

The backend is a simple **MVC** structure with a thin service and repository layer:

```
routes → controllers → services → repositories → Prisma → PostgreSQL
                          └──▶ in-memory cache
```

| Layer        | Responsibility                                    |
| ------------ | ------------------------------------------------- |
| Routes       | URL + Zod schemas for params/body/response        |
| Controllers  | HTTP only: read request, call service, set status |
| Services     | Business logic, caching, domain errors            |
| Repositories | Prisma queries only                               |

### Caching

`apps/api/src/cache/memory-cache.ts` is a small TTL cache. `GET /api/tasks` is cached for 60 s and invalidated on every create/update/delete; weather is cached per city for 10 minutes. PostgreSQL is always the source of truth. The cache is per-process, so with several API instances it would be replaced by Redis.

## Getting started

### Prerequisites

- Node.js 22+ and pnpm (`corepack enable`)
- PostgreSQL 14+ running locally
- An [OpenWeather API key](https://home.openweathermap.org/api_keys) (free; can take up to ~2 hours to activate)

### Run locally

Create a database user and the dev + test databases (once):

```bash
sudo -u postgres psql \
  -c "CREATE ROLE taskapp LOGIN PASSWORD 'taskapp' CREATEDB;" \
  -c "CREATE DATABASE taskapp OWNER taskapp;" \
  -c "CREATE DATABASE taskapp_test OWNER taskapp;"
```

`CREATEDB` lets `prisma migrate dev` create its temporary shadow database.

> **Troubleshooting:** if `CREATE DATABASE` fails with _"template database template1 has a collation version mismatch"_ (common after an OS upgrade), create the databases from `template0` instead: `CREATE DATABASE taskapp TEMPLATE template0;` (same for `taskapp_test`).

```bash
pnpm install
cp apps/api/.env.example apps/api/.env        # then set OPENWEATHER_API_KEY
pnpm --filter @app/shared build
pnpm --filter @app/api db:generate
pnpm --filter @app/api db:migrate             # apply migrations
pnpm --filter @app/api db:seed                # optional sample tasks
pnpm dev                                      # API :3000, web :5173
```

Open http://localhost:5173. Vite proxies `/api` to the API, exactly like Netlify does in production.

### Build the API image (optional)

```bash
docker build -f apps/api/Dockerfile -t task-api .
```

### Scripts

| Command                                        | Description                                                                              |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `pnpm dev`                                     | API + web in watch mode                                                                  |
| `pnpm test`                                    | All tests (API tests use the `taskapp_test` database; override with `TEST_DATABASE_URL`) |
| `pnpm lint` / `pnpm typecheck` / `pnpm format` | Code quality                                                                             |
| `pnpm build`                                   | Build all packages                                                                       |

## Database schema

Defined in [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma).

**Table `tasks`**

| Column        | Type            | Null | Default   | Notes                         |
| ------------- | --------------- | ---- | --------- | ----------------------------- |
| `id`          | `uuid`          | no   | generated | Primary key                   |
| `title`       | `varchar(200)`  | no   | —         | Trimmed, 1–200 chars          |
| `description` | `varchar(1000)` | yes  | `NULL`    | Optional                      |
| `completed`   | `boolean`       | no   | `false`   |                               |
| `created_at`  | `timestamp(3)`  | no   | `now()`   | Indexed; list is newest first |
| `updated_at`  | `timestamp(3)`  | no   | —         | Updated on every change       |

## API

Base path `/api`. Request and response bodies are validated with the Zod schemas in [`packages/shared`](packages/shared/src).

| Method | Path                       | Body                                   | Success       | Errors             |
| ------ | -------------------------- | -------------------------------------- | ------------- | ------------------ |
| GET    | `/api/tasks`               | —                                      | 200 `Task[]`  | —                  |
| POST   | `/api/tasks`               | `{ title, description? }`              | 201 `Task`    | 400                |
| PATCH  | `/api/tasks/:id`           | `{ title?, description?, completed? }` | 200 `Task`    | 400, 404           |
| DELETE | `/api/tasks/:id`           | —                                      | 204           | 400, 404           |
| GET    | `/api/weather?city=London` | —                                      | 200 `Weather` | 400, 404, 429, 502 |
| GET    | `/health`                  | —                                      | 200           | 503                |

All errors share one shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{ "path": "title", "message": "Title is required" }]
  }
}
```

## API integration — OpenWeather (assessment Step 3)

- **API used:** [OpenWeather Current Weather Data](https://openweathermap.org/current) (`/data/2.5/weather`, metric units).
- **Implementation:** the browser calls our own `GET /api/weather?city=…`. `weather.service.ts` calls OpenWeather with a 5 s timeout, validates the response with Zod, maps it to a small stable shape (`city, country, temperature, feelsLike, description, icon, humidity, windSpeed`), and caches it per city for 10 minutes. Upstream 404 becomes `CITY_NOT_FOUND`; bad key, timeouts and 5xx become `502 UPSTREAM_ERROR`. The endpoint is rate-limited to 30 requests/minute per IP. Keeping the call on the server means the **API key never reaches the browser** and repeat lookups don't use up the free-tier quota.
- **UI:** the weather widget in the header. Click it to change city; the choice is remembered.
- **Screenshot:** ![Weather widget](docs/screenshots/weather.png)
- **Commit:** _link to be added after pushing to GitHub_

## Deployment

| Part           | Where                            | How                                                                             |
| -------------- | -------------------------------- | ------------------------------------------------------------------------------- |
| Web            | Netlify                          | Connected to GitHub in the Netlify UI; config in [`netlify.toml`](netlify.toml) |
| API + Postgres | One EC2 instance, Docker Compose | [`deploy-api.yml`](.github/workflows/deploy-api.yml)                            |

**CI** ([`ci.yml`](.github/workflows/ci.yml)) runs on every push and PR: lint, format check, typecheck, tests against a Postgres service container, build, and a Docker image build.

**CD** ([`deploy-api.yml`](.github/workflows/deploy-api.yml)) runs on pushes to `main` that touch the API:

1. Runs CI.
2. Authenticates to AWS with **GitHub OIDC** (no stored AWS keys).
3. Builds the image and pushes it to **ECR**, tagged with the commit SHA.
4. Uses **SSM Run Command** to run [`deploy/deploy.sh`](deploy/deploy.sh) on EC2, which pulls the image, restarts the stack (migrations run on container start), waits for `/health`, and **rolls back** to the last good tag if it fails.

Netlify serves the site over HTTPS and proxies `/api/*` to EC2. The browser only sees one HTTPS origin, so there is no CORS or mixed-content issue and EC2 doesn't need a domain or TLS certificate.

### One-time AWS setup

<details>
<summary>Step-by-step</summary>

1. **ECR:** create a private repository, e.g. `task-manager-api`.
2. **GitHub OIDC provider:** IAM → Identity providers → add `token.actions.githubusercontent.com`, audience `sts.amazonaws.com`.
3. **Deploy role** for GitHub Actions, trusted by that provider and limited to `repo:<owner>/<repo>:ref:refs/heads/main` and the `production` environment. Permissions:
   - ECR push to that one repository (`ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`, `ecr:CompleteLayerUpload`, `ecr:PutImage`, `ecr:BatchGetImage`)
   - `ssm:SendCommand` on the instance and on `arn:aws:ssm:<region>::document/AWS-RunShellScript`
   - `ssm:GetCommandInvocation`
4. **EC2 instance role** with `AmazonSSMManagedInstanceCore` and `AmazonEC2ContainerRegistryReadOnly`.
5. **Launch EC2:** Amazon Linux 2023, `t3.small` (or `t3.micro` + swap), the role above, a security group allowing **only inbound 80/tcp**. Allocate and associate an **Elastic IP**.
6. **Prepare the instance** (Session Manager → Start session):
   ```bash
   sudo dnf install -y docker
   sudo systemctl enable --now docker
   sudo mkdir -p /usr/local/lib/docker/cli-plugins
   sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
     -o /usr/local/lib/docker/cli-plugins/docker-compose
   sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
   sudo mkdir -p /opt/task-app && cd /opt/task-app
   sudo tee .env >/dev/null <<'EOF'
   POSTGRES_USER=taskapp
   POSTGRES_PASSWORD=<strong-random-password>
   POSTGRES_DB=taskapp
   DATABASE_URL=postgresql://taskapp:<strong-random-password>@db:5432/taskapp
   OPENWEATHER_API_KEY=<your-key>
   LOG_LEVEL=info
   EOF
   sudo chmod 600 .env
   ```
7. **GitHub:** create a `production` environment; add secret `AWS_DEPLOY_ROLE_ARN` and variables `AWS_REGION`, `ECR_REPOSITORY`, `EC2_INSTANCE_ID`. Run **Deploy API** manually once.
8. **Netlify:** put the Elastic IP into `netlify.toml` (replace `EC2_ELASTIC_IP`), commit, then add the repo in the Netlify UI (it picks up `netlify.toml` automatically).

</details>

## Trade-offs and next steps

| Decision                            | Why                             | What I'd do next                              |
| ----------------------------------- | ------------------------------- | --------------------------------------------- |
| Postgres in Docker on the API's EC2 | Cheapest, simplest for a demo   | Nightly `pg_dump` to S3, or move to RDS       |
| Netlify → EC2 over plain HTTP       | No domain or certificate needed | Domain + Caddy/Let's Encrypt, or ALB + ACM    |
| In-memory cache                     | No extra infrastructure         | Redis once there's more than one API instance |
| No auth, tasks are global           | Not in scope                    | JWT/session auth, tasks per user              |
| No pagination                       | Small lists                     | Cursor pagination + server-side filtering     |
| Secrets in `.env` on the instance   | Simple                          | SSM Parameter Store / Secrets Manager         |
