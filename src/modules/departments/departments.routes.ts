import { FastifyInstance } from 'fastify';
import { DepartmentsService } from './departments.service';
import { createDepartmentSchema, updateDepartmentSchema } from './departments.schema';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { sendSuccess } from '../../utils/api-response';

export async function departmentsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/', async (request, reply) => {
    const depts = await DepartmentsService.list();
    return sendSuccess(reply, depts, 'Departments retrieved');
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const dept = await DepartmentsService.getById(id);
    return sendSuccess(reply, dept, 'Department details');
  });

  fastify.post(
    '/',
    { preHandler: [requirePermission('manage_departments')] },
    async (request, reply) => {
      const input = createDepartmentSchema.parse(request.body);
      const dept = await DepartmentsService.create(input, request.user?.id);
      return sendSuccess(reply, dept, 'Department created successfully', 201);
    }
  );

  fastify.put(
    '/:id',
    { preHandler: [requirePermission('manage_departments')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updateDepartmentSchema.parse(request.body);
      const dept = await DepartmentsService.update(id, input, request.user?.id);
      return sendSuccess(reply, dept, 'Department updated successfully');
    }
  );

  fastify.delete(
    '/:id',
    { preHandler: [requirePermission('manage_departments')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await DepartmentsService.delete(id, request.user?.id);
      return sendSuccess(reply, result, 'Department deleted successfully');
    }
  );
}
