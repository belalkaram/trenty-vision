import { db } from '../../database/client';
import * as schema from '../../database/schema/index';
import { eq, and, lte, or, isNull } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import { wsHub } from '../../websocket/ws.hub';
import { OutboundQueueService } from '../../services/outbound-queue.service';

export class ReminderScheduler {
  private static timer: NodeJS.Timeout | null = null;
  private static isChecking = false;

  /**
   * Start periodic check (runs every 30 seconds)
   */
  static start(intervalMs: number = 30000): void {
    if (this.timer) {
      clearInterval(this.timer);
    }

    logger.info({ intervalMs }, 'ReminderScheduler started');
    this.timer = setInterval(() => {
      this.checkDueReminders().catch((err) => {
        logger.error({ err }, 'Error checking due reminders');
      });
      this.checkInactiveConversations().catch((err) => {
        logger.error({ err }, 'Error checking inactive conversations');
      });
    }, intervalMs);

    // Initial check on boot
    this.checkDueReminders().catch((err) => {
      logger.error({ err }, 'Error in initial reminder check');
    });
    this.checkInactiveConversations().catch((err) => {
      logger.error({ err }, 'Error in initial inactive conversations check');
    });
  }

  /**
   * Stop the scheduler
   */
  static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('ReminderScheduler stopped');
    }
  }

  /**
   * Check and trigger all due reminders
   */
  static async checkDueReminders(): Promise<number> {
    if (this.isChecking) return 0;
    this.isChecking = true;

    try {
      const now = new Date();
      // Find all pending reminders where dueAt <= now
      const dueReminders = await db.query.reminders.findMany({
        where: and(
          eq(schema.reminders.status, 'pending'),
          lte(schema.reminders.dueAt, now)
        ),
        with: {
          // optionally include relations
        },
      });

      if (dueReminders.length === 0) {
        return 0;
      }

      logger.info({ count: dueReminders.length }, 'Triggering due reminders');

      for (const reminder of dueReminders) {
        // Mark as completed
        await db
          .update(schema.reminders)
          .set({
            status: 'completed',
            completedAt: now,
            updatedAt: now,
          })
          .where(eq(schema.reminders.id, reminder.id));

        // Create in-app notification entry
        try {
          await db.insert(schema.notifications).values({
            userId: reminder.assignedUserId,
            title: `تذكير متابعة: ${reminder.title}`,
            message: reminder.note || `حان موعد متابعة المحادثة المحددة`,
            type: 'reminder',
            data: {
              reminderId: reminder.id,
              conversationId: reminder.conversationId,
              leadId: reminder.leadId,
            },
          });
        } catch (notifErr) {
          logger.warn({ notifErr, reminderId: reminder.id }, 'Could not record notification row');
        }

        // Broadcast over WebSocket to all active agents/supervisors
        wsHub.broadcast('reminder.due', {
          id: reminder.id,
          conversationId: reminder.conversationId,
          leadId: reminder.leadId,
          assignedUserId: reminder.assignedUserId,
          title: reminder.title,
          note: reminder.note,
          dueAt: reminder.dueAt.toISOString(),
        });

        // 4. Send WhatsApp Notification to the assigned employee
        try {
          const [emp] = await db
            .select({
              id: schema.employees.id,
              whatsappNumber: schema.employees.whatsappNumber,
              name: schema.users.name,
            })
            .from(schema.employees)
            .leftJoin(schema.users, eq(schema.employees.userId, schema.users.id))
            .where(eq(schema.employees.userId, reminder.assignedUserId))
            .limit(1);

          if (emp?.whatsappNumber) {
            let contactInfo: { name?: string | null; phoneNumber?: string | null } | null = null;
            if (reminder.conversationId) {
              const [conv] = await db
                .select({
                  contactName: schema.contacts.name,
                  contactPhone: schema.contacts.phoneNumber,
                })
                .from(schema.conversations)
                .leftJoin(schema.contacts, eq(schema.conversations.contactId, schema.contacts.id))
                .where(eq(schema.conversations.id, reminder.conversationId))
                .limit(1);
              if (conv) contactInfo = { name: conv.contactName, phoneNumber: conv.contactPhone };
            } else if (reminder.leadId) {
              const [cont] = await db
                .select({
                  contactName: schema.contacts.name,
                  contactPhone: schema.contacts.phoneNumber,
                })
                .from(schema.leads)
                .innerJoin(schema.contacts, eq(schema.leads.contactId, schema.contacts.id))
                .where(eq(schema.leads.id, reminder.leadId))
                .limit(1);
              if (cont) contactInfo = { name: cont.contactName, phoneNumber: cont.contactPhone };
            }

            const clientDigits = contactInfo?.phoneNumber?.replace(/\D/g, '') || '';
            const waLink = clientDigits ? `https://wa.me/${clientDigits}` : '';
            const clientDisplay = contactInfo?.name && contactInfo.name !== contactInfo.phoneNumber
              ? `${contactInfo.name} (${contactInfo.phoneNumber})`
              : contactInfo?.phoneNumber || '';

            const alertMsg = [
              `🔔 *تنبيه: حان موعد التذكير والمتابعة!*`,
              `━━━━━━━━━━━━━━━━`,
              `مرحباً *${emp.name || 'عزيزي الموظف'}*، لديك تذكير مستحق الآن:`,
              `📌 *العنوان:* ${reminder.title}`,
              clientDisplay ? `👤 *العميل:* ${clientDisplay}` : '',
              reminder.note ? `📝 *التفاصيل:* ${reminder.note}` : '',
              waLink ? `👉 *محادثة العميل مباشرة:* ${waLink}` : '',
              `⏰ *الوقت:* ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`,
              `━━━━━━━━━━━━━━━━`,
              `مرسلة آلياً عبر نظام إدارة واتساب CRM.`
            ].filter(Boolean).join('\n');

            const [defaultAcc] = await db.select().from(schema.whatsappAccounts).limit(1);
            if (defaultAcc) {
              const cleanEmpDigits = emp.whatsappNumber.replace(/\D/g, '');
              const empJid = `${cleanEmpDigits}@s.whatsapp.net`;
              await OutboundQueueService.sendMessage({
                companyId: defaultAcc.companyId,
                accountId: defaultAcc.id,
                conversationId: reminder.conversationId || undefined,
                toJid: empJid,
                type: 'text',
                text: alertMsg,
                priority: 1,
              });
              logger.info(
                { reminderId: reminder.id, employeePhone: emp.whatsappNumber, title: reminder.title },
                'Successfully sent due reminder alert via WhatsApp to employee'
              );
            }
          }
        } catch (waErr: any) {
          logger.warn({ waErr: waErr?.message, reminderId: reminder.id }, 'Could not dispatch WhatsApp alert for due reminder');
        }
      }

      return dueReminders.length;
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Automatically close conversations that have had no messages for more than 5 minutes
   */
  static async checkInactiveConversations(): Promise<number> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      // Find open conversations with no activity in the last 5 minutes
      const inactiveConvs = await db
        .update(schema.conversations)
        .set({
          status: 'closed',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.conversations.status, 'open'),
            or(
              lte(schema.conversations.lastMessageAt, fiveMinutesAgo),
              and(
                isNull(schema.conversations.lastMessageAt),
                lte(schema.conversations.createdAt, fiveMinutesAgo)
              )
            )
          )
        )
        .returning({ id: schema.conversations.id });

      if (inactiveConvs.length > 0) {
        logger.info(
          { count: inactiveConvs.length, ids: inactiveConvs.map((c) => c.id) },
          'Marked inactive conversations as closed (5-minute inactivity rule)'
        );
        wsHub.broadcast('conversations.inactivity_closed', {
          conversationIds: inactiveConvs.map((c) => c.id),
        });
      }

      return inactiveConvs.length;
    } catch (err: any) {
      logger.error({ err }, 'Error checking inactive conversations');
      return 0;
    }
  }
}

