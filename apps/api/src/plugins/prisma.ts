import fp from 'fastify-plugin';
import type { PrismaClient } from '../db/prisma.js';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export const prismaPlugin = fp<{ client: PrismaClient }>(async (app, { client }) => {
  app.decorate('prisma', client);
  app.addHook('onClose', async () => {
    await client.$disconnect();
  });
});
