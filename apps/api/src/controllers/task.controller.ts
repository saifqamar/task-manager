import type { FastifyReply, FastifyRequest } from 'fastify';
import type { z } from 'zod';
import type { createTaskSchema, taskIdParamsSchema, updateTaskSchema } from '@app/shared';
import type { TaskService } from '../services/task.service.js';

type IdParams = z.infer<typeof taskIdParamsSchema>;
type CreateBody = z.output<typeof createTaskSchema>;
type UpdateBody = z.output<typeof updateTaskSchema>;

export function createTaskController(service: TaskService) {
  return {
    list: async () => service.list(),

    create: async (request: FastifyRequest<{ Body: CreateBody }>, reply: FastifyReply) => {
      const task = await service.create(request.body);
      return reply.code(201).send(task);
    },

    update: async (request: FastifyRequest<{ Params: IdParams; Body: UpdateBody }>) =>
      service.update(request.params.id, request.body),

    remove: async (request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) => {
      await service.remove(request.params.id);
      return reply.code(204).send();
    },
  };
}

export type TaskController = ReturnType<typeof createTaskController>;
