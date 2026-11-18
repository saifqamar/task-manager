import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Not every command needs a DB (e.g. `prisma generate` in Docker builds).
    url: process.env.DATABASE_URL ?? 'postgresql://placeholder@localhost:5432/placeholder',
  },
});
