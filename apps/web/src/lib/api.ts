import {
  apiErrorSchema,
  taskListSchema,
  taskSchema,
  type CreateTaskInput,
  type ErrorCode,
  type Task,
  type UpdateTaskInput,
} from '@app/shared';
import type { z } from 'zod';

const BASE_URL = '/api';
const TIMEOUT_MS = 10_000;

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode | 'NETWORK_ERROR',
    message: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function request<T>(path: string, init: RequestInit, schema?: z.ZodType<T>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ApiClientError(0, 'NETWORK_ERROR', 'Could not reach the server');
  }

  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(await res.json().catch(() => null));
    if (parsed.success) {
      throw new ApiClientError(res.status, parsed.data.error.code, parsed.data.error.message);
    }
    throw new ApiClientError(res.status, 'INTERNAL_ERROR', `Request failed (${res.status})`);
  }

  if (!schema) return undefined as T;
  return schema.parse(await res.json());
}

export const api = {
  listTasks: () => request<Task[]>('/tasks', { method: 'GET' }, taskListSchema),

  createTask: (input: CreateTaskInput) =>
    request<Task>('/tasks', { method: 'POST', body: JSON.stringify(input) }, taskSchema),

  updateTask: (id: string, input: UpdateTaskInput) =>
    request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, taskSchema),

  deleteTask: (id: string) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),
};

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}
