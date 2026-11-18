import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  createTaskSchema,
  taskIdParamsSchema,
  taskListSchema,
  taskSchema,
  updateTaskSchema,
} from '@app/shared';
import type { TaskController } from '../controllers/task.controller.js';

export const taskRoutes: FastifyPluginAsync<{ controller: TaskController }> = async (
  app,
  { controller },
) => {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get('/tasks', { schema: { response: { 200: taskListSchema } } }, controller.list);

  r.post(
    '/tasks',
    { schema: { body: createTaskSchema, response: { 201: taskSchema } } },
    controller.create,
  );

  r.patch(
    '/tasks/:id',
    {
      schema: { params: taskIdParamsSchema, body: updateTaskSchema, response: { 200: taskSchema } },
    },
    controller.update,
  );

  r.delete('/tasks/:id', { schema: { params: taskIdParamsSchema } }, controller.remove);
};
