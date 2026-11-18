import { buildApp } from '../src/app.js';
import type { Env } from '../src/config/env.js';
import { createPrismaClient } from '../src/db/prisma.js';

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://taskapp:taskapp@localhost:5432/taskapp_test';

export const testEnv: Env = {
  NODE_ENV: 'test',
  PORT: 0,
  HOST: '127.0.0.1',
  LOG_LEVEL: 'silent',
  DATABASE_URL: TEST_DATABASE_URL,
  OPENWEATHER_API_KEY: 'test-key',
};

export async function createTestApp(overrides: { fetch?: typeof globalThis.fetch } = {}) {
  const prisma = createPrismaClient(TEST_DATABASE_URL);
  const app = await buildApp({ env: testEnv, prisma, rateLimit: false, ...overrides });
  await app.ready();
  return { app, prisma };
}
