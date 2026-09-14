import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, sql, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../database/client';
import { whatsappAccounts, whatsappSessions, companies, bridgeCommands, bridgeHeartbeats } from '../../database/schema/index';
import { config } from '../../config/index';
import { wsHub } from '../../websocket/ws.hub';
import { logger } from '../../utils/logger';

async function getLocalSessionManager() {
  if (config.DEPLOYMENT_MODE === 'local') {
    try {
      const mod = await import('./session.manager');
      return mod.sessionManager;
    } catch (e) {
      logger.warn({ err: e }, 'Could not load local sessionManager');
      return null;
    }
  }
  return null;
}

async function queueBridgeCommand(companyId: string, accountId: string, action: string, payload: Record<string, any> = {}) {
  const [cmd] = await db
    .insert(bridgeCommands)
    .values({
      companyId,
      accountId,
      action,
      payload,
      status: 'pending',
    })
    .returning();
  return cmd;
}

// ─── Schemas ─────────────────────────────────────────────

const createAccountSchema = z.object({
  displayName: z.string().min(1).max(150),
});

// ─── Routes ──────────────────────────────────────────────

export async function whatsappRoutes(app: FastifyInstance): Promise<void> {

  /**
   * GET /api/v1/whatsapp/accounts — List all WhatsApp accounts
   */
  app.get('/accounts', async (request: FastifyRequest, reply: FastifyReply) => {
    const accounts = await db
      .select()
      .from(whatsappAccounts)
      .orderBy(whatsappAccounts.createdAt);

    const sm = await getLocalSessionManager();
    let enriched;

    if (sm) {
      enriched = await Promise.all(
        accounts.map(async (account) => {
          const liveStatus = await sm.getAccountStatus(account.id);
          const liveQr = (await sm.getQRCode(account.id)) || liveStatus.qrCode || null;
          const livePairing = (await sm.getPairingCode(account.id)) || liveStatus.pairingCode || null;
          return {
            ...account,
            isPrimaryDispatcher: Boolean(account.isPrimaryDispatcher),
            dispatcherSlot: account.dispatcherSlot || null,
            status: liveStatus.status !== 'disconnected' ? liveStatus.status : account.status,
            liveStatus: liveStatus.status,
            liveQrCode: liveQr,
            livePairingCode: livePairing,
            livePhoneNumber: liveStatus.phoneNumber || account.phoneNumber,
            liveDeviceName: liveStatus.deviceName || account.deviceName,
            liveError: liveStatus.error || null,
            bridgeStatus: 'online',
          };
        })
      );
    } else {
      const [heartbeat] = await db
        .select()
        .from(bridgeHeartbeats)
        .orderBy(desc(bridgeHeartbeats.lastSeenAt))
        .limit(1);

      const isBridgeActive = heartbeat
        ? (Date.now() - new Date(heartbeat.lastSeenAt).getTime()) < 35000
        : false;

      enriched = accounts.map((account) => ({
        ...account,
        isPrimaryDispatcher: Boolean(account.isPrimaryDispatcher),
        dispatcherSlot: account.dispatcherSlot || null,
        liveStatus: isBridgeActive ? account.status : 'disconnected',
        liveQrCode: isBridgeActive ? (account.bridgeQrCode || null) : null,
        livePairingCode: null,
        livePhoneNumber: account.phoneNumber,
        liveDeviceName: account.deviceName,
        liveError: isBridgeActive ? null : 'سيرفر Baileys المحلي غير متصل',
        bridgeStatus: isBridgeActive ? 'online' : 'offline',
      }));
    }

    return reply.send({ success: true, data: enriched });
  });

  /**
   * POST /api/v1/whatsapp/accounts — Create a new WhatsApp account
   */
  app.post('/accounts', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = createAccountSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: 'Invalid input', details: parsed.error.format() });
    }

    // Get the first company (single-company system)
    const [company] = await db.select().from(companies).limit(1);
    if (!company) {
      return reply.status(500).send({ success: false, error: 'No company found. Run db:seed first.' });
    }

    const [account] = await db
      .insert(whatsappAccounts)
      .values({
        companyId: company.id,
        displayName: parsed.data.displayName,
        status: 'disconnected',
      })
      .returning();

    logger.info({ accountId: account.id, displayName: account.displayName }, 'WhatsApp account created');

    return reply.status(201).send({ success: true, data: account });
  });

  /**
   * GET /api/v1/whatsapp/accounts/:id — Get a specific WhatsApp account
   */
  app.get('/accounts/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const [account] = await db
      .select()
      .from(whatsappAccounts)
      .where(eq(whatsappAccounts.id, id));

    if (!account) {
      return reply.status(404).send({ success: false, error: 'Account not found' });
    }

    const sm = await getLocalSessionManager();
    if (sm) {
      const liveStatus = await sm.getAccountStatus(id);
      const liveQr = (await sm.getQRCode(id)) || liveStatus.qrCode || null;
      const livePairing = (await sm.getPairingCode(id)) || liveStatus.pairingCode || null;

      return reply.send({
        success: true,
        data: {
          ...account,
          liveStatus: liveStatus.status,
          liveQrCode: liveQr,
          livePairingCode: livePairing,
          livePhoneNumber: liveStatus.phoneNumber,
          liveJid: liveStatus.jid,
          liveDeviceName: liveStatus.deviceName,
        },
      });
    }

    return reply.send({
      success: true,
      data: {
        ...account,
        liveStatus: account.status,
        liveQrCode: account.bridgeQrCode,
        livePairingCode: null,
        livePhoneNumber: account.phoneNumber,
        liveJid: account.jid,
        liveDeviceName: account.deviceName,
      },
    });
  });

  /**
   * POST /api/v1/whatsapp/accounts/:id/connect — Start connection (generates QR)
   */
  app.post('/accounts/:id/connect', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const [account] = await db
      .select()
      .from(whatsappAccounts)
      .where(eq(whatsappAccounts.id, id));

    if (!account) {
      return reply.status(404).send({ success: false, error: 'Account not found' });
    }

    const sm = await getLocalSessionManager();
    if (sm) {
      try {
        await sm.connectAccount(id);
        return reply.send({ success: true, message: 'Connection initiated. Watch WebSocket for QR code.' });
      } catch (err) {
        logger.error({ accountId: id, err }, 'Failed to connect WhatsApp account');
        return reply.status(500).send({ success: false, error: 'Failed to start connection' });
      }
    } else {
      await queueBridgeCommand(account.companyId, id, 'connect');
      return reply.send({ success: true, message: 'تم إرسال أمر الاتصال إلى سيرفر WhatsApp المحلي.' });
    }
  });

  /**
   * POST /api/v1/whatsapp/accounts/:id/disconnect — Disconnect (keeps auth)
   */
  app.post('/accounts/:id/disconnect', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const [account] = await db.select().from(whatsappAccounts).where(eq(whatsappAccounts.id, id)).limit(1);
    if (!account) return reply.status(404).send({ success: false, error: 'Account not found' });

    const sm = await getLocalSessionManager();
    if (sm) {
      try {
        await sm.disconnectAccount(id);
        return reply.send({ success: true, message: 'Account disconnected' });
      } catch (err) {
        logger.error({ accountId: id, err }, 'Failed to disconnect WhatsApp account');
        return reply.status(500).send({ success: false, error: 'Failed to disconnect' });
      }
    } else {
      await queueBridgeCommand(account.companyId, id, 'disconnect');
      return reply.send({ success: true, message: 'تم إرسال أمر قطع الاتصال إلى سيرفر WhatsApp المحلي.' });
    }
  });

  /**
   * POST /api/v1/whatsapp/accounts/:id/logout — Logout (clears auth, needs new QR)
   */
  app.post('/accounts/:id/logout', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const [account] = await db.select().from(whatsappAccounts).where(eq(whatsappAccounts.id, id)).limit(1);
    if (!account) return reply.status(404).send({ success: false, error: 'Account not found' });

    const sm = await getLocalSessionManager();
    if (sm) {
      try {
        await sm.logoutAccount(id);
        return reply.send({ success: true, message: 'Account logged out. Auth state cleared.' });
      } catch (err) {
        logger.error({ accountId: id, err }, 'Failed to logout WhatsApp account');
        return reply.status(500).send({ success: false, error: 'Failed to logout' });
      }
    } else {
      await queueBridgeCommand(account.companyId, id, 'logout');
      return reply.send({ success: true, message: 'تم إرسال أمر تسجيل الخروج إلى سيرفر WhatsApp المحلي.' });
    }
  });

  /**
   * POST /api/v1/whatsapp/accounts/:id/reconnect — Reconnect account
   */
  app.post('/accounts/:id/reconnect', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const [account] = await db.select().from(whatsappAccounts).where(eq(whatsappAccounts.id, id)).limit(1);
    if (!account) return reply.status(404).send({ success: false, error: 'Account not found' });

    const sm = await getLocalSessionManager();
    if (sm) {
      try {
        await sm.reconnectAccount(id);
        return reply.send({ success: true, message: 'Reconnection initiated' });
      } catch (err) {
        logger.error({ accountId: id, err }, 'Failed to reconnect WhatsApp account');
        return reply.status(500).send({ success: false, error: 'Failed to reconnect' });
      }
    } else {
      await queueBridgeCommand(account.companyId, id, 'reconnect');
      return reply.send({ success: true, message: 'تم إرسال أمر إعادة الاتصال إلى سيرفر WhatsApp المحلي.' });
    }
  });

  /**
   * POST /api/v1/whatsapp/accounts/:id/restart — Restart account session (alias)
   */
  app.post('/accounts/:id/restart', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const [account] = await db.select().from(whatsappAccounts).where(eq(whatsappAccounts.id, id)).limit(1);
    if (!account) return reply.status(404).send({ success: false, error: 'Account not found' });

    const sm = await getLocalSessionManager();
    if (sm) {
      try {
        await sm.restartAccount(id);
        return reply.send({ success: true, message: 'Session restarted successfully' });
      } catch (err) {
        logger.error({ accountId: id, err }, 'Failed to restart WhatsApp account');
        return reply.status(500).send({ success: false, error: 'Failed to restart' });
      }
    } else {
      await queueBridgeCommand(account.companyId, id, 'restart');
      return reply.send({ success: true, message: 'تم إرسال أمر إعادة التشغيل إلى سيرفر WhatsApp المحلي.' });
    }
  });

  /**
   * POST /api/v1/whatsapp/accounts/:id/reset — Complete wipe and reset of auth credentials
   */
  app.post('/accounts/:id/reset', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const [account] = await db.select().from(whatsappAccounts).where(eq(whatsappAccounts.id, id)).limit(1);
    if (!account) return reply.status(404).send({ success: false, error: 'Account not found' });

    const sm = await getLocalSessionManager();
    if (sm) {
      try {
        await sm.resetAccount(id);
        return reply.send({ success: true, message: 'Account session reset. Ready for fresh pairing.' });
      } catch (err) {
        logger.error({ accountId: id, err }, 'Failed to reset WhatsApp account');
        return reply.status(500).send({ success: false, error: 'Failed to reset' });
      }
    } else {
      await queueBridgeCommand(account.companyId, id, 'reset');
      return reply.send({ success: true, message: 'تم إرسال أمر إعادة الضبط إلى سيرفر WhatsApp المحلي.' });
    }
  });

  /**
   * DELETE /api/v1/whatsapp/accounts/:id — Delete account permanently
   */
  app.delete('/accounts/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const sm = await getLocalSessionManager();
    if (sm) {
      try {
        await sm.deleteAccount(id);
      } catch (err) {
        logger.error({ accountId: id, err }, 'Failed to delete local session');
      }
    }
    await db.delete(whatsappAccounts).where(eq(whatsappAccounts.id, id));
    return reply.send({ success: true, message: 'Account deleted successfully' });
  });

  /**
   * POST /api/v1/whatsapp/accounts/:id/pairing-code — Request 8-character phone pairing code
   */
  app.post('/accounts/:id/pairing-code', async (request: FastifyRequest<{ Params: { id: string }; Body: { phoneNumber: string } }>, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { phoneNumber } = (request.body as { phoneNumber?: string }) || {};

    if (!phoneNumber || phoneNumber.trim().length < 6) {
      return reply.status(400).send({
        success: false,
        error: 'يرجى إدخال رقم هاتف صالح مع رمز الدولة (مثال: +965XXXXXXXX أو +201XXXXXXXXX)',
      });
    }

    const sm = await getLocalSessionManager();
    if (sm) {
      try {
        const code = await sm.requestPairingCode(id, phoneNumber.trim());
        return reply.send({
          success: true,
          data: {
            pairingCode: code,
            formattedCode: code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code,
            phoneNumber: phoneNumber.trim(),
          },
          message: 'Pairing code generated successfully',
        });
      } catch (err: any) {
        logger.error({ accountId: id, phoneNumber, err }, 'Failed to request pairing code');
        return reply.status(500).send({
          success: false,
          error: err.message || 'فشل توليد كود الاقتران. تأكد من أن الرقم غير مرتبط بالفعل.',
        });
      }
    } else {
      const [account] = await db.select().from(whatsappAccounts).where(eq(whatsappAccounts.id, id)).limit(1);
      if (!account) return reply.status(404).send({ success: false, error: 'Account not found' });
      const cmd = await queueBridgeCommand(account.companyId, id, 'pairing_code', { phoneNumber: phoneNumber.trim() });
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const [updatedCmd] = await db.select().from(bridgeCommands).where(eq(bridgeCommands.id, cmd.id)).limit(1);
        if (updatedCmd && updatedCmd.status === 'completed' && (updatedCmd.result as any)?.pairingCode) {
          const code = (updatedCmd.result as any).pairingCode;
          return reply.send({
            success: true,
            data: {
              pairingCode: code,
              formattedCode: code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code,
              phoneNumber: phoneNumber.trim(),
            },
            message: 'Pairing code generated successfully',
          });
        }
      }
      return reply.send({
        success: true,
        data: { commandId: cmd.id, status: 'pending' },
        message: 'تم إرسال طلب رمز الاقتران إلى السيرفر المحلي.',
      });
    }
  });

  /**
   * GET /api/v1/whatsapp/accounts/:id/pairing-code — Get current pairing code
   */
  app.get('/accounts/:id/pairing-code', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const sm = await getLocalSessionManager();
    if (sm) {
      const code = await sm.getPairingCode(id);
      if (!code) {
        return reply.status(404).send({ success: false, error: 'No pairing code available' });
      }
      return reply.send({ success: true, data: { pairingCode: code } });
    } else {
      const [cmd] = await db
        .select()
        .from(bridgeCommands)
        .where(and(eq(bridgeCommands.accountId, id), eq(bridgeCommands.action, 'pairing_code')))
        .orderBy(desc(bridgeCommands.createdAt))
        .limit(1);
      const code = (cmd?.result as any)?.pairingCode;
      if (!code) return reply.status(404).send({ success: false, error: 'No pairing code available' });
      return reply.send({ success: true, data: { pairingCode: code } });
    }
  });

  /**
   * GET /api/v1/whatsapp/accounts/:id/qr — Get current QR code
   */
  app.get('/accounts/:id/qr', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const sm = await getLocalSessionManager();
    if (sm) {
      const qrCode = await sm.getQRCode(id);
      if (!qrCode) {
        return reply.status(404).send({ success: false, error: 'No QR code available' });
      }
      return reply.send({ success: true, data: { qrCode } });
    } else {
      const [acc] = await db.select().from(whatsappAccounts).where(eq(whatsappAccounts.id, id)).limit(1);
      if (!acc?.bridgeQrCode) {
        return reply.status(404).send({ success: false, error: 'No QR code available' });
      }
      return reply.send({ success: true, data: { qrCode: acc.bridgeQrCode } });
    }
  });

  /**
   * PATCH /api/v1/whatsapp/accounts/:id/dispatcher — Configure Primary Dispatcher status
   * Allows setting an account as Primary Dispatcher 1 or Primary Dispatcher 2 (Max 2 accounts)
   */
  app.patch('/accounts/:id/dispatcher', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      isPrimaryDispatcher: z.boolean(),
      dispatcherSlot: z.number().int().min(1).max(2).optional().nullable(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'البيانات المدخلة غير صالحة',
        details: parsed.error.format(),
      });
    }

    const { isPrimaryDispatcher, dispatcherSlot } = parsed.data;

    const [account] = await db
      .select()
      .from(whatsappAccounts)
      .where(eq(whatsappAccounts.id, id))
      .limit(1);

    if (!account) {
      return reply.status(404).send({ success: false, error: 'حساب WhatsApp غير موجود' });
    }

    if (isPrimaryDispatcher) {
      // Check how many other accounts are currently designated as primary dispatchers
      const currentDispatchers = await db
        .select()
        .from(whatsappAccounts)
        .where(
          and(
            eq(whatsappAccounts.isPrimaryDispatcher, true),
            sql`${whatsappAccounts.id} != ${id}::uuid`
          )
        );

      if (currentDispatchers.length >= 2) {
        return reply.status(400).send({
          success: false,
          error: 'الحد الأقصى للأرقام الأساسية الموزعة هو رقمان فقط (الموزع الأول والموزع الثاني). يرجى إلغاء تعيين أحد الأرقام الموزعة السابقة لتتمكن من تعيين هذا الرقم.',
          currentDispatchers: currentDispatchers.map((d) => ({
            id: d.id,
            displayName: d.displayName,
            slot: d.dispatcherSlot,
            phoneNumber: d.phoneNumber,
          })),
        });
      }

      // Determine slot (1 or 2)
      let resolvedSlot = dispatcherSlot;
      const occupiedSlots = new Set(currentDispatchers.map((d) => d.dispatcherSlot));

      if (!resolvedSlot || occupiedSlots.has(resolvedSlot)) {
        if (!occupiedSlots.has(1)) {
          resolvedSlot = 1;
        } else if (!occupiedSlots.has(2)) {
          resolvedSlot = 2;
        } else {
          resolvedSlot = 1;
        }
      }

      const [updated] = await db
        .update(whatsappAccounts)
        .set({
          isPrimaryDispatcher: true,
          dispatcherSlot: resolvedSlot,
          updatedAt: new Date(),
        })
        .where(eq(whatsappAccounts.id, id))
        .returning();

      wsHub.broadcast('whatsapp.dispatcher_updated', {
        accountId: id,
        isPrimaryDispatcher: true,
        dispatcherSlot: resolvedSlot,
      });

      return reply.send({
        success: true,
        message: `تم تعيين الرقم كرقم موزع أساسي (${resolvedSlot === 1 ? 'الموزع الأول' : 'الموزع الثاني'}) بنجاح.`,
        data: updated,
      });
    } else {
      // Remove dispatcher designation
      const [updated] = await db
        .update(whatsappAccounts)
        .set({
          isPrimaryDispatcher: false,
          dispatcherSlot: null,
          updatedAt: new Date(),
        })
        .where(eq(whatsappAccounts.id, id))
        .returning();

      wsHub.broadcast('whatsapp.dispatcher_updated', {
        accountId: id,
        isPrimaryDispatcher: false,
        dispatcherSlot: null,
      });

      return reply.send({
        success: true,
        message: 'تم إلغاء تعيين الرقم كموزع أساسي بنجاح.',
        data: updated,
      });
    }
  });

  /**
   * DELETE /api/v1/whatsapp/accounts/:id — Delete a WhatsApp account
   */
  app.delete('/accounts/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    // Disconnect first
    const sm = await getLocalSessionManager();
    if (sm) {
      try {
        await sm.logoutAccount(id);
      } catch (err) {
        // Ignore if not connected
      }
    }

    await db.delete(whatsappAccounts).where(eq(whatsappAccounts.id, id));

    return reply.send({ success: true, message: 'Account deleted' });
  });
}
