import { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export function requirePermission(permissionName: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError('Authentication required.');
    }

    // Administrator / Super admin has all permissions
    if (request.user.roleName === 'adminstrator' || request.user.roleName === 'super_admin' || request.user.roleName === 'admin') {
      return;
    }

    if (!request.user.permissions.includes(permissionName)) {
      throw new ForbiddenError(`Missing required permission: ${permissionName}`);
    }
  };
}

export function requireAnyPermission(permissionNames: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError('Authentication required.');
    }

    if (request.user.roleName === 'adminstrator' || request.user.roleName === 'super_admin' || request.user.roleName === 'admin') {
      return;
    }

    const hasAny = permissionNames.some((p) => request.user?.permissions.includes(p));
    if (!hasAny) {
      throw new ForbiddenError(`Missing at least one required permission: ${permissionNames.join(', ')}`);
    }
  };
}

export function requireRole(roleNames: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError('Authentication required.');
    }

    if (!roleNames.includes(request.user.roleName)) {
      throw new ForbiddenError(`Role must be one of: ${roleNames.join(', ')}`);
    }
  };
}
