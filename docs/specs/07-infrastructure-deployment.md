# 07 — Infrastructure & Deployment

## Environments

| Env        | Web                                                | API                         | DB                                                                                            |
| ---------- | -------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------- |
| Local      | Vite dev server `:5173` (proxies `/api` → `:3000`) | `tsx watch` on host `:3000` | Locally installed PostgreSQL `:5432` (`taskapp` + `taskapp_test` databases); no Docker needed |
| CI         | build only                                         | tests in runner             | Postgres service container                                                                    |
| Production | Netlify                                            | Docker container on EC2     | Postgres container on the same EC2                                                            |

## Local development

No Docker locally — a natively installed PostgreSQL is used.

```bash
# once: role + dev and test databases (CREATEDB is needed for prisma's shadow DB)
sudo -u postgres psql -c "CREATE ROLE taskapp LOGIN PASSWORD 'taskapp' CREATEDB;" \
  -c "CREATE DATABASE taskapp OWNER taskapp;" -c "CREATE DATABASE taskapp_test OWNER taskapp;"

cp apps/api/.env.example apps/api/.env   # add OPENWEATHER_API_KEY
pnpm install
pnpm --filter @app/api db:migrate        # prisma migrate dev
pnpm --filter @app/api db:seed           # optional
pnpm dev                                 # api + web in parallel
```

Docker is only used in CI (image build check) and in production on EC2.

## API Docker image — `apps/api/Dockerfile`

Multi-stage, built from the repo root (needs workspace + `packages/shared`):

1. **deps** — `node:<lts>-alpine`, enable corepack/pnpm, install workspace deps with frozen lockfile.
2. **build** — `prisma generate`, bundle `apps/api` with `tsup` (bundles `@app/shared`, keeps `@prisma/client` external).
3. **runtime** — `node:<lts>-alpine`, production deps only, `dist/`, `prisma/` (schema + migrations), runs as non-root `node` user.
   - `ENTRYPOINT`: `prisma migrate deploy && node dist/server.js`
   - `HEALTHCHECK`: `wget -qO- http://localhost:3000/health`

## Production host — EC2

| Item           | Value                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Instance       | `t3.small` (2 GB RAM) recommended; `t3.micro` works with a 1 GB swap file                                                   |
| OS             | Amazon Linux 2023                                                                                                           |
| Software       | Docker Engine + Compose plugin, AWS CLI, SSM agent (preinstalled on AL2023)                                                 |
| Network        | Elastic IP (stable address for the Netlify proxy)                                                                           |
| Security group | Inbound **80/tcp** from `0.0.0.0/0` only. **No port 22** — shell access via SSM Session Manager. Postgres port not exposed. |
| Instance role  | `AmazonSSMManagedInstanceCore` + `AmazonEC2ContainerRegistryReadOnly`                                                       |
| App dir        | `/opt/task-app/` containing `docker-compose.prod.yml`, `deploy.sh`, `.env` (chmod 600)                                      |

### `deploy/docker-compose.prod.yml`

```yaml
services:
  db:
    image: postgres:<major>-alpine
    restart: unless-stopped
    env_file: .env # POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck: pg_isready
    # no ports: only reachable on the internal compose network

  api:
    image: ${ECR_REPO}:${IMAGE_TAG}
    restart: unless-stopped
    env_file: .env # DATABASE_URL, OPENWEATHER_API_KEY, NODE_ENV=production
    depends_on: { db: { condition: service_healthy } }
    ports: ['80:3000']
    logging: json-file, max-size 10m, max-file 3

volumes:
  pgdata:
```

### Server `.env` (created once at bootstrap, never committed)

```
POSTGRES_USER=taskapp
POSTGRES_PASSWORD=<strong random>
POSTGRES_DB=taskapp
DATABASE_URL=postgresql://taskapp:<password>@db:5432/taskapp
OPENWEATHER_API_KEY=<key>
NODE_ENV=production
LOG_LEVEL=info
```

Future improvement: move secrets to SSM Parameter Store.

## Frontend host — Netlify

