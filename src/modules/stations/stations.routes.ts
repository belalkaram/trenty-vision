import { FastifyInstance } from 'fastify';
import { StationsService } from './stations.service';
import { createStationSchema, updateStationSchema } from './stations.schema';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { sendSuccess } from '../../utils/api-response';

export async function stationsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/', async (request, reply) => {
    const list = await StationsService.list();
    return sendSuccess(reply, list, 'Stations retrieved');
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const station = await StationsService.getById(id);
    return sendSuccess(reply, station, 'Station details');
  });

  fastify.post(
    '/',
    { preHandler: [requirePermission('manage_stations')] },
    async (request, reply) => {
      const input = createStationSchema.parse(request.body);
      const station = await StationsService.create(input, request.user?.id);
      return sendSuccess(reply, station, 'Station created successfully', 201);
    }
  );

  fastify.put(
    '/:id',
    { preHandler: [requirePermission('manage_stations')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updateStationSchema.parse(request.body);
      const station = await StationsService.update(id, input, request.user?.id);
      return sendSuccess(reply, station, 'Station updated successfully');
    }
  );

  fastify.delete(
    '/:id',
    { preHandler: [requirePermission('manage_stations')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await StationsService.delete(id, request.user?.id);
      return sendSuccess(reply, result, 'Station deleted successfully');
    }
  );
}
