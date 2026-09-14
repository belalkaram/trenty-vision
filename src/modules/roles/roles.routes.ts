import { FastifyInstance } from 'fastify';
import { RolesService } from './roles.service';
import { createRoleSchema, updateRoleSchema } from './roles.schema';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { sendSuccess } from '../../utils/api-response';

export async function rolesRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // List all roles
  fastify.get(
    '/',
    { preHandler: [requirePermission('manage_roles')] },
    async (request, reply) => {
      const roles = await RolesService.listRoles();
      return sendSuccess(reply, roles, 'Roles retrieved');
    }
  );

  // List all available permissions
  fastify.get(
    '/permissions',
    { preHandler: [requirePermission('manage_roles')] },
    async (request, reply) => {
      const permissions = await RolesService.listPermissions();
      return sendSuccess(reply, permissions, 'Permissions retrieved');
    }
  );

  // Get single role
  fastify.get(
    '/:id',
    { preHandler: [requirePermission('manage_roles')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const role = await RolesService.getRole(id);
      return sendSuccess(reply, role, 'Role details');
    }
  );

  // Create role
  fastify.post(
    '/',
    { preHandler: [requirePermission('manage_roles')] },
    async (request, reply) => {
      const input = createRoleSchema.parse(request.body);
      const role = await RolesService.createRole(input, request.user?.id);
      return sendSuccess(reply, role, 'Role created successfully', 201);
    }
  );

  // Update role
  fastify.put(
    '/:id',
    { preHandler: [requirePermission('manage_roles')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updateRoleSchema.parse(request.body);
      const role = await RolesService.updateRole(id, input, request.user?.id);
      return sendSuccess(reply, role, 'Role updated successfully');
    }
  );
}
