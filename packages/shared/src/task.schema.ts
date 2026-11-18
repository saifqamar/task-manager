import { z } from 'zod';

export const TITLE_MAX = 200;
export const DESCRIPTION_MAX = 1000;

const title = z
  .string({ error: 'Title is required' })
  .trim()
  .min(1, 'Title is required')
  .max(TITLE_MAX, `Title must be at most ${TITLE_MAX} characters`);

/** Optional description: trimmed, empty string normalised to null. */
const description = z
  .string()
  .trim()
  .max(DESCRIPTION_MAX, `Description must be at most ${DESCRIPTION_MAX} characters`)
  .nullable()
  .transform((value) => (value === '' ? null : value));

export const taskSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  completed: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const taskListSchema = z.array(taskSchema);

export const createTaskSchema = z.strictObject({
  title,
  description: description.optional(),
});

export const updateTaskSchema = z
  .strictObject({
    title: title.optional(),
    description: description.optional(),
    completed: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'At least one field must be provided',
  });

export const taskIdParamsSchema = z.object({
  id: z.uuid('Task id must be a valid UUID'),
});

export type Task = z.infer<typeof taskSchema>;
export type CreateTaskInput = z.input<typeof createTaskSchema>;
export type UpdateTaskInput = z.input<typeof updateTaskSchema>;
export type TaskIdParams = z.infer<typeof taskIdParamsSchema>;
