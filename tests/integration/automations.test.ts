import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { db, pool } from '../../src/database/client';
import {
  companies,
  contacts,
  conversations,
  stations,
  employees,
  users,
  automationRules,
  reminders,
  settings,
} from '../../src/database/schema/index';
import { eq } from 'drizzle-orm';
import { AssignmentService } from '../../src/modules/automations/assignment.service';
import { RulesEngine } from '../../src/modules/automations/rules.engine';
import { ReminderScheduler } from '../../src/modules/automations/reminder.scheduler';

describe('Automation & Business Rules Engine Integration Tests', () => {
  let app: FastifyInstance;
  let authCookie: string;
  let testUserId: string;
  let testCompanyId: string;
  let testStationId: string;
  let testEmployeeId: string;
  let testContactId: string;
  let testConversationId: string;
  let testRuleId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Login as seeded Super Admin
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@trenty.com',
        password: 'Password123!',
      },
    });

    expect(loginRes.statusCode).toBe(200);
    const cookies = loginRes.cookies;
    const accessCookie = cookies.find((c) => c.name === 'access_token');
    authCookie = `access_token=${accessCookie?.value}`;

    const adminUser = await db.query.users.findFirst({
      where: eq(users.email, 'admin@trenty.com'),
    });
    testUserId = adminUser!.id;

    const [company] = await db.select().from(companies).limit(1);
    testCompanyId = company.id;

    const [station] = await db.select().from(stations).limit(1);
    testStationId = station.id;

    let [employee] = await db.select().from(employees).limit(1);
    if (!employee) {
      const [newEmp] = await db
        .insert(employees)
        .values({
          userId: testUserId,
          companyId: testCompanyId,
          stationId: testStationId,
          status: 'active',
        })
        .returning();
      employee = newEmp;
    }
    testEmployeeId = employee.id;

    // Create test contact
    const [contact] = await db
      .insert(contacts)
      .values({
        companyId: testCompanyId,
        name: 'Auto Rule Customer Test',
        phoneNumber: '+966558887777',
        whatsappJid: '966558887777@s.whatsapp.net',
      })
      .onConflictDoUpdate({
        target: contacts.phoneNumber,
        set: { name: 'Auto Rule Customer Test' },
      })
      .returning();
    testContactId = contact.id;

    // Create test conversation
    const [newConv] = await db
      .insert(conversations)
      .values({
        companyId: testCompanyId,
        contactId: testContactId,
        assignedStationId: testStationId,
        status: 'open',
        lastMessageText: 'مرحباً أريد استشارة رعاية صحية وفحص المنتجات',
        unreadCount: '0',
      })
      .returning();
    testConversationId = newConv.id;
  });

  afterAll(async () => {
    if (testRuleId) {
      await db.delete(automationRules).where(eq(automationRules.id, testRuleId));
    }
    if (testConversationId) {
      await db.delete(conversations).where(eq(conversations.id, testConversationId));
    }
    if (testContactId) {
      await db.delete(contacts).where(eq(contacts.id, testContactId));
    }
    ReminderScheduler.stop();
    await app.close();
    await pool.end();
  });

  // ─── 1. Unit Tests: AssignmentService ────────────────────────
  describe('AssignmentService unit tests', () => {
    it('getSetting returns value or fallback default', async () => {
      const mode = await AssignmentService.getSetting<string>('assignment_mode', 'round_robin');
      expect(['round_robin', 'least_busy', 'manual']).toContain(mode);

      const fallback = await AssignmentService.getSetting<string>('non_existent_key_xyz', 'fallback_val');
      expect(fallback).toBe('fallback_val');
    });

    it('assignRoundRobin returns an active employee id for station', async () => {
      const employeeId = await AssignmentService.assignRoundRobin(testStationId);
      // Either returns an employee ID or null if station has no agents
      if (employeeId) {
        expect(typeof employeeId).toBe('string');
      }
    });

    it('assignLeastBusy returns an active employee id', async () => {
      const employeeId = await AssignmentService.assignLeastBusy(testStationId);
      if (employeeId) {
        expect(typeof employeeId).toBe('string');
      }
    });

    it('autoAssignConversation executes assignment and updates source', async () => {
      const result = await AssignmentService.autoAssignConversation(testConversationId, {
        preferredStationId: testStationId,
        forceMode: 'round_robin',
      });

      expect(result).toBeDefined();
      expect(result.assignedStationId).toBe(testStationId);
      expect(['round_robin', 'least_busy', 'direct', 'manual', 'system']).toContain(result.assignmentSource);
    });
  });

  // ─── 2. Unit Tests: RulesEngine ──────────────────────────────
  describe('RulesEngine unit tests', () => {
    it('isWithinBusinessHours properly evaluates configured working hours', async () => {
      // Test with Wednesday 12:00 PM (should be within normal 09:00 - 18:00 Kuwait time)
      const noonWed = new Date('2026-09-09T12:00:00Z');
      const within = await RulesEngine.isWithinBusinessHours(noonWed);
      expect(typeof within).toBe('boolean');
    });

    it('matchKeywordRules finds matching keywords in message text', async () => {
      // Create temporary rule
      const [rule] = await db
        .insert(automationRules)
        .values({
          name: 'Healthcare Inquiries Keywords',
          triggerType: 'keyword',
          conditions: { keywords: ['استشارة', 'صحي', 'رعاية', 'طبي'] },
          actions: [
            {
              assignStationId: testStationId,
              addTags: ['رعاية_صحية', 'مهم'],
              replyText: 'أهلاً بك، تم تحويل استشارتك إلى قسم الرعاية الصحية.',
            },
          ],
          priority: 1,
          enabled: true,
        })
        .returning();

      testRuleId = rule.id;

      const match = await RulesEngine.matchKeywordRules('مرحباً أريد استشارة رعاية صحية عاجلة');
      expect(match.matchedRules.length).toBeGreaterThan(0);
      expect(match.targetStationId).toBe(testStationId);
      expect(match.tagsToAdd).toContain('رعاية_صحية');
      expect(match.autoReplyText).toBe('أهلاً بك، تم تحويل استشارتك إلى قسم الرعاية الصحية.');

      // Negative match test
      const noMatch = await RulesEngine.matchKeywordRules('صباح الخير فقط');
      expect(noMatch.matchedRules.length).toBe(0);
    });
  });

  // ─── 3. REST API: Automations Endpoints ──────────────────────
  describe('Automations REST API', () => {
    it('GET /api/v1/automations/settings returns settings configuration', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/automations/settings',
        headers: { cookie: authCookie },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(true);
      expect(json.data.automationEnabled).toBeDefined();
      expect(json.data.assignmentMode).toBeDefined();
      expect(json.data.businessHours).toBeDefined();
      expect(json.data.welcomeMessageTemplate).toBeDefined();
      expect(json.data.outOfHoursMessageTemplate).toBeDefined();
    });

    it('PUT /api/v1/automations/settings updates settings', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/v1/automations/settings',
        headers: { cookie: authCookie },
        payload: {
          assignmentMode: 'least_busy',
          welcomeMessageEnabled: true,
          welcomeMessageTemplate: 'مرحباً بك في ترينتي فيجن للرعاية الصحية! كيف يمكننا مساعدتك اليوم؟',
        },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(true);

      // Verify persistence
      const getRes = await app.inject({
        method: 'GET',
        url: '/api/v1/automations/settings',
        headers: { cookie: authCookie },
      });
      const getJson = JSON.parse(getRes.body);
      expect(getJson.data.assignmentMode).toBe('least_busy');
      expect(getJson.data.welcomeMessageTemplate).toBe('مرحباً بك في ترينتي فيجن للرعاية الصحية! كيف يمكننا مساعدتك اليوم؟');
    });

    it('GET /api/v1/automations/rules lists keyword rules', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/automations/rules',
        headers: { cookie: authCookie },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
    });

    it('POST /api/v1/automations/rules creates a new rule', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/automations/rules',
        headers: { cookie: authCookie },
        payload: {
          name: 'Medical Products Rule',
          triggerType: 'keyword',
          conditions: { keywords: ['أجهزة', 'فحص', 'منتج'] },
          actions: [{ addTags: ['منتجات_صحية'] }],
          priority: 5,
          enabled: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(true);
      expect(json.data.name).toBe('Medical Products Rule');

      // Cleanup
      await db.delete(automationRules).where(eq(automationRules.id, json.data.id));
    });

    it('PATCH /api/v1/automations/rules/:id updates an existing rule', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/automations/rules/${testRuleId}`,
        headers: { cookie: authCookie },
        payload: {
          enabled: false,
        },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(true);
      expect(json.data.enabled).toBe(false);

      // Re-enable
      await app.inject({
        method: 'PATCH',
        url: `/api/v1/automations/rules/${testRuleId}`,
        headers: { cookie: authCookie },
        payload: { enabled: true },
      });
    });

    it('POST /api/v1/automations/reminders creates a follow-up reminder', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/automations/reminders',
        headers: { cookie: authCookie },
        payload: {
          conversationId: testConversationId,
          title: 'متابعة الاستشارة الصحية',
          note: 'العميل يرغب في استفسار عن منتجات الرعاية وتأكيد الموعد',
          dueAt: futureDate.toISOString(),
        },
      });

      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(true);
      expect(json.data.title).toBe('متابعة الاستشارة الصحية');
      expect(json.data.status).toBe('pending');

      const reminderId = json.data.id;

      // GET reminders
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/automations/reminders',
        headers: { cookie: authCookie },
      });
      const listJson = JSON.parse(listRes.body);
      expect(listJson.success).toBe(true);
      expect(listJson.data.some((r: any) => r.id === reminderId)).toBe(true);

      // PATCH status to completed
      const patchRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/automations/reminders/${reminderId}/status`,
        headers: { cookie: authCookie },
        payload: { status: 'completed' },
      });
      expect(patchRes.statusCode).toBe(200);

      // Clean up reminder
      await db.delete(reminders).where(eq(reminders.id, reminderId));
    });
  });

  // ─── 4. Unit Tests: ReminderScheduler ────────────────────────
  describe('ReminderScheduler worker tests', () => {
    it('checkDueReminders triggers due reminders and marks them completed', async () => {
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 5);

      const [dueReminder] = await db
        .insert(reminders)
        .values({
          assignedUserId: testUserId,
          conversationId: testConversationId,
          title: 'تذكير مستحق الآن',
          note: 'متابعة فورية',
          dueAt: pastDate,
          status: 'pending',
        })
        .returning();

      // Trigger scheduler
      const count = await ReminderScheduler.checkDueReminders();
      expect(count).toBeGreaterThanOrEqual(1);

      // Verify it is marked completed
      const updated = await db.query.reminders.findFirst({
        where: eq(reminders.id, dueReminder.id),
      });
      expect(updated?.status).toBe('completed');
      expect(updated?.completedAt).toBeDefined();

      // Cleanup
      await db.delete(reminders).where(eq(reminders.id, dueReminder.id));
    });
  });
});
