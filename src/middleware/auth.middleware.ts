import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config/index';
import { UnauthorizedError } from '../utils/errors';
import { db } from '../database/client';
import { users, roles, rolePermissions, permissions } from '../database/schema/index';
import { eq } from 'drizzle-orm';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  permissions: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  let token: string | undefined;

  // 1. Check Authorization Bearer header
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // 2. Check HTTP-only cookie if no header
  if (!token && request.cookies?.access_token) {
    token = request.cookies.access_token;
  }

  // 3. Check query param token (e.g. for CSV export direct downloads)
  if (!token && (request.query as any)?.token) {
    token = (request.query as any).token;
  }

  if (!token) {
    throw new UnauthorizedError('Authentication required. Please log in.');
  }

  try {
    const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as {
      userId: string;
      email: string;
    };

    // Load active user with role and permissions
    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.userId),
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedError('User account is inactive or not found.');
    }

    const userRole = await db.query.roles.findFirst({
      where: eq(roles.id, user.roleId),
    });

    if (!userRole) {
      throw new UnauthorizedError('User role not found.');
    }

    // Load permissions for this role
    const assignedPerms = await db
      .select({ name: permissions.name })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, user.roleId));

    const permNames = assignedPerms.map((p) => p.name);

    request.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      roleName: userRole.name,
      permissions: permNames,
    };
  } catch (err: any) {
    if (err instanceof UnauthorizedError) {
      throw err;
    }
    throw new UnauthorizedError('Invalid or expired token.');
  }
}
