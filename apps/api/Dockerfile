# syntax=docker/dockerfile:1
# Build from the repository root:  docker build -f apps/api/Dockerfile .

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true
# openssl: required by Prisma's schema engine (migrations) on Alpine
RUN apk add --no-cache openssl && corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

# ---- build: all deps, compile shared + api ----
FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @app/api --filter @app/shared
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @app/shared build \
 && pnpm --filter @app/api db:generate \
 && pnpm --filter @app/api build

# ---- runtime: production deps only ----
FROM base AS runtime
ENV NODE_ENV=production
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter @app/api
# Prisma downloads its schema engine lazily, which fails at runtime because the
# container runs as a non-root user. Fetch it now (as root) and fail the build if missing.
RUN node node_modules/.pnpm/@prisma+engines@*/node_modules/@prisma/engines/scripts/postinstall.js \
 && ls node_modules/.pnpm/@prisma+engines@*/node_modules/@prisma/engines/schema-engine-linux-musl-*
WORKDIR /repo/apps/api
COPY --from=build /repo/apps/api/dist ./dist
COPY apps/api/prisma ./prisma
COPY apps/api/prisma.config.ts apps/api/docker-entrypoint.sh ./
RUN chown -R node:node /repo/apps/api
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
