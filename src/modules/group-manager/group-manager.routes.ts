import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../database/client';
import { groupJobs, groupExtractedContacts } from '../../database/schema/group-manager';
import { whatsappAccounts, bridgeCommands, companies } from '../../database/schema/index';
import { authenticate } from '../../middleware/auth.middleware';
import { logger } from '../../utils/logger';
import { sessionManager } from '../whatsapp/session.manager';

// ─── Routes ──────────────────────────────────────────────

export async function groupManagerRoutes(app: FastifyInstance): Promise<void> {
  // All routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/group-manager/groups — List all WhatsApp groups for this company's connected account
   * Returns groups from the bridge/session
   */
  app.get('/groups', async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = request.companyId || request.user?.companyId;
    if (!companyId) {
      return reply.code(403).send({ success: false, error: 'لا يوجد شركة مرتبطة بحسابك' });
    }

    // Get the connected WhatsApp account for this company
    const [account] = await db
      .select()
      .from(whatsappAccounts)
      .where(eq(whatsappAccounts.companyId, companyId))
      .limit(1);

    if (!account || account.status !== 'connected') {
      return reply.send({
        success: true,
        data: [],
        message: 'يرجى ربط حساب واتساب أولاً',
        whatsappConnected: false,
      });
    }

    // If local WhatsApp session is connected, fetch real groups directly
    const provider = sessionManager.getProvider(account.id);
    if (provider) {
      try {
        const groups = await sessionManager.fetchAllGroups(account.id);
        return reply.send({
          success: true,
          data: groups,
          message: 'تم جلب الجروبات بنجاح',
          whatsappConnected: true,
        });
      } catch (err: any) {
        logger.warn({ err: err?.message }, 'Failed to fetch groups via sessionManager directly, queueing bridge command');
      }
    }

    // Fallback: Queue a bridge command to fetch groups
    const [cmd] = await db
      .insert(bridgeCommands)
      .values({
        companyId,
        accountId: account.id,
        action: 'list_groups',
        payload: {},
        status: 'pending',
      })
      .returning();

    return reply.send({
      success: true,
      data: {
        commandId: cmd.id,
        accountId: account.id,
        accountStatus: account.status,
        whatsappConnected: true,
      },
      message: 'تم إرسال طلب جلب الجروبات، يرجى الانتظار...',
    });
  });

  /**
   * POST /api/v1/group-manager/extract — Start extracting contacts from a group
   */
  app.post('/extract', async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = request.companyId || request.user?.companyId;
    if (!companyId) {
      return reply.code(403).send({ success: false, error: 'لا يوجد شركة مرتبطة بحسابك' });
    }

    const bodySchema = z.object({
      groupJid: z.string().min(1, 'معرف الجروب مطلوب'),
      groupName: z.string().optional(),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'بيانات غير صالحة', details: parsed.error.format() });
    }

    // Get connected WhatsApp account
    const [account] = await db
      .select()
      .from(whatsappAccounts)
      .where(and(eq(whatsappAccounts.companyId, companyId), eq(whatsappAccounts.status, 'connected')))
      .limit(1);

    if (!account) {
      return reply.code(400).send({ success: false, error: 'لا يوجد حساب واتساب متصل' });
    }

    // Create extraction job
    const [job] = await db
      .insert(groupJobs)
      .values({
        companyId,
        type: 'extract',
        sourceGroupJid: parsed.data.groupJid,
        sourceGroupName: parsed.data.groupName || null,
        status: 'pending',
      })
      .returning();

    // Queue bridge command to extract participants
    await db
      .insert(bridgeCommands)
      .values({
        companyId,
        accountId: account.id,
        action: 'extract_group_participants',
        payload: {
          groupJid: parsed.data.groupJid,
          jobId: job.id,
        },
        status: 'pending',
      });

    // If local session is active, execute extraction immediately in background
    const provider = sessionManager.getProvider(account.id);
    if (provider) {
      (async () => {
        try {
          await db
            .update(groupJobs)
            .set({ status: 'running', updatedAt: new Date() })
            .where(eq(groupJobs.id, job.id));

          const metadata = await sessionManager.getGroupMetadata(account.id, parsed.data.groupJid);
          const rawParticipants = metadata.participants || [];
          const participants = rawParticipants.map((p: any) => ({
            phoneNumber: p.id.split('@')[0].split(':')[0],
            displayName: p.id.split('@')[0].split(':')[0],
            isAdmin: p.admin === 'admin' || p.admin === 'superadmin',
          }));

          if (participants.length > 0) {
            await db.insert(groupExtractedContacts).values(
              participants.map((p: any) => ({
                companyId,
                jobId: job.id,
                phoneNumber: p.phoneNumber,
                displayName: p.displayName,
                groupJid: parsed.data.groupJid,
                groupName: metadata.subject || parsed.data.groupName || null,
                isAdmin: p.isAdmin,
              }))
            );
          }

          await db
            .update(groupJobs)
            .set({
              status: 'completed',
              sourceGroupName: metadata.subject || parsed.data.groupName || null,
              totalContacts: participants.length,
              processedContacts: participants.length,
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(groupJobs.id, job.id));

          logger.info({ jobId: job.id, count: participants.length }, 'Direct group extraction completed successfully');
        } catch (err: any) {
          logger.error({ jobId: job.id, err: err?.message }, 'Direct group extraction failed');
          await db
            .update(groupJobs)
            .set({
              status: 'failed',
              errorMessage: err?.message || 'فشل في استخراج أعضاء الجروب',
              updatedAt: new Date(),
            })
            .where(eq(groupJobs.id, job.id));
        }
      })().catch((err) => logger.error({ err }, 'Error in direct extraction background task'));
    }

    logger.info({ companyId, jobId: job.id, groupJid: parsed.data.groupJid }, 'Group extraction job created');

    return reply.send({
      success: true,
      data: job,
      message: 'تم بدء عملية استخراج الأشخاص من الجروب',
    });
  });

  /**
   * POST /api/v1/group-manager/add — Start adding contacts to a group
   */
  app.post('/add', async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = request.companyId || request.user?.companyId;
    if (!companyId) {
      return reply.code(403).send({ success: false, error: 'لا يوجد شركة مرتبطة بحسابك' });
    }

    const bodySchema = z.object({
      targetGroupJid: z.string().min(1, 'معرف الجروب الهدف مطلوب'),
      targetGroupName: z.string().optional(),
      contactIds: z.array(z.string().uuid()).min(1, 'يجب اختيار شخص واحد على الأقل'),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'بيانات غير صالحة', details: parsed.error.format() });
    }

    // Get connected WhatsApp account
    const [account] = await db
      .select()
      .from(whatsappAccounts)
      .where(and(eq(whatsappAccounts.companyId, companyId), eq(whatsappAccounts.status, 'connected')))
      .limit(1);

    if (!account) {
      return reply.code(400).send({ success: false, error: 'لا يوجد حساب واتساب متصل' });
    }

    // Get the selected contacts
    const contacts = await db
      .select()
      .from(groupExtractedContacts)
      .where(
        and(
          eq(groupExtractedContacts.companyId, companyId),
          sql`${groupExtractedContacts.id} = ANY(${parsed.data.contactIds}::uuid[])`
        )
      );

    if (contacts.length === 0) {
      return reply.code(400).send({ success: false, error: 'لم يتم العثور على جهات الاتصال المحددة' });
    }

    // Create add job
    const [job] = await db
      .insert(groupJobs)
      .values({
        companyId,
        type: 'add',
        targetGroupJid: parsed.data.targetGroupJid,
        targetGroupName: parsed.data.targetGroupName || null,
        status: 'pending',
        totalContacts: contacts.length,
      })
      .returning();

    // Queue bridge command for each batch of contacts
    const phoneNumbers = contacts.map(c => c.phoneNumber);
    await db
      .insert(bridgeCommands)
      .values({
        companyId,
        accountId: account.id,
        action: 'add_to_group',
        payload: {
          targetGroupJid: parsed.data.targetGroupJid,
          phoneNumbers,
          jobId: job.id,
          contactIds: parsed.data.contactIds,
        },
        status: 'pending',
      });

    // If local session is active, execute addition immediately in background
    const provider = sessionManager.getProvider(account.id);
    if (provider) {
      (async () => {
        try {
          await db
            .update(groupJobs)
            .set({ status: 'running', updatedAt: new Date() })
            .where(eq(groupJobs.id, job.id));

          let processed = 0;
          let failed = 0;

          // Add in small batches of 5 to respect WhatsApp rate limits
          const batchSize = 5;
          for (let i = 0; i < contacts.length; i += batchSize) {
            const batch = contacts.slice(i, i + batchSize);
            const jids = batch.map((c) => `${c.phoneNumber.replace(/[^0-9]/g, '')}@s.whatsapp.net`);

            try {
              const results = await sessionManager.addGroupParticipants(account.id, parsed.data.targetGroupJid, jids);
              for (const res of results) {
                const phone = res.jid ? res.jid.split('@')[0].split(':')[0] : '';
                const contact = phone ? batch.find((c) => c.phoneNumber.includes(phone) || phone.includes(c.phoneNumber)) : null;
                if (contact) {
                  const isSuccess = String(res.status) === '200';
                  if (isSuccess) {
                    processed++;
                    await db
                      .update(groupExtractedContacts)
                      .set({ addedToTarget: true, addError: null })
                      .where(eq(groupExtractedContacts.id, contact.id));
                  } else {
                    failed++;
                    const errMsg =
                      String(res.status) === '403'
                        ? 'خصوصية المستخدم تمنع الإضافة المباشرة (يحتاج دعوة)'
                        : String(res.status) === '409'
                        ? 'العضو موجود بالفعل في الجروب'
                        : `كود الحالة: ${res.status}`;
                    await db
                      .update(groupExtractedContacts)
                      .set({ addError: errMsg })
                      .where(eq(groupExtractedContacts.id, contact.id));
                  }
                }
              }
            } catch (batchErr: any) {
              failed += batch.length;
              for (const contact of batch) {
                await db
                  .update(groupExtractedContacts)
                  .set({ addError: batchErr?.message || 'خطأ أثناء الإضافة' })
                  .where(eq(groupExtractedContacts.id, contact.id));
              }
            }

            if (i + batchSize < contacts.length) {
              await new Promise((r) => setTimeout(r, 2000));
            }
          }

          await db
            .update(groupJobs)
            .set({
              status: 'completed',
              processedContacts: processed,
              failedContacts: failed,
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(groupJobs.id, job.id));

          logger.info({ jobId: job.id, processed, failed }, 'Direct group add completed successfully');
        } catch (err: any) {
          logger.error({ jobId: job.id, err: err?.message }, 'Direct group add failed');
          await db
            .update(groupJobs)
            .set({
              status: 'failed',
              errorMessage: err?.message || 'فشل في إضافة الأعضاء إلى الجروب',
              updatedAt: new Date(),
            })
            .where(eq(groupJobs.id, job.id));
        }
      })().catch((err) => logger.error({ err }, 'Error in direct add background task'));
    }

    logger.info({ companyId, jobId: job.id, targetGroupJid: parsed.data.targetGroupJid, contactCount: contacts.length }, 'Group add job created');

    return reply.send({
      success: true,
      data: job,
      message: `تم بدء إضافة ${contacts.length} شخص إلى الجروب`,
    });
  });

  /**
   * GET /api/v1/group-manager/jobs — List all extraction/add jobs
   */
  app.get('/jobs', async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = request.companyId || request.user?.companyId;
    if (!companyId) {
      return reply.code(403).send({ success: false, error: 'لا يوجد شركة مرتبطة بحسابك' });
    }

    const { type, status } = request.query as { type?: string; status?: string };

    let whereClause = eq(groupJobs.companyId, companyId);
    
    const jobs = await db
      .select()
      .from(groupJobs)
      .where(whereClause)
      .orderBy(desc(groupJobs.createdAt))
      .limit(100);

    // Filter by type/status in JS if needed (simpler)
    let filtered = jobs;
    if (type) filtered = filtered.filter(j => j.type === type);
    if (status) filtered = filtered.filter(j => j.status === status);

    return reply.send({ success: true, data: filtered });
  });

  /**
   * GET /api/v1/group-manager/contacts — List extracted contacts
   */
  app.get('/contacts', async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = request.companyId || request.user?.companyId;
    if (!companyId) {
      return reply.code(403).send({ success: false, error: 'لا يوجد شركة مرتبطة بحسابك' });
    }

    const { groupJid, jobId, page = '1', limit = '50' } = request.query as {
      groupJid?: string;
      jobId?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    let baseWhere = eq(groupExtractedContacts.companyId, companyId);

    const contacts = await db
      .select()
      .from(groupExtractedContacts)
      .where(baseWhere)
      .orderBy(desc(groupExtractedContacts.extractedAt))
      .limit(limitNum)
      .offset(offset);

    // Apply additional filters in JS
    let filtered = contacts;
    if (groupJid) filtered = filtered.filter(c => c.groupJid === groupJid);
    if (jobId) filtered = filtered.filter(c => c.jobId === jobId);

    // Get total count
    const [countResult] = await db
      .select({ total: count(groupExtractedContacts.id) })
      .from(groupExtractedContacts)
      .where(baseWhere);

    return reply.send({
      success: true,
      data: filtered,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: Number(countResult?.total || 0),
      },
    });
  });

  /**
   * DELETE /api/v1/group-manager/contacts — Clear all extracted contacts
   */
  app.delete('/contacts', async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = request.companyId || request.user?.companyId;
    if (!companyId) {
      return reply.code(403).send({ success: false, error: 'لا يوجد شركة مرتبطة بحسابك' });
    }

    await db.delete(groupExtractedContacts).where(eq(groupExtractedContacts.companyId, companyId));

    return reply.send({ success: true, message: 'تم حذف جميع جهات الاتصال المستخرجة' });
  });

  /**
   * POST /api/v1/group-manager/save-extracted — Save extracted participants (called by bridge)
   */
  app.post('/save-extracted', async (request: FastifyRequest, reply: FastifyReply) => {
    const bodySchema = z.object({
      companyId: z.string().uuid(),
      jobId: z.string().uuid(),
      groupJid: z.string(),
      groupName: z.string().optional(),
      participants: z.array(z.object({
        phoneNumber: z.string(),
        displayName: z.string().optional(),
        isAdmin: z.boolean().optional(),
      })),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'Invalid data' });
    }

    const { companyId: cId, jobId, groupJid, groupName, participants } = parsed.data;

    // Insert extracted contacts
    if (participants.length > 0) {
      await db
        .insert(groupExtractedContacts)
        .values(
          participants.map(p => ({
            companyId: cId,
            jobId,
            phoneNumber: p.phoneNumber,
            displayName: p.displayName || null,
            groupJid,
            groupName: groupName || null,
            isAdmin: p.isAdmin || false,
          }))
        );
    }

    // Update job status
    await db
      .update(groupJobs)
      .set({
        status: 'completed',
        totalContacts: participants.length,
        processedContacts: participants.length,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(groupJobs.id, jobId));

    logger.info({ jobId, participantCount: participants.length }, 'Saved extracted group participants');

    return reply.send({ success: true, data: { saved: participants.length } });
  });

  /**
   * GET /api/v1/group-manager/stats — Get group manager statistics
   */
  app.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = request.companyId || request.user?.companyId;
    if (!companyId) {
      return reply.code(403).send({ success: false, error: 'لا يوجد شركة مرتبطة بحسابك' });
    }

    const [contactCount] = await db
      .select({ total: count(groupExtractedContacts.id) })
      .from(groupExtractedContacts)
      .where(eq(groupExtractedContacts.companyId, companyId));

    const [extractJobCount] = await db
      .select({ total: count(groupJobs.id) })
      .from(groupJobs)
      .where(and(eq(groupJobs.companyId, companyId), eq(groupJobs.type, 'extract')));

    const [addJobCount] = await db
      .select({ total: count(groupJobs.id) })
      .from(groupJobs)
      .where(and(eq(groupJobs.companyId, companyId), eq(groupJobs.type, 'add')));

    return reply.send({
      success: true,
      data: {
        totalExtractedContacts: Number(contactCount?.total || 0),
        totalExtractJobs: Number(extractJobCount?.total || 0),
        totalAddJobs: Number(addJobCount?.total || 0),
      },
    });
  });
}
