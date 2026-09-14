import { db } from '../../database/client';
import { roles, permissions, rolePermissions } from '../../database/schema/index';
import { eq, inArray } from 'drizzle-orm';
import { NotFoundError, ConflictError, ValidationError } from '../../utils/errors';
import { CreateRoleInput, UpdateRoleInput } from './roles.schema';
import { AuditService } from '../audit/audit.service';

export class RolesService {
  public static async listRoles() {
    const allRoles = await db.select().from(roles);

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

  public static async listPermissions() {
    return db.select().from(permissions);
  }

  public static async getRole(id: string) {
    const role = await db.query.roles.findFirst({
      where: eq(roles.id, id),
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

  public static async createRole(input: CreateRoleInput, actorId?: string) {
    const existing = await db.query.roles.findFirst({
      where: eq(roles.name, input.name),
    });

    if (existing) {
      throw new ConflictError('A role with this name already exists');
    }

    const [newRole] = await db
      .insert(roles)
      .values({
        name: input.name,
        displayName: input.displayName,
        description: input.description,
        isSystem: false,
      })
      .returning();

    // Verify and assign permissions
    const validPerms = await db
      .select()
      .from(permissions)
      .where(inArray(permissions.name, input.permissions));

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
      action: 'role.create',
      entityType: 'role',
      entityId: newRole.id,
      newValues: { name: newRole.name, permissions: input.permissions },
    });

    return this.getRole(newRole.id);
  }

  public static async updateRole(id: string, input: UpdateRoleInput, actorId?: string) {
    const role = await db.query.roles.findFirst({
      where: eq(roles.id, id),
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    if (role.isSystem && input.displayName && role.name === 'super_admin') {
      throw new ValidationError('System super_admin role cannot be modified');
    }

    const oldRole = await this.getRole(id);

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

      const validPerms = await db
        .select()
        .from(permissions)
        .where(inArray(permissions.name, input.permissions));

      if (validPerms.length > 0) {
        await db.insert(rolePermissions).values(
          validPerms.map((p) => ({
            roleId: id,
            permissionId: p.id,
          }))
        );
      }
    }

    const updatedRole = await this.getRole(id);

    await AuditService.log({
      actorId,
      action: 'role.update',
      entityType: 'role',
      entityId: id,
      oldValues: oldRole,
      newValues: updatedRole,
    });

    return updatedRole;
  }
}
