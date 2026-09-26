import { FastifyInstance } from 'fastify';
import { EmployeesService } from './employees.service';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  updateEmployeeStatusSchema,
} from './employees.schema';
import { authenticate, requireCrmCompany } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { sendSuccess } from '../../utils/api-response';

export async function employeesRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', requireCrmCompany);

  // List employees
  fastify.get(
    '/',
    { preHandler: [requirePermission('manage_employees')] },
    async (request, reply) => {
      const companyId = request.companyId || request.user?.companyId;
      const query = request.query as {
        departmentId?: string;
        stationId?: string;
        supervisorId?: string;
        status?: 'active' | 'inactive' | 'away' | 'offline';
      };

      const list = await EmployeesService.list({ ...query, companyId });
      return sendSuccess(reply, list, 'Employees retrieved');
    }
  );

  // Get supervisors list for dropdowns
  fastify.get(
    '/supervisors',
    { preHandler: [requirePermission('manage_employees')] },
    async (request, reply) => {
      const companyId = request.companyId || request.user?.companyId;
      const supervisors = await EmployeesService.getSupervisors(companyId);
      return sendSuccess(reply, supervisors, 'Supervisors retrieved');
    }
  );

  // Get single employee
  fastify.get(
    '/:id',
    { preHandler: [requirePermission('manage_employees')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const companyId = request.companyId || request.user?.companyId;
      const employee = await EmployeesService.getById(id, companyId);
      return sendSuccess(reply, employee, 'Employee details');
    }
  );

  // Create new employee
  fastify.post(
    '/',
    { preHandler: [requirePermission('manage_employees')] },
    async (request, reply) => {
      const companyId = request.companyId || request.user?.companyId;
      const input = createEmployeeSchema.parse(request.body);
      const employee = await EmployeesService.create(input, request.user?.id, companyId);
      return sendSuccess(reply, employee, 'Employee created successfully', 201);
    }
  );

  // Update employee
  fastify.put(
    '/:id',
    { preHandler: [requirePermission('manage_employees')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updateEmployeeSchema.parse(request.body);
      const employee = await EmployeesService.update(id, input, request.user?.id);
      return sendSuccess(reply, employee, 'Employee updated successfully');
    }
  );

  // Update status (e.g. active, away, offline)
  fastify.patch('/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = updateEmployeeStatusSchema.parse(request.body);
    const employee = await EmployeesService.updateStatus(id, status);
    return sendSuccess(reply, employee, 'Status updated');
  });

  // Delete employee
  fastify.delete(
    '/:id',
    { preHandler: [requirePermission('manage_employees')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const companyId = request.companyId || request.user?.companyId;
      const result = await EmployeesService.delete(id, request.user?.id, companyId);
      return sendSuccess(reply, result, 'Employee deleted successfully');
    }
  );
}
