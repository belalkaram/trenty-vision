import { eq, and, or } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  contacts,
  conversations,
  messages,
  whatsappAccounts,
  employees,
  users,
} from '../../database/schema/index';
import { wsHub } from '../../websocket/ws.hub';
import { logger } from '../../utils/logger';
import { validateAndFormatPhone } from '../../utils/phone.validator';
import { sessionManager } from './session.manager';
import { jidNormalizedUser, isLidUser } from '@whiskeysockets/baileys';
import { AssignmentService } from '../automations/assignment.service';
import { WhatsAppReminderService } from '../reminders/whatsapp-reminder.service';
import { LandingSyncService } from '../../services/landing-sync.service';

/**
 * Extracts message content details from a Baileys message object.
 */
function extractMessageContent(msg: any): {
  type: string;
  text: string | null;
  mediaId: string | null;
  metadata: Record<string, any>;
} {
  const message = msg.message;
  if (!message) return { type: 'text', text: null, mediaId: null, metadata: {} };

  if (message.conversation) {
    return { type: 'text', text: message.conversation, mediaId: null, metadata: {} };
  }
  if (message.extendedTextMessage) {
    return {
      type: 'text',
      text: message.extendedTextMessage.text || '',
      mediaId: null,
      metadata: {
        contextInfo: message.extendedTextMessage.contextInfo ? {
          stanzaId: message.extendedTextMessage.contextInfo.stanzaId,
          participant: message.extendedTextMessage.contextInfo.participant,
        } : undefined,
      },
    };
  }
  if (message.imageMessage) {
    return {
      type: 'image',
      text: message.imageMessage.caption || null,
      mediaId: null,
      metadata: {
        mimetype: message.imageMessage.mimetype,
        fileLength: message.imageMessage.fileLength,
        width: message.imageMessage.width,
        height: message.imageMessage.height,
      },
    };
  }
  if (message.videoMessage) {
    return {
      type: 'video',
      text: message.videoMessage.caption || null,
      mediaId: null,
      metadata: {
        mimetype: message.videoMessage.mimetype,
        fileLength: message.videoMessage.fileLength,
        seconds: message.videoMessage.seconds,
      },
    };
  }
  if (message.audioMessage) {
    const isVoiceNote = message.audioMessage.ptt === true;
    return {
      type: isVoiceNote ? 'voice_note' : 'audio',
      text: null,
      mediaId: null,
      metadata: {
        mimetype: message.audioMessage.mimetype,
        fileLength: message.audioMessage.fileLength,
        seconds: message.audioMessage.seconds,
        ptt: message.audioMessage.ptt,
      },
    };
  }
  if (message.documentMessage) {
    return {
      type: 'document',
      text: message.documentMessage.caption || null,
      mediaId: null,
      metadata: {
        mimetype: message.documentMessage.mimetype,
        fileName: message.documentMessage.fileName,
        fileLength: message.documentMessage.fileLength,
      },
    };
  }
  if (message.locationMessage) {
    return {
      type: 'location',
      text: message.locationMessage.name || null,
      mediaId: null,
      metadata: {
        latitude: message.locationMessage.degreesLatitude,
        longitude: message.locationMessage.degreesLongitude,
        name: message.locationMessage.name,
        address: message.locationMessage.address,
      },
    };
  }
  if (message.contactMessage || message.contactsArrayMessage) {
    return { type: 'contact', text: null, mediaId: null, metadata: { contact: message.contactMessage || message.contactsArrayMessage } };
  }
  if (message.stickerMessage) {
    return { type: 'sticker', text: null, mediaId: null, metadata: { mimetype: message.stickerMessage.mimetype } };
  }

  return { type: 'text', text: null, mediaId: null, metadata: {} };
}

// Concurrency lock: sequential execution queue per sender to eliminate race conditions
const senderQueues = new Map<string, Promise<any>>();

function runInSenderSequence<T>(senderKey: string, task: () => Promise<T>): Promise<T> {
  const current = senderQueues.get(senderKey) || Promise.resolve();
  const next = current.then(task, task);
  senderQueues.set(senderKey, next);
  next.finally(() => {
    if (senderQueues.get(senderKey) === next) {
      senderQueues.delete(senderKey);
    }
  });
  return next;
}

