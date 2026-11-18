import { buildApp } from './app.js';
import { loadEnv } from './config/env.js';

const env = loadEnv();

const app = await buildApp({
  env,
  logger: {
    level: env.LOG_LEVEL,
    ...(env.NODE_ENV === 'development' && { transport: { target: 'pino-pretty' } }),
  },
});

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'Shutting down');
  try {
    await app.close();
    process.exit(0);
  } catch (error) {
    app.log.error({ err: error }, 'Error during shutdown');
    process.exit(1);
  }
};
process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

try {
  await app.listen({ port: env.PORT, host: env.HOST });
} catch (error) {
  app.log.error({ err: error }, 'Failed to start server');
  process.exit(1);
}
