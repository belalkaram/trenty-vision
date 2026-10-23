import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../database/client';
import { broadcastCampaigns, broadcastRecipients } from '../../database/schema/broadcast';
import { whatsappAccounts, companies } from '../../database/schema/index';
import { authenticate } from '../../middleware/auth.middleware';
import { broadcastService } from './broadcast.service';
import { sessionManager } from '../whatsapp/session.manager';
import { logger } from '../../utils/logger';

async function resolveEffectiveAccountAndCompany(request: FastifyRequest): Promise<{
  companyId: string;
  activeAccount: typeof whatsappAccounts.$inferSelect | null;
  accounts: (typeof whatsappAccounts.$inferSelect)[];
  isSuperAdmin: boolean;
}> {
  const isSuperAdmin = Boolean(request.user?.isSuperAdmin || !request.user?.companyId);
  let userCompanyId = request.companyId || request.user?.companyId;

  let accounts = userCompanyId
    ? await db
        .select()
        .from(whatsappAccounts)
        .where(eq(whatsappAccounts.companyId, userCompanyId))
        .orderBy(desc(whatsappAccounts.status), desc(whatsappAccounts.createdAt))
    : [];

  if (accounts.length === 0) {
    accounts = await db
      .select()
      .from(whatsappAccounts)
      .orderBy(desc(whatsappAccounts.status), desc(whatsappAccounts.createdAt));
  }

  const activeAccount = accounts.find((a) => a.status === 'connected') || accounts[0] || null;

  let effectiveCompanyId = userCompanyId || activeAccount?.companyId;
  if (!effectiveCompanyId) {
    const [c] = await db.select({ id: companies.id }).from(companies).limit(1);
    effectiveCompanyId = c?.id || '00000000-0000-0000-0000-000000000001';
  }

  return {
    companyId: effectiveCompanyId,
    activeAccount,
    accounts,
    isSuperAdmin,
  };
}

const createCampaignSchema = z.object({
  name: z.string().min(1, 'اسم الحملة مطلوب'),
  whatsappAccountId: z.string().uuid().optional(),
  messageType: z.enum(['text', 'image', 'video', 'document']).default('text'),
  messageContent: z.string().min(1, 'نص الرسالة مطلوب'),
  mediaUrl: z.string().optional(),
  mediaFilename: z.string().optional(),
  minDelaySeconds: z.number().min(1).default(5),
  maxDelaySeconds: z.number().min(1).default(12),
  batchSize: z.number().min(1).default(25),
  batchSleepSeconds: z.number().min(0).default(30),
  recipients: z.array(
    z.object({
      phoneNumber: z.string().min(6),
      recipientName: z.string().optional(),
    })
  ).min(1, 'يجب إضافة مستلم واحد على الأقل'),
});