/**
 * Forwards an incoming customer WhatsApp message directly to the assigned employee's personal WhatsApp number.
 * Built with full anti-loop protection, E.164 normalization, and safe error handling.
 */
export async function forwardInboundMessageToEmployee(params: {
  employeeId: string;
  conversationId: string;
  contact: { id: string; name: string; phoneNumber: string };
  message: { text: string | null; type: string; mediaId?: string | null; metadata?: any };
  accountId: string;
  accountPhoneNumber?: string | null;
  isNewAssignment?: boolean;
}): Promise<{ success: boolean; reason?: string }> {
  try {
    const { employeeId, conversationId, contact, message, accountId, accountPhoneNumber, isNewAssignment } = params;

    // 1. Anti-Loop: Check if incoming message is an automated CRM notification banner
    const rawText = (message.text || '').trim();
    if (
      rawText.startsWith('🔔 *إشعار') ||
      rawText.startsWith('📩 *رسالة واردة') ||
      rawText.startsWith('🔔 *عميل جديد') ||
      rawText.includes('لوحة تحكم CRM') ||
      rawText.includes('مرسلة آلياً عبر نظام إدارة واتساب CRM')
    ) {
      logger.info({ conversationId }, 'Skipping forward: Message is an internal CRM notification banner (anti-loop)');
      return { success: false, reason: 'anti_loop_banner' };
    }

    // 2. Query employee record from DB
    const [emp] = await db
      .select({
        id: employees.id,
        whatsappNumber: employees.whatsappNumber,
        name: users.name,
        email: users.email,
        status: employees.status,
      })
      .from(employees)
      .leftJoin(users, eq(employees.userId, users.id))
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (!emp) {
      logger.warn({ employeeId, conversationId }, 'Assigned employee record not found in database');
      return { success: false, reason: 'employee_not_found' };
    }

    const employeeName = emp.name || 'الموظف المسند';

    if (emp.status === 'inactive') {
      logger.info({ employeeId, name: employeeName }, 'Employee is inactive, skipping WhatsApp forward');
      return { success: false, reason: 'employee_inactive' };
    }

    const rawEmpPhone = (emp.whatsappNumber || '').trim();
    if (!rawEmpPhone) {
      logger.info({ employeeId, name: employeeName }, 'Employee has no personal WhatsApp number configured in CRM');
      return { success: false, reason: 'no_phone_configured' };
    }

    // 3. Format and validate employee phone to E.164
    const phoneValidation = validateAndFormatPhone(rawEmpPhone);
    const cleanEmpDigits = phoneValidation.digitsOnly || rawEmpPhone.replace(/\D/g, '');

    if (!cleanEmpDigits || cleanEmpDigits.length < 8) {
      logger.warn({ employeeId, rawEmpPhone }, 'Employee WhatsApp number is invalid or too short');
      return { success: false, reason: 'invalid_employee_phone' };
    }

    // 4. Anti-Loop: Prevent sending to the connected WhatsApp account itself
    const cleanAccountDigits = (accountPhoneNumber || '').replace(/\D/g, '');
    if (cleanAccountDigits && cleanEmpDigits === cleanAccountDigits) {
      logger.warn(
        { cleanEmpDigits, cleanAccountDigits },
        'Employee WhatsApp number is the same as the connected system WhatsApp account (skipping to prevent self-loop)'
      );
      return { success: false, reason: 'same_as_system_account' };
    }

    // 5. Get active WhatsApp provider (resilient multi-strategy lookup)
    let provider = accountId ? sessionManager.getProvider(accountId) : null;
    if (!provider || provider.connectionState?.status !== 'connected') {
      // Look for any connected provider in active sessions
      for (const [, p] of sessionManager.getActiveSessions()) {
        if (p.connectionState?.status === 'connected') {
          provider = p;
          break;
        }
      }
    }

    if (!provider || provider.connectionState?.status !== 'connected') {
      const [connectedAccount] = await db
        .select()
        .from(whatsappAccounts)
        .where(eq(whatsappAccounts.status, 'connected'))
        .limit(1);

      if (connectedAccount) {
        const candidate = sessionManager.getProvider(connectedAccount.id);
        if (candidate && candidate.connectionState?.status === 'connected') {
          provider = candidate;
        }
      }
    }

    if (!provider || provider.connectionState?.status !== 'connected') {
      logger.warn(
        { accountId, employeeId },
        'Cannot forward message to employee: No active WhatsApp socket provider is currently connected'
      );
      return { success: false, reason: 'no_active_provider' };
    }

    // 6. Build message content description
    let contentSnippet = message.text || '';
    if (message.type === 'image') {
      contentSnippet = message.text ? `📷 [صورة مرفقة]: ${message.text}` : '📷 [صورة مرفقة من العميل]';
    } else if (message.type === 'voice_note' || message.type === 'audio') {
      contentSnippet = '🎤 [رسالة صوتية واردة من العميل]';
    } else if (message.type === 'document') {
      const fileName = message.metadata?.fileName || '';
      contentSnippet = fileName ? `📄 [مستند مرفق]: ${fileName}` : '📄 [مستند مرفق من العميل]';
    } else if (message.type === 'video') {
      contentSnippet = message.text ? `🎥 [مقطع فيديو]: ${message.text}` : '🎥 [مقطع فيديو من العميل]';
    } else if (message.type === 'location') {
      contentSnippet = '📍 [موقع جغرافي مرسل من العميل]';
    } else if (!contentSnippet) {
      contentSnippet = `[رسالة من نوع: ${message.type}]`;
    }

    // 7. Direct wa.me link for the employee to chat directly with customer
    const cleanCustDigits = (contact.phoneNumber || '').replace(/\D/g, '');
    const directWaLink = cleanCustDigits ? `https://wa.me/${cleanCustDigits}` : '';
    const contactDisplayName = contact.name && contact.name !== contact.phoneNumber
      ? `${contact.name} (${contact.phoneNumber})`
      : contact.phoneNumber;

    const alertMessage = [
      isNewAssignment
        ? `🔔 *إشعار: عميل جديد مسند إليك*`
        : `📩 *رسالة واردة من عميل مسند إليك*`,
      `━━━━━━━━━━━━━━━━`,
      `مرحباً *${employeeName}*، وصلتك رسالة جديدة من العميل:`,
      `👤 *العميل:* ${contactDisplayName}`,
      `📱 *رقم العميل:* ${contact.phoneNumber}`,
      `💬 *الرسالة:*`,
      `${contentSnippet}`,
      ``,
      directWaLink ? `👉 *محادثة العميل المباشرة:* ${directWaLink}` : '',
      `⏰ *الوقت:* ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`,
      `━━━━━━━━━━━━━━━━`,
      `مرسلة آلياً عبر نظام إدارة واتساب CRM.`
    ].filter(Boolean).join('\n');

    // 8. Dispatch message to employee personal WhatsApp
    const empJid = `${cleanEmpDigits}@s.whatsapp.net`;
    const sentResult = await provider.sendText(empJid, alertMessage);

    logger.info(
      {
        conversationId,
        employeeId: emp.id,
        employeeName,
        employeePhone: phoneValidation.formatted || rawEmpPhone,
        customerPhone: contact.phoneNumber,
        whatsappMessageId: sentResult?.id,
      },
      'Successfully forwarded incoming customer message to assigned employee on WhatsApp'
    );

    return { success: true };
  } catch (forwardErr: any) {
    logger.error(
      {
        err: forwardErr?.message,
        stack: forwardErr?.stack,
        employeeId: params.employeeId,
        conversationId: params.conversationId,
      },
      'Error in forwardInboundMessageToEmployee: Exception caught and handled safely'
    );
    
    // Add a robust error fallback: insert a system note about the failure
    try {
      const fallbackReason = forwardErr?.message || 'unknown_error';
      await db.insert(messages).values({
        conversationId: params.conversationId,
        contactId: params.contact.id,
        senderType: 'system',
        direction: 'outgoing',
        type: 'system',
        text: `⚠️ تعذر إعادة توجيه الرسالة للموظف عبر الواتساب. السبب: ${fallbackReason}`,
        status: 'sent',
      });
      wsHub.broadcast('conversation_update', { id: params.conversationId });
    } catch (dbErr) {
      logger.error({ dbErr }, 'Failed to insert fallback system message for failed forward');
    }

    return { success: false, reason: forwardErr?.message || 'unknown_error' };
  }
}

