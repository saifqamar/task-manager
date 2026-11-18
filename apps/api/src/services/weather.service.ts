import { z } from 'zod';
import type { Weather } from '@app/shared';
import { MemoryCache } from '../cache/memory-cache.js';
import { CityNotFoundError, UpstreamError } from '../errors/app-error.js';

const OPENWEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather';
const TIMEOUT_MS = 5_000;

/** Only the fields we use from OpenWeather's current-weather response. */
const upstreamSchema = z.object({
  name: z.string(),
  sys: z.object({ country: z.string().optional() }),
  main: z.object({ temp: z.number(), feels_like: z.number(), humidity: z.number() }),
  weather: z.array(z.object({ description: z.string(), icon: z.string() })).min(1),
  wind: z.object({ speed: z.number() }),
});

export interface WeatherService {
  getByCity(city: string): Promise<Weather>;
}

export interface WeatherServiceDeps {
  apiKey: string;
  fetch?: typeof globalThis.fetch;
  cache?: MemoryCache<Weather>;
  logger?: { error: (obj: object, msg: string) => void };
}

export function createWeatherService({
  apiKey,
  fetch = globalThis.fetch,
  cache = new MemoryCache<Weather>({ ttlMs: 10 * 60_000, maxEntries: 100 }),
  logger,
}: WeatherServiceDeps): WeatherService {
  async function fetchUpstream(city: string): Promise<unknown> {
    const url = new URL(OPENWEATHER_URL);
    url.searchParams.set('q', city);
    url.searchParams.set('appid', apiKey);
    url.searchParams.set('units', 'metric');

    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (error) {
      logger?.error({ err: error, city }, 'OpenWeather request failed');
      throw new UpstreamError();
    }

    if (response.status === 404) throw new CityNotFoundError(city);
    if (!response.ok) {
      logger?.error({ status: response.status, city }, 'OpenWeather returned an error');
      throw new UpstreamError();
    }
    return response.json();
  }

  return {
    async getByCity(rawCity) {
      const city = rawCity.trim();
      const key = `weather:${city.toLowerCase()}`;
      const cached = cache.get(key);
      if (cached) return cached;

      const parsed = upstreamSchema.safeParse(await fetchUpstream(city));
      if (!parsed.success) {
        logger?.error({ issues: parsed.error.issues, city }, 'Unexpected OpenWeather response');
        throw new UpstreamError();
      }

      const data = parsed.data;
      const current = data.weather[0]!;
      const weather: Weather = {
        city: data.name,
        country: data.sys.country ?? null,
        temperature: data.main.temp,
        feelsLike: data.main.feels_like,
        description: current.description,
        icon: current.icon,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        fetchedAt: new Date().toISOString(),
      };
      cache.set(key, weather);
      return weather;
    },
  };
}
