import { FastifyInstance } from 'fastify';
import { SettingsService } from './settings.service';
import { updateSettingSchema } from './settings.schema';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { sendSuccess } from '../../utils/api-response';

export async function settingsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // Get all settings for current company
  fastify.get(
    '/',
    { preHandler: [requirePermission('manage_settings')] },
    async (request, reply) => {
      const companyId = request.companyId || request.user?.companyId || undefined;
      const all = await SettingsService.getAll(companyId);
      return sendSuccess(reply, { ...all.map, list: all.list, map: all.map }, 'Settings retrieved');
    }
  );

  // Get single setting by key
  fastify.get('/:key', async (request, reply) => {
    const { key } = request.params as { key: string };
    const companyId = request.companyId || request.user?.companyId || undefined;
    const val = await SettingsService.get(key, companyId);
    return sendSuccess(reply, { key, value: val }, 'Setting value');
  });

  // Update batch settings (supports both POST and PUT)
  const handleBatchUpdate = async (request: any, reply: any) => {
    let settingsToUpdate: Record<string, any> = {};
    if (request.body && typeof request.body === 'object') {
      if ('settings' in request.body && typeof request.body.settings === 'object') {
        settingsToUpdate = request.body.settings;
      } else {
        settingsToUpdate = request.body;
      }
    }

    delete settingsToUpdate.list;
    delete settingsToUpdate.map;
    delete settingsToUpdate.results;

    const companyId = request.companyId || request.user?.companyId || undefined;
    const results = await SettingsService.updateBatch(settingsToUpdate, request.user?.id, companyId);
    const all = await SettingsService.getAll(companyId);
    return sendSuccess(reply, { ...all.map, results }, 'Settings updated successfully');
  };

  fastify.post('/', { preHandler: [requirePermission('manage_settings')] }, handleBatchUpdate);
  fastify.put('/', { preHandler: [requirePermission('manage_settings')] }, handleBatchUpdate);

  // Update single setting
  fastify.put(
    '/:key',
    { preHandler: [requirePermission('manage_settings')] },
    async (request, reply) => {
      const { key } = request.params as { key: string };
      const input = updateSettingSchema.parse(request.body);
      const companyId = request.companyId || request.user?.companyId || undefined;
      const updated = await SettingsService.set(key, input.value, request.user?.id, companyId);
      return sendSuccess(reply, updated, `Setting "${key}" updated`);
    }
  );
}
