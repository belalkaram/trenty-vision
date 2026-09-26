import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { db } from '../../database/client';
import * as schema from '../../database/schema/index';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authenticate, requireCrmCompany } from '../../middleware/auth.middleware';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { wsHub } from '../../websocket/ws.hub';
import { unifyBusinessHours } from '../../utils/business-hours.converter';

export const automationsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Apply auth middleware to all automation endpoints
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireCrmCompany);

  /**
   * GET /api/v1/automations/settings
   * Retrieve automation, business hours, and bot configuration for current company
   */
  const getSettingsHandler = async (request: any, reply: any) => {
    const companyId = request.companyId || request.user?.companyId;
    let companyName = request.user?.companyName;

    if (!companyName && companyId) {
      const comp = await db.query.companies.findFirst({
        where: eq(schema.companies.id, companyId),
      });
      if (comp) companyName = comp.name;
    }
    companyName = companyName || 'خدمة العملاء';

    const allSettings = companyId
      ? await db.query.settings.findMany({ where: eq(schema.settings.companyId, companyId) })
      : await db.query.settings.findMany();

    const settingsMap: Record<string, any> = {};

    for (const s of allSettings) {
      settingsMap[s.key] = s.value;
    }

    const welcomeEnabled = settingsMap['welcome_message_enabled'] ?? true;
    const welcomeTmpl =
      settingsMap['welcome_message_template'] ??
      `مرحباً بك في ${companyName}! يسعدنا تواصلك معنا، سيقوم أحد أخصائيي الخدمة بالرد عليك ومساعدتك في أقرب وقت.`;
    
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
      `شكراً لتواصلك مع ${companyName}! نحن حالياً خارج أوقات العمل الرسمية. سنقوم بالرد عليك فور بدء ساعات العمل القادمة.`;
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
    const companyId = request.companyId || request.user?.companyId;

    let targetCompanyId = companyId;
    if (!targetCompanyId) {
      const [firstComp] = await db.select().from(schema.companies).limit(1);
      targetCompanyId = firstComp?.id;
    }

    if (!targetCompanyId) {
      return reply.status(500).send({ success: false, error: 'No company found' });
    }

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
      updates.push({ key: 'routingStrategy', value: assignMode, groupName: 'assignment' });
    }

    const welcomeEnabled = raw.welcomeMessageEnabled ?? raw.greetingBotEnabled;
    if (welcomeEnabled !== undefined) {
      updates.push({ key: 'welcome_message_enabled', value: welcomeEnabled, groupName: 'bot' });
    }

    const welcomeTmpl = raw.welcomeMessageTemplate ?? raw.greetingMessage;
    if (welcomeTmpl !== undefined) {
      updates.push({ key: 'welcome_message_template', value: welcomeTmpl, groupName: 'bot' });
    }

    const oohEnabled =
      raw.outOfHoursMessageEnabled ??
      raw.outOfOfficeBotEnabled ??
      raw.outOfOfficeEnabled;
    if (oohEnabled !== undefined) {
      updates.push({ key: 'out_of_hours_message_enabled', value: oohEnabled, groupName: 'bot' });
      updates.push({ key: 'outOfHoursMessageEnabled', value: oohEnabled, groupName: 'bot' });
      updates.push({ key: 'outOfOfficeBotEnabled', value: oohEnabled, groupName: 'bot' });
      updates.push({ key: 'outOfOfficeEnabled', value: oohEnabled, groupName: 'bot' });
    }

    const oohTmpl = raw.outOfHoursMessageTemplate ?? raw.outOfOfficeMessage;
    if (oohTmpl !== undefined) {
      updates.push({ key: 'out_of_hours_message_template', value: oohTmpl, groupName: 'bot' });
      updates.push({ key: 'outOfHoursMessageTemplate', value: oohTmpl, groupName: 'bot' });
      updates.push({ key: 'outOfOfficeMessage', value: oohTmpl, groupName: 'bot' });
    }

    let bHours = raw.businessHours;
    if (raw.businessHoursStart !== undefined || raw.businessHoursEnd !== undefined || raw.activeDays !== undefined) {
      const currentSetting = await db.query.settings.findFirst({
        where: and(eq(schema.settings.companyId, targetCompanyId), eq(schema.settings.key, 'business_hours')),
      });
      const current = (currentSetting?.value as any) || {
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
        where: and(eq(schema.settings.companyId, targetCompanyId), eq(schema.settings.key, item.key)),
      });

      if (existing) {
        await db
          .update(schema.settings)
          .set({ value: item.value, updatedAt: new Date() })
          .where(eq(schema.settings.id, existing.id));
      } else {
        await db.insert(schema.settings).values({
          companyId: targetCompanyId,
          key: item.key,
          value: item.value,
          groupName: item.groupName,
        });
      }
    }

    logger.info({ userId: (request as any).user?.id, companyId: targetCompanyId }, 'Automation settings updated');
    return reply.send({ success: true, message: 'Settings updated successfully' });
  };

  app.put('/settings', updateSettingsHandler);
  app.put('/', updateSettingsHandler);


  /**
   * GET /api/v1/automations/rules
   * List all keyword and routing rules for current company
   */
  app.get('/rules', async (request, reply) => {
    const companyId = request.companyId || (request as any).user?.companyId;
    const rules = await db.query.automationRules.findMany({
      where: companyId ? eq(schema.automationRules.companyId, companyId) : undefined,
      orderBy: [schema.automationRules.priority, desc(schema.automationRules.createdAt)],
    });

    return reply.send({ success: true, data: rules });
  });

  /**
   * POST /api/v1/automations/rules
   * Create a new automation rule
   */
  app.post('/rules', async (request, reply) => {
    const companyId = request.companyId || (request as any).user?.companyId;
    let targetCompanyId = companyId;
    if (!targetCompanyId) {
      const [firstComp] = await db.select().from(schema.companies).limit(1);
      targetCompanyId = firstComp?.id;
    }

    const ruleValidator = z.object({
      name: z.string().min(1),
      triggerType: z.string().default('keyword'),
      conditions: z.record(z.any()).default({}),
      actions: z.array(z.record(z.any())).default([]),
      priority: z.number().default(0),
      enabled: z.boolean().default(true),
      scope: z.string().default('company'),
    });

    const data = ruleValidator.parse(request.body);

    const [rule] = await db
      .insert(schema.automationRules)
      .values({
        companyId: targetCompanyId,
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
    const companyId = request.companyId || request.user?.companyId;

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

    const condition = companyId
      ? and(eq(schema.automationRules.id, id), eq(schema.automationRules.companyId, companyId))
      : eq(schema.automationRules.id, id);

    const [updated] = await db
      .update(schema.automationRules)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(condition)
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
    const companyId = request.companyId || (request as any).user?.companyId;

    const condition = companyId
      ? and(eq(schema.automationRules.id, id), eq(schema.automationRules.companyId, companyId))
      : eq(schema.automationRules.id, id);

    await db.delete(schema.automationRules).where(condition);
    return reply.send({ success: true, message: 'Rule deleted' });
  });

  /**
   * GET /api/v1/automations/reminders
   * Get reminders with optional status/conversation filtering and user details
   */
  app.get('/reminders', async (request, reply) => {
    const user = (request as any).user;
    const companyId = request.companyId || user?.companyId;
    const query = request.query as {
      status?: 'pending' | 'completed' | 'cancelled' | 'all';
      conversationId?: string;
      all?: string;
    };

    const conditions: any[] = [];

    if (companyId) {
      conditions.push(eq(schema.reminders.companyId, companyId));
    }

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
      })
      .from(schema.reminders)
      .leftJoin(schema.users, eq(schema.reminders.assignedUserId, schema.users.id))
      .where(whereClause)
      .orderBy(desc(schema.reminders.dueAt));

    return reply.send({ success: true, data: list });
  });

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
    const companyId = request.companyId || user?.companyId;
    let targetCompanyId = companyId;
    if (!targetCompanyId) {
      const [firstComp] = await db.select().from(schema.companies).limit(1);
      targetCompanyId = firstComp?.id;
    }

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
        companyId: targetCompanyId,
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
    const companyId = request.companyId || (request as any).user?.companyId;

    const { status } = z
      .object({
        status: z.enum(['pending', 'completed', 'cancelled']),
      })
      .parse(request.body);

    const condition = companyId
      ? and(eq(schema.reminders.id, id), eq(schema.reminders.companyId, companyId))
      : eq(schema.reminders.id, id);

    const [updated] = await db
      .update(schema.reminders)
      .set({
        status,
        completedAt: status === 'completed' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(condition)
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
    const companyId = request.companyId || user?.companyId;
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

    const condition = companyId
      ? and(eq(schema.reminders.id, id), eq(schema.reminders.companyId, companyId))
      : eq(schema.reminders.id, id);

    const [updated] = await db
      .update(schema.reminders)
      .set(updates)
      .where(condition)
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
    const companyId = request.companyId || (request as any).user?.companyId;

    const condition = companyId
      ? and(eq(schema.reminders.id, id), eq(schema.reminders.companyId, companyId))
      : eq(schema.reminders.id, id);

    const [deleted] = await db
      .delete(schema.reminders)
      .where(condition)
      .returning();

    if (!deleted) {
      return reply.status(404).send({ success: false, message: 'Reminder not found' });
    }

    wsHub.broadcast('reminder.deleted', { id });

    return reply.send({ success: true, message: 'Reminder deleted successfully' });
  });
};
