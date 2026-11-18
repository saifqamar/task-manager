import type { Task } from '@app/shared';
import type { Task as TaskRow } from '../db/prisma.js';
import { MemoryCache } from '../cache/memory-cache.js';
import { TaskNotFoundError } from '../errors/app-error.js';
import type {
  CreateTaskData,
  TaskRepository,
  UpdateTaskData,
} from '../repositories/task.repository.js';

const LIST_KEY = 'tasks:all';

export interface TaskService {
  list(): Promise<Task[]>;
  create(input: CreateTaskData): Promise<Task>;
  update(id: string, input: UpdateTaskData): Promise<Task>;
  remove(id: string): Promise<void>;
}

/** Map a DB row to the API representation (Dates → ISO strings). */
export function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    completed: row.completed,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function createTaskService(
  repository: TaskRepository,
  cache = new MemoryCache<Task[]>({ ttlMs: 60_000, maxEntries: 1 }),
): TaskService {
  return {
    async list() {
      const cached = cache.get(LIST_KEY);
      if (cached) return cached;

      const tasks = (await repository.findAll()).map(toTask);
      cache.set(LIST_KEY, tasks);
      return tasks;
    },

    async create(input) {
      const task = toTask(await repository.create(input));
      cache.delete(LIST_KEY);
      return task;
    },

    async update(id, input) {
      const row = await repository.update(id, input);
      if (!row) throw new TaskNotFoundError(id);
      cache.delete(LIST_KEY);
      return toTask(row);
    },

    async remove(id) {
      const deleted = await repository.delete(id);
      if (!deleted) throw new TaskNotFoundError(id);
      cache.delete(LIST_KEY);
    },
  };
}
