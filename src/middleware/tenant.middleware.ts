import { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

export async function requireTenant(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    throw new UnauthorizedError('Authentication required.');
  }

  // Super Admin can specify company via header or query, or operate globally
  if (request.user.isSuperAdmin) {
    const overrideCompanyId = (request.headers['x-company-id'] as string) || (request.query as any)?.companyId;
    if (overrideCompanyId) {
      request.companyId = overrideCompanyId;
    }
    return;
  }

  if (!request.user.companyId) {
    throw new ForbiddenError('User is not associated with any active company.');
  }

  request.companyId = request.user.companyId;
}
