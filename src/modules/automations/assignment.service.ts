import { db } from '../../database/client';
import * as schema from '../../database/schema/index';
import { eq, and, desc, sql, ne } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import { wsHub } from '../../websocket/ws.hub';
import { OutboundQueueService } from '../../services/outbound-queue.service';
import { validateAndFormatPhone } from '../../utils/phone.validator';

export class AssignmentService {
  /**
   * Helper to retrieve a setting by key
   */
  static async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const setting = await db.query.settings.findFirst({
        where: eq(schema.settings.key, key),
      });
      if (setting && setting.value !== undefined && setting.value !== null) {
        return setting.value as T;
      }
    } catch (err) {
      logger.warn({ err, key }, 'Failed to fetch setting, using fallback default');
    }
    return defaultValue;
  }

  /**
   * Find sticky agent who previously interacted with this contact.
   * Checks contact metadata (persistent assignment) first, then previous conversations.
   */
  static async findStickyAgent(contactId: string): Promise<{ employeeId: string; stationId: string | null } | null> {
    // 1. Check contact metadata first for persistent assignedEmployeeId
    const [contact] = await db
      .select()
      .from(schema.contacts)
      .where(eq(schema.contacts.id, contactId))
      .limit(1);

    const metaAssignedEmp = (contact?.metadata as any)?.assignedEmployeeId;
    if (metaAssignedEmp) {
      const emp = await db.query.employees.findFirst({
        where: and(
          eq(schema.employees.id, metaAssignedEmp),
          ne(schema.employees.status, 'inactive')
        ),
      });

      if (emp) {
        const user = await db.query.users.findFirst({
          where: and(
            eq(schema.users.id, emp.userId),
            eq(schema.users.status, 'active')
          ),
        });

        if (user) {
          return {
            employeeId: emp.id,
            stationId: emp.stationId || null,
          };
        }
      }
    }

    // 2. Check previous conversations with assignedEmployeeId
    const prevConv = await db.query.conversations.findFirst({
      where: and(
        eq(schema.conversations.contactId, contactId),
        sql`${schema.conversations.assignedEmployeeId} IS NOT NULL`
      ),
      orderBy: [desc(schema.conversations.lastMessageAt), desc(schema.conversations.updatedAt)],
    });

    if (!prevConv || !prevConv.assignedEmployeeId) {
      return null;
    }

    // Verify employee is active
    const employee = await db.query.employees.findFirst({
      where: and(
        eq(schema.employees.id, prevConv.assignedEmployeeId),
        ne(schema.employees.status, 'inactive')
      ),
    });

    if (!employee) {
      return null;
    }

    const user = await db.query.users.findFirst({
      where: and(
        eq(schema.users.id, employee.userId),
        eq(schema.users.status, 'active')
      ),
    });

    if (!user) {
      return null;
    }

    return {
      employeeId: employee.id,
      stationId: employee.stationId || prevConv.assignedStationId,
    };
  }

  /**
   * Assign conversation using Round-Robin rotation among active employees.
   * If stationId provided, tries station first; falls back to all active company employees.
   */
  static async assignRoundRobin(stationId?: string | null, maxCapacity = 10): Promise<string | null> {
    // 1. Try within specific station if provided
    if (stationId) {
      const stationResult = await db.execute<{ id: string; open_chats: string }>(sql`
        SELECT e.id, COUNT(c.id) as open_chats
        FROM employees e
        INNER JOIN users u ON u.id = e.user_id
        LEFT JOIN (
          SELECT assigned_employee_id, MAX(assigned_at) as last_assigned_at
          FROM conversations
          WHERE assigned_employee_id IS NOT NULL
          GROUP BY assigned_employee_id
        ) conv ON conv.assigned_employee_id = e.id
        LEFT JOIN conversations c ON c.assigned_employee_id = e.id AND c.status = 'open'
        WHERE e.station_id = ${stationId}
          AND e.status != 'inactive'
          AND u.status = 'active'
        GROUP BY e.id, e.created_at, conv.last_assigned_at
        HAVING COUNT(c.id) < ${maxCapacity}
        ORDER BY conv.last_assigned_at ASC NULLS FIRST, e.created_at ASC
        LIMIT 1
      `);

      if (stationResult.rows && stationResult.rows.length > 0) {
        return stationResult.rows[0].id;
      }
    }

    // 2. Fallback: all active employees in the system under capacity limit
    const fallbackResult = await db.execute<{ id: string; open_chats: string }>(sql`
      SELECT e.id, COUNT(c.id) as open_chats
      FROM employees e
      INNER JOIN users u ON u.id = e.user_id
      LEFT JOIN (
        SELECT assigned_employee_id, MAX(assigned_at) as last_assigned_at
        FROM conversations
        WHERE assigned_employee_id IS NOT NULL
        GROUP BY assigned_employee_id
      ) conv ON conv.assigned_employee_id = e.id
      LEFT JOIN conversations c ON c.assigned_employee_id = e.id AND c.status = 'open'
      WHERE e.status != 'inactive'
        AND u.status = 'active'
      GROUP BY e.id, e.created_at, conv.last_assigned_at
      HAVING COUNT(c.id) < ${maxCapacity}
      ORDER BY conv.last_assigned_at ASC NULLS FIRST, e.created_at ASC
      LIMIT 1
    `);

    if (fallbackResult.rows && fallbackResult.rows.length > 0) {
      return fallbackResult.rows[0].id;
    }

    // 3. Last resort: any active employee regardless of capacity
    const anyEmployee = await db.execute<{ id: string }>(sql`
      SELECT e.id
      FROM employees e
      INNER JOIN users u ON u.id = e.user_id
      WHERE e.status != 'inactive'
        AND u.status = 'active'
      ORDER BY e.created_at ASC
      LIMIT 1
    `);

    return anyEmployee.rows?.[0]?.id || null;
  }

  /**
   * Assign conversation to the least busy active employee.
   * If stationId provided, tries station first; falls back to all active company employees.
   */
  static async assignLeastBusy(stationId?: string | null, maxCapacity = 10): Promise<string | null> {
    // 1. Try within specific station if provided
    if (stationId) {
      const stationResult = await db.execute<{ id: string }>(sql`
        SELECT e.id, COUNT(c.id) as open_chats
        FROM employees e
        INNER JOIN users u ON u.id = e.user_id
        LEFT JOIN conversations c ON c.assigned_employee_id = e.id AND c.status = 'open'
        WHERE e.station_id = ${stationId}
          AND e.status != 'inactive'
          AND u.status = 'active'
        GROUP BY e.id, e.created_at
        HAVING COUNT(c.id) < ${maxCapacity}
        ORDER BY open_chats ASC, e.created_at ASC
        LIMIT 1
      `);

      if (stationResult.rows && stationResult.rows.length > 0) {
        return stationResult.rows[0].id;
      }
    }

    // 2. Fallback: all active employees in the system
    const fallbackResult = await db.execute<{ id: string }>(sql`
      SELECT e.id, COUNT(c.id) as open_chats
      FROM employees e
      INNER JOIN users u ON u.id = e.user_id
      LEFT JOIN conversations c ON c.assigned_employee_id = e.id AND c.status = 'open'
      WHERE e.status != 'inactive'
        AND u.status = 'active'
      GROUP BY e.id, e.created_at
      HAVING COUNT(c.id) < ${maxCapacity}
      ORDER BY open_chats ASC, e.created_at ASC
      LIMIT 1
    `);

    if (fallbackResult.rows && fallbackResult.rows.length > 0) {
      return fallbackResult.rows[0].id;
    }

    // 3. Any active employee
    return this.assignRoundRobin(null, 999);
  }

  /**
   * Fallback to supervisor or administrator if no agents are available
   */
  static async fallbackToSupervisor(stationId?: string | null): Promise<string | null> {
    if (stationId) {
      const stationResult = await db.execute<{ id: string }>(sql`
        SELECT e.id
        FROM employees e
        INNER JOIN users u ON u.id = e.user_id
        INNER JOIN roles r ON r.id = u.role_id
        WHERE e.station_id = ${stationId}
          AND (r.name = 'adminstrator' OR r.name = 'admin' OR r.name = 'super_admin' OR r.name = 'supervisor')
          AND u.status = 'active'
        LIMIT 1
      `);

      if (stationResult.rows && stationResult.rows.length > 0) {
        return stationResult.rows[0].id;
      }
    }

    // System-wide admin / supervisor fallback
    const result = await db.execute<{ id: string }>(sql`
      SELECT e.id
      FROM employees e
      INNER JOIN users u ON u.id = e.user_id
      INNER JOIN roles r ON r.id = u.role_id
      WHERE (r.name = 'adminstrator' OR r.name = 'admin' OR r.name = 'super_admin' OR r.name = 'supervisor')
        AND u.status = 'active'
      LIMIT 1
    `);

    return result.rows?.[0]?.id || null;
  }

  /**
   * Orchestrate full automated assignment for a conversation
   */
  static async autoAssignConversation(
    conversationId: string,
    options?: {
      preferredStationId?: string;
      forceMode?: 'round_robin' | 'least_busy' | 'manual';
      skipWhatsAppNotification?: boolean;
    }
  ): Promise<{
    assignedEmployeeId: string | null;
    assignedStationId: string | null;
    assignmentSource: 'round_robin' | 'least_busy' | 'direct' | 'manual' | 'system';
  }> {
    // Check both snake_case and camelCase settings
    const assignmentEnabled =
      (await this.getSetting<any>('assignment_enabled', null)) ??
      (await this.getSetting<any>('autoAssignmentEnabled', true));

    if (!assignmentEnabled) {
      return {
        assignedEmployeeId: null,
        assignedStationId: options?.preferredStationId || null,
        assignmentSource: 'manual',
      };
    }

    const conversation = await db.query.conversations.findFirst({
      where: eq(schema.conversations.id, conversationId),
    });

    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    // 0. IDEMPOTENCY CHECK: If conversation already has an active assigned employee, KEEP IT!
    // Never reassign a customer who already has an assigned employee!
    if (conversation.assignedEmployeeId) {
      const existingEmp = await db.query.employees.findFirst({
        where: and(
          eq(schema.employees.id, conversation.assignedEmployeeId),
          ne(schema.employees.status, 'inactive')
        ),
      });

      if (existingEmp) {
        logger.info(
          { conversationId, employeeId: conversation.assignedEmployeeId },
          'Conversation already persistently assigned to active employee, keeping assignment'
        );
        return {
          assignedEmployeeId: conversation.assignedEmployeeId,
          assignedStationId: options?.preferredStationId || conversation.assignedStationId,
          assignmentSource: conversation.assignmentSource as any,
        };
      }
    }

    // Determine target station
    let targetStationId = options?.preferredStationId || conversation.assignedStationId;
    if (!targetStationId) {
      // Pick first active station if available
      const defaultStation = await db.query.stations.findFirst({
        where: eq(schema.stations.active, true),
      });
      targetStationId = defaultStation?.id || null;
    }

    // 1. Check Persistent Sticky Agent (from contact metadata or previous conversations)
    const sticky = await this.findStickyAgent(conversation.contactId);
    if (sticky) {
      logger.info(
        { conversationId, employeeId: sticky.employeeId, contactId: conversation.contactId },
        'Assigned via Persistent Sticky Agent'
      );

      const targetStation = sticky.stationId || targetStationId;
      await db
        .update(schema.conversations)
        .set({
          assignedEmployeeId: sticky.employeeId,
          assignedStationId: targetStation,
          assignmentSource: 'direct',
          assignedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.conversations.id, conversationId));

      // Persist permanently on contact metadata
      const [cont] = await db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.id, conversation.contactId))
        .limit(1);

      if (cont) {
        const meta = (cont.metadata || {}) as Record<string, any>;
        if (meta.assignedEmployeeId !== sticky.employeeId) {
          meta.assignedEmployeeId = sticky.employeeId;
          await db
            .update(schema.contacts)
            .set({ metadata: meta, updatedAt: new Date() })
            .where(eq(schema.contacts.id, cont.id));
        }
      }

      const eventPayload = {
        id: conversationId,
        conversationId,
        assignedEmployeeId: sticky.employeeId,
        assignedStationId: targetStation,
        assignmentSource: 'direct',
      };

      wsHub.broadcast('conversation.updated', eventPayload);
      wsHub.broadcast('conversation_update', eventPayload);
      wsHub.broadcast('assigned', {
        conversationId,
        assignedEmployeeId: sticky.employeeId,
      });

      // Dispatch WhatsApp alert to sticky employee if not skipped
      if (!options?.skipWhatsAppNotification) {
        AssignmentService.notifyEmployeeViaWhatsApp({
          employeeId: sticky.employeeId,
          contactId: conversation.contactId,
          conversationId,
          lastMessageText: conversation.lastMessageText,
          whatsappAccountId: conversation.whatsappAccountId,
          sourceDescription: 'تم توجيه المحادثة لك تلقائياً بصفتك الموظف المتابع لهذا العميل',
        }).catch((e) => logger.warn({ err: e?.message }, 'Failed sticky employee WhatsApp notification'));
      }

      return {
        assignedEmployeeId: sticky.employeeId,
        assignedStationId: targetStation,
        assignmentSource: 'direct',
      };
    }

    // 2. Read strategy from settings (supports both assignment_mode and routingStrategy)
    const strategy =
      options?.forceMode ||
      (await this.getSetting<any>('assignment_mode', null)) ||
      (await this.getSetting<any>('routingStrategy', 'round_robin'));

    const maxCapacity = Number(
      (await this.getSetting<any>('maxConcurrentChatsPerAgent', null)) || 10
    );

    if (strategy === 'manual') {
      if (targetStationId) {
        await db
          .update(schema.conversations)
          .set({
            assignedStationId: targetStationId,
            assignmentSource: 'manual',
            updatedAt: new Date(),
          })
          .where(eq(schema.conversations.id, conversationId));
      }

      return {
        assignedEmployeeId: null,
        assignedStationId: targetStationId,
        assignmentSource: 'manual',
      };
    }

    let chosenEmployeeId: string | null = null;
    let source: 'round_robin' | 'least_busy' | 'system' = 'round_robin';

    if (strategy === 'least_busy') {
      chosenEmployeeId = await this.assignLeastBusy(targetStationId, maxCapacity);
      source = 'least_busy';
    } else {
      chosenEmployeeId = await this.assignRoundRobin(targetStationId, maxCapacity);
      source = 'round_robin';
    }

    // 3. Fallback to supervisor/admin if still no agent found
    let supervisorId: string | null = null;
    if (!chosenEmployeeId) {
      supervisorId = await this.fallbackToSupervisor(targetStationId);
      if (supervisorId) {
        chosenEmployeeId = supervisorId;
        source = 'system';
        logger.info(
          { conversationId, targetStationId, supervisorId },
          'No station agents found, fell back to supervisor'
        );
      }
    }

    if (chosenEmployeeId) {
      // Find the chosen employee's station to keep data clean
      const emp = await db.query.employees.findFirst({
        where: eq(schema.employees.id, chosenEmployeeId),
      });
      const finalStationId = emp?.stationId || targetStationId;

      await db
        .update(schema.conversations)
        .set({
          assignedEmployeeId: chosenEmployeeId,
          assignedStationId: finalStationId,
          assignedSupervisorId: supervisorId,
          assignmentSource: source,
          assignedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.conversations.id, conversationId));

      // Persist chosen employee permanently on contact metadata so future chats always go to them
      const [cont] = await db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.id, conversation.contactId))
        .limit(1);

      if (cont) {
        const meta = (cont.metadata || {}) as Record<string, any>;
        meta.assignedEmployeeId = chosenEmployeeId;
        await db
          .update(schema.contacts)
          .set({ metadata: meta, updatedAt: new Date() })
          .where(eq(schema.contacts.id, cont.id));
      }

      logger.info(
        { conversationId, chosenEmployeeId, finalStationId, source },
        'Conversation successfully auto-assigned to employee and permanently bound to contact'
      );

      const eventPayload = {
        id: conversationId,
        conversationId,
        assignedEmployeeId: chosenEmployeeId,
        assignedStationId: finalStationId,
        assignmentSource: source,
      };

      wsHub.broadcast('conversation.updated', eventPayload);
      wsHub.broadcast('conversation_update', eventPayload);
      wsHub.broadcast('assigned', {
        conversationId,
        assignedEmployeeId: chosenEmployeeId,
      });

      // Dispatch WhatsApp alert to employee on their personal number if not skipped
      if (!options?.skipWhatsAppNotification) {
        AssignmentService.notifyEmployeeViaWhatsApp({
          employeeId: chosenEmployeeId,
          contactId: conversation.contactId,
          conversationId,
          lastMessageText: conversation.lastMessageText,
          whatsappAccountId: conversation.whatsappAccountId,
          sourceDescription: 'تم توزيع محادثة عميل جديدة إليك آلياً عبر نظام التوزيع',
        }).catch((e) => logger.warn({ err: e?.message }, 'Failed auto-assigned employee WhatsApp notification'));
      }

      return {
        assignedEmployeeId: chosenEmployeeId,
        assignedStationId: finalStationId,
        assignmentSource: source,
      };
    }

    // If still no employee, keep station assigned if available
    if (targetStationId) {
      await db
        .update(schema.conversations)
        .set({
          assignedStationId: targetStationId,
          assignmentSource: 'system',
          updatedAt: new Date(),
        })
        .where(eq(schema.conversations.id, conversationId));
    }

    return {
      assignedEmployeeId: null,
      assignedStationId: targetStationId,
      assignmentSource: 'system',
    };
  }

  /**
   * Send an instant WhatsApp notification to the employee's personal phone number
   * alerting them of an assigned client, with a direct wa.me link.
   */
  static async notifyEmployeeViaWhatsApp(params: {
    employeeId: string;
    contactId: string;
    conversationId: string;
    lastMessageText?: string | null;
    whatsappAccountId?: string | null;
    sourceDescription?: string;
  }): Promise<boolean> {
    try {
      const [emp] = await db
        .select({
          id: schema.employees.id,
          companyId: schema.employees.companyId,
          whatsappNumber: schema.employees.whatsappNumber,
          name: schema.users.name,
        })
        .from(schema.employees)
        .leftJoin(schema.users, eq(schema.employees.userId, schema.users.id))
        .where(eq(schema.employees.id, params.employeeId))
        .limit(1);

      const rawEmpPhone = (emp?.whatsappNumber || '').trim();
      if (!rawEmpPhone) {
        logger.info({ employeeId: params.employeeId }, 'Employee has no WhatsApp number configured, skipping alert');
        return false;
      }

      const phoneValidation = validateAndFormatPhone(rawEmpPhone);
      const cleanEmpDigits = phoneValidation.digitsOnly || rawEmpPhone.replace(/\D/g, '');
      if (!cleanEmpDigits || cleanEmpDigits.length < 8) {
        logger.warn({ employeeId: params.employeeId, raw: rawEmpPhone }, 'Invalid employee phone number for WhatsApp alert');
        return false;
      }

      const [contact] = await db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.id, params.contactId))
        .limit(1);

      const contactName = contact?.name || contact?.phoneNumber || 'عميل جديد';
      const contactPhone = contact?.phoneNumber || '';
      const cleanCustDigits = contactPhone.replace(/\D/g, '');
      const waLink = cleanCustDigits ? `https://wa.me/${cleanCustDigits}` : '';
      const lastMsg = params.lastMessageText || 'محادثة عميل جديدة واردة على النظام';
      const employeeName = emp.name || 'الموظف المسند';

      const alertMessage = [
        `🔔 *إشعار إسناد عميل جديد*`,
        `━━━━━━━━━━━━━━━━`,
        `مرحباً *${employeeName}*، ${params.sourceDescription || 'تم إسناد محادثة العميل التالية إليك'}:`,
        `👤 *العميل:* ${contactName}`,
        `📱 *رقم العميل:* ${contactPhone}`,
        lastMsg ? `💬 *آخر رسالة:* ${lastMsg}` : '',
        waLink ? `👉 *رابط محادثة واتساب المباشرة للعميل:* ${waLink}` : '',
        `⏰ *الوقت:* ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`,
        `━━━━━━━━━━━━━━━━`,
        `يرجى المتابعة والتواصل مع العميل عبر لوحة تحكم CRM.`
      ].filter(Boolean).join('\n');

      let accountId = params.whatsappAccountId;
      if (!accountId) {
        const [defaultAcc] = await db.select().from(schema.whatsappAccounts).limit(1);
        if (defaultAcc) accountId = defaultAcc.id;
      }

      if (!accountId || !emp.companyId) {
        logger.warn({ employeeId: params.employeeId }, 'Cannot dispatch assignment WhatsApp alert: No WhatsApp account or company available');
        return false;
      }

      const empJid = `${cleanEmpDigits}@s.whatsapp.net`;
      await OutboundQueueService.sendMessage({
        companyId: emp.companyId,
        accountId,
        conversationId: params.conversationId,
        toJid: empJid,
        type: 'text',
        text: alertMessage,
        priority: 1,
      });

      logger.info(
        { employeeId: emp.id, employeePhone: phoneValidation.formatted || rawEmpPhone, contactPhone },
        'Successfully dispatched WhatsApp assignment alert to employee personal number'
      );
      return true;
    } catch (err: any) {
      logger.error(
        { err: err?.message, stack: err?.stack, employeeId: params.employeeId, conversationId: params.conversationId },
        'Failed to dispatch WhatsApp assignment alert to employee'
      );
      return false;
    }
  }
}
