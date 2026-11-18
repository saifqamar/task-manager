# 06 — Weather Integration (Assessment Step 3)

## API used

**OpenWeather — Current Weather Data API**
`GET https://api.openweathermap.org/data/2.5/weather?q={city}&appid={key}&units=metric`

Free tier; key obtained from openweathermap.org (new keys can take up to ~2 hours to activate).

## Why proxy through the backend

- The API key stays in the server's environment and is never shipped in the JS bundle.
- Responses are cached server-side (10 min per city) — protects the free-tier quota and speeds up repeat lookups.
- The upstream response is reduced to a small, stable shape owned by us; the frontend doesn't depend on OpenWeather's format.
- Upstream failures are mapped to our standard error format.

## Endpoint

`GET /api/weather?city=London`

```json
200 OK
{
  "city": "London",
  "country": "GB",
  "temperature": 12.4,
  "feelsLike": 11.1,
  "description": "light rain",
  "icon": "10d",
  "humidity": 81,
  "windSpeed": 4.6,
  "fetchedAt": "2026-11-18T10:00:00.000Z"
}
```

Units: °C, m/s. Icon rendered by the frontend as `https://openweathermap.org/img/wn/{icon}@2x.png`.

## `weather.service.ts` behaviour

1. Normalise city (`trim`, lowercase for cache key).
2. Cache hit → return.
3. Call OpenWeather with native `fetch` and `AbortSignal.timeout(5000)`; city is URL-encoded.
4. Map upstream result:

| Upstream                                               | Our response                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------- |
| 200                                                    | Validate with a Zod schema of the fields we use → map → cache → 200 |
| 404                                                    | 404 `CITY_NOT_FOUND` (not cached)                                   |
| 401 (bad/inactive key)                                 | 502 `UPSTREAM_ERROR`; logged at `error` level                       |
| 429 / 5xx / timeout / network error / unexpected shape | 502 `UPSTREAM_ERROR`; logged                                        |

`fetch` is injected into the service so tests can stub it.

## Frontend widget

- Shows icon, temperature, city, and description in the header.
- Default city: `London`; last chosen city remembered in `localStorage`.
- Click the widget → popover with a city input; submit fetches new weather.
- States: skeleton while loading, inline message for "City not found", muted "Weather unavailable" for upstream errors (never breaks the task UI).

## Deliverables checklist for submission

- [ ] API used: OpenWeather Current Weather Data
- [ ] Short explanation (this spec, condensed into README)
- [ ] Screenshot of the widget working (stored at `docs/screenshots/weather.png`)
- [ ] Dedicated commit: `feat: OpenWeather integration (api proxy + widget)` — link included in submission
