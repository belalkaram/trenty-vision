import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc, asc, and, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../database/client';
import {
  messages,
  conversations,
  contacts,
  whatsappAccounts,
  users,
} from '../../database/schema/index';
import { authenticate, requireCrmCompany } from '../../middleware/auth.middleware';
import { OutboundQueueService } from '../../services/outbound-queue.service';
import { LocalStorageProvider } from '../../providers/storage/storage.provider';
import { wsHub } from '../../websocket/ws.hub';
import { logger } from '../../utils/logger';

const storage = new LocalStorageProvider();

const listMessagesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const sendMessageSchema = z.object({
  text: z.string().optional(),
  type: z.enum(['text', 'image', 'video', 'audio', 'voice_note', 'document', 'location']).default('text'),
  media: z
    .object({
      dataUrl: z.string().min(10),
      fileName: z.string().optional(),
      mimeType: z.string().optional(),
      caption: z.string().optional(),
    })
    .optional(),
  quotedMessageId: z.string().uuid().optional(),
});

export async function messagesRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireCrmCompany);

  /**
   * GET /api/v1/conversations/:conversationId/messages — Paginated messages list
   */
  app.get('/:conversationId/messages', async (request: FastifyRequest<{ Params: { conversationId: string } }>, reply: FastifyReply) => {
    const { conversationId } = request.params;
    const query = listMessagesQuerySchema.parse(request.query);
    const userCompanyId = request.user?.companyId;

    // Verify conversation belongs to company
    const [convCheck] = await db
      .select({ id: conversations.id, companyId: conversations.companyId })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!convCheck || (userCompanyId && convCheck.companyId !== userCompanyId && !request.user?.isSuperAdmin)) {
      return reply.status(404).send({ success: false, error: 'Conversation not found' });
    }

    const rows = await db
      .select({
        id: messages.id,
        whatsappMessageId: messages.whatsappMessageId,
        direction: messages.direction,
        senderType: messages.senderType,
        senderUserId: messages.senderUserId,
        senderUserName: users.name,
        type: messages.type,
        text: messages.text,
        mediaId: messages.mediaId,
        quotedMessageId: messages.quotedMessageId,
        status: messages.status,
        timestamp: messages.timestamp,
        metadata: messages.metadata,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderUserId, users.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.timestamp))
      .limit(query.limit)
      .offset(query.offset);

    // Auto-reset unread count if conversation has unread messages
    try {
      const updated = await db
        .update(conversations)
        .set({ unreadCount: '0', updatedAt: new Date() })
        .where(and(eq(conversations.id, conversationId), ne(conversations.unreadCount, '0')))
        .returning({ id: conversations.id });

      if (updated.length > 0) {
        wsHub.broadcast('conversation.read', { conversationId });
        wsHub.broadcast('conversation.updated', { conversationId, unreadCount: 0 });
      }
    } catch (err) {
      logger.debug({ err }, 'Failed to clear unreadCount on fetch messages');
    }

    return reply.send({
      success: true,
      data: rows,
      meta: {
        limit: query.limit,
        offset: query.offset,
        count: rows.length,
      },
    });
  });

  /**
   * POST /api/v1/conversations/:conversationId/messages — Send outbound message
   */
  app.post('/:conversationId/messages', async (request: FastifyRequest<{ Params: { conversationId: string } }>, reply: FastifyReply) => {
    const { conversationId } = request.params;
    const parsed = sendMessageSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: 'Invalid message payload', details: parsed.error.format() });
    }

    const { text, type, media, quotedMessageId } = parsed.data;

    if (!text && !media) {
      return reply.status(400).send({ success: false, error: 'Message must contain either text or media' });
    }

    // 1. Fetch Conversation and Contact
    const [conv] = await db
      .select({
        id: conversations.id,
        companyId: conversations.companyId,
        whatsappAccountId: conversations.whatsappAccountId,
        contactId: conversations.contactId,
        contactName: contacts.name,
        contactPhone: contacts.phoneNumber,
        contactJid: contacts.whatsappJid,
      })
      .from(conversations)
      .innerJoin(contacts, eq(conversations.contactId, contacts.id))
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conv) {
      return reply.status(404).send({ success: false, error: 'Conversation not found' });
    }

    const userCompanyId = request.user?.companyId;
    if (userCompanyId && conv.companyId !== userCompanyId && !request.user?.isSuperAdmin) {
      return reply.status(404).send({ success: false, error: 'Conversation not found' });
    }

    // 2. Resolve WhatsApp Account to send from
    let accountId = conv.whatsappAccountId;
    if (!accountId) {
      // Pick first connected or first available account for this company
      const defaultAccountQuery = db.select().from(whatsappAccounts);
      const [defaultAccount] = conv.companyId
        ? await defaultAccountQuery.where(eq(whatsappAccounts.companyId, conv.companyId)).limit(1)
        : await defaultAccountQuery.limit(1);

      if (!defaultAccount) {
        return reply.status(400).send({ success: false, error: 'No WhatsApp account configured for this company' });
      }
      accountId = defaultAccount.id;
    }

    // Target JID
    const rawNumber = conv.contactPhone.replace(/\D/g, '');
    const toJid = conv.contactJid || `${rawNumber}@s.whatsapp.net`;

    // 3. Handle media upload if present
    let mediaUrl: string | undefined;
    let mediaBuffer: Buffer | null = null;
    let resolvedMimeType = media?.mimeType || 'application/octet-stream';
    let resolvedFileName = media?.fileName || `file_${Date.now()}`;

    const metadata: Record<string, any> = {};

    if (media && media.dataUrl) {
      try {
        const base64Data = media.dataUrl.includes(';base64,') ? media.dataUrl.split(';base64,')[1] : media.dataUrl;
        mediaBuffer = Buffer.from(base64Data, 'base64');

        const { storageKey, size } = await storage.upload(mediaBuffer, {
          fileName: resolvedFileName,
          mimeType: resolvedMimeType,
          directory: 'chat_media',
        });

        mediaUrl = `/api/v1/media/${encodeURIComponent(storageKey)}`;
        metadata.url = mediaUrl;
        metadata.fileName = resolvedFileName;
        metadata.mimeType = resolvedMimeType;
        metadata.fileLength = size;
        if (media.caption) metadata.caption = media.caption;
      } catch (err: any) {
        logger.error({ err }, 'Failed to save outgoing media file');
        return reply.status(500).send({ success: false, error: 'Failed to save media file' });
      }
    }

    // 4. Save outgoing message to DB
    const senderUserId = request.user?.id || null;
    const messageText = text || (type !== 'text' ? `[${type}]` : '');
    let whatsappMessageId = `crm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const [savedMsg] = await db
      .insert(messages)
      .values({
        conversationId,
        contactId: conv.contactId,
        senderType: 'employee',
        senderUserId,
        direction: 'outgoing',
        type,
        text: messageText,
        whatsappMessageId,
        quotedMessageId: quotedMessageId || null,
        status: 'pending',
        metadata,
      })
      .returning();

    // 5. Send via WhatsApp Provider (local) or Queue (online)
    const sendResult = await OutboundQueueService.sendMessage({
      companyId: conv.companyId,
      accountId,
      conversationId,
      messageId: savedMsg.id,
      toJid,
      type,
      text,
      mediaBuffer,
      mediaUrl,
      mediaMime: resolvedMimeType,
      mediaFilename: resolvedFileName,
      caption: text || media?.caption,
      quotedMessageId,
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

    // 6. Update Conversation last message
    await db
      .update(conversations)
      .set({
        lastMessageText: messageText,
        lastMessageAt: new Date(),
        status: 'open',
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId));

    // 7. Broadcast via WebSocket
    const broadcastPayload = {
      ...savedMsg,
      status: finalStatus,
      whatsappMessageId,
      senderUserName: request.user?.name || 'Staff',
      conversationId,
    };

    wsHub.broadcast('whatsapp.message', broadcastPayload);
    wsHub.broadcast('conversation.updated', {
      conversationId,
      lastMessageText: messageText,
      lastMessageAt: savedMsg.createdAt,
    });

    logger.info({ messageId: savedMsg.id, conversationId, toJid, status: finalStatus }, 'Outbound message processed');

    return reply.status(201).send({
      success: true,
      data: broadcastPayload,
    });
  });

  /**
   * POST & PATCH /api/v1/conversations/:conversationId/notes — Add internal team note
   */
  const notesHandler = async (request: FastifyRequest<{ Params: { conversationId: string } }>, reply: FastifyReply) => {
    const { conversationId } = request.params;
    const raw = (request.body as any) || {};
    const noteText = (raw.text || raw.notes || '').trim();

    if (!noteText) {
      return reply.status(400).send({ success: false, error: 'Note text is required' });
    }

    const [conv] = await db
      .select({ id: conversations.id, contactId: conversations.contactId, companyId: conversations.companyId })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conv || (request.user?.companyId && conv.companyId !== request.user.companyId && !request.user?.isSuperAdmin)) {
      return reply.status(404).send({ success: false, error: 'Conversation not found' });
    }

    const senderUserId = request.user?.id || null;
    const authorName = request.user?.name || 'فريق العمل';

    const [savedMsg] = await db
      .insert(messages)
      .values({
        conversationId,
        contactId: conv.contactId,
        senderType: 'employee',
        senderUserId,
        direction: 'outgoing',
        type: 'system',
        text: noteText,
        status: 'sent',
        metadata: {
          isInternalNote: true,
          authorName,
        },
      })
      .returning();

    const broadcastPayload = {
      ...savedMsg,
      senderUserName: authorName,
      conversationId,
    };

    wsHub.broadcast('whatsapp.message', broadcastPayload);

    return reply.status(201).send({
      success: true,
      data: broadcastPayload,
    });
  };

  app.post('/:conversationId/notes', notesHandler);
  app.patch('/:conversationId/notes', notesHandler);
}


