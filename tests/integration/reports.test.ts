import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { db, pool } from '../../src/database/client';
import {
  companies,
  contacts,
  conversations,
  stations,
  messages,
} from '../../src/database/schema/index';
import { eq } from 'drizzle-orm';

describe('Reports & Analytics Integration Tests', () => {
  let app: FastifyInstance;
  let authCookie: string;
  let testCompanyId: string;
  let testContactId: string;
  let testConversationId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Login as seeded Super Admin
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

    const [company] = await db.select().from(companies).limit(1);
    testCompanyId = company.id;

    // Create a dedicated test contact and conversation
    const [contact] = await db
      .insert(contacts)
      .values({
        companyId: testCompanyId,
        name: 'عميل اختبار التقارير',
        phoneNumber: '+96590009999',
        whatsappJid: '96590009999@s.whatsapp.net',
        source: 'campaign_reports',
      })
      .returning();
    testContactId = contact.id;

    const [station] = await db.select().from(stations).limit(1);

    const [conv] = await db
      .insert(conversations)
      .values({
        companyId: testCompanyId,
        contactId: testContactId,
        assignedStationId: station?.id || null,
        status: 'open',
        lastMessageText: 'مرحباً، أود الاستفسار',
      })
      .returning();
    testConversationId = conv.id;
  });

  afterAll(async () => {
    try {
      if (testConversationId) {
        await db.delete(messages).where(eq(messages.conversationId, testConversationId));
        await db.delete(conversations).where(eq(conversations.id, testConversationId));
      }
      if (testContactId) {
        await db.delete(contacts).where(eq(contacts.id, testContactId));
      }
    } catch (e) {
      console.warn('Cleanup error in reports.test.ts:', e);
    }
    await app.close();
  });

  describe('1. GET /api/v1/reports/metrics', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/reports/metrics',
      });
      expect(res.statusCode).toBe(401);
    });

    it('should return 200 with aggregated operational metrics', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/reports/metrics',
        headers: { cookie: authCookie },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();

      // Overview
      const overview = json.data.overview;
      expect(overview).toBeDefined();
      expect(typeof overview.totalConversations).toBe('number');
      expect(typeof overview.openConversations).toBe('number');
      expect(typeof overview.closedConversations).toBe('number');
      expect(typeof overview.resolutionRate).toBe('number');
      expect(typeof overview.totalMessages).toBe('number');
      expect(typeof overview.incomingMessages).toBe('number');
      expect(typeof overview.outgoingMessages).toBe('number');
      expect(typeof overview.totalContacts).toBe('number');

      // Funnel
      const funnel = json.data.leadsFunnel;
      expect(funnel).toBeDefined();
      expect(typeof funnel.new).toBe('number');
      expect(typeof funnel.contacted).toBe('number');
      expect(typeof funnel.qualified).toBe('number');

      // Stations & Employees
      expect(Array.isArray(json.data.stations)).toBe(true);
      expect(Array.isArray(json.data.employees)).toBe(true);
    });
  });

  describe('2. CSV Exports', () => {
    it('should export conversations as CSV with UTF-8 BOM', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/reports/conversations/export',
        headers: { cookie: authCookie },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('.csv');

      // Check UTF-8 BOM and headers in body
      expect(res.body.startsWith('\uFEFF')).toBe(true);
      expect(res.body).toContain('معرف المحادثة');
      expect(res.body).toContain('اسم العميل');
      expect(res.body).toContain('رقم الهاتف');
      expect(res.body).toContain('الحالة');
    });

    it('should export contacts & leads as CSV with UTF-8 BOM', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/reports/contacts/export',
        headers: { cookie: authCookie },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');

      expect(res.body.startsWith('\uFEFF')).toBe(true);
      expect(res.body).toContain('معرف العميل');
      expect(res.body).toContain('اسم العميل');
      expect(res.body).toContain('مرحلة العميل (Lead Stage)');
    });
  });

  describe('3. Internal Team Notes (POST /api/v1/conversations/:id/notes)', () => {
    it('should add an internal team note to conversation successfully', async () => {
      const noteText = 'تم الاتفاق مع العميل على إرسال العرض غداً صباحاً 📝';

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/conversations/${testConversationId}/notes`,
        headers: { cookie: authCookie },
        payload: { text: noteText },
      });

      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(true);
      expect(json.data.text).toBe(noteText);
      expect(json.data.type).toBe('system');
      expect(json.data.senderType).toBe('employee');
      expect(json.data.metadata.isInternalNote).toBe(true);
      expect(json.data.metadata.authorName).toBeDefined();

      // Verify in DB
      const [saved] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, json.data.id))
        .limit(1);

      expect(saved).toBeDefined();
      expect(saved.text).toBe(noteText);
      expect(saved.type).toBe('system');
    });

    it('should reject note submission with empty text', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/conversations/${testConversationId}/notes`,
        headers: { cookie: authCookie },
        payload: { text: '   ' },
      });

      expect(res.statusCode).toBe(400);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(false);
    });

    it('should return 404 when adding note to non-existent conversation', async () => {
      const randomUuid = '00000000-0000-0000-0000-000000000000';
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/conversations/${randomUuid}/notes`,
        headers: { cookie: authCookie },
        payload: { text: 'ملاحظة لمحادثة وهمية' },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('4. HTML View Delivery', () => {
    it('should serve the /reports React SPA application shell', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/reports',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.body).toContain('id="root"');
    });
  });
});
