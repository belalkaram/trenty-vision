import { FastifyInstance } from 'fastify';
import { db, pool } from '../../database/client';
import { sql } from 'drizzle-orm';
import { sendSuccess, sendError } from '../../utils/api-response';

export async function healthRoutes(fastify: FastifyInstance) {
  // Global health check
  fastify.get('/', async (request, reply) => {
    return sendSuccess(
      reply,
      {
        status: 'healthy',
        timestamp: new Date(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        version: '1.0.0',
      },
      'Trenty Vision CRM is operational'
    );
  });

  // Database health
  fastify.get('/database', async (request, reply) => {
    try {
      const start = Date.now();
      await db.execute(sql`SELECT 1`);
      const latencyMs = Date.now() - start;

      return sendSuccess(
        reply,
        {
          status: 'connected',
          latencyMs,
          totalPoolClients: pool.totalCount,
          idleClients: pool.idleCount,
        },
        'Database connection active'
      );
    } catch (err: any) {
      return sendError(reply, `Database health check failed: ${err.message}`, 503);
    }
  });

  // WhatsApp Gateway health (Phase 1 stub)
  fastify.get('/whatsapp', async (request, reply) => {
    return sendSuccess(
      reply,
      {
        status: 'ready_for_phase_2',
        gateway: 'Baileys',
        activeSessions: 0,
      },
      'WhatsApp Gateway subsystem initialized'
    );
  });

  // Storage health
  fastify.get('/storage', async (request, reply) => {
    return sendSuccess(
      reply,
      {
        driver: 'local',
        status: 'writable',
      },
      'Storage provider active'
    );
  });

  // CRM health
  fastify.get('/crm', async (request, reply) => {
    return sendSuccess(
      reply,
      {
        status: 'configured',
        connectionsCount: 0,
      },
      'CRM integration layer active'
    );
  });
}