export async function broadcastRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/broadcast/campaigns — List all campaigns
   */
  app.get('/campaigns', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = await resolveEffectiveAccountAndCompany(request);

      const campaigns = await db
        .select()
        .from(broadcastCampaigns)
        .where(eq(broadcastCampaigns.companyId, companyId))
        .orderBy(desc(broadcastCampaigns.createdAt));

      return reply.send({ success: true, data: campaigns });
    } catch (err: any) {
      logger.error({ err }, 'Error fetching broadcast campaigns');
      return reply.status(500).send({ success: false, error: err?.message || 'فشل جلب الحملات' });
    }
  });

  /**
   * POST /api/v1/broadcast/campaigns — Create new campaign
   */
  app.post('/campaigns', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId, activeAccount } = await resolveEffectiveAccountAndCompany(request);
      const parsed = createCampaignSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: 'بيانات غير صحيحة',
          details: parsed.error.format(),
        });
      }

      const data = parsed.data;
      const accountId = data.whatsappAccountId || activeAccount?.id;

      if (!accountId) {
        return reply.status(400).send({
          success: false,
          error: 'لا يوجد حساب واتساب متصل لإنشاء الحملة',
        });
      }

      // Deduplicate recipients by phone number
      const seenPhones = new Set<string>();
      const uniqueRecipients = data.recipients.filter((r) => {
        const clean = r.phoneNumber.replace(/[^0-9]/g, '');
        if (!clean || seenPhones.has(clean)) return false;
        seenPhones.add(clean);
        return true;
      });

      if (uniqueRecipients.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'قائمة المستلمين لا تحتوي على أرقام هواتف صالحة',
        });
      }

      // Insert campaign record
      const [campaign] = await db
        .insert(broadcastCampaigns)
        .values({
          companyId,
          whatsappAccountId: accountId,
          name: data.name,
          messageType: data.messageType,
          messageContent: data.messageContent,
          mediaUrl: data.mediaUrl,
          mediaFilename: data.mediaFilename,
          minDelaySeconds: data.minDelaySeconds,
          maxDelaySeconds: data.maxDelaySeconds,
          batchSize: data.batchSize,
          batchSleepSeconds: data.batchSleepSeconds,
          status: 'draft',
          totalRecipients: uniqueRecipients.length,
          pendingCount: uniqueRecipients.length,
          sentCount: 0,
          failedCount: 0,
        })
        .returning();

      // Batch insert recipients (chunk of 100 to avoid query size limits)
      const recipientChunks = [];
      const CHUNK_SIZE = 100;
      for (let i = 0; i < uniqueRecipients.length; i += CHUNK_SIZE) {
        const chunk = uniqueRecipients.slice(i, i + CHUNK_SIZE).map((r) => ({
          campaignId: campaign.id,
          phoneNumber: r.phoneNumber.trim(),
          recipientName: r.recipientName?.trim() || null,
          status: 'pending' as const,
        }));
        recipientChunks.push(chunk);
      }

      for (const chunk of recipientChunks) {
        await db.insert(broadcastRecipients).values(chunk);
      }

      logger.info({ campaignId: campaign.id, totalRecipients: uniqueRecipients.length }, 'Broadcast campaign created successfully');

      return reply.status(201).send({
        success: true,
        message: 'تم إنشاء الحملة بنجاح',
        data: campaign,
      });
    } catch (err: any) {
      logger.error({ err }, 'Error creating broadcast campaign');
      return reply.status(500).send({ success: false, error: err?.message || 'فشل إنشاء الحملة' });
    }
  });

  /**
   * GET /api/v1/broadcast/campaigns/:id — Get campaign details and recipients
   */
  app.get('/campaigns/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const [campaign] = await db
        .select()
        .from(broadcastCampaigns)
        .where(eq(broadcastCampaigns.id, id))
        .limit(1);

      if (!campaign) {
        return reply.status(404).send({ success: false, error: 'الحملة غير موجودة' });
      }

      const recipients = await db
        .select()
        .from(broadcastRecipients)
        .where(eq(broadcastRecipients.campaignId, id))
        .orderBy(desc(broadcastRecipients.createdAt));

      return reply.send({
        success: true,
        data: {
          campaign,
          recipients,
        },
      });
    } catch (err: any) {
      logger.error({ err }, 'Error fetching campaign details');
      return reply.status(500).send({ success: false, error: err?.message || 'فشل جلب تفاصيل الحملة' });
    }
  });

  /**
   * POST /api/v1/broadcast/campaigns/:id/start — Start campaign
   */
  app.post('/campaigns/:id/start', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const result = await broadcastService.startCampaign(id);
      return reply.send(result);
    } catch (err: any) {
      logger.error({ err, id: request.params.id }, 'Error starting broadcast campaign');
      return reply.status(400).send({ success: false, error: err?.message || 'فشل بدء تشغيل الحملة' });
    }
  });

  /**
   * POST /api/v1/broadcast/campaigns/:id/pause — Pause campaign
   */
  app.post('/campaigns/:id/pause', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const result = await broadcastService.pauseCampaign(id);
      return reply.send(result);
    } catch (err: any) {
      logger.error({ err, id: request.params.id }, 'Error pausing broadcast campaign');
      return reply.status(400).send({ success: false, error: err?.message || 'فشل إيقاف الحملة مؤقتاً' });
    }
  });

  /**
   * POST /api/v1/broadcast/campaigns/:id/resume — Resume campaign
   */
  app.post('/campaigns/:id/resume', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const result = await broadcastService.resumeCampaign(id);
      return reply.send(result);
    } catch (err: any) {
      logger.error({ err, id: request.params.id }, 'Error resuming broadcast campaign');
      return reply.status(400).send({ success: false, error: err?.message || 'فشل استئناف الحملة' });
    }
  });

  /**
   * POST /api/v1/broadcast/campaigns/:id/cancel — Cancel campaign
   */
  app.post('/campaigns/:id/cancel', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const result = await broadcastService.cancelCampaign(id);
      return reply.send(result);
    } catch (err: any) {
      logger.error({ err, id: request.params.id }, 'Error cancelling broadcast campaign');
      return reply.status(400).send({ success: false, error: err?.message || 'فشل إلغاء الحملة' });
    }
  });

  /**
   * POST /api/v1/broadcast/campaigns/:id/retry-failed — Retry failed recipients
   */
  app.post('/campaigns/:id/retry-failed', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const result = await broadcastService.retryFailed(id);
      return reply.send(result);
    } catch (err: any) {
      logger.error({ err, id: request.params.id }, 'Error retrying failed recipients');
      return reply.status(400).send({ success: false, error: err?.message || 'فشل إعادة محاولة الإرسال' });
    }
  });

  /**
   * DELETE /api/v1/broadcast/campaigns/:id — Delete campaign
   */
  app.delete('/campaigns/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      await broadcastService.cancelCampaign(id).catch(() => {});
      await db.delete(broadcastCampaigns).where(eq(broadcastCampaigns.id, id));
      return reply.send({ success: true, message: 'تم حذف الحملة بنجاح' });
    } catch (err: any) {
      logger.error({ err, id: request.params.id }, 'Error deleting broadcast campaign');
      return reply.status(500).send({ success: false, error: err?.message || 'فشل حذف الحملة' });
    }
  });

  /**
   * POST /api/v1/broadcast/check-numbers — Check numbers on WhatsApp
   */
  app.post('/check-numbers', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { activeAccount } = await resolveEffectiveAccountAndCompany(request);
      const schema = z.object({
        phoneNumbers: z.array(z.string().min(5)),
        whatsappAccountId: z.string().uuid().optional(),
      });

      const parsed = schema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: 'قائمة الأرقام غير صالحة' });
      }

      const accountId = parsed.data.whatsappAccountId || activeAccount?.id;
      if (!accountId) {
        return reply.status(400).send({ success: false, error: 'لا يوجد حساب واتساب متصل للتحقق من الأرقام' });
      }

      const results = await sessionManager.checkNumbers(accountId, parsed.data.phoneNumbers);
      return reply.send({ success: true, data: results });
    } catch (err: any) {
      logger.error({ err }, 'Error checking numbers on WhatsApp');
      return reply.status(500).send({ success: false, error: err?.message || 'فشل فحص الأرقام على واتساب' });
    }
  });

  /**
   * GET /api/v1/broadcast/campaigns/:id/export — Export campaign report as CSV
   */
  app.get('/campaigns/:id/export', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const [campaign] = await db
        .select()
        .from(broadcastCampaigns)
        .where(eq(broadcastCampaigns.id, id))
        .limit(1);

      if (!campaign) {
        return reply.status(404).send({ success: false, error: 'الحملة غير موجودة' });
      }

      const recipients = await db
        .select()
        .from(broadcastRecipients)
        .where(eq(broadcastRecipients.campaignId, id))
        .orderBy(desc(broadcastRecipients.createdAt));

      // Build UTF-8 CSV with BOM for proper Arabic display in Excel
      const BOM = '\uFEFF';
      const headers = ['الاسم', 'رقم الهاتف', 'الحالة', 'وقت الإرسال', 'سبب الخطأ'];
      const rows = recipients.map((r) => {
        const statusMap: Record<string, string> = {
          sent: 'تم الإرسال بنجاح',
          failed: 'فشل الإرسال',
          pending: 'قيد الانتظار',
          skipped: 'تم التخطي',
        };
        const statusText = statusMap[r.status] || r.status;
        const sentTime = r.sentAt ? new Date(r.sentAt).toLocaleString('ar-EG') : '—';
        const name = (r.recipientName || '').replace(/"/g, '""');
        const phone = (r.phoneNumber || '').replace(/"/g, '""');
        const err = (r.errorReason || '').replace(/"/g, '""');

        return `"${name}","${phone}","${statusText}","${sentTime}","${err}"`;
      });

      const csvContent = BOM + [headers.join(','), ...rows].join('\r\n');
      const filename = `تقرير_حملة_${campaign.name.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_')}.csv`;

      reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
        .send(csvContent);
    } catch (err: any) {
      logger.error({ err }, 'Error exporting campaign CSV');
      return reply.status(500).send({ success: false, error: 'فشل تصدير التقرير' });
    }
  });
}
