import { db } from '../../database/client';
import { roles, permissions, rolePermissions, companies } from '../../database/schema/index';
import { eq, and, inArray } from 'drizzle-orm';
import { NotFoundError, ConflictError, ValidationError } from '../../utils/errors';
import { CreateRoleInput, UpdateRoleInput } from './roles.schema';
import { AuditService } from '../audit/audit.service';

export class RolesService {
  public static async getCompanyId(providedId?: string | null): Promise<string> {
    if (providedId) return providedId;
    const comp = await db.query.companies.findFirst();
    if (!comp) {
      throw new Error('Default company not found');
    }
    return comp.id;
  }

  public static async listRoles(companyId?: string | null) {
    const whereClause = companyId ? eq(roles.companyId, companyId) : undefined;
    const allRoles = await db.select().from(roles).where(whereClause);

    // Fetch permissions for each role
    const results = await Promise.all(
      allRoles.map(async (role) => {
        const assigned = await db
          .select({
            id: permissions.id,
            name: permissions.name,
            displayName: permissions.displayName,
            groupName: permissions.groupName,
          })
          .from(rolePermissions)
          .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
          .where(eq(rolePermissions.roleId, role.id));

        return {
          ...role,
          permissions: assigned,
        };
      })
    );

    return results;
  }

  public static async listPermissions(companyId?: string | null) {
    const whereClause = companyId ? eq(permissions.companyId, companyId) : undefined;
    return db.select().from(permissions).where(whereClause);
  }

  public static async getRole(id: string, companyId?: string | null) {
    const condition = companyId
      ? and(eq(roles.id, id), eq(roles.companyId, companyId))
      : eq(roles.id, id);

    const role = await db.query.roles.findFirst({
      where: condition,
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    const assigned = await db
      .select({
        id: permissions.id,
        name: permissions.name,
        displayName: permissions.displayName,
        groupName: permissions.groupName,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, role.id));

    return {
      ...role,
      permissions: assigned,
    };
  }

  public static async createRole(input: CreateRoleInput, actorId?: string, companyId?: string | null) {
    const effectiveCompanyId = await this.getCompanyId(companyId);

    const existing = await db.query.roles.findFirst({
      where: and(eq(roles.companyId, effectiveCompanyId), eq(roles.name, input.name)),
    });

    if (existing) {
      throw new ConflictError('A role with this name already exists in this company');
    }

    const [newRole] = await db
      .insert(roles)
      .values({
        companyId: effectiveCompanyId,
        name: input.name,
        displayName: input.displayName,
        description: input.description,
        isSystem: false,
      })
      .returning();

    // Verify and assign permissions within this company
    const validPerms = await db
      .select()
      .from(permissions)
      .where(
        and(
          eq(permissions.companyId, effectiveCompanyId),
          inArray(permissions.name, input.permissions)
        )
      );

    if (validPerms.length > 0) {
      await db.insert(rolePermissions).values(
        validPerms.map((p) => ({
          roleId: newRole.id,
          permissionId: p.id,
        }))
      );
    }

    await AuditService.log({
      actorId,
      companyId: effectiveCompanyId,
      action: 'role.create',
      entityType: 'role',
      entityId: newRole.id,
      newValues: { name: newRole.name, permissions: input.permissions },
    });

    return this.getRole(newRole.id, effectiveCompanyId);
  }

  public static async updateRole(id: string, input: UpdateRoleInput, actorId?: string, companyId?: string | null) {
    const role = await db.query.roles.findFirst({
      where: and(eq(roles.id, id), companyId ? eq(roles.companyId, companyId) : undefined),
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    if (role.isSystem && input.displayName && (role.name === 'super_admin' || role.name === 'adminstrator')) {
      throw new ValidationError('System role structure cannot be modified');
    }

    const oldRole = await this.getRole(id, companyId);

    await db
      .update(roles)
      .set({
        displayName: input.displayName ?? role.displayName,
        description: input.description ?? role.description,
      })
      .where(eq(roles.id, id));

    if (input.permissions) {
      // Remove existing permissions
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));

      const permConditions = [inArray(permissions.name, input.permissions)];
      if (role.companyId) {
        permConditions.push(eq(permissions.companyId, role.companyId));
      }

      const validPerms = await db
        .select()
        .from(permissions)
        .where(and(...permConditions));

      if (validPerms.length > 0) {
        await db.insert(rolePermissions).values(
          validPerms.map((p) => ({
            roleId: id,
            permissionId: p.id,
          }))
        );
      }
    }

    const updatedRole = await this.getRole(id, companyId);

    await AuditService.log({
      actorId,
      companyId: role.companyId,
      action: 'role.update',
      entityType: 'role',
      entityId: id,
      oldValues: oldRole,
      newValues: updatedRole,
    });

    return updatedRole;
  }
}
