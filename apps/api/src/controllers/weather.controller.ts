import type { FastifyRequest } from 'fastify';
import type { WeatherQuery } from '@app/shared';
import type { WeatherService } from '../services/weather.service.js';

export function createWeatherController(service: WeatherService) {
  return {
    get: async (request: FastifyRequest<{ Querystring: WeatherQuery }>) =>
      service.getByCity(request.query.city),
  };
}

export type WeatherController = ReturnType<typeof createWeatherController>;
