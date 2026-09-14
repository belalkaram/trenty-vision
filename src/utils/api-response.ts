import { FastifyReply } from 'fastify';

export interface ApiResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  requestId?: string;
  [key: string]: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  message: string;
  errors: Record<string, string[]> | null;
  meta: ApiResponseMeta;
}

export function sendSuccess<T>(
  reply: FastifyReply,
  data: T,
  message = 'Success',
  statusCode = 200,
  meta: ApiResponseMeta = {}
) {
  const requestId = reply.request.id;
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    errors: null,
    meta: {
      requestId,
      ...meta,
    },
  };
  return reply.status(statusCode).send(response);
}

export function sendError(
  reply: FastifyReply,
  message: string,
  statusCode = 500,
  errors: Record<string, string[]> | null = null,
  meta: ApiResponseMeta = {}
) {
  const requestId = reply.request.id;
  const response: ApiResponse<null> = {
    success: false,
    data: null,
    message,
    errors,
    meta: {
      requestId,
      ...meta,
    },
  };
  return reply.status(statusCode).send(response);
}
