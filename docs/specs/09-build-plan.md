# 09 — Build Plan

Each step is one (or a few) focused commits. Each step ends green (lint, typecheck, tests).

| #   | Step                 | Output                                                                                                                   | Commit(s)                                            |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| 0   | Specs                | `docs/specs/*`                                                                                                           | `docs: add project specs`                            |
| 1   | Monorepo scaffold    | pnpm workspace, tsconfig base, ESLint/Prettier, `.gitignore`, `.editorconfig`                                            | `chore: scaffold monorepo`                           |
| 2   | Shared package       | Zod schemas + types for task, weather, error                                                                             | `feat(shared): add task, weather and error schemas`  |
| 3   | API foundation       | Fastify app/server split, env config, error handler, security plugins, `/health`, Prisma schema + first migration + seed | `feat(api): fastify foundation and prisma schema`    |
| 4   | Task CRUD API        | cache, repository, service, controller, routes + integration tests                                                       | `feat(api): task CRUD with in-memory cache`          |
| 5   | Web foundation       | Vite + React + Tailwind + shadcn init, Vite proxy, API client                                                            | `feat(web): scaffold vite app with shadcn`           |
| 6   | Task UI              | Zustand store, task components, filters, dialogs, toasts, responsive layout + tests                                      | `feat(web): task management UI`                      |
| 7   | Weather (Step 3)     | Weather service/route/tests + WeatherWidget                                                                              | `feat: OpenWeather integration (api proxy + widget)` |
| 8   | Docker               | API Dockerfile, `deploy/` files                                                                                          | `build: dockerize api`                               |
| 9   | CI                   | `ci.yml`                                                                                                                 | `ci: lint, typecheck, test and build`                |
| 10  | CD                   | `deploy-api.yml`, `deploy.sh`, `netlify.toml`                                                                            | `ci: deploy api to EC2 via ECR and SSM`              |
| 11  | AWS + Netlify setup  | Manual (you), following README bootstrap steps                                                                           | —                                                    |
| 12  | README & screenshots | Setup, schema, API table, architecture, trade-offs, live URLs, screenshots                                               | `docs: README with setup, schema and screenshots`    |

## Needed from you before / during the build

- [ ] OpenWeather API key (needed by step 7; create it now so it activates)
- [ ] GitHub repository (public) — needed before step 10
- [ ] AWS account access for step 11
- [ ] Netlify account for step 11
