import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, sql, count, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../database/client';
import { groupJobs, groupExtractedContacts } from '../../database/schema/group-manager';
import { whatsappAccounts, bridgeCommands, companies } from '../../database/schema/index';
import { authenticate } from '../../middleware/auth.middleware';
import { logger } from '../../utils/logger';
import { sessionManager } from '../whatsapp/session.manager';

/**
 * Normalizes user input for target group:
 * Supports group JID (120363xxx@g.us), pure digits, or WhatsApp invite links (chat.whatsapp.com/xxx)
 */
async function normalizeTargetGroupJid(
  rawInput: string,
  accountId?: string,
  sessionMgr?: typeof sessionManager
): Promise<{ jid: string; groupSubject?: string }> {
  let cleaned = (rawInput || '').trim();

  // 1. WhatsApp Invite Link check: https://chat.whatsapp.com/CODE
  const inviteMatch = cleaned.match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/);
  if (inviteMatch && inviteMatch[1]) {
    const code = inviteMatch[1];
    if (accountId && sessionMgr) {
      try {
        const info = await sessionMgr.getGroupInviteInfo(accountId, code);
        if (info?.id) {
          return { jid: info.id, groupSubject: info.subject };
        }
      } catch (e: any) {
        throw new Error(`رابط دعوة الجروب غير صالح أو تعذر الوصول إليه: ${e?.message || 'تأكد من صحة الرابط'}`);
      }
    }
  }

  // 2. Pure digits without @g.us
  if (/^\d+$/.test(cleaned)) {
    cleaned = `${cleaned}@g.us`;
  }

  // 3. Must be a valid WhatsApp Group JID ending in @g.us
  if (!cleaned.endsWith('@g.us')) {
    throw new Error('معرف الجروب غير صالح. يجب أن ينتهي بـ @g.us أو يكون رابط دعوة الجروب (chat.whatsapp.com/...)');
  }

  return { jid: cleaned };
}

/**
 * Checks whether the connected WhatsApp account is in the group and has admin permissions
 */
async function checkAccountIsGroupAdmin(
  accountId: string,
  targetGroupJid: string,
  sessionMgr: typeof sessionManager
): Promise<{ canAdd: boolean; reason?: string; groupSubject?: string; inviteLink?: string }> {
  try {
    const provider = sessionMgr.getProvider(accountId);
    if (!provider) return { canAdd: true };

    const meta = await sessionMgr.getGroupMetadata(accountId, targetGroupJid);
    if (!meta) return { canAdd: true };

    const myId = provider.user?.id || '';
    const myPhone = myId.split('@')[0].split(':')[0];
    const myLid = provider.user?.lid ? provider.user.lid.split('@')[0].split(':')[0] : '';

    const me = meta.participants?.find((p: any) => {
      const pClean = (p.id || '').split('@')[0].split(':')[0];
      const pPn = (p.phoneNumber || '').replace(/[^0-9]/g, '');
      return (
        (myPhone && pClean === myPhone) ||
        (myLid && pClean === myLid) ||
        (myPhone && pPn && pPn.includes(myPhone))
      );
    });

    const isMember = !!me;
    const isAdmin = me?.admin === 'admin' || me?.admin === 'superadmin';
    const allMembersCanAdd = meta.memberAddMode === true;

    if (!isMember) {
      return {
        canAdd: false,
        groupSubject: meta.subject,
        reason: `حساب الواتساب المتصل في النظام (${myPhone || 'الرقم المربوط'}) ليس عضواً في هذا الجروب ("${meta.subject || targetGroupJid}"). يرجى إضافة هذا الرقم أولاً للجروب.`,
      };
    }

    if (!isAdmin && !allMembersCanAdd) {
      let inviteCode: string | undefined;
      try {
        inviteCode = await provider.getGroupInviteCode(targetGroupJid);
      } catch {}

      return {
        canAdd: false,
        groupSubject: meta.subject,
        inviteLink: inviteCode ? `https://chat.whatsapp.com/${inviteCode}` : undefined,
        reason: `حساب الواتساب المتصل في النظام (${myPhone || 'الرقم المربوط'}) عضو في الجروب "${meta.subject}" ولكنه ليس مشرفاً (Admin). في واتساب، لا يمكن إضافة أشخاص إلا بواسطة مشرف الجروب. يرجى ترقية هذا الرقم إلى مشرف داخل الجروب في تطبيق واتساب أولاً.`,
      };
    }

    return { canAdd: true, groupSubject: meta.subject };
  } catch (err: any) {
    logger.warn({ targetGroupJid, err: err?.message }, 'Admin verification check skipped due to error');
    return { canAdd: true };
  }
}