Connected to GitHub through the Netlify UI (manual, one time). `netlify.toml` lives at the **repo root** so Netlify installs the whole pnpm workspace (the web app depends on `packages/shared`):

```toml
[build]
  command = "pnpm --filter @app/web... build"   # builds shared, then web
  publish = "apps/web/dist"

[[redirects]]                      # API proxy — must come first
  from   = "/api/*"
  to     = "http://<ELASTIC_IP>/api/:splat"
  status = 200
  force  = true

[[redirects]]                      # SPA fallback
  from   = "/*"
  to     = "/index.html"
  status = 200
```

Result: browser → `https://<site>.netlify.app/api/tasks` (HTTPS, same origin) → Netlify → `http://<EIP>/api/tasks`. No CORS, no mixed content, no domain or TLS cert required on EC2.

Accepted trade-offs (documented in README): the Netlify→EC2 hop is unencrypted, and the EC2 API is also reachable directly on port 80. Upgrade path: domain + Caddy/Let's Encrypt on EC2, or ALB + ACM.

## CI/CD — GitHub Actions

### `ci.yml` — on every push and pull request

1. Checkout, setup pnpm + Node (with cache), `pnpm install --frozen-lockfile`
2. `pnpm lint` · `pnpm typecheck`
3. API tests against a `postgres` service container (`prisma migrate deploy` first)
4. Web tests
5. `pnpm build` (shared, api, web)
6. `docker build` of the API image (validates the Dockerfile; not pushed)

### `deploy-api.yml` — on push to `main` touching `apps/api/**`, `packages/shared/**`, `deploy/**`, or manual dispatch

1. Re-run CI (reusable workflow) — deploy only if green.
2. Authenticate to AWS via **GitHub OIDC** (`aws-actions/configure-aws-credentials`, role ARN in repo secret). No long-lived AWS keys.
3. Login to ECR, build image, push tags `<git-sha>` and `latest`.
4. `aws ssm send-command` (AWS-RunShellScript) on the instance:
   - download `deploy/docker-compose.prod.yml` and `deploy/deploy.sh` for that commit (public repo raw URL)
   - run `deploy.sh <git-sha>`
5. Poll `aws ssm get-command-invocation` until done; fail the job if the script failed.

### `deploy/deploy.sh <tag>` (runs on EC2)

1. `aws ecr get-login-password | docker login …`
2. `IMAGE_TAG=<tag> docker compose -f docker-compose.prod.yml pull api`
3. `IMAGE_TAG=<tag> docker compose -f docker-compose.prod.yml up -d` (migrations run in the api entrypoint)
4. Poll `http://localhost/health` up to 60 s → exit non-zero if unhealthy.
5. Write `<tag>` to `.last-good-tag` on success. On failure, redeploy the previous `.last-good-tag` (simple rollback).
6. `docker image prune -f`

### GitHub configuration

| Name                  | Type     | Purpose             |
| --------------------- | -------- | ------------------- |
| `AWS_DEPLOY_ROLE_ARN` | secret   | OIDC role to assume |
| `AWS_REGION`          | variable | e.g. `eu-west-1`    |
| `ECR_REPOSITORY`      | variable | ECR repo name       |
| `EC2_INSTANCE_ID`     | variable | SSM target          |

### IAM (least privilege)

- **OIDC trust**: `token.actions.githubusercontent.com`, restricted to `repo:<owner>/<repo>:ref:refs/heads/main`.
- **Deploy role permissions**: ECR push to the one repository; `ssm:SendCommand` on the one instance + `AWS-RunShellScript` document; `ssm:GetCommandInvocation`.

## One-time AWS bootstrap (manual, documented step-by-step in README)

1. Create ECR repository.
2. Create IAM OIDC provider for GitHub + deploy role (policy above).
3. Create EC2 instance role (SSM core + ECR read-only).
4. Launch EC2 (AL2023, security group above), attach role, allocate + associate Elastic IP.
5. Via Session Manager: install Docker + compose plugin, (optional) swap file, create `/opt/task-app/.env`.
6. Add GitHub secrets/variables; run `deploy-api` manually once.
7. Put the Elastic IP into `netlify.toml`, connect repo in Netlify UI.
