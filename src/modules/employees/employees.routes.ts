import { FastifyInstance } from 'fastify';
import { EmployeesService } from './employees.service';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  updateEmployeeStatusSchema,
} from './employees.schema';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { sendSuccess } from '../../utils/api-response';

export async function employeesRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // List employees
  fastify.get(
    '/',
    { preHandler: [requirePermission('manage_employees')] },
    async (request, reply) => {
      const query = request.query as {
        departmentId?: string;
        stationId?: string;
        supervisorId?: string;
        status?: 'active' | 'inactive' | 'away' | 'offline';
      };

      const list = await EmployeesService.list(query);
      return sendSuccess(reply, list, 'Employees retrieved');
    }
  );

  // Get supervisors list for dropdowns
  fastify.get(
    '/supervisors',
    { preHandler: [requirePermission('manage_employees')] },
    async (request, reply) => {
      const supervisors = await EmployeesService.getSupervisors();
      return sendSuccess(reply, supervisors, 'Supervisors retrieved');
    }
  );

  // Get single employee
  fastify.get(
    '/:id',
    { preHandler: [requirePermission('manage_employees')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const employee = await EmployeesService.getById(id);
      return sendSuccess(reply, employee, 'Employee details');
    }
  );

  // Create new employee
  fastify.post(
    '/',
    { preHandler: [requirePermission('manage_employees')] },
    async (request, reply) => {
      const input = createEmployeeSchema.parse(request.body);
      const employee = await EmployeesService.create(input, request.user?.id);
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
      const result = await EmployeesService.delete(id, request.user?.id);
      return sendSuccess(reply, result, 'Employee deleted successfully');
    }
  );
}
