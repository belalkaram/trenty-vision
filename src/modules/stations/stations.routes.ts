import { FastifyInstance } from 'fastify';
import { StationsService } from './stations.service';
import { createStationSchema, updateStationSchema } from './stations.schema';
import { authenticate, requireCrmCompany } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { sendSuccess } from '../../utils/api-response';

export async function stationsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', requireCrmCompany);

  fastify.get('/', async (request, reply) => {
    const companyId = request.companyId || request.user?.companyId;
    const list = await StationsService.list(companyId);
    return sendSuccess(reply, list, 'Stations retrieved');
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const companyId = request.companyId || request.user?.companyId;
    const station = await StationsService.getById(id, companyId);
    return sendSuccess(reply, station, 'Station details');
  });

  fastify.post(
    '/',
    { preHandler: [requirePermission('manage_stations')] },
    async (request, reply) => {
      const companyId = request.companyId || request.user?.companyId;
      const input = createStationSchema.parse(request.body);
      const station = await StationsService.create(input, request.user?.id, companyId);
      return sendSuccess(reply, station, 'Station created successfully', 201);
    }
  );

  fastify.put(
    '/:id',
    { preHandler: [requirePermission('manage_stations')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const companyId = request.companyId || request.user?.companyId;
      const input = updateStationSchema.parse(request.body);
      const station = await StationsService.update(id, input, request.user?.id, companyId);
      return sendSuccess(reply, station, 'Station updated successfully');
    }
  );

  fastify.delete(
    '/:id',
    { preHandler: [requirePermission('manage_stations')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const companyId = request.companyId || request.user?.companyId;
      const result = await StationsService.delete(id, request.user?.id, companyId);
      return sendSuccess(reply, result, 'Station deleted successfully');
    }
  );
}
