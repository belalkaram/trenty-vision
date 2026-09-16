import { FastifyInstance } from 'fastify';
import { RolesService } from './roles.service';
import { createRoleSchema, updateRoleSchema } from './roles.schema';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { sendSuccess } from '../../utils/api-response';

export async function rolesRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // List all roles for current company
  fastify.get(
    '/',
    { preHandler: [requirePermission('manage_roles')] },
    async (request, reply) => {
      const companyId = request.companyId || request.user?.companyId;
      const roles = await RolesService.listRoles(companyId);
      return sendSuccess(reply, roles, 'Roles retrieved');
    }
  );

  // List all available permissions for current company
  fastify.get(
    '/permissions',
    { preHandler: [requirePermission('manage_roles')] },
    async (request, reply) => {
      const companyId = request.companyId || request.user?.companyId;
      const permissions = await RolesService.listPermissions(companyId);
      return sendSuccess(reply, permissions, 'Permissions retrieved');
    }
  );

  // Get single role
  fastify.get(
    '/:id',
    { preHandler: [requirePermission('manage_roles')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const companyId = request.companyId || request.user?.companyId;
      const role = await RolesService.getRole(id, companyId);
      return sendSuccess(reply, role, 'Role details');
    }
  );

  // Create role for current company
  fastify.post(
    '/',
    { preHandler: [requirePermission('manage_roles')] },
    async (request, reply) => {
      const companyId = request.companyId || request.user?.companyId;
      const input = createRoleSchema.parse(request.body);
      const role = await RolesService.createRole(input, request.user?.id, companyId);
      return sendSuccess(reply, role, 'Role created successfully', 201);
    }
  );

  // Update role
  fastify.put(
    '/:id',
    { preHandler: [requirePermission('manage_roles')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const companyId = request.companyId || request.user?.companyId;
      const input = updateRoleSchema.parse(request.body);
      const role = await RolesService.updateRole(id, input, request.user?.id, companyId);
      return sendSuccess(reply, role, 'Role updated successfully');
    }
  );
}
