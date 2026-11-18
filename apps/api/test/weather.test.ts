import { afterAll, describe, expect, it, vi } from 'vitest';
import { createWeatherService } from '../src/services/weather.service.js';
import { CityNotFoundError, UpstreamError } from '../src/errors/app-error.js';
import { createTestApp } from './helpers.js';

const upstreamBody = {
  name: 'London',
  sys: { country: 'GB' },
  main: { temp: 12.4, feels_like: 11.1, humidity: 81 },
  weather: [{ description: 'light rain', icon: '10d' }],
  wind: { speed: 4.6 },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('WeatherService', () => {
  it('maps the upstream response and calls OpenWeather with metric units', async () => {
    const fetch = vi.fn().mockResolvedValue(json(upstreamBody));
    const service = createWeatherService({ apiKey: 'k', fetch });

    const weather = await service.getByCity(' London ');
    expect(weather).toMatchObject({
      city: 'London',
      country: 'GB',
      temperature: 12.4,
      feelsLike: 11.1,
      description: 'light rain',
      icon: '10d',
      humidity: 81,
      windSpeed: 4.6,
    });

    const url = new URL(fetch.mock.calls[0]![0]);
    expect(url.searchParams.get('q')).toBe('London');
    expect(url.searchParams.get('units')).toBe('metric');
    expect(url.searchParams.get('appid')).toBe('k');
  });

  it('caches per city, case-insensitively', async () => {
    const fetch = vi.fn().mockImplementation(async () => json(upstreamBody));
    const service = createWeatherService({ apiKey: 'k', fetch });
    await service.getByCity('London');
    await service.getByCity('LONDON');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('maps upstream 404 to CityNotFoundError', async () => {
    const service = createWeatherService({
      apiKey: 'k',
      fetch: vi.fn().mockResolvedValue(json({ message: 'city not found' }, 404)),
    });
    await expect(service.getByCity('Nowhere')).rejects.toBeInstanceOf(CityNotFoundError);
  });

  it.each([
    ['401 bad key', () => Promise.resolve(json({}, 401))],
    ['500 error', () => Promise.resolve(json({}, 500))],
    ['network failure', () => Promise.reject(new TypeError('fetch failed'))],
    ['unexpected body', () => Promise.resolve(json({ foo: 'bar' }))],
  ])('maps %s to UpstreamError', async (_name, impl) => {
    const service = createWeatherService({ apiKey: 'k', fetch: vi.fn().mockImplementation(impl) });
    await expect(service.getByCity('London')).rejects.toBeInstanceOf(UpstreamError);
  });
});

describe('GET /api/weather', () => {
  const fetch = vi.fn();
  const testApp = createTestApp({ fetch });

  afterAll(async () => (await testApp).app.close());

  it('returns weather for a city', async () => {
    const { app } = await testApp;
    fetch.mockResolvedValueOnce(json(upstreamBody));
    const res = await app.inject({ method: 'GET', url: '/api/weather?city=London' });
    expect(res.statusCode).toBe(200);
    expect(res.json().city).toBe('London');
  });

  it('validates the city query', async () => {
    const { app } = await testApp;
    const res = await app.inject({ method: 'GET', url: '/api/weather' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 CITY_NOT_FOUND', async () => {
    const { app } = await testApp;
    fetch.mockResolvedValueOnce(json({}, 404));
    const res = await app.inject({ method: 'GET', url: '/api/weather?city=Atlantis' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('CITY_NOT_FOUND');
  });

  it('returns 502 UPSTREAM_ERROR', async () => {
    const { app } = await testApp;
    fetch.mockResolvedValueOnce(json({}, 500));
    const res = await app.inject({ method: 'GET', url: '/api/weather?city=Paris' });
    expect(res.statusCode).toBe(502);
    expect(res.json().error.code).toBe('UPSTREAM_ERROR');
  });
});
