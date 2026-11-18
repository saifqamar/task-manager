import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';

export interface SecurityOptions {
  corsOrigin?: string;
  rateLimit: boolean;
}

export const securityPlugin = fp<SecurityOptions>(async (app, opts) => {
  await app.register(helmet);

  if (opts.rateLimit) {
    await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  }

  // Production traffic is same-origin via the Netlify proxy, so CORS is only
  // needed when the frontend calls the API directly (e.g. local experiments).
  if (opts.corsOrigin) {
    await app.register(cors, {
      origin: opts.corsOrigin.split(',').map((o) => o.trim()),
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    });
  }
});
