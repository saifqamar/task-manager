import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@app/shared';
import { api } from '@/lib/api';
import type * as ApiModule from '@/lib/api';
import { countTasks, filterTasks, useTaskStore } from './task-store';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return {
    ...actual,
    api: {
      listTasks: vi.fn(),
      createTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
      getWeather: vi.fn(),
    },
  };
});

const task = (overrides: Partial<Task> = {}): Task => ({
  id: crypto.randomUUID(),
  title: 'Task',
  description: null,
  completed: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const a = task({ title: 'a' });
const b = task({ title: 'b', completed: true });

beforeEach(() => {
  vi.resetAllMocks();
  useTaskStore.setState({ tasks: [a, b], status: 'success', error: null, filter: 'all' });
});

describe('toggleTask', () => {
  it('updates optimistically before the server responds', async () => {
    let resolve!: (t: Task) => void;
    vi.mocked(api.updateTask).mockReturnValue(new Promise((r) => (resolve = r)));

    const pending = useTaskStore.getState().toggleTask(a.id);
    expect(useTaskStore.getState().tasks[0]!.completed).toBe(true);

    resolve({ ...a, completed: true });
    await pending;
    expect(api.updateTask).toHaveBeenCalledWith(a.id, { completed: true });
  });

  it('rolls back when the server fails', async () => {
    vi.mocked(api.updateTask).mockRejectedValue(new Error('boom'));
    await expect(useTaskStore.getState().toggleTask(a.id)).rejects.toThrow('boom');
    expect(useTaskStore.getState().tasks[0]).toEqual(a);
  });
});

describe('deleteTask', () => {
  it('re-inserts the task at its original position on failure', async () => {
    vi.mocked(api.deleteTask).mockRejectedValue(new Error('boom'));
    const pending = useTaskStore.getState().deleteTask(a.id);
    expect(useTaskStore.getState().tasks).toEqual([b]);
    await expect(pending).rejects.toThrow();
    expect(useTaskStore.getState().tasks).toEqual([a, b]);
  });
});

describe('addTask', () => {
  it('prepends the created task', async () => {
    const created = task({ title: 'new' });
    vi.mocked(api.createTask).mockResolvedValue(created);
    await useTaskStore.getState().addTask({ title: 'new' });
    expect(useTaskStore.getState().tasks[0]).toEqual(created);
  });
});

describe('selectors', () => {
  it('filters and counts', () => {
    expect(filterTasks([a, b], 'active')).toEqual([a]);
    expect(filterTasks([a, b], 'completed')).toEqual([b]);
    expect(countTasks([a, b])).toEqual({ all: 2, active: 1, completed: 1 });
  });
});
