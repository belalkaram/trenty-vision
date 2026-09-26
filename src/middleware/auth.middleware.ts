import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config/index';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { db } from '../database/client';
import { users, roles, rolePermissions, permissions, companies } from '../database/schema/index';
import { eq } from 'drizzle-orm';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roleId: string | null;
  roleName: string;
  companyId: string | null;
  companyName?: string;
  companyLogo?: string | null;
  companyType?: string; // 'crm' | 'group_manager'
  isSuperAdmin: boolean;
  permissions: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
    companyId?: string;
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

    // Load active user
    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.userId),
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedError('User account is inactive or not found.');
    }

    let companyName: string | undefined;
    let companyLogo: string | null = null;
    let companyType: string | undefined;

    if (user.companyId) {
      const company = await db.query.companies.findFirst({
        where: eq(companies.id, user.companyId),
      });

      if (!company || company.status === 'suspended') {
        throw new UnauthorizedError('Company account is suspended or inactive.');
      }
      companyName = company.name;
      companyLogo = company.logoUrl;
      companyType = company.type;
    }

    let roleName = 'user';
    let permNames: string[] = [];
    const isSuperAdmin = user.companyId === null;

    if (user.roleId) {
      const userRole = await db.query.roles.findFirst({
        where: eq(roles.id, user.roleId),
      });

      if (userRole) {
        roleName = userRole.name;
      }

      // Load permissions for this role
      const assignedPerms = await db
        .select({ name: permissions.name })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, user.roleId));

      permNames = assignedPerms.map((p) => p.name);
    } else if (isSuperAdmin) {
      roleName = 'superadmin';
      permNames = ['*'];
    }

    request.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      roleName,
      companyId: user.companyId,
      companyName,
      companyLogo,
      companyType,
      isSuperAdmin,
      permissions: permNames,
    };

    if (user.companyId) {
      request.companyId = user.companyId;
    }
  } catch (err: any) {
    if (err instanceof UnauthorizedError) {
      throw err;
    }
    throw new UnauthorizedError('Invalid or expired token.');
  }
}

/**
 * Ensures that the requesting tenant is allowed to access CRM features.
 * Companies of type 'group_manager' are restricted from CRM endpoints.
 */
export async function requireCrmCompany(request: FastifyRequest, _reply: FastifyReply) {
  if (request.user?.isSuperAdmin) {
    return;
  }
  if (request.user?.companyType === 'group_manager') {
    throw new ForbiddenError('هذا الحساب مخصص لأداة إدارة وسحب الجروبات فقط، ولا يملك صلاحية الوصول إلى نظام إدارة علاقات العملاء (CRM).');
  }
}

