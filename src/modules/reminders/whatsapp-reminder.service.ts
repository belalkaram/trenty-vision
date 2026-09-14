import { db } from '../../database/client';
import * as schema from '../../database/schema/index';
import { eq, or, ilike, and, desc } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import { wsHub } from '../../websocket/ws.hub';
import { validateAndFormatPhone } from '../../utils/phone.validator';
import { parseReminderCommand, isReminderMessage } from './whatsapp-reminder.parser';
import { sessionManager } from '../whatsapp/session.manager';
import type { BaileysProvider } from '../../providers/whatsapp/baileys.provider';

export class WhatsAppReminderService {
  /**
   * Checks if an incoming message is a reminder command from an authorized employee or admin.
   * If so, parses and records the reminder, links it to the conversation/client,
   * sends an instant confirmation to the employee on WhatsApp, and updates WebSocket clients.
   */
  static async handleIncomingReminder(params: {
    senderPhoneOrJid: string;
    messageText: string;
    quotedMessageText?: string | null;
    accountId: string;
    isFromMe?: boolean;
    remoteJid?: string;
    currentConversationId?: string;
    currentContact?: typeof schema.contacts.$inferSelect;
    provider?: BaileysProvider | null;
  }): Promise<{ handled: boolean; reason?: string; reminderId?: string }> {
    try {
      const {
        senderPhoneOrJid,
        messageText,
        quotedMessageText,
        accountId,
        isFromMe,
        remoteJid,
        currentConversationId,
        currentContact,
        provider,
      } = params;

      // 1. Quick check: Is this even a reminder message?
      if (!isReminderMessage(messageText, Boolean(quotedMessageText))) {
        return { handled: false };
      }

      // 2. Authenticate Sender: Is this sender a registered employee / admin in the CRM?
      const cleanSenderDigits = senderPhoneOrJid.split('@')[0].replace(/\D/g, '');

      // Find employee by WhatsApp number (clean digits matching)
      const allEmployees = await db
        .select({
          id: schema.employees.id,
          userId: schema.employees.userId,
          whatsappNumber: schema.employees.whatsappNumber,
          status: schema.employees.status,
          userName: schema.users.name,
          userEmail: schema.users.email,
        })
        .from(schema.employees)
        .leftJoin(schema.users, eq(schema.employees.userId, schema.users.id));

      let matchedEmployee = allEmployees.find((emp) => {
        if (!emp.whatsappNumber) return false;
        const empDigits = emp.whatsappNumber.replace(/\D/g, '');
        return empDigits === cleanSenderDigits || cleanSenderDigits.endsWith(empDigits) || empDigits.endsWith(cleanSenderDigits);
      });

      // If sender was an LID or senderPhoneOrJid didn't match, check currentContact phone
      if (!matchedEmployee && currentContact?.phoneNumber) {
        const contactDigits = currentContact.phoneNumber.replace(/\D/g, '');
        if (contactDigits) {
          matchedEmployee = allEmployees.find((emp) => {
            if (!emp.whatsappNumber) return false;
            const empDigits = emp.whatsappNumber.replace(/\D/g, '');
            return empDigits === contactDigits || contactDigits.endsWith(empDigits) || empDigits.endsWith(contactDigits);
          });
        }
      }

      // If still not matched, and remoteJid or sender is an LID, try to reverse lookup
      if (!matchedEmployee && (remoteJid?.endsWith('@lid') || senderPhoneOrJid.endsWith('@lid')) && provider) {
        const lid = remoteJid?.endsWith('@lid') ? remoteJid : senderPhoneOrJid;
        const resolvedPhone = await provider.getPhoneNumberForLid(lid);
        if (resolvedPhone) {
          const resDigits = resolvedPhone.replace(/\D/g, '');
          matchedEmployee = allEmployees.find((emp) => {
            if (!emp.whatsappNumber) return false;
            const empDigits = emp.whatsappNumber.replace(/\D/g, '');
            return empDigits === resDigits || resDigits.endsWith(empDigits) || empDigits.endsWith(resDigits);
          });
        }
      }

      // If sent from the connected WhatsApp account (isFromMe or sender is connected account phone)
      if (!matchedEmployee) {
        const [acc] = await db
          .select()
          .from(schema.whatsappAccounts)
          .where(eq(schema.whatsappAccounts.id, accountId))
          .limit(1);

        const isAccountOwner = isFromMe || (acc?.phoneNumber && (
          cleanSenderDigits === acc.phoneNumber.replace(/\D/g, '') ||
          cleanSenderDigits.endsWith(acc.phoneNumber.replace(/\D/g, '')) ||
          acc.phoneNumber.replace(/\D/g, '').endsWith(cleanSenderDigits)
        ));

        if (isAccountOwner && acc) {
          // Find first employee in the company
          const [companyEmp] = await db
            .select({
              id: schema.employees.id,
              userId: schema.employees.userId,
              whatsappNumber: schema.employees.whatsappNumber,
              status: schema.employees.status,
              userName: schema.users.name,
              userEmail: schema.users.email,
            })
            .from(schema.employees)
            .leftJoin(schema.users, eq(schema.employees.userId, schema.users.id))
            .where(eq(schema.employees.companyId, acc.companyId))
            .limit(1);

          if (companyEmp) {
            matchedEmployee = companyEmp;
          } else {
            // Fallback to first user in database
            const [firstUser] = await db
              .select({
                id: schema.users.id,
                name: schema.users.name,
                email: schema.users.email,
              })
              .from(schema.users)
              .limit(1);

            if (firstUser) {
              matchedEmployee = {
                id: firstUser.id,
                userId: firstUser.id,
                whatsappNumber: acc.phoneNumber,
                status: 'active',
                userName: firstUser.name,
                userEmail: firstUser.email,
              };
            }
          }
        }
      }

      if (!matchedEmployee || matchedEmployee.status === 'inactive') {
        // Not a registered employee or admin, proceed as normal message
        return { handled: false, reason: 'sender_not_an_employee' };
      }

      // 3. Parse Reminder Command
      const parsed = parseReminderCommand(messageText, quotedMessageText || undefined);
      if (!parsed) {
        return { handled: false, reason: 'parse_failed' };
      }

      // 4. Resolve Target Client and Conversation
      let targetContact: typeof schema.contacts.$inferSelect | undefined = currentContact;
      let targetConversation: typeof schema.conversations.$inferSelect | undefined;

      if (currentConversationId) {
        const [curConv] = await db
          .select()
          .from(schema.conversations)
          .where(eq(schema.conversations.id, currentConversationId))
          .limit(1);
        if (curConv) targetConversation = curConv;
      }

      // If an explicit client phone was parsed from template or quoted message, prioritize it
      if (parsed.clientPhone) {
        const cleanCustDigits = parsed.clientPhone.replace(/\D/g, '');
        const foundContacts = await db
          .select()
          .from(schema.contacts)
          .where(ilike(schema.contacts.phoneNumber, `%${cleanCustDigits.slice(-9)}%`))
          .limit(1);

        if (foundContacts.length > 0) {
          targetContact = foundContacts[0];
          // Find open or most recent conversation for this contact
          const foundConversations = await db
            .select()
            .from(schema.conversations)
            .where(eq(schema.conversations.contactId, targetContact.id))
            .orderBy(desc(schema.conversations.updatedAt))
            .limit(1);

          if (foundConversations.length > 0) {
            targetConversation = foundConversations[0];
          }
        }
      }

      // 4.5 Resolve Lead record if exists for this contact
      let targetLeadId: string | null = null;
      if (targetContact) {
        const [lead] = await db
          .select({ id: schema.leads.id })
          .from(schema.leads)
          .where(eq(schema.leads.contactId, targetContact.id))
          .limit(1);
        if (lead) {
          targetLeadId = lead.id;
        }
      }

      // 5. Store Reminder in database
      const [newReminder] = await db
        .insert(schema.reminders)
        .values({
          assignedUserId: matchedEmployee.userId,
          conversationId: targetConversation ? targetConversation.id : null,
          leadId: targetLeadId,
          title: parsed.title,
          note: parsed.note || null,
          dueAt: parsed.dueAt,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      logger.info(
        {
          reminderId: newReminder.id,
          employeeId: matchedEmployee.id,
          employeeName: matchedEmployee.userName,
          clientPhone: parsed.clientPhone || targetContact?.phoneNumber,
          dueAt: parsed.dueAt.toISOString(),
          title: parsed.title,
        },
        'WhatsApp in-chat reminder successfully created and recorded'
      );

      // 6. Broadcast Real-time Event to Web UI
      const broadcastPayload = {
        ...newReminder,
        dueAt: newReminder.dueAt.toISOString(),
        assignedUserName: matchedEmployee.userName,
        contactName: targetContact?.name || null,
        contactPhone: targetContact?.phoneNumber || parsed.clientPhone || null,
      };

      wsHub.broadcast('reminder.created', broadcastPayload);
      wsHub.broadcast('reminders.update', broadcastPayload);

      // 7. Dispatch Instant WhatsApp Confirmation
      let activeProvider = provider;
      if (!activeProvider || activeProvider.connectionState?.status !== 'connected') {
        for (const [, p] of sessionManager.getActiveSessions()) {
          if (p.connectionState?.status === 'connected') {
            activeProvider = p;
            break;
          }
        }
      }

      if (activeProvider && activeProvider.connectionState?.status === 'connected') {
        const clientDisplayName = targetContact?.name && targetContact.name !== targetContact.phoneNumber
          ? `${targetContact.name} (${targetContact.phoneNumber})`
          : targetContact?.phoneNumber || parsed.clientPhone || 'عام (مربوط بالمحادثة الحالية)';

        const formattedDateString = parsed.dueAt.toLocaleString('ar-EG', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        const confirmationMessage = [
          `✅ *تم حفظ التذكير في النظام بنجاح!*`,
          `━━━━━━━━━━━━━━━━`,
          `📌 *العنوان:* ${parsed.title}`,
          `👤 *العميل:* ${clientDisplayName}`,
          `⏰ *موعد التنبيه:* ${formattedDateString}`,
          parsed.note ? `📝 *التفاصيل:* ${parsed.note}` : '',
          `━━━━━━━━━━━━━━━━`,
          `🔔 سيقوم النظام بتنبيهك تلقائياً على الواتساب فور حلول الموعد.`
        ].filter(Boolean).join('\n');

        const replyJid = remoteJid || `${cleanSenderDigits}@s.whatsapp.net`;

        await activeProvider.sendText(replyJid, confirmationMessage);
        logger.info({ replyJid, reminderId: newReminder.id }, 'Dispatched WhatsApp confirmation for in-chat reminder');
      }

      return {
        handled: true,
        reminderId: newReminder.id,
      };
    } catch (err: any) {
      logger.error(
        { err: err?.message, stack: err?.stack, sender: params.senderPhoneOrJid },
        'Error handling in-chat WhatsApp reminder command'
      );
      return { handled: false, reason: err?.message };
    }
  }
}