/**
 * Processes an incoming WhatsApp message:
 * 1. Idempotency check — skip if whatsapp_message_id already exists
 * 2. Resolve normalized JID and real phone number (even if from WhatsApp LID)
 * 3. Resolve or create Contact
 * 4. Resolve or create Conversation (with strict Persistent Sticky Assignment)
 * 5. Auto-assign conversation if unassigned (respecting persistent sticky agent)
 * 6. Save Message
 * 7. Update Conversation with last message info
 * 8. Broadcast via WebSocket with full employee notification details
 * 9. Dispatch/Forward message to assigned employee on WhatsApp
 */
export async function handleInboundMessage(accountId: string, msg: any): Promise<void> {
  const whatsappMessageId = msg.key?.id;
  const remoteJid = msg.key?.remoteJid;

  if (!whatsappMessageId || !remoteJid) {
    logger.warn({ accountId }, 'Inbound message missing key data, skipping');
    return;
  }

  // Skip status broadcasts
  if (remoteJid === 'status@broadcast') return;

  const normalizedRemoteJid = jidNormalizedUser(remoteJid);

  // Serialize incoming messages per sender to completely eliminate race conditions
  return runInSenderSequence(normalizedRemoteJid, async () => {
    try {
      // 1. Idempotency check
      const existingMsg = await db
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.whatsappMessageId, whatsappMessageId))
        .limit(1);

      if (existingMsg.length > 0) {
        logger.debug({ whatsappMessageId }, 'Duplicate message, skipping');
        return;
      }

      let resolvedPhoneDigits: string | null = null;
      const isLid = isLidUser(remoteJid) || remoteJid.endsWith('@lid');

      // If it's a WhatsApp LID, resolve to actual phone number from reverse mapping
      if (isLid) {
        const provider = sessionManager.getProvider(accountId);
        if (provider) {
          resolvedPhoneDigits = await provider.getPhoneNumberForLid(remoteJid);
        }
      }

      if (!resolvedPhoneDigits) {
        resolvedPhoneDigits = normalizedRemoteJid.split('@')[0];
      }

      // Format phone number according to canonical E.164
      const phoneCheck = validateAndFormatPhone(resolvedPhoneDigits);
      const formattedPhone = phoneCheck.isValid
        ? phoneCheck.formatted
        : (resolvedPhoneDigits.startsWith('+') ? resolvedPhoneDigits : `+${resolvedPhoneDigits.replace(/\D/g, '')}`);

      // 2. Resolve or create Contact (robust match against phone, normalized JID, or raw JID)
      let contact = await db
        .select()
        .from(contacts)
        .where(
          or(
            eq(contacts.phoneNumber, formattedPhone),
            eq(contacts.whatsappJid, normalizedRemoteJid),
            eq(contacts.whatsappJid, remoteJid)
          )
        )
        .limit(1);

      // Get the company from the WhatsApp account
      const account = await db
        .select()
        .from(whatsappAccounts)
        .where(eq(whatsappAccounts.id, accountId))
        .limit(1);

      if (account.length === 0) {
        logger.error({ accountId }, 'WhatsApp account not found');
        return;
      }

      const companyId = account[0].companyId;

      if (contact.length === 0) {
        const displayName = (msg.pushName && msg.pushName.trim() !== '') ? msg.pushName.trim() : formattedPhone;

        const [newContact] = await db
          .insert(contacts)
          .values({
            companyId,
            name: displayName,
            phoneNumber: formattedPhone,
            whatsappJid: isLid ? normalizedRemoteJid : (phoneCheck.whatsappJid || normalizedRemoteJid),
            source: 'whatsapp',
            metadata: {
              whatsappPushName: msg.pushName || null,
              lid: isLid ? remoteJid : null,
              isSavedOnPhone: false,
            },
          })
          .returning();
        contact = [newContact];
        logger.info({ phoneNumber: formattedPhone, contactId: newContact.id, displayName }, 'Created new contact');
      } else {
        // Update contact JID or pushName if needed
        const existing = contact[0];
        const updates: Record<string, any> = { updatedAt: new Date() };

        if (!existing.whatsappJid || (existing.whatsappJid.endsWith('@lid') && !isLid)) {
          updates.whatsappJid = normalizedRemoteJid;
        }

        if (msg.pushName && (existing.name === existing.phoneNumber || !existing.name)) {
          updates.name = msg.pushName.trim();
        }

        const existingMeta = (existing.metadata || {}) as Record<string, any>;
        if (msg.pushName && existingMeta.whatsappPushName !== msg.pushName) {
          updates.metadata = { ...existingMeta, whatsappPushName: msg.pushName, lid: isLid ? remoteJid : existingMeta.lid };
        }

        if (Object.keys(updates).length > 1) {
          const [updated] = await db
            .update(contacts)
            .set(updates)
            .where(eq(contacts.id, existing.id))
            .returning();
          if (updated) contact = [updated];
        }
      }

      const isFromMe = Boolean(msg.key?.fromMe);

      // Automatically register incoming customer contact to Trinity Vision landing page (fire-and-forget, non-blocking)
      if (!isFromMe && !remoteJid.endsWith('@g.us') && !remoteJid.includes('@broadcast')) {
        LandingSyncService.syncContactAsync(contact[0]);
      }

      const contactId = contact[0].id;
      const contactMeta = (contact[0].metadata || {}) as Record<string, any>;

      // 3. Resolve or create Conversation
      let conversation = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.contactId, contactId),
            eq(conversations.whatsappAccountId, accountId)
          )
        )
        .limit(1);

      let isNewConversation = false;
      if (conversation.length === 0) {
        // Check if contact has persistent assigned employee from metadata or previous conversations
        const sticky = await AssignmentService.findStickyAgent(contactId);

        const [newConvo] = await db
          .insert(conversations)
          .values({
            companyId,
            contactId,
            whatsappAccountId: accountId,
            status: 'open',
            assignedEmployeeId: sticky?.employeeId || contactMeta.assignedEmployeeId || null,
            assignedStationId: sticky?.stationId || null,
            assignmentSource: sticky ? 'direct' : 'manual',
            lastMessageText: null,
            unreadCount: '1',
          })
          .returning();
        conversation = [newConvo];
        isNewConversation = true;
        logger.info({ contactId, conversationId: newConvo.id, assignedEmployeeId: newConvo.assignedEmployeeId }, 'Created new conversation');
      } else if (!conversation[0].assignedEmployeeId) {
        // Check if contact has persistent assigned employee from metadata or previous conversations
        const sticky = await AssignmentService.findStickyAgent(contactId);
        const persistentEmpId = sticky?.employeeId || (contactMeta.assignedEmployeeId as string) || null;
        if (persistentEmpId) {
          conversation[0].assignedEmployeeId = persistentEmpId;
          if (sticky?.stationId) conversation[0].assignedStationId = sticky.stationId;
          await db
            .update(conversations)
            .set({
              assignedEmployeeId: persistentEmpId,
              assignedStationId: sticky?.stationId || conversation[0].assignedStationId,
              updatedAt: new Date(),
            })
            .where(eq(conversations.id, conversation[0].id));
          logger.info(
            { conversationId: conversation[0].id, assignedEmployeeId: persistentEmpId },
            'Restored persistent assigned employee from contact metadata / sticky agent'
          );
        }
      }

      const conversationId = conversation[0].id;

      // 4. Extract message content
      const { type, text, mediaId, metadata } = extractMessageContent(msg);
      const messageTimestamp = msg.messageTimestamp
        ? new Date((typeof msg.messageTimestamp === 'number' ? msg.messageTimestamp : Number(msg.messageTimestamp)) * 1000)
        : new Date();

      // 4.5 In-Chat Reminder & Note Command Interception
      // If an employee or admin sends a reminder/note command (or quotes an alert), handle it as a CRM command
      const rawContextInfo =
        (msg.message as any)?.extendedTextMessage?.contextInfo ||
        (msg.message as any)?.ephemeralMessage?.message?.extendedTextMessage?.contextInfo ||
        (msg.message as any)?.viewOnceMessage?.message?.extendedTextMessage?.contextInfo ||
        (msg.message as any)?.imageMessage?.contextInfo;

      const rawQuotedStanzaId = rawContextInfo?.stanzaId || (metadata?.contextInfo as any)?.stanzaId;

      if (text) {
        const quotedMsg = rawContextInfo?.quotedMessage;
        let quotedText = '';
        if (quotedMsg && typeof quotedMsg === 'object') {
          quotedText =
            quotedMsg.conversation ||
            quotedMsg.extendedTextMessage?.text ||
            quotedMsg.imageMessage?.caption ||
            quotedMsg.videoMessage?.caption ||
            '';
        }

        // If quoted message text wasn't included inline by WhatsApp, fetch from DB using stanzaId
        if (!quotedText && rawQuotedStanzaId && typeof rawQuotedStanzaId === 'string') {
          const [prevMsg] = await db
            .select({ text: messages.text })
            .from(messages)
            .where(eq(messages.whatsappMessageId, rawQuotedStanzaId))
            .limit(1);
          if (prevMsg?.text) {
            quotedText = prevMsg.text;
          }
        }

        const reminderResult = await WhatsAppReminderService.handleIncomingReminder({
          senderPhoneOrJid: isFromMe
            ? (account[0]?.phoneNumber || formattedPhone || remoteJid)
            : (formattedPhone || contact[0]?.phoneNumber || remoteJid),
          messageText: text,
          quotedMessageText: quotedText || null,
          accountId,
          isFromMe,
          remoteJid,
          currentConversationId: conversationId,
          currentContact: contact[0],
          provider: sessionManager.getProvider(accountId) || null,
        });

        if (reminderResult.handled) {
          logger.info(
            { reminderId: reminderResult.reminderId, remoteJid, isFromMe },
            'WhatsApp message successfully processed as in-chat reminder command'
          );
          return;
        }
      }

      // 5. Save Message
      const senderType = isFromMe ? 'employee' : 'customer';
      const direction = isFromMe ? 'outgoing' : 'incoming';
      const msgStatus = isFromMe ? 'sent' : 'delivered';

      // Look up internal UUID of quoted message in DB if a message was quoted
      let quotedMessageInternalId: string | null = null;
      if (rawQuotedStanzaId && typeof rawQuotedStanzaId === 'string') {
        const [quotedRow] = await db
          .select({ id: messages.id })
          .from(messages)
          .where(eq(messages.whatsappMessageId, rawQuotedStanzaId))
          .limit(1);
        if (quotedRow) {
          quotedMessageInternalId = quotedRow.id;
        }
      }

      const [savedMessage] = await db
        .insert(messages)
        .values({
          whatsappMessageId,
          conversationId,
          contactId,
          senderType,
          direction,
          type: type as any,
          text,
          mediaId,
          quotedMessageId: quotedMessageInternalId,
          timestamp: messageTimestamp,
          status: msgStatus,
          metadata,
        })
        .returning();

      // 6. Update conversation with last message info
      const currentUnread = parseInt(conversation[0].unreadCount || '0', 10);
      const newUnreadCount = isFromMe ? conversation[0].unreadCount : String(currentUnread + 1);

      // Reopen conversation if closed, KEEPING assignedEmployeeId intact
      await db
        .update(conversations)
        .set({
          lastMessageText: text || `[${type}]`,
          lastMessageAt: messageTimestamp,
          unreadCount: newUnreadCount,
          status: 'open',
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversationId));

      // 7. Persistent Assignment Check:
      // If conversation is currently unassigned, run autoAssignConversation.
      // If it already has an assigned employee, autoAssignConversation will preserve it!
      let wasNewlyAssigned = false;
      if (!isFromMe && (!conversation[0].assignedEmployeeId || isNewConversation)) {
        try {
          const assignResult = await AssignmentService.autoAssignConversation(conversationId, {
            skipWhatsAppNotification: true,
          });
          if (assignResult?.assignedEmployeeId) {
            conversation[0].assignedEmployeeId = assignResult.assignedEmployeeId;
            conversation[0].assignedStationId = assignResult.assignedStationId;
            wasNewlyAssigned = true;
          }
        } catch (assignErr) {
          logger.error({ assignErr, conversationId }, 'Failed to auto-assign incoming conversation');
        }
      }

      // 8. Broadcast to WebSocket clients with full details
      const broadcastMsg = {
        ...savedMessage,
        conversationId,
        contactName: contact[0].name,
        contactPhone: contact[0].phoneNumber,
        assignedEmployeeId: conversation[0].assignedEmployeeId,
        assignedStationId: conversation[0].assignedStationId,
        whatsappAccount: account[0].displayName || account[0].phoneNumber,
      };

      wsHub.broadcast('message.created', {
        accountId,
        message: broadcastMsg,
      });
      wsHub.broadcast('whatsapp.message', broadcastMsg);
      wsHub.broadcast('new_message', {
        conversationId,
        message: broadcastMsg,
      });

      const convUpdatePayload = {
        id: conversationId,
        conversationId,
        lastMessageText: text || `[${type}]`,
        lastMessageAt: messageTimestamp,
        unreadCount: newUnreadCount,
        assignedEmployeeId: conversation[0].assignedEmployeeId,
        assignedStationId: conversation[0].assignedStationId,
        contact: {
          id: contact[0].id,
          name: contact[0].name,
          phoneNumber: contact[0].phoneNumber,
        },
      };

      wsHub.broadcast('conversation.updated', convUpdatePayload);
      wsHub.broadcast('conversation_update', convUpdatePayload);

      // Dedicated notification event for employee UI
      if (!isFromMe && conversation[0].assignedEmployeeId) {
        wsHub.broadcast('employee.notification', {
          type: 'new_inbound_message',
          assignedEmployeeId: conversation[0].assignedEmployeeId,
          conversationId,
          contactName: contact[0].name,
          contactPhone: contact[0].phoneNumber,
          messageText: text || `[${type}]`,
          timestamp: messageTimestamp,
          whatsappAccount: account[0].displayName || account[0].phoneNumber,
        });

        // 🚀 AUTOMATIC WHATSAPP FORWARDING TO ASSIGNED EMPLOYEE'S PERSONAL WHATSAPP
        // When a message arrives from a customer for an assigned conversation,
        // the connected WhatsApp account automatically forwards the message and client details
        // to the employee's personal WhatsApp number!
        forwardInboundMessageToEmployee({
          employeeId: conversation[0].assignedEmployeeId,
          conversationId,
          contact: {
            id: contact[0].id,
            name: contact[0].name,
            phoneNumber: contact[0].phoneNumber,
          },
          message: { text, type, mediaId, metadata },
          accountId,
          accountPhoneNumber: account[0].phoneNumber,
          isNewAssignment: isNewConversation || wasNewlyAssigned,
        }).catch((forwardErr: any) => {
          logger.error(
            {
              err: forwardErr?.message,
              stack: forwardErr?.stack,
              conversationId,
              employeeId: conversation[0].assignedEmployeeId,
            },
            'Background forward of inbound message to employee WhatsApp failed safely'
          );
        });
      }

      logger.info(
        { accountId, whatsappMessageId, conversationId, contactId, type, isFromMe, assignedEmployeeId: conversation[0].assignedEmployeeId },
        'WhatsApp message processed successfully'
      );

      // 9. Trigger Automation & Business Rules Engine only for incoming customer messages
      if (!isFromMe) {
        try {
          const { RulesEngine } = await import('../automations/rules.engine');
          await RulesEngine.processInboundMessage({
            conversationId,
            contactId,
            accountId,
            toJid: remoteJid,
            messageText: text || '',
          });
        } catch (autoErr) {
          logger.error({ autoErr, conversationId }, 'Error running automation rules on inbound message');
        }
      }
    } catch (err) {
      logger.error({ accountId, whatsappMessageId, err }, 'Failed to process inbound message');
    }
  });
}
