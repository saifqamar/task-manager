import { z } from 'zod';

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'BAD_REQUEST',
  'TASK_NOT_FOUND',
  'CITY_NOT_FOUND',
  'ROUTE_NOT_FOUND',
  'RATE_LIMITED',
  'UPSTREAM_ERROR',
  'SERVICE_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const;

export const errorCodeSchema = z.enum(ERROR_CODES);

export const apiErrorSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});

export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
