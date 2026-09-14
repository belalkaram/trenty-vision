import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { db, pool } from '../../src/database/client';
import { companies, contacts, conversations, messages, leads, stations, employees } from '../../src/database/schema/index';
import { eq } from 'drizzle-orm';

describe('WhatsApp Inbox & Chat Engine API Tests', () => {
  let app: FastifyInstance;
  let authCookie: string;
  let testContactId: string;
  let testConversationId: string;
  let testLeadId: string;
  let testStationId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Login as seeded Super Admin to get session cookie
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

    // 2. Resolve company
    const [company] = await db.select().from(companies).limit(1);

    // 3. Resolve or create station
    const [station] = await db.select().from(stations).limit(1);
    testStationId = station.id;

    // 4. Create or resolve test contact
    const [contact] = await db
      .insert(contacts)
      .values({
        companyId: company.id,
        name: 'Amr Customer Test',
        phoneNumber: '+966551239999',
        whatsappJid: '966551239999@s.whatsapp.net',
      })
      .onConflictDoUpdate({
        target: contacts.phoneNumber,
        set: { name: 'Amr Customer Test' },
      })
      .returning();
    testContactId = contact.id;

    // 5. Create test conversation
    const [existingConv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.contactId, testContactId))
      .limit(1);

    if (existingConv) {
      testConversationId = existingConv.id;
    } else {
      const [newConv] = await db
        .insert(conversations)
        .values({
          companyId: company.id,
          contactId: testContactId,
          assignedStationId: testStationId,
          status: 'open',
          lastMessageText: 'مرحباً، أود الاستفسار عن باقات وخدمات الرعاية الصحية',
          unreadCount: '2',
        })
        .returning();
      testConversationId = newConv.id;
    }

    // 6. Create test lead
    const [existingLead] = await db
      .select()
      .from(leads)
      .where(eq(leads.contactId, testContactId))
      .limit(1);

    if (existingLead) {
      testLeadId = existingLead.id;
    } else {
      const [newLead] = await db
        .insert(leads)
        .values({
          contactId: testContactId,
          stage: 'new',
          destination: 'ماليزيا',
          travelDate: '2026-10-01',
          stationId: testStationId,
        })
        .returning();
      testLeadId = newLead.id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/conversations lists conversations with counts and metadata', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/conversations',
      headers: { cookie: authCookie },
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.meta).toBeDefined();
    expect(json.meta.counts).toBeDefined();
    expect(typeof json.meta.counts.open).toBe('number');
  });

  it('GET /api/v1/conversations/:id returns single conversation details + lead', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/conversations/${testConversationId}`,
      headers: { cookie: authCookie },
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.success).toBe(true);
    expect(json.data.id).toBe(testConversationId);
    expect(json.data.contact.name).toBe('Amr Customer Test');
    expect(json.data.lead).toBeDefined();
  });

  it('POST /api/v1/conversations/:id/read marks conversation as read', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/conversations/${testConversationId}/read`,
      headers: { cookie: authCookie },
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.success).toBe(true);

    // Verify unread count is 0 in DB
    const [conv] = await db
      .select({ unreadCount: conversations.unreadCount })
      .from(conversations)
      .where(eq(conversations.id, testConversationId));
    expect(conv.unreadCount).toBe('0');
  });

  it('PATCH /api/v1/conversations/:id/status changes conversation status', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/conversations/${testConversationId}/status`,
      headers: { cookie: authCookie },
      payload: { status: 'pending' },
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('pending');
  });

  it('POST /api/v1/conversations/:id/assign reassigns conversation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/conversations/${testConversationId}/assign`,
      headers: { cookie: authCookie },
      payload: { assignedStationId: testStationId },
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.success).toBe(true);
    expect(json.data.assignedStationId).toBe(testStationId);
  });

  it('POST /api/v1/conversations/:id/messages sends outbound text message', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/conversations/${testConversationId}/messages`,
      headers: { cookie: authCookie },
      payload: {
        text: 'أهلاً بك يا عمرو، معك خدمة عملاء ترينتي فيجن للرعاية الصحية',
        type: 'text',
      },
    });

    expect(res.statusCode).toBe(201);
    const json = JSON.parse(res.body);
    expect(json.success).toBe(true);
    expect(json.data.text).toBe('أهلاً بك يا عمرو، معك خدمة عملاء ترينتي فيجن للرعاية الصحية');
    expect(json.data.direction).toBe('outgoing');
    expect(json.data.senderType).toBe('employee');
  });

  it('GET /api/v1/conversations/:id/messages returns message history', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/conversations/${testConversationId}/messages`,
      headers: { cookie: authCookie },
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
  });

  it('POST /api/v1/media/upload uploads base64 file and generates URL', async () => {
    const fakeDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/media/upload',
      headers: { cookie: authCookie },
      payload: {
        dataUrl: fakeDataUrl,
        fileName: 'pixel.png',
        mimeType: 'image/png',
      },
    });

    expect(res.statusCode).toBe(201);
    const json = JSON.parse(res.body);
    expect(json.success).toBe(true);
    expect(json.data.url).toMatch(/^\/api\/v1\/media\//);
  });

  it('GET /api/v1/quick-replies lists quick replies', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/quick-replies',
      headers: { cookie: authCookie },
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it('PATCH /api/v1/leads/:id/stage updates pipeline stage', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/leads/${testLeadId}/stage`,
      headers: { cookie: authCookie },
      payload: { stage: 'qualified' },
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.success).toBe(true);
    expect(json.data.stage).toBe('qualified');
  });
});
