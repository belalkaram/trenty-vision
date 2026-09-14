import { FastifyInstance } from 'fastify';
import { AuditService } from './audit.service';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { sendSuccess } from '../../utils/api-response';

export async function auditRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  fastify.get(
    '/',
    { preHandler: [requirePermission('view_audit_logs')] },
    async (request, reply) => {
      const query = request.query as {
        page?: string;
        limit?: string;
        entityType?: string;
        actorId?: string;
      };

      const result = await AuditService.list({
        page: query.page ? parseInt(query.page, 10) : 1,
        limit: query.limit ? parseInt(query.limit, 10) : 20,
        entityType: query.entityType,
        actorId: query.actorId,
      });

      return sendSuccess(reply, result.items, 'Audit logs retrieved', 200, result.pagination);
    }
  );
}
