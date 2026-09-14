import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, sql, ilike, or, lte, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../database/client';
import {
  conversations,
  contacts,
  employees,
  users,
  stations,
  leads,
  whatsappAccounts,
  messages,
  reminders,
  companies,
  conversationTags,
} from '../../database/schema/index';
import { authenticate } from '../../middleware/auth.middleware';
import { OutboundQueueService } from '../../services/outbound-queue.service';
import { config } from '../../config/index';
import { wsHub } from '../../websocket/ws.hub';
import { logger } from '../../utils/logger';
import { validateAndFormatPhone } from '../../utils/phone.validator';
import { AssignmentService } from '../automations/assignment.service';

// ─── Query & Body Schemas ───────────────────────────────────

export const listConversationsQuerySchema = z.object({
  status: z.preprocess((val) => (val === 'resolved' ? 'closed' : val), z.enum(['open', 'pending', 'waiting', 'closed']).optional()),
  stationId: z.string().uuid().optional(),
  assignedEmployeeId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;

const assignSchema = z.object({
  assignedEmployeeId: z.string().uuid().nullable().optional(),
  assignedStationId: z.string().uuid().nullable().optional(),
  assignedSupervisorId: z.string().uuid().nullable().optional(),
});

const statusSchema = z.object({
  status: z.enum(['open', 'pending', 'waiting', 'closed']),
});

const modeSchema = z.object({
  humanMode: z.boolean().optional(),
  automationEnabled: z.boolean().optional(),
});

export async function conversationsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/conversations — List conversations with filters and search
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    // Auto-close any conversations that have been inactive for > 5 minutes
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      await db
        .update(conversations)
        .set({ status: 'closed', updatedAt: new Date() })
        .where(
          and(
            eq(conversations.status, 'open'),
            or(
              lte(conversations.lastMessageAt, fiveMinutesAgo),
              and(isNull(conversations.lastMessageAt), lte(conversations.createdAt, fiveMinutesAgo))
            )
          )
        );
    } catch {}

    const query = listConversationsQuerySchema.parse(request.query);

    const conditions = [];

    if (query.status) {
      conditions.push(eq(conversations.status, query.status));
    }

    if (query.stationId) {
      conditions.push(eq(conversations.assignedStationId, query.stationId));
    }

    if (query.assignedEmployeeId) {
      conditions.push(eq(conversations.assignedEmployeeId, query.assignedEmployeeId));
    }

    if (query.search && query.search.trim() !== '') {
      const rawSearch = query.search.trim();
      const s = `%${rawSearch}%`;
      const searchConditions = [
        ilike(contacts.name, s),
        ilike(contacts.phoneNumber, s),
        ilike(contacts.whatsappJid, s),
        ilike(conversations.lastMessageText, s),
      ];

      const cleanDigits = rawSearch.replace(/\D/g, '');
      if (cleanDigits.length >= 3) {
        searchConditions.push(ilike(contacts.phoneNumber, `%${cleanDigits}%`));
        const strippedZero = cleanDigits.replace(/^0+/, '');
        if (strippedZero.length >= 3 && strippedZero !== cleanDigits) {
          searchConditions.push(ilike(contacts.phoneNumber, `%${strippedZero}%`));
        }
      }

      const formatted = validateAndFormatPhone(rawSearch);
      if (formatted.isValid && formatted.e164) {
        searchConditions.push(ilike(contacts.phoneNumber, `%${formatted.e164}%`));
      }

      conditions.push(or(...searchConditions));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: conversations.id,
        status: conversations.status,
        lastMessageText: conversations.lastMessageText,
        lastMessageAt: conversations.lastMessageAt,
        unreadCount: conversations.unreadCount,
        humanMode: conversations.humanMode,
        automationEnabled: conversations.automationEnabled,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        contact: {
          id: contacts.id,
          name: contacts.name,
          phoneNumber: contacts.phoneNumber,
          whatsappJid: contacts.whatsappJid,
          avatarUrl: contacts.avatarUrl,
        },
        station: {
          id: stations.id,
          name: stations.name,
        },
        assignedEmployee: {
          id: employees.id,
          name: users.name,
          email: users.email,
        },
        whatsappAccount: {
          id: whatsappAccounts.id,
          displayName: whatsappAccounts.displayName,
          phoneNumber: whatsappAccounts.phoneNumber,
        },
      })
      .from(conversations)
      .innerJoin(contacts, eq(conversations.contactId, contacts.id))
      .leftJoin(stations, eq(conversations.assignedStationId, stations.id))
      .leftJoin(employees, eq(conversations.assignedEmployeeId, employees.id))
      .leftJoin(users, eq(employees.userId, users.id))
      .leftJoin(whatsappAccounts, eq(conversations.whatsappAccountId, whatsappAccounts.id))
      .where(whereClause)
      .orderBy(desc(conversations.lastMessageAt), desc(conversations.updatedAt))
      .limit(query.limit)
      .offset(query.offset);

    // Get overall counts by status
    const [counts] = await db
      .select({
        openCount: sql<number>`count(*) filter (where ${conversations.status} = 'open')`,
        pendingCount: sql<number>`count(*) filter (where ${conversations.status} = 'pending')`,
        closedCount: sql<number>`count(*) filter (where ${conversations.status} = 'closed')`,
        totalCount: sql<number>`count(*)`,
      })
      .from(conversations);

    const mappedRows = rows.map((row) => ({
      ...row,
      unreadCount: parseInt(row.unreadCount || '0', 10) || 0,
      contactId: row.contact?.id,
      contactName: row.contact?.name || row.contact?.phoneNumber || 'عميل واتساب',
      contactPhone: row.contact?.phoneNumber || '',
      contactAvatar: row.contact?.avatarUrl || '',
      stationId: row.station?.id,
      stationName: row.station?.name || '',
      assignedAgentId: row.assignedEmployee?.id,
      assignedAgentName: row.assignedEmployee?.name || '',
      lastMessageTimestamp: row.lastMessageAt
        ? new Date(row.lastMessageAt).toISOString()
        : row.updatedAt
        ? new Date(row.updatedAt).toISOString()
        : undefined,
    }));

    return reply.send({
      success: true,
      data: mappedRows,
      meta: {
        limit: query.limit,
        offset: query.offset,
        counts: {
          open: Number(counts?.openCount || 0),
          pending: Number(counts?.pendingCount || 0),
          closed: Number(counts?.closedCount || 0),
          total: Number(counts?.totalCount || 0),
        },
      },
    });
  });

  /**
   * POST /api/v1/conversations/start — Start a new outbound conversation
   */
  app.post('/start', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const schemaValidator = z.object({
      phoneNumber: z.string().min(1),
      contactName: z.string().optional(),
      messageText: z.string().optional(),
      whatsappAccountId: z.string().uuid().optional(),
      stationId: z.string().uuid().optional().nullable(),
      assignedEmployeeId: z.string().uuid().optional().nullable(),
    });

    const parsed = schemaValidator.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'بيانات المحادثة غير صالحة',
        details: parsed.error.format(),
      });
    }

    const { phoneNumber, contactName, messageText, whatsappAccountId, stationId, assignedEmployeeId } = parsed.data;

    // Validate phone number with international country code
    const phoneCheck = validateAndFormatPhone(phoneNumber);
    if (!phoneCheck.isValid) {
      return reply.status(400).send({
        success: false,
        error: phoneCheck.error || 'رقم الهاتف غير صالح',
      });
    }

    const formattedPhone = phoneCheck.formatted;

    // Resolve WhatsApp Account to send from (prioritize primary dispatcher 1 & 2)
    let accountId = whatsappAccountId;
    if (!accountId) {
      // 1. Primary Dispatcher Slot 1
      const [slot1Account] = await db
        .select()
        .from(whatsappAccounts)
        .where(and(eq(whatsappAccounts.isPrimaryDispatcher, true), eq(whatsappAccounts.dispatcherSlot, 1)))
        .limit(1);

      if (slot1Account) {
        accountId = slot1Account.id;
      } else {
        // 2. Any Primary Dispatcher
        const [anyDispatcher] = await db
          .select()
          .from(whatsappAccounts)
          .where(eq(whatsappAccounts.isPrimaryDispatcher, true))
          .limit(1);

        if (anyDispatcher) {
          accountId = anyDispatcher.id;
        } else {
          // 3. Any connected account
          const [connected] = await db
            .select()
            .from(whatsappAccounts)
            .where(eq(whatsappAccounts.status, 'connected'))
            .limit(1);

          if (connected) {
            accountId = connected.id;
          } else {
            // 4. Any account at all
            const [firstAcc] = await db.select().from(whatsappAccounts).limit(1);
            if (!firstAcc) {
              return reply.status(400).send({
                success: false,
                error: 'لا يوجد أي حساب واتساب مسجل في النظام للإرسال منه.',
              });
            }
            accountId = firstAcc.id;
          }
        }
      }
    }

    const [account] = await db
      .select()
      .from(whatsappAccounts)
      .where(eq(whatsappAccounts.id, accountId))
      .limit(1);

    if (!account) {
      return reply.status(404).send({ success: false, error: 'حساب WhatsApp المحدد غير موجود' });
    }

    // Resolve or create Contact
    let [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.phoneNumber, formattedPhone))
      .limit(1);

    if (!contact) {
      const remoteJid = `${formattedPhone.replace(/\D/g, '')}@s.whatsapp.net`;
      [contact] = await db
        .insert(contacts)
        .values({
          companyId: account.companyId,
          name: contactName?.trim() || formattedPhone,
          phoneNumber: formattedPhone,
          whatsappJid: remoteJid,
          source: 'manual_outbound',
        })
        .returning();
    } else if (contactName && contactName.trim() !== '' && contact.name === contact.phoneNumber) {
      // Update contact name if it was previously just the phone number
      [contact] = await db
        .update(contacts)
        .set({ name: contactName.trim(), updatedAt: new Date() })
        .where(eq(contacts.id, contact.id))
        .returning();
    }

    // Resolve or create Conversation
    let [convo] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.contactId, contact.id),
          eq(conversations.whatsappAccountId, account.id)
        )
      )
      .limit(1);

    if (!convo) {
      [convo] = await db
        .insert(conversations)
        .values({
          companyId: account.companyId,
          contactId: contact.id,
          whatsappAccountId: account.id,
          assignedStationId: stationId || null,
          assignedEmployeeId: assignedEmployeeId || null,
          status: 'open',
          lastMessageText: messageText?.trim() || null,
          lastMessageAt: messageText?.trim() ? new Date() : null,
          unreadCount: '0',
        })
        .returning();
    } else {
      // Re-open conversation if it was closed, update station / employee if provided
      const updateData: any = { updatedAt: new Date() };
      if (convo.status === 'closed') {
        updateData.status = 'open';
      }
      if (stationId) updateData.assignedStationId = stationId;
      if (assignedEmployeeId) updateData.assignedEmployeeId = assignedEmployeeId;

      [convo] = await db
        .update(conversations)
        .set(updateData)
        .where(eq(conversations.id, convo.id))
        .returning();
    }

    // If message text was provided, send it via WhatsApp socket or queue
    if (messageText && messageText.trim() !== '') {
      const rawNumber = formattedPhone.replace(/\D/g, '');
      const toJid = contact.whatsappJid || `${rawNumber}@s.whatsapp.net`;
      let whatsappMessageId = `crm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const [savedMsg] = await db
        .insert(messages)
        .values({
          conversationId: convo.id,
          contactId: contact.id,
          senderType: 'employee',
          senderUserId: user.id,
          direction: 'outgoing',
          type: 'text',
          text: messageText.trim(),
          whatsappMessageId,
          status: 'pending',
        })
        .returning();

      const sendResult = await OutboundQueueService.sendMessage({
        companyId: account.companyId,
        accountId: account.id,
        conversationId: convo.id,
        messageId: savedMsg.id,
        toJid,
        type: 'text',
        text: messageText.trim(),
      });

      const finalStatus = sendResult.status === 'sent' ? 'sent' : 'queued';
      if (sendResult.whatsappMessageId) {
        whatsappMessageId = sendResult.whatsappMessageId;
      }

      await db
        .update(messages)
        .set({
          status: finalStatus,
          whatsappMessageId,
          updatedAt: new Date(),
        })
        .where(eq(messages.id, savedMsg.id));

      await db
        .update(conversations)
        .set({
          lastMessageText: messageText.trim(),
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, convo.id));

      wsHub.broadcast('message.created', {
        accountId: account.id,
        message: {
          ...savedMsg,
          conversationId: convo.id,
          contactName: contact.name,
          contactPhone: contact.phoneNumber,
        },
      });
    }

    wsHub.broadcast('conversation.created', {
      conversationId: convo.id,
      contactName: contact.name,
      contactPhone: contact.phoneNumber,
      accountId: account.id,
    });

    return reply.status(201).send({
      success: true,
      data: {
        ...convo,
        contact,
        whatsappAccount: {
          id: account.id,
          displayName: account.displayName,
          phoneNumber: account.phoneNumber,
        },
      },
    });
  });

  /**
   * GET /api/v1/conversations/:id/timeline — Full Follow-Up Timeline & History
   */
  app.get('/:id/timeline', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    const [convo] = await db
      .select({
        id: conversations.id,
        contactId: conversations.contactId,
        status: conversations.status,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);

    if (!convo) {
      return reply.status(404).send({ success: false, error: 'المحادثة غير موجودة' });
    }

    // 1. Fetch Reminders for this conversation or contact
    const convReminders = await db
      .select({
        id: reminders.id,
        title: reminders.title,
        note: reminders.note,
        dueAt: reminders.dueAt,
        status: reminders.status,
        completedAt: reminders.completedAt,
        createdAt: reminders.createdAt,
        assignedUserName: users.name,
        assignedUserEmail: users.email,
      })
      .from(reminders)
      .leftJoin(users, eq(reminders.assignedUserId, users.id))
      .where(
        or(
          eq(reminders.conversationId, convo.id),
          eq(reminders.leadId, convo.contactId)
        )
      )
      .orderBy(desc(reminders.dueAt));

    // 2. Fetch Internal Team Notes
    const internalNotes = await db
      .select({
        id: messages.id,
        text: messages.text,
        metadata: messages.metadata,
        createdAt: messages.createdAt,
        timestamp: messages.timestamp,
        authorName: users.name,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderUserId, users.id))
      .where(
        and(
          eq(messages.conversationId, convo.id),
          sql`${messages.metadata}->>'isInternalNote' = 'true'`
        )
      )
      .orderBy(desc(messages.createdAt));

    // 3. Assemble unified timeline
    const timelineItems = [
      ...convReminders.map((r) => ({
        id: r.id,
        type: 'reminder' as const,
        title: r.title,
        description: r.note,
        date: r.dueAt,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
        status: r.status,
        author: r.assignedUserName || 'فريق العمل',
        badge: r.status === 'completed' ? 'تمت المتابعة' : r.status === 'cancelled' ? 'ملغي' : 'متابعة مطلوبة',
      })),
      ...internalNotes.map((n) => ({
        id: n.id,
        type: 'note' as const,
        title: 'ملاحظة داخلية',
        description: n.text,
        date: n.createdAt,
        createdAt: n.createdAt,
        status: 'note',
        author: n.authorName || (n.metadata as any)?.authorName || 'الموظف',
        badge: 'ملاحظة',
      })),
      {
        id: `created_${convo.id}`,
        type: 'system' as const,
        title: 'بدء المحادثة وفتح قناة التواصل',
        description: 'تم تسجيل المحادثة مع العميل في النظام',
        date: convo.createdAt,
        createdAt: convo.createdAt,
        status: convo.status,
        author: 'النظام',
        badge: 'بداية المحادثة',
      },
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return reply.send({
      success: true,
      data: timelineItems,
    });
  });

  /**
   * GET /api/v1/conversations/:id — Single conversation details + contact + lead
   */
  app.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    const [row] = await db
      .select({
        id: conversations.id,
        status: conversations.status,
        lastMessageText: conversations.lastMessageText,
        lastMessageAt: conversations.lastMessageAt,
        unreadCount: conversations.unreadCount,
        humanMode: conversations.humanMode,
        automationEnabled: conversations.automationEnabled,
        assignmentSource: conversations.assignmentSource,
        assignedAt: conversations.assignedAt,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        contact: {
          id: contacts.id,
          name: contacts.name,
          phoneNumber: contacts.phoneNumber,
          whatsappJid: contacts.whatsappJid,
          avatarUrl: contacts.avatarUrl,
          source: contacts.source,
          metadata: contacts.metadata,
        },
        station: {
          id: stations.id,
          name: stations.name,
        },
        assignedEmployee: {
          id: employees.id,
          name: users.name,
          email: users.email,
        },
        whatsappAccount: {
          id: whatsappAccounts.id,
          displayName: whatsappAccounts.displayName,
          phoneNumber: whatsappAccounts.phoneNumber,
        },
      })
      .from(conversations)
      .innerJoin(contacts, eq(conversations.contactId, contacts.id))
      .leftJoin(stations, eq(conversations.assignedStationId, stations.id))
      .leftJoin(employees, eq(conversations.assignedEmployeeId, employees.id))
      .leftJoin(users, eq(employees.userId, users.id))
      .leftJoin(whatsappAccounts, eq(conversations.whatsappAccountId, whatsappAccounts.id))
      .where(eq(conversations.id, id))
      .limit(1);

    if (!row) {
      return reply.status(404).send({ success: false, error: 'Conversation not found' });
    }

    // Also fetch active lead for this contact if any
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.contactId, row.contact.id))
      .orderBy(desc(leads.createdAt))
      .limit(1);

    return reply.send({
      success: true,
      data: {
        ...row,
        unreadCount: parseInt(row.unreadCount || '0', 10) || 0,
        contactId: row.contact?.id,
        contactName: row.contact?.name || row.contact?.phoneNumber || 'عميل واتساب',
        contactPhone: row.contact?.phoneNumber || '',
        contactAvatar: row.contact?.avatarUrl || '',
        stationId: row.station?.id,
        stationName: row.station?.name || '',
        assignedAgentId: row.assignedEmployee?.id,
        assignedAgentName: row.assignedEmployee?.name || '',
        lastMessageTimestamp: row.lastMessageAt
          ? new Date(row.lastMessageAt).toISOString()
          : row.updatedAt
          ? new Date(row.updatedAt).toISOString()
          : undefined,
        lead: lead || null,
      },
    });
  });

  /**
   * POST & PATCH /api/v1/conversations/:id/assign — Reassign conversation
   */
  const assignHandler = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const raw = (request.body as any) || {};

    const updates: Record<string, any> = {
      updatedAt: new Date(),
      assignedAt: new Date(),
      assignmentSource: 'manual',
    };

    const employeeId = raw.assignedEmployeeId !== undefined ? raw.assignedEmployeeId : raw.assignedAgentId;
    if (employeeId !== undefined) {
      updates.assignedEmployeeId = employeeId;
    }

    const stationId = raw.assignedStationId !== undefined ? raw.assignedStationId : raw.stationId;
    if (stationId !== undefined) {
      updates.assignedStationId = stationId;
    }

    if (raw.assignedSupervisorId !== undefined) {
      updates.assignedSupervisorId = raw.assignedSupervisorId;
    }

    const [updated] = await db
      .update(conversations)
      .set(updates)
      .where(eq(conversations.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({ success: false, error: 'Conversation not found' });
    }

    // Persist new assignment to contact metadata as well
    if (updated.contactId && employeeId) {
      const [cont] = await db.select().from(contacts).where(eq(contacts.id, updated.contactId)).limit(1);
      if (cont) {
        const meta = (cont.metadata || {}) as Record<string, any>;
        meta.assignedEmployeeId = employeeId;
        await db.update(contacts).set({ metadata: meta, updatedAt: new Date() }).where(eq(contacts.id, cont.id));
      }

      // Dispatch instant WhatsApp alert to employee's personal phone number
      if (raw.notifyEmployeeWhatsApp !== false) {
        AssignmentService.notifyEmployeeViaWhatsApp({
          employeeId,
          contactId: updated.contactId,
          conversationId: id,
          lastMessageText: updated.lastMessageText,
          whatsappAccountId: updated.whatsappAccountId,
          sourceDescription: 'قام مدير النظام بإسناد محادثة العميل التالية إليك مباشرة',
        }).catch((err) => logger.warn({ err: err?.message, employeeId }, 'Failed manual assign employee WhatsApp alert'));
      }
    }

    const eventPayload = {
      id,
      conversationId: id,
      assignedEmployeeId: employeeId !== undefined ? employeeId : updated.assignedEmployeeId,
      assignedStationId: stationId !== undefined ? stationId : updated.assignedStationId,
      updates,
    };

    wsHub.broadcast('conversation.updated', eventPayload);
    wsHub.broadcast('conversation_update', eventPayload);
    wsHub.broadcast('assigned', { conversationId: id, assignedEmployeeId: employeeId });

    logger.info({ conversationId: id, updates }, 'Conversation reassigned and contact metadata updated');

    return reply.send({ success: true, data: updated });
  };

  app.post('/:id/assign', assignHandler);
  app.patch('/:id/assign', assignHandler);


  /**
   * PATCH /api/v1/conversations/:id/status — Update status (open, pending, closed)
   */
  app.patch('/:id/status', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const parsed = statusSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: 'Invalid status', details: parsed.error.format() });
    }

    const [updated] = await db
      .update(conversations)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({ success: false, error: 'Conversation not found' });
    }

    wsHub.broadcast('conversation.updated', { conversationId: id, status: parsed.data.status });
    return reply.send({ success: true, data: updated });
  });

  /**
   * POST /api/v1/conversations/:id/read — Mark conversation as read
   */
  app.post('/:id/read', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    const [conv] = await db
      .select({
        id: conversations.id,
        whatsappAccountId: conversations.whatsappAccountId,
        contactJid: contacts.whatsappJid,
      })
      .from(conversations)
      .innerJoin(contacts, eq(conversations.contactId, contacts.id))
      .where(eq(conversations.id, id))
      .limit(1);

    if (!conv) {
      return reply.status(404).send({ success: false, error: 'Conversation not found' });
    }

    // Reset unread count
    await db
      .update(conversations)
      .set({ unreadCount: '0', updatedAt: new Date() })
      .where(eq(conversations.id, id));

    // If active WhatsApp socket exists in local mode and contact JID is present, notify WhatsApp
    if (config.DEPLOYMENT_MODE === 'local' && conv.whatsappAccountId && conv.contactJid) {
      try {
        const { sessionManager } = await import('../whatsapp/session.manager');
        const provider = sessionManager.getProvider(conv.whatsappAccountId);
        if (provider) {
          await provider.markRead(conv.contactJid, []);
        }
      } catch (err) {
        logger.debug({ err }, 'Failed to send read receipt to WA socket');
      }
    }

    wsHub.broadcast('conversation.read', { conversationId: id });
    wsHub.broadcast('conversation.updated', { conversationId: id, unreadCount: 0 });
    return reply.send({ success: true, message: 'Conversation marked as read' });
  });

  /**
   * PATCH /api/v1/conversations/:id/mode — Toggle human mode & automation
   */
  app.patch('/:id/mode', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const parsed = modeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: 'Invalid mode payload' });
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (parsed.data.humanMode !== undefined) updates.humanMode = parsed.data.humanMode;
    if (parsed.data.automationEnabled !== undefined) updates.automationEnabled = parsed.data.automationEnabled;

    const [updated] = await db
      .update(conversations)
      .set(updates)
      .where(eq(conversations.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({ success: false, error: 'Conversation not found' });
    }

    wsHub.broadcast('conversation.updated', { conversationId: id, ...updates });
    return reply.send({ success: true, data: updated });
  });

  /**
   * DELETE /api/v1/conversations/:id — Delete conversation and all its messages/records
   */
  app.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    // Validate UUID format
    const uuidSchema = z.string().uuid();
    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) {
      return reply.status(400).send({
        success: false,
        error: 'معرف المحادثة غير صالح (يجب أن يكون بصيغة UUID)',
      });
    }

    try {
      // 1. Check if conversation exists
      const [existing] = await db
        .select({ id: conversations.id, contactId: conversations.contactId })
        .from(conversations)
        .where(eq(conversations.id, id))
        .limit(1);

      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: 'المحادثة غير موجودة أو تم حذفها بالفعل مسبقاً',
        });
      }

      // 2. Perform safe transactional deletion
      await db.transaction(async (tx) => {
        // Delete messages associated with this conversation
        await tx.delete(messages).where(eq(messages.conversationId, id));

        // Delete reminders associated with this conversation
        await tx.delete(reminders).where(eq(reminders.conversationId, id));

        // Delete conversation tags
        await tx.delete(conversationTags).where(eq(conversationTags.conversationId, id));

        // Finally delete conversation record itself
        await tx.delete(conversations).where(eq(conversations.id, id));
      });

      // 3. Broadcast real-time deletion to all connected agents and clients
      wsHub.broadcast('conversation.deleted', { id, conversationId: id });
      wsHub.broadcast('conversation_deleted', { id, conversationId: id });

      logger.info({ conversationId: id, contactId: existing.contactId }, 'Conversation and associated data deleted successfully');

      return reply.send({
        success: true,
        message: 'تم مسح المحادثة وكافة رسائلها وسجلاتها بنجاح من النظام',
        data: { id },
      });
    } catch (err: any) {
      logger.error({ err, conversationId: id }, 'Database error while deleting conversation');
      return reply.status(500).send({
        success: false,
        error: 'حدث خطأ غير متوقع أثناء محاولة حذف المحادثة من قاعدة البيانات',
        details: err?.message,
      });
    }
  });
}
