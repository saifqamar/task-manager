import type { PrismaClient, Task as TaskRow } from '../db/prisma.js';
import { isRecordNotFound } from '../db/prisma.js';

export interface CreateTaskData {
  title: string;
  description?: string | null;
}

export interface UpdateTaskData {
  title?: string;
  description?: string | null;
  completed?: boolean;
}

export interface TaskRepository {
  findAll(): Promise<TaskRow[]>;
  create(data: CreateTaskData): Promise<TaskRow>;
  /** Returns null when the task does not exist. */
  update(id: string, data: UpdateTaskData): Promise<TaskRow | null>;
  /** Returns false when the task does not exist. */
  delete(id: string): Promise<boolean>;
}

export function createTaskRepository(prisma: PrismaClient): TaskRepository {
  return {
    findAll: () => prisma.task.findMany({ orderBy: { createdAt: 'desc' } }),

    create: (data) => prisma.task.create({ data }),

    async update(id, data) {
      try {
        return await prisma.task.update({ where: { id }, data });
      } catch (error) {
        if (isRecordNotFound(error)) return null;
        throw error;
      }
    },

    async delete(id) {
      try {
        await prisma.task.delete({ where: { id } });
        return true;
      } catch (error) {
        if (isRecordNotFound(error)) return false;
        throw error;
      }
    },
  };
}