// ─── Routes ──────────────────────────────────────────────

export async function groupManagerRoutes(app: FastifyInstance): Promise<void> {
  // All routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/group-manager/groups — Auto-discover and list all WhatsApp groups for this company
   */
  app.get('/groups', async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = request.companyId || request.user?.companyId;
    if (!companyId) {
      return reply.code(403).send({ success: false, error: 'لا يوجد شركة مرتبطة بحسابك' });
    }

    // Get all WhatsApp accounts for this company, prioritizing connected accounts
    const accounts = await db
      .select()
      .from(whatsappAccounts)
      .where(eq(whatsappAccounts.companyId, companyId))
      .orderBy(desc(whatsappAccounts.status), desc(whatsappAccounts.createdAt));

    if (accounts.length === 0) {
      return reply.send({
        success: true,
        data: [],
        message: 'لا يوجد أي رقم واتساب مسجل لشركتك. يرجى التوجه إلى "بوابة واتساب" لربط رقم أولاً.',
        whatsappConnected: false,
      });
    }

    const connectedAccount = accounts.find((a) => a.status === 'connected') || accounts[0];
    let activeProvider = connectedAccount ? sessionManager.getProvider(connectedAccount.id) : undefined;
    let activeAccount = connectedAccount;

    if (!activeProvider) {
      for (const acc of accounts) {
        const p = sessionManager.getProvider(acc.id);
        if (p) {
          activeProvider = p;
          activeAccount = acc;
          break;
        }
      }
    }

    // If account is marked connected in DB but socket is not initialized in memory, attempt auto-connect
    if (!activeProvider && connectedAccount.status === 'connected') {
      try {
        await sessionManager.connectAccount(connectedAccount.id);
        for (let i = 0; i < 6; i++) {
          await new Promise((r) => setTimeout(r, 500));
          activeProvider = sessionManager.getProvider(connectedAccount.id);
          if (activeProvider && activeProvider.connectionState.status === 'connected') break;
        }
      } catch (connErr: any) {
        logger.warn({ err: connErr?.message }, 'Auto-connect attempt during fetchAllGroups');
      }
    }

    // If local WhatsApp session is connected, fetch real groups directly
    if (activeProvider) {
      try {
        const groups = await sessionManager.fetchAllGroups(activeAccount.id);
        const sortedGroups = (groups || []).sort((a, b) => (b.size || 0) - (a.size || 0));
        return reply.send({
          success: true,
          data: sortedGroups,
          count: sortedGroups.length,
          accountName: activeAccount.displayName,
          phoneNumber: activeAccount.phoneNumber,
          message: `تم اكتشاف ${sortedGroups.length} جروب تلقائياً بنجاح`,
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
        accountId: activeAccount.id,
        action: 'list_groups',
        payload: {},
        status: 'pending',
      })
      .returning();

    // Wait up to 3.5 seconds for bridge response
    for (let i = 0; i < 7; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const [updatedCmd] = await db.select().from(bridgeCommands).where(eq(bridgeCommands.id, cmd.id)).limit(1);
      if (updatedCmd && updatedCmd.status === 'completed' && (updatedCmd.result as any)?.groups) {
        const groups = (updatedCmd.result as any).groups;
        const sorted = (groups || []).sort((a: any, b: any) => (b.size || 0) - (a.size || 0));
        return reply.send({
          success: true,
          data: sorted,
          count: sorted.length,
          accountName: activeAccount.displayName,
          phoneNumber: activeAccount.phoneNumber,
          message: `تم اكتشاف ${sorted.length} جروب تلقائياً بنجاح`,
          whatsappConnected: true,
        });
      }
    }

    return reply.send({
      success: true,
      data: [],
      commandId: cmd.id,
      accountId: activeAccount.id,
      accountStatus: activeAccount.status,
      whatsappConnected: activeAccount.status === 'connected',
      message: activeAccount.status === 'connected'
        ? 'تم إرسال طلب استكشاف الجروبات، جاري الاتصال بمحرك واتساب...'
        : 'رقم الواتساب غير متصل حالياً، يرجى مسح رمز الاستجابة السريعة (QR) في صفحة بوابة واتساب.',
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
          const participants = await Promise.all(
            rawParticipants.map(async (p: any) => {
              let phone = '';
              if (p.phoneNumber) {
                phone = p.phoneNumber.replace(/[^0-9]/g, '');
              } else if (p.id && !p.id.endsWith('@lid')) {
                phone = p.id.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
              } else if (p.id && p.id.endsWith('@lid')) {
                const cleanLid = p.id.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
                const resolved = await provider.getPhoneNumberForLid(cleanLid);
                phone = resolved ? resolved.replace(/[^0-9]/g, '') : cleanLid;
              } else {
                phone = (p.id || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
              }

              const displayName = p.notify || p.name || p.username || phone;
              const isAdmin = p.admin === 'admin' || p.admin === 'superadmin';
              return {
                phoneNumber: phone,
                displayName,
                isAdmin,
              };
            })
          );

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
   * POST /api/v1/group-manager/add — Start adding selected extracted contacts to a group
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
    const accounts = await db
      .select()
      .from(whatsappAccounts)
      .where(eq(whatsappAccounts.companyId, companyId))
      .orderBy(desc(whatsappAccounts.status), desc(whatsappAccounts.createdAt));

    const connectedAccount = accounts.find((a) => a.status === 'connected') || accounts[0];
    if (!connectedAccount) {
      return reply.code(400).send({ success: false, error: 'لا يوجد حساب واتساب متصل حالياً للقيام بعملية الإضافة' });
    }

    let activeProvider = sessionManager.getProvider(connectedAccount.id);
    let activeAccount = connectedAccount;
    if (!activeProvider) {
      for (const acc of accounts) {
        const p = sessionManager.getProvider(acc.id);
        if (p) {
          activeProvider = p;
          activeAccount = acc;
          break;
        }
      }
    }

    // Normalize targetGroupJid (handle invite links, pure numbers, etc.)
    let targetGroupJid: string;
    let resolvedGroupName = parsed.data.targetGroupName;
    try {
      const normalized = await normalizeTargetGroupJid(parsed.data.targetGroupJid, activeAccount.id, sessionManager);
      targetGroupJid = normalized.jid;
      if (!resolvedGroupName && normalized.groupSubject) {
        resolvedGroupName = normalized.groupSubject;
      }
    } catch (normErr: any) {
      return reply.code(400).send({ success: false, error: normErr.message });
    }

    // Check if the connected account is an admin in the target group
    if (activeProvider) {
      const adminCheck = await checkAccountIsGroupAdmin(activeAccount.id, targetGroupJid, sessionManager);
      if (!adminCheck.canAdd) {
        return reply.code(400).send({
          success: false,
          error: adminCheck.reason || 'حساب الواتساب ليس مشرفاً في هذا الجروب',
          inviteLink: adminCheck.inviteLink,
        });
      }
      if (!resolvedGroupName && adminCheck.groupSubject) {
        resolvedGroupName = adminCheck.groupSubject;
      }
    }

    // Get the selected contacts using inArray (fix malformed array literal bug)
    const contacts = await db
      .select()
      .from(groupExtractedContacts)
      .where(
        and(
          eq(groupExtractedContacts.companyId, companyId),
          inArray(groupExtractedContacts.id, parsed.data.contactIds)
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
        targetGroupJid,
        targetGroupName: resolvedGroupName || null,
        status: 'pending',
        totalContacts: contacts.length,
      })
      .returning();

    // Queue bridge command for each batch of contacts
    const phoneNumbers = contacts.map((c) => c.phoneNumber);
    await db.insert(bridgeCommands).values({
      companyId,
      accountId: activeAccount.id,
      action: 'add_to_group',
      payload: {
        targetGroupJid,
        phoneNumbers,
        jobId: job.id,
        contactIds: parsed.data.contactIds,
      },
      status: 'pending',
    });

    // If local session is active, execute addition immediately in background
    if (activeProvider) {
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
            const validContactsToAdd: { contact: typeof contacts[0]; jid: string; cleanPhone: string }[] = [];

            for (const contact of batch) {
              let phone = contact.phoneNumber.replace(/[^0-9]/g, '');

              // If it's a long number (likely an LID >= 14 digits), attempt to resolve to real phone number
              if (phone.length >= 14 && activeProvider) {
                const resolved = await activeProvider.getPhoneNumberForLid(phone);
                if (resolved) {
                  phone = resolved.replace(/[^0-9]/g, '');
                  await db
                    .update(groupExtractedContacts)
                    .set({ phoneNumber: phone })
                    .where(eq(groupExtractedContacts.id, contact.id));
                }
              }

              // If still >= 14 digits and cannot be resolved, this contact's phone number is hidden by WhatsApp privacy
              if (phone.length >= 14) {
                failed++;
                await db
                  .update(groupExtractedContacts)
                  .set({
                    addError: 'رقم الهاتف مخفي في إعدادات خصوصية واتساب (LID) - يرجى إرسال رابط دعوة الجروب له للانضمام',
                  })
                  .where(eq(groupExtractedContacts.id, contact.id));
                continue;
              }

              validContactsToAdd.push({
                contact,
                cleanPhone: phone,
                jid: `${phone}@s.whatsapp.net`,
              });
            }

            if (validContactsToAdd.length > 0) {
              const jids = validContactsToAdd.map((v) => v.jid);

              try {
                const results = await sessionManager.addGroupParticipants(activeAccount.id, targetGroupJid, jids);
                for (const res of results) {
                  const phone = res.jid ? res.jid.split('@')[0].split(':')[0] : '';
                  const item = validContactsToAdd.find(
                    (v) =>
                      v.cleanPhone === phone ||
                      v.contact.phoneNumber.includes(phone) ||
                      (phone && v.cleanPhone.includes(phone))
                  );

                  if (item) {
                    const isSuccess = String(res.status) === '200';
                    if (isSuccess) {
                      processed++;
                      await db
                        .update(groupExtractedContacts)
                        .set({ addedToTarget: true, addError: null })
                        .where(eq(groupExtractedContacts.id, item.contact.id));
                    } else {
                      failed++;
                      const errMsg =
                        String(res.status) === '403'
                          ? 'خصوصية المستخدم تمنع الإضافة المباشرة (يحتاج إرسال رابط دعوة الجروب)'
                          : String(res.status) === '409'
                          ? 'العضو موجود بالفعل في الجروب'
                          : String(res.status) === '408'
                          ? 'المستخدم غادر الجروب مؤخراً ولا يمكن إضافته مباشرة (يحتاج رابط دعوة)'
                          : String(res.status) === '401'
                          ? 'حساب الواتساب ليس مشرفاً (Admin) في هذا الجروب'
                          : String(res.status) === '400'
                          ? 'رقم الهاتف غير مسجل في واتساب أو غير صالح'
                          : `كود الحالة: ${res.status}`;

                      await db
                        .update(groupExtractedContacts)
                        .set({ addError: errMsg })
                        .where(eq(groupExtractedContacts.id, item.contact.id));
                    }
                  }
                }
              } catch (batchErr: any) {
                failed += validContactsToAdd.length;
                let errMsg = batchErr?.message || 'خطأ أثناء الإضافة';
                if (/401|not-authorized|admin/i.test(errMsg)) {
                  errMsg = 'حساب الواتساب ليس مشرفاً (Admin) في هذا الجروب';
                } else if (/403|forbidden/i.test(errMsg)) {
                  errMsg = 'لا تملك صلاحية الإضافة في هذا الجروب';
                } else if (/404|item-not-found/i.test(errMsg)) {
                  errMsg = 'لم يتم العثور على الجروب أو تم حذفه';
                }
                for (const item of validContactsToAdd) {
                  await db
                    .update(groupExtractedContacts)
                    .set({ addError: errMsg })
                    .where(eq(groupExtractedContacts.id, item.contact.id));
                }
              }
            }

            if (i + batchSize < contacts.length) {
              await new Promise((r) => setTimeout(r, 2000));
            }
          }

          const finalStatus = processed === 0 && failed > 0 ? 'failed' : 'completed';
          await db
            .update(groupJobs)
            .set({
              status: finalStatus,
              processedContacts: processed,
              failedContacts: failed,
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(groupJobs.id, job.id));

          logger.info({ jobId: job.id, processed, failed, finalStatus }, 'Direct group add completed');
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

    logger.info(
      { companyId, jobId: job.id, targetGroupJid, contactCount: contacts.length },
      'Group add job created'
    );

    return reply.send({
      success: true,
      data: job,
      message: `تم بدء إضافة ${contacts.length} شخص إلى الجروب`,
    });
  });

  /**
   * POST /api/v1/group-manager/add-numbers — Add people directly by typing or pasting phone numbers
   */
  app.post('/add-numbers', async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = request.companyId || request.user?.companyId;
    if (!companyId) {
      return reply.code(403).send({ success: false, error: 'لا يوجد شركة مرتبطة بحسابك' });
    }

    const bodySchema = z.object({
      targetGroupJid: z.string().min(1, 'معرف الجروب الهدف مطلوب'),
      targetGroupName: z.string().optional(),
      phoneNumbers: z.array(z.string()).min(1, 'يجب إدخال رقم هاتف واحد على الأقل'),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'بيانات غير صالحة', details: parsed.error.format() });
    }

    // Clean, validate and normalize phone numbers (7 to 16 digits)
    const rawNumbers = parsed.data.phoneNumbers;
    const cleanNumbersSet = new Set<string>();

    for (const raw of rawNumbers) {
      const cleaned = String(raw).replace(/[^0-9]/g, '');
      if (cleaned.length >= 7 && cleaned.length <= 16) {
        cleanNumbersSet.add(cleaned);
      }
    }

    const uniqueNumbers = Array.from(cleanNumbersSet);
    if (uniqueNumbers.length === 0) {
      return reply.code(400).send({
        success: false,
        error:
          'لم يتم العثور على أي أرقام هواتف صالحة. يرجى التأكد من كتابة الأرقام بصيغة صحيحة تشمل كود الدولة (مثال: +965XXXXXXXX أو 201XXXXXXXXX).',
      });
    }

    // Get connected WhatsApp account
    const accounts = await db
      .select()
      .from(whatsappAccounts)
      .where(eq(whatsappAccounts.companyId, companyId))
      .orderBy(desc(whatsappAccounts.status), desc(whatsappAccounts.createdAt));

    const connectedAccount = accounts.find((a) => a.status === 'connected') || accounts[0];
    if (!connectedAccount) {
      return reply.code(400).send({ success: false, error: 'لا يوجد حساب واتساب متصل حالياً للقيام بعملية الإضافة' });
    }

    let activeProvider = sessionManager.getProvider(connectedAccount.id);
    let activeAccount = connectedAccount;
    if (!activeProvider) {
      for (const acc of accounts) {
        const p = sessionManager.getProvider(acc.id);
        if (p) {
          activeProvider = p;
          activeAccount = acc;
          break;
        }
      }
    }

    // Normalize targetGroupJid (handle invite links, pure numbers, etc.)
    let targetGroupJid: string;
    let resolvedGroupName = parsed.data.targetGroupName;
    try {
      const normalized = await normalizeTargetGroupJid(parsed.data.targetGroupJid, activeAccount.id, sessionManager);
      targetGroupJid = normalized.jid;
      if (!resolvedGroupName && normalized.groupSubject) {
        resolvedGroupName = normalized.groupSubject;
      }
    } catch (normErr: any) {
      return reply.code(400).send({ success: false, error: normErr.message });
    }

    // Check if the connected account is an admin in the target group
    if (activeProvider) {
      const adminCheck = await checkAccountIsGroupAdmin(activeAccount.id, targetGroupJid, sessionManager);
      if (!adminCheck.canAdd) {
        return reply.code(400).send({
          success: false,
          error: adminCheck.reason || 'حساب الواتساب ليس مشرفاً في هذا الجروب',
          inviteLink: adminCheck.inviteLink,
        });
      }
      if (!resolvedGroupName && adminCheck.groupSubject) {
        resolvedGroupName = adminCheck.groupSubject;
      }
    }

    // Create add job
    const [job] = await db
      .insert(groupJobs)
      .values({
        companyId,
        type: 'add',
        targetGroupJid,
        targetGroupName: resolvedGroupName || null,
        status: 'pending',
        totalContacts: uniqueNumbers.length,
      })
      .returning();

    // Insert contacts so they are tracked and searchable
    const insertedContacts = await db
      .insert(groupExtractedContacts)
      .values(
        uniqueNumbers.map((phone) => ({
          companyId,
          jobId: job.id,
          phoneNumber: phone,
          displayName: phone,
          groupJid: targetGroupJid,
          groupName: resolvedGroupName || null,
          addedToTarget: false,
        }))
      )
      .returning();

    const contactIdMap = new Map(insertedContacts.map((c) => [c.phoneNumber, c.id]));

    // Queue bridge command if bridge mode
    await db.insert(bridgeCommands).values({
      companyId,
      accountId: activeAccount.id,
      action: 'add_to_group',
      payload: {
        targetGroupJid,
        phoneNumbers: uniqueNumbers,
        jobId: job.id,
      },
      status: 'pending',
    });

    // If local session is active, execute addition directly in background
    if (activeProvider) {
      (async () => {
        try {
          await db
            .update(groupJobs)
            .set({ status: 'running', updatedAt: new Date() })
            .where(eq(groupJobs.id, job.id));

          let processed = 0;
          let failed = 0;

          // Add in small batches of 5 to protect from WhatsApp spam limits
          const batchSize = 5;
          for (let i = 0; i < uniqueNumbers.length; i += batchSize) {
            const batch = uniqueNumbers.slice(i, i + batchSize);
            const jids = batch.map((phone) => `${phone}@s.whatsapp.net`);

            try {
              const results = await sessionManager.addGroupParticipants(activeAccount.id, targetGroupJid, jids);
              for (const res of results) {
                const phone = res.jid ? res.jid.split('@')[0].split(':')[0] : '';
                const contactId = contactIdMap.get(phone);
                const isSuccess = String(res.status) === '200';

                if (isSuccess) {
                  processed++;
                  if (contactId) {
                    await db
                      .update(groupExtractedContacts)
                      .set({ addedToTarget: true, addError: null })
                      .where(eq(groupExtractedContacts.id, contactId));
                  }
                } else {
                  failed++;
                  const errMsg =
                    String(res.status) === '403'
                      ? 'خصوصية المستخدم تمنع الإضافة المباشرة (يحتاج إرسال رابط دعوة الجروب)'
                      : String(res.status) === '409'
                      ? 'العضو موجود بالفعل في الجروب'
                      : String(res.status) === '408'
                      ? 'المستخدم غادر الجروب مؤخراً ولا يمكن إضافته مباشرة (يحتاج رابط دعوة)'
                      : String(res.status) === '401'
                      ? 'حساب الواتساب ليس مشرفاً (Admin) في هذا الجروب'
                      : String(res.status) === '400'
                      ? 'رقم الهاتف غير مسجل في واتساب أو غير صالح'
                      : `كود الحالة: ${res.status}`;

                  if (contactId) {
                    await db
                      .update(groupExtractedContacts)
                      .set({ addError: errMsg })
                      .where(eq(groupExtractedContacts.id, contactId));
                  }
                }
              }
            } catch (batchErr: any) {
              failed += batch.length;
              let errMsg = batchErr?.message || 'خطأ أثناء الإضافة';
              if (/401|not-authorized|admin/i.test(errMsg)) {
                errMsg = 'حساب الواتساب ليس مشرفاً (Admin) في هذا الجروب';
              } else if (/403|forbidden/i.test(errMsg)) {
                errMsg = 'لا تملك صلاحية الإضافة في هذا الجروب';
              } else if (/404|item-not-found/i.test(errMsg)) {
                errMsg = 'لم يتم العثور على الجروب أو تم حذفه';
              }
              for (const phone of batch) {
                const contactId = contactIdMap.get(phone);
                if (contactId) {
                  await db
                    .update(groupExtractedContacts)
                    .set({ addError: errMsg })
                    .where(eq(groupExtractedContacts.id, contactId));
                }
              }
            }

            if (i + batchSize < uniqueNumbers.length) {
              await new Promise((r) => setTimeout(r, 2000));
            }
          }

          const finalStatus = processed === 0 && failed > 0 ? 'failed' : 'completed';
          await db
            .update(groupJobs)
            .set({
              status: finalStatus,
              processedContacts: processed,
              failedContacts: failed,
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(groupJobs.id, job.id));

          logger.info({ jobId: job.id, processed, failed, finalStatus }, 'Direct phone number group add completed');
        } catch (err: any) {
          logger.error({ jobId: job.id, err: err?.message }, 'Direct phone number group add failed');
          await db
            .update(groupJobs)
            .set({
              status: 'failed',
              errorMessage: err?.message || 'فشل في إضافة الأرقام إلى الجروب',
              updatedAt: new Date(),
            })
            .where(eq(groupJobs.id, job.id));
        }
      })().catch((err) => logger.error({ err }, 'Error in direct add-numbers background worker'));
    }

    return reply.send({
      success: true,
      data: job,
      totalCount: uniqueNumbers.length,
      message: `تم بدء عملية إضافة ${uniqueNumbers.length} رقم هاتف إلى الجروب بنجاح`,
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
