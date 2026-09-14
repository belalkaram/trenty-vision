import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

export async function requestIdMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const existingId = request.headers['x-request-id'] as string;
  const requestId = existingId || uuidv4();
  request.id = requestId;
  reply.header('x-request-id', requestId);
}
