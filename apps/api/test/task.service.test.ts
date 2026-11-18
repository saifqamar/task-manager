import { describe, expect, it, vi } from 'vitest';
import type { TaskRepository } from '../src/repositories/task.repository.js';
import { createTaskService } from '../src/services/task.service.js';
import { TaskNotFoundError } from '../src/errors/app-error.js';

const row = {
  id: '6f1c2b8e-1d7a-4b7e-9a51-1f8e2b9c0d11',
  title: 'Task',
  description: null,
  completed: false,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

function fakeRepository(): TaskRepository {
  return {
    findAll: vi.fn().mockResolvedValue([row]),
    create: vi.fn().mockResolvedValue(row),
    update: vi.fn().mockResolvedValue(row),
    delete: vi.fn().mockResolvedValue(true),
  };
}

describe('TaskService caching', () => {
  it('serves repeated list calls from cache', async () => {
    const repo = fakeRepository();
    const service = createTaskService(repo);
    await service.list();
    await service.list();
    expect(repo.findAll).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['create', (s: ReturnType<typeof createTaskService>) => s.create({ title: 'x' })],
    ['update', (s: ReturnType<typeof createTaskService>) => s.update(row.id, { completed: true })],
    ['remove', (s: ReturnType<typeof createTaskService>) => s.remove(row.id)],
  ])('%s invalidates the cached list', async (_name, write) => {
    const repo = fakeRepository();
    const service = createTaskService(repo);
    await service.list();
    await write(service);
    await service.list();
    expect(repo.findAll).toHaveBeenCalledTimes(2);
  });

  it('throws TaskNotFoundError and keeps cache when update misses', async () => {
    const repo = fakeRepository();
    vi.mocked(repo.update).mockResolvedValue(null);
    const service = createTaskService(repo);
    await service.list();
    await expect(service.update(row.id, { completed: true })).rejects.toBeInstanceOf(
      TaskNotFoundError,
    );
    await service.list();
    expect(repo.findAll).toHaveBeenCalledTimes(1);
  });
});
