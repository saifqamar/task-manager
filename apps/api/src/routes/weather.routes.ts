import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { weatherQuerySchema, weatherSchema } from '@app/shared';
import type { WeatherController } from '../controllers/weather.controller.js';

export const weatherRoutes: FastifyPluginAsync<{ controller: WeatherController }> = async (
  app,
  { controller },
) => {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/weather',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: { querystring: weatherQuerySchema, response: { 200: weatherSchema } },
    },
    controller.get,
  );
};
