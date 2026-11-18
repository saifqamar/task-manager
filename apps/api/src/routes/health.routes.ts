import type { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', { config: { rateLimit: false } }, async (request, reply) => {
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'ok' };
    } catch (error) {
      request.log.error({ err: error }, 'Health check: database unreachable');
      return reply.code(503).send({
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Database unreachable' },
      });
    }
  });
};
