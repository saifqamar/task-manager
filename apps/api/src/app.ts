import Fastify, { type FastifyServerOptions } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Env } from './config/env.js';
import { createPrismaClient, type PrismaClient } from './db/prisma.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import { prismaPlugin } from './plugins/prisma.js';
import { securityPlugin } from './plugins/security.js';
import { createTaskRepository } from './repositories/task.repository.js';
import { createTaskService } from './services/task.service.js';
import { createTaskController } from './controllers/task.controller.js';
import { healthRoutes } from './routes/health.routes.js';
import { taskRoutes } from './routes/task.routes.js';

export interface BuildAppOptions {
  env: Env;
  logger?: FastifyServerOptions['logger'];
  /** Overrides for tests. */
  prisma?: PrismaClient;
  fetch?: typeof globalThis.fetch;
  rateLimit?: boolean;
}

export async function buildApp({ env, logger = false, prisma, rateLimit = true }: BuildAppOptions) {
  const app = Fastify({ logger, trustProxy: true }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const client = prisma ?? createPrismaClient(env.DATABASE_URL);

  await app.register(errorHandlerPlugin);
  await app.register(securityPlugin, { corsOrigin: env.CORS_ORIGIN, rateLimit });
  await app.register(prismaPlugin, { client });

  // Wiring: repository → service → controller → routes
  const taskController = createTaskController(createTaskService(createTaskRepository(client)));

  await app.register(healthRoutes);
  await app.register(taskRoutes, { prefix: '/api', controller: taskController });

  return app;
}
