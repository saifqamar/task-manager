# 04 — API

Base path: `/api`. JSON only (`Content-Type: application/json`). Timestamps are ISO-8601 strings (UTC).

## Endpoints

| Method | Path                       | Request                | Success                          | Errors                |
| ------ | -------------------------- | ---------------------- | -------------------------------- | --------------------- |
| GET    | `/health`                  | —                      | 200 `{ status: "ok", db: "ok" }` | 503 if DB unreachable |
| GET    | `/api/tasks`               | —                      | 200 `Task[]` (newest first)      | —                     |
| POST   | `/api/tasks`               | body `CreateTaskInput` | 201 `Task`                       | 400                   |
| PATCH  | `/api/tasks/:id`           | body `UpdateTaskInput` | 200 `Task`                       | 400, 404              |
| DELETE | `/api/tasks/:id`           | —                      | 204 (no body)                    | 400, 404              |
| GET    | `/api/weather?city=<name>` | query `WeatherQuery`   | 200 `Weather`                    | 400, 404, 429, 502    |

`/health` is outside `/api` so it is not exposed through the Netlify proxy; it is used by Docker healthcheck and the deploy script.

**Why PATCH and not PUT for update:** clients send only changed fields; "mark completed" is `PATCH {"completed": true}` — no separate endpoint needed.

## Types (defined once in `packages/shared` as Zod schemas)

```ts
Task = {
  id: string            // uuid
  title: string
  description: string | null
  completed: boolean
  createdAt: string     // ISO
  updatedAt: string     // ISO
}

CreateTaskInput = {
  title: string                 // trimmed, 1–200 chars
  description?: string | null   // trimmed, max 1000; "" normalised to null
}

UpdateTaskInput = {             // at least one field required
  title?: string                // trimmed, 1–200
  description?: string | null   // trimmed, max 1000; "" → null
  completed?: boolean
}

TaskIdParams = { id: string }   // must be a uuid

WeatherQuery = { city: string } // trimmed, 1–100 chars
Weather      = see 06-weather-integration
```

Unknown body fields are rejected (strict objects) → 400.

## Errors

Every non-2xx response has the same shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{ "path": "title", "message": "Title is required" }]
  }
}
```

| HTTP | `code`                | When                                                        |
| ---- | --------------------- | ----------------------------------------------------------- |
| 400  | `VALIDATION_ERROR`    | Body/params/query fail Zod validation (`details` present)   |
| 400  | `BAD_REQUEST`         | Malformed JSON, etc.                                        |
| 404  | `TASK_NOT_FOUND`      | Task id does not exist                                      |
| 404  | `CITY_NOT_FOUND`      | OpenWeather has no such city                                |
| 404  | `ROUTE_NOT_FOUND`     | Unknown route                                               |
| 429  | `RATE_LIMITED`        | Rate limit exceeded                                         |
| 502  | `UPSTREAM_ERROR`      | OpenWeather failed / timed out / bad key                    |
| 503  | `SERVICE_UNAVAILABLE` | DB down (health only)                                       |
| 500  | `INTERNAL_ERROR`      | Anything unexpected — generic message, details only in logs |

Internal error messages and stack traces are never returned to clients.

## Examples

```http
POST /api/tasks
{ "title": "Write README", "description": "Include schema and setup" }

201 Created
{ "id": "6f1c…", "title": "Write README", "description": "Include schema and setup",
  "completed": false, "createdAt": "2026-11-18T10:00:00.000Z", "updatedAt": "2026-11-18T10:00:00.000Z" }
```

```http
PATCH /api/tasks/6f1c…
{ "completed": true }

200 OK
{ …, "completed": true, "updatedAt": "2026-11-18T10:05:00.000Z" }
```

```http
PATCH /api/tasks/6f1c…
{}

400 Bad Request
{ "error": { "code": "VALIDATION_ERROR", "message": "Request validation failed",
             "details": [{ "path": "", "message": "At least one field must be provided" }] } }
```

## Rate limits

| Scope                          | Limit                 |
| ------------------------------ | --------------------- |
| Global (per client IP)         | 100 requests / minute |
| `/api/weather` (per client IP) | 30 requests / minute  |

Client IP is taken from `X-Forwarded-For` (`trustProxy: true`) because all production traffic arrives via Netlify.
