import fp from 'fastify-plugin';
import type { FastifyError } from 'fastify';
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from 'fastify-type-provider-zod';
import type { ApiError } from '@app/shared';
import { AppError } from '../errors/app-error.js';

function body(
  code: ApiError['error']['code'],
  message: string,
  details?: ApiError['error']['details'],
): ApiError {
  return { error: details ? { code, message, details } : { code, message } };
}

/** Single place that turns any thrown error into the standard error body. */
export const errorHandlerPlugin = fp(async (app) => {
  app.setNotFoundHandler((request, reply) => {
    reply
      .code(404)
      .send(body('ROUTE_NOT_FOUND', `Route ${request.method} ${request.url} not found`));
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      const details = error.validation.map((issue) => ({
        path: issue.instancePath.replace(/^\//, '').replaceAll('/', '.'),
        message: issue.message ?? 'Invalid value',
      }));
      return reply.code(400).send(body('VALIDATION_ERROR', 'Request validation failed', details));
    }

    if (error instanceof AppError) {
      if (error.statusCode >= 500) request.log.error({ err: error }, error.message);
      return reply.code(error.statusCode).send(body(error.code, error.message));
    }

    if (isResponseSerializationError(error)) {
      request.log.error({ err: error, cause: error.cause }, 'Response failed schema validation');
      return reply.code(500).send(body('INTERNAL_ERROR', 'Internal server error'));
    }

    const status = error.statusCode ?? 500;
    if (status === 429) {
      return reply.code(429).send(body('RATE_LIMITED', 'Too many requests, slow down'));
    }
    if (status >= 400 && status < 500) {
      return reply.code(status).send(body('BAD_REQUEST', error.message));
    }

    request.log.error({ err: error }, 'Unhandled error');
    return reply.code(500).send(body('INTERNAL_ERROR', 'Internal server error'));
  });
});
