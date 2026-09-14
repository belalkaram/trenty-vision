import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { db } from '../../database/client';
import * as schema from '../../database/schema/index';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authenticate } from '../../middleware/auth.middleware';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { wsHub } from '../../websocket/ws.hub';
import { unifyBusinessHours } from '../../utils/business-hours.converter';

export const automationsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Apply auth middleware to all automation endpoints
  app.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/automations/settings
   * Retrieve automation, business hours, and bot configuration
   */
  const getSettingsHandler = async (request: any, reply: any) => {
    const allSettings = await db.query.settings.findMany();
    const settingsMap: Record<string, any> = {};

    for (const s of allSettings) {
      settingsMap[s.key] = s.value;
    }

    const welcomeEnabled = settingsMap['welcome_message_enabled'] ?? true;
    const welcomeTmpl =
      settingsMap['welcome_message_template'] ??
      'مرحباً بك في ترينتي فيجن (Trenty Vision) للخدمات والرعاية الصحية! يسعدنا تواصلك معنا، سيقوم أحد أخصائيي الرعاية بالرد عليك ومساعدتك في أقرب وقت.';
    
    // Check all potential keys for out of hours enabled, defaulting to false
    const oohEnabled =
      settingsMap['out_of_hours_message_enabled'] ??
      settingsMap['outOfHoursMessageEnabled'] ??
      settingsMap['outOfOfficeBotEnabled'] ??
      settingsMap['outOfOfficeEnabled'] ??
      false;

    const oohTmpl =
      settingsMap['out_of_hours_message_template'] ??
      settingsMap['outOfHoursMessageTemplate'] ??
      settingsMap['outOfOfficeMessage'] ??
      'شكراً لتواصلك مع ترينتي فيجن (Trenty Vision) للرعاية الصحية! نحن حالياً خارج أوقات العمل الرسمية. سنقوم بالرد عليك وتقديم الرعاية المطلوبة فور بدء ساعات العمل القادمة.';
    const assignMode = settingsMap['assignment_mode'] ?? 'round_robin';

    const rawBHours = settingsMap['business_hours'] ?? settingsMap['businessHours'];
    const bHoursObj = unifyBusinessHours(rawBHours);

    const payload = {
      automationEnabled: settingsMap['automation_enabled'] ?? true,
      assignmentEnabled: settingsMap['assignment_enabled'] ?? true,
      assignmentMode: assignMode,
      routingStrategy: assignMode,
      welcomeMessageEnabled: welcomeEnabled,
      greetingBotEnabled: welcomeEnabled,
      welcomeMessageTemplate: welcomeTmpl,
      greetingMessage: welcomeTmpl,
      outOfHoursMessageEnabled: oohEnabled,
      outOfOfficeBotEnabled: oohEnabled,
      outOfOfficeEnabled: oohEnabled,
      outOfHoursMessageTemplate: oohTmpl,
      outOfOfficeMessage: oohTmpl,
      businessHours: bHoursObj,
      businessHoursStart: bHoursObj.start || '09:00',
      businessHoursEnd: bHoursObj.end || '18:00',
      activeDays: bHoursObj.workDays || [0, 1, 2, 3, 4, 6],
    };

    return reply.send({
      success: true,
      data: payload,
    });
  };

  /**
   * GET /api/v1/automations/settings & GET /api/v1/automations
   */
  app.get('/settings', getSettingsHandler);
  app.get('/', getSettingsHandler);

  /**
   * PUT /api/v1/automations/settings & PUT /api/v1/automations
   * Update automation configuration
   */
  const updateSettingsHandler = async (request: any, reply: any) => {
    const raw = request.body || {};
    const updates: Array<{ key: string; value: any; groupName: string }> = [];

    const autoEnabled = raw.automationEnabled;
    if (autoEnabled !== undefined) {
      updates.push({ key: 'automation_enabled', value: autoEnabled, groupName: 'automation' });
    }

    const assignEnabled = raw.assignmentEnabled;
    if (assignEnabled !== undefined) {
      updates.push({ key: 'assignment_enabled', value: assignEnabled, groupName: 'assignment' });
    }

    const assignMode = raw.assignmentMode || raw.routingStrategy;
    if (assignMode !== undefined) {
      updates.push({ key: 'assignment_mode', value: assignMode, groupName: 'assignment' });
    }

    const welcomeEnabled = raw.welcomeMessageEnabled ?? raw.greetingBotEnabled;
    if (welcomeEnabled !== undefined) {
      updates.push({ key: 'welcome_message_enabled', value: welcomeEnabled, groupName: 'automation' });
    }

    const welcomeTmpl = raw.welcomeMessageTemplate || raw.greetingMessage;
    if (welcomeTmpl !== undefined) {
      updates.push({ key: 'welcome_message_template', value: welcomeTmpl, groupName: 'automation' });
    }

    const oohEnabled = raw.outOfHoursMessageEnabled ?? raw.outOfOfficeBotEnabled ?? raw.outOfOfficeEnabled;
    if (oohEnabled !== undefined) {
      updates.push({ key: 'out_of_hours_message_enabled', value: oohEnabled, groupName: 'automation' });
      updates.push({ key: 'outOfHoursMessageEnabled', value: oohEnabled, groupName: 'automation' });
      updates.push({ key: 'outOfOfficeBotEnabled', value: oohEnabled, groupName: 'automation' });
      updates.push({ key: 'outOfOfficeEnabled', value: oohEnabled, groupName: 'automation' });
    }

    const oohTmpl = raw.outOfHoursMessageTemplate || raw.outOfOfficeMessage;
    if (oohTmpl !== undefined) {
      updates.push({ key: 'out_of_hours_message_template', value: oohTmpl, groupName: 'automation' });
      updates.push({ key: 'outOfHoursMessageTemplate', value: oohTmpl, groupName: 'automation' });
      updates.push({ key: 'outOfOfficeMessage', value: oohTmpl, groupName: 'automation' });
    }

    let bHours = raw.businessHours ?? raw.business_hours;
    if (raw.businessHoursStart !== undefined || raw.businessHoursEnd !== undefined || raw.activeDays !== undefined) {
      const existingBHours = await db.query.settings.findFirst({
        where: eq(schema.settings.key, 'business_hours'),
      });
      const current = (existingBHours?.value as any) || {
        enabled: true,
        timezone: 'Asia/Kuwait',
        start: '09:00',
        end: '18:00',
        workDays: [0, 1, 2, 3, 4, 6],
      };
      bHours = unifyBusinessHours({
        ...current,
        start: raw.businessHoursStart ?? current.start ?? '09:00',
        end: raw.businessHoursEnd ?? current.end ?? '18:00',
        workDays: raw.activeDays ?? current.workDays ?? [0, 1, 2, 3, 4, 6],
        activeDays: raw.activeDays ?? current.workDays ?? [0, 1, 2, 3, 4, 6],
      });
    } else if (bHours !== undefined) {
      bHours = unifyBusinessHours(bHours);
    }

    if (bHours !== undefined) {
      updates.push({ key: 'business_hours', value: bHours, groupName: 'operational' });
      updates.push({ key: 'businessHours', value: bHours, groupName: 'operational' });
    }

    for (const item of updates) {
      const existing = await db.query.settings.findFirst({
        where: eq(schema.settings.key, item.key),
      });

      if (existing) {
        await db
          .update(schema.settings)
          .set({ value: item.value, updatedAt: new Date() })
          .where(eq(schema.settings.key, item.key));
      } else {
        await db.insert(schema.settings).values({
          key: item.key,
          value: item.value,
          groupName: item.groupName,
        });
      }
    }

    logger.info({ userId: (request as any).user?.id }, 'Automation settings updated');
    return reply.send({ success: true, message: 'Settings updated successfully' });
  };

  app.put('/settings', updateSettingsHandler);
  app.put('/', updateSettingsHandler);


  /**
   * GET /api/v1/automations/rules
   * List all keyword and routing rules
   */
  app.get('/rules', async (request, reply) => {
    const rules = await db.query.automationRules.findMany({
      orderBy: [schema.automationRules.priority, desc(schema.automationRules.createdAt)],
    });

    return reply.send({ success: true, data: rules });
  });

  /**
   * POST /api/v1/automations/rules
   * Create a new automation rule
   */
  app.post('/rules', async (request, reply) => {
    const ruleValidator = z.object({
      name: z.string().min(1),
      triggerType: z.string().default('keyword'),
      conditions: z.record(z.any()).default({}),
      actions: z.array(z.record(z.any())).default([]),
      priority: z.number().default(0),
      enabled: z.boolean().default(true),
      scope: z.string().default('global'),
    });

    const data = ruleValidator.parse(request.body);

    const [rule] = await db
      .insert(schema.automationRules)
      .values({
        name: data.name,
        triggerType: data.triggerType,
        conditions: data.conditions,
        actions: data.actions,
        priority: data.priority,
        enabled: data.enabled,
        scope: data.scope,
      })
      .returning();

    return reply.status(201).send({ success: true, data: rule });
  });

  /**
   * PATCH /api/v1/automations/rules/:id
   * Update an automation rule
   */
  const updateRuleHandler = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const ruleValidator = z.object({
      name: z.string().optional(),
      triggerType: z.string().optional(),
      conditions: z.record(z.any()).optional(),
      actions: z.array(z.record(z.any())).optional(),
      priority: z.number().optional(),
      enabled: z.boolean().optional(),
      scope: z.string().optional(),
    });

    const data = ruleValidator.parse(request.body);

    const [updated] = await db
      .update(schema.automationRules)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.automationRules.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({ success: false, message: 'Rule not found' });
    }

    return reply.send({ success: true, data: updated });
  };

  app.patch('/rules/:id', updateRuleHandler);
  app.put('/rules/:id', updateRuleHandler);


  /**
   * DELETE /api/v1/automations/rules/:id
   * Delete an automation rule
   */
  app.delete('/rules/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    await db.delete(schema.automationRules).where(eq(schema.automationRules.id, id));
    return reply.send({ success: true, message: 'Rule deleted' });
  });

  /**
   * GET /api/v1/automations/reminders
   * Get reminders with optional status/conversation filtering and user details
   */
  app.get('/reminders', async (request, reply) => {
    const user = (request as any).user;
    const query = request.query as {
      status?: 'pending' | 'completed' | 'cancelled' | 'all';
      conversationId?: string;
      all?: string;
    };

    const conditions: any[] = [];

    // Role check: if not administrator, restrict to own reminders unless all=true requested by admin
    const isAdmin = user.roleName === 'adminstrator' || user.roleName === 'admin' || user.roleName === 'super_admin';
    if (!isAdmin || query.all !== 'true') {
      conditions.push(eq(schema.reminders.assignedUserId, user.id));
    }

    if (query.status && query.status !== 'all') {
      conditions.push(eq(schema.reminders.status, query.status as any));
    }

    if (query.conversationId) {
      conditions.push(eq(schema.reminders.conversationId, query.conversationId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db
      .select({
        id: schema.reminders.id,
        title: schema.reminders.title,
        note: schema.reminders.note,
        dueAt: schema.reminders.dueAt,
        status: schema.reminders.status,
        completedAt: schema.reminders.completedAt,
        createdAt: schema.reminders.createdAt,
        updatedAt: schema.reminders.updatedAt,
        conversationId: schema.reminders.conversationId,
        leadId: schema.reminders.leadId,
        assignedUserId: schema.reminders.assignedUserId,
        assignedUserName: schema.users.name,
        assignedUserEmail: schema.users.email,
        contactName: schema.contacts.name,
        contactPhone: schema.contacts.phoneNumber,
      })
      .from(schema.reminders)
      .leftJoin(schema.users, eq(schema.reminders.assignedUserId, schema.users.id))
      .leftJoin(schema.conversations, eq(schema.reminders.conversationId, schema.conversations.id))
      .leftJoin(schema.contacts, eq(schema.conversations.contactId, schema.contacts.id))
      .where(whereClause)
      .orderBy(desc(schema.reminders.dueAt));

    return reply.send({ success: true, data: list });
  });

  /**
   * Helper to safely resolve an assigned user ID from either a user ID or employee ID,
   * falling back to the requesting user ID to prevent FK constraint violations.
   */
  async function resolveAssignedUserId(rawId: string | undefined | null, fallbackUserId: string): Promise<string> {
    if (!rawId || typeof rawId !== 'string' || rawId.trim() === '') {
      return fallbackUserId;
    }
    const cleanId = rawId.trim();

    // 1. Check if it's already a valid user ID in users table
    const [existingUser] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.id, cleanId))
      .limit(1);

    if (existingUser) {
      return existingUser.id;
    }

    // 2. Check if it's an employee ID (from the employees table)
    const [employee] = await db
      .select({ userId: schema.employees.userId })
      .from(schema.employees)
      .where(eq(schema.employees.id, cleanId))
      .limit(1);

    if (employee && employee.userId) {
      return employee.userId;
    }

    return fallbackUserId;
  }

  /**
   * POST /api/v1/automations/reminders
   * Create a follow-up reminder
   */
  app.post('/reminders', async (request, reply) => {
    const user = (request as any).user;
    const validator = z.object({
      conversationId: z.string().uuid().optional().nullable(),
      leadId: z.string().uuid().optional().nullable(),
      assignedUserId: z.string().optional().nullable(),
      title: z.string().min(1),
      note: z.string().optional().nullable(),
      dueAt: z.string().datetime(),
    });

    const data = validator.parse(request.body);
    const assignedUserId = await resolveAssignedUserId(data.assignedUserId, user.id);

    const [created] = await db
      .insert(schema.reminders)
      .values({
        assignedUserId,
        conversationId: data.conversationId || null,
        leadId: data.leadId || null,
        title: data.title,
        note: data.note || null,
        dueAt: new Date(data.dueAt),
        status: 'pending',
      })
      .returning();

    // Broadcast reminder creation to UI
    wsHub.broadcast('reminder.created', created);

    return reply.status(201).send({ success: true, data: created });
  });

  /**
   * PATCH /api/v1/automations/reminders/:id/status
   * Quick status toggle (pending / completed / cancelled)
   */
  app.patch('/reminders/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = z
      .object({
        status: z.enum(['pending', 'completed', 'cancelled']),
      })
      .parse(request.body);

    const [updated] = await db
      .update(schema.reminders)
      .set({
        status,
        completedAt: status === 'completed' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(schema.reminders.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({ success: false, message: 'Reminder not found' });
    }

    wsHub.broadcast('reminder.updated', updated);

    return reply.send({ success: true, data: updated });
  });

  /**
   * PATCH /api/v1/automations/reminders/:id
   * Update reminder fields (dueAt, title, note, assignedUserId)
   */
  app.patch('/reminders/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const validator = z.object({
      title: z.string().min(1).optional(),
      note: z.string().optional().nullable(),
      dueAt: z.string().datetime().optional(),
      status: z.enum(['pending', 'completed', 'cancelled', 'overdue']).optional(),
      assignedUserId: z.string().optional().nullable(),
    });

    const data = validator.parse(request.body);
    const updates: any = { updatedAt: new Date() };

    if (data.title !== undefined) updates.title = data.title;
    if (data.note !== undefined) updates.note = data.note;
    if (data.dueAt !== undefined) updates.dueAt = new Date(data.dueAt);
    if (data.assignedUserId !== undefined) {
      updates.assignedUserId = await resolveAssignedUserId(data.assignedUserId, user.id);
    }
    if (data.status !== undefined) {
      updates.status = data.status;
      if (data.status === 'completed') updates.completedAt = new Date();
      if (data.status === 'pending') updates.completedAt = null;
    }

    const [updated] = await db
      .update(schema.reminders)
      .set(updates)
      .where(eq(schema.reminders.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({ success: false, message: 'Reminder not found' });
    }

    wsHub.broadcast('reminder.updated', updated);

    return reply.send({ success: true, data: updated });
  });

  /**
   * DELETE /api/v1/automations/reminders/:id
   * Delete a reminder
   */
  app.delete('/reminders/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const [deleted] = await db
      .delete(schema.reminders)
      .where(eq(schema.reminders.id, id))
      .returning();

    if (!deleted) {
      return reply.status(404).send({ success: false, message: 'Reminder not found' });
    }

    wsHub.broadcast('reminder.deleted', { id });

    return reply.send({ success: true, message: 'Reminder deleted successfully' });
  });
};
