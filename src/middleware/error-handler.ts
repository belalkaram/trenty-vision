import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/api-response';
import { logger } from '../utils/logger';

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  logger.error(
    {
      err: error,
      url: request.url,
      method: request.method,
      requestId: request.id,
      userId: request.user?.id,
    },
    'Request error occurred'
  );

  // Zod Validation Error
  if (error instanceof ZodError) {
    const formattedErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const field = issue.path.join('.') || 'body';
      if (!formattedErrors[field]) {
        formattedErrors[field] = [];
      }
      formattedErrors[field].push(issue.message);
    }
    return sendError(reply, 'Validation error', 422, formattedErrors);
  }

  // Application Custom Error
  if (error instanceof AppError) {
    return sendError(reply, error.message, error.statusCode, error.errors);
  }

  // Fastify Rate Limit Error
  if (error.statusCode === 429) {
    return sendError(reply, 'Too many requests, please slow down.', 429);
  }

  // Fastify standard 404
  if (error.statusCode === 404) {
    return sendError(reply, 'Route not found', 404);
  }

  // Default Internal Server Error
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message;
  return sendError(reply, message, error.statusCode || 500);
}
