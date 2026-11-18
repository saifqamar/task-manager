import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from './helpers.js';

const { app, prisma } = await createTestApp();
const MISSING_ID = '00000000-0000-4000-8000-000000000000';

async function createTask(payload: Record<string, unknown> = { title: 'Test task' }) {
  const res = await app.inject({ method: 'POST', url: '/api/tasks', payload });
  return res.json();
}

// Rows are wiped directly (bypassing the service cache); every test then
// writes through the API first, which invalidates the cached list.
beforeEach(async () => {
  await prisma.task.deleteMany();
});
afterAll(async () => {
  await app.close();
});

describe('GET /api/tasks', () => {
  it('returns tasks newest first', async () => {
    await createTask({ title: 'first' });
    await createTask({ title: 'second' });

    const res = await app.inject({ method: 'GET', url: '/api/tasks' });
    expect(res.statusCode).toBe(200);
    expect(res.json().map((t: { title: string }) => t.title)).toEqual(['second', 'first']);
  });
});

describe('POST /api/tasks', () => {
  it('creates a task and persists it', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: { title: '  Write README  ', description: '' },
    });
    expect(res.statusCode).toBe(201);
    const task = res.json();
    expect(task).toMatchObject({ title: 'Write README', description: null, completed: false });
    expect(await prisma.task.findUnique({ where: { id: task.id } })).not.toBeNull();
  });

  it.each([
    ['missing title', {}],
    ['blank title', { title: '   ' }],
    ['title too long', { title: 'x'.repeat(201) }],
    ['unknown field', { title: 'ok', completed: true }],
  ])('rejects %s with 400', async (_name, payload) => {
    const res = await app.inject({ method: 'POST', url: '/api/tasks', payload });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
    expect(res.json().error.details.length).toBeGreaterThan(0);
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: { 'content-type': 'application/json' },
      payload: '{"title":',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('BAD_REQUEST');
  });
});

describe('PATCH /api/tasks/:id', () => {
  it('updates fields and toggles completion', async () => {
    const created = await createTask();
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${created.id}`,
      payload: { title: 'Renamed', completed: true },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: created.id, title: 'Renamed', completed: true });
  });

  it('rejects an empty body', async () => {
    const created = await createTask();
    const res = await app.inject({ method: 'PATCH', url: `/api/tasks/${created.id}`, payload: {} });
    expect(res.statusCode).toBe(400);
  });

  it('rejects an invalid id', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tasks/not-a-uuid',
      payload: { completed: true },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${MISSING_ID}`,
      payload: { completed: true },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('TASK_NOT_FOUND');
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('deletes a task', async () => {
    const created = await createTask();
    const res = await app.inject({ method: 'DELETE', url: `/api/tasks/${created.id}` });
    expect(res.statusCode).toBe(204);

    const list = await app.inject({ method: 'GET', url: '/api/tasks' });
    expect(list.json()).toEqual([]);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/api/tasks/${MISSING_ID}` });
    expect(res.statusCode).toBe(404);
  });
});

describe('misc', () => {
  it('returns the standard error body for unknown routes', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('reports health', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.json()).toEqual({ status: 'ok', db: 'ok' });
  });
});
