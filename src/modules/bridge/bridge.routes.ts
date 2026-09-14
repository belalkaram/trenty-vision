import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../database/client';
import { bridgeHeartbeats, bridgeCommands, whatsappAccounts } from '../../database/schema/index';
import { logger } from '../../utils/logger';

export async function bridgeRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/bridge/status — Get Baileys Bridge health & connection status
   */
  app.get('/status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const [heartbeat] = await db
        .select()
        .from(bridgeHeartbeats)
        .orderBy(desc(bridgeHeartbeats.lastSeenAt))
        .limit(1);

      if (!heartbeat) {
        return reply.send({
          success: true,
          data: {
            isOnline: false,
            bridgeId: null,
            lastSeenAt: null,
            uptimeSeconds: 0,
            version: '1.0.0',
            message: 'لم يتم تسجيل أي اتصال من سيرفر WhatsApp المحلي بعد.',
          },
        });
      }

      // Check if last seen within 35 seconds (heartbeat sent every 15s)
      const diffMs = Date.now() - new Date(heartbeat.lastSeenAt).getTime();
      const isOnline = diffMs < 35000;

      return reply.send({
        success: true,
        data: {
          isOnline,
          bridgeId: heartbeat.bridgeId,
          lastSeenAt: heartbeat.lastSeenAt,
          uptimeSeconds: heartbeat.uptimeSeconds,
          version: heartbeat.version,
          accountsSummary: heartbeat.accountsSummary,
          diffSeconds: Math.round(diffMs / 1000),
          message: isOnline
            ? 'سيرفر WhatsApp المحلي متصل وجاهز.'
            : 'سيرفر WhatsApp المحلي غير متصل حالياً.',
        },
      });
    } catch (err: any) {
      logger.error({ err }, 'Failed to fetch bridge status');
      return reply.status(500).send({ success: false, error: 'Failed to check bridge status' });
    }
  });

  /**
   * GET /api/v1/bridge/accounts — Summary of accounts monitored by Bridge
   */
  app.get('/accounts', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const accounts = await db
        .select({
          id: whatsappAccounts.id,
          displayName: whatsappAccounts.displayName,
          phoneNumber: whatsappAccounts.phoneNumber,
          status: whatsappAccounts.status,
          bridgeStatus: whatsappAccounts.bridgeStatus,
          bridgeLastSeen: whatsappAccounts.bridgeLastSeen,
          hasQrCode: whatsappAccounts.bridgeQrCode,
        })
        .from(whatsappAccounts);

      return reply.send({
        success: true,
        data: accounts.map((acc) => ({
          ...acc,
          hasQrCode: Boolean(acc.hasQrCode),
        })),
      });
    } catch (err: any) {
      logger.error({ err }, 'Failed to fetch bridge accounts');
      return reply.status(500).send({ success: false, error: 'Failed to fetch bridge accounts' });
    }
  });

  /**
   * POST /api/v1/bridge/command-result — Report bridge command execution result
   */
  app.post('/command-result', async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      commandId: z.string().uuid(),
      status: z.enum(['completed', 'failed']),
      result: z.record(z.any()).optional(),
      error: z.string().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: 'Invalid payload' });
    }

    const { commandId, status, result, error } = parsed.data;

    await db
      .update(bridgeCommands)
      .set({
        status,
        result: result || null,
        error: error || null,
        completedAt: new Date(),
      })
      .where(eq(bridgeCommands.id, commandId));

    return reply.send({ success: true, message: 'Command result updated' });
  });
}
