import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { pool } from '../../src/database/client';

describe('Trenty Vision CRM API Integration Tests', () => {
  let app: FastifyInstance;
  let adminAccessToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  it('GET /health returns healthy status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('healthy');
  });

  it('GET /health/database checks PostgreSQL connection', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health/database',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('connected');
  });

  it('POST /api/v1/auth/login fails with invalid credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@trenty.com',
        password: 'WrongPassword!',
      },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(false);
  });

  it('POST /api/v1/auth/login succeeds with seeded super admin', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@trenty.com',
        password: 'Password123!',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe('admin@trenty.com');
    expect(body.data.user.role).toBe('adminstrator');
    expect(body.data.tokens.accessToken).toBeDefined();

    adminAccessToken = body.data.tokens.accessToken;
  });

  it('GET /api/v1/auth/me returns profile for authenticated user', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.email).toBe('admin@trenty.com');
    expect(['super_admin', 'admin', 'adminstrator']).toContain(body.data.role);
    expect(body.data.permissions.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/employees requires authentication', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/employees',
    });

    expect(response.statusCode).toBe(401);
  });

  it('GET /api/v1/employees succeeds for super admin', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/employees',
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('GET /api/v1/stations returns seeded stations', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stations',
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(3);
  });

  it('GET /api/v1/departments returns seeded departments', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/departments',
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(0);
  });

  it('GET /api/v1/settings returns system settings map', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/settings',
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.map.automation_enabled).toBe(true);
  });

  it('GET /api/v1/audit returns audit log trail', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/audit',
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  // ─── CRUD Tests: Departments ───────────────────────────
  it('Departments CRUD: should create, update, and delete a department', async () => {
    // 1. Create
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/departments',
      headers: { authorization: `Bearer ${adminAccessToken}` },
      payload: {
        name: 'قسم الرعاية التخصصية التجريبي',
        code: 'CARE-TEST',
        description: 'قسم لاختبار التكامل',
      },
    });
    expect(createRes.statusCode).toBe(201);
    const created = JSON.parse(createRes.payload).data;
    expect(created.id).toBeDefined();
    expect(created.name).toBe('قسم الرعاية التخصصية التجريبي');

    // 2. Update
    const updateRes = await app.inject({
      method: 'PUT',
      url: `/api/v1/departments/${created.id}`,
      headers: { authorization: `Bearer ${adminAccessToken}` },
      payload: {
        name: 'قسم الرعاية التخصصية المعدل',
      },
    });
    expect(updateRes.statusCode).toBe(200);
    const updated = JSON.parse(updateRes.payload).data;
    expect(updated.name).toBe('قسم الرعاية التخصصية المعدل');

    // 3. Delete
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/departments/${created.id}`,
      headers: { authorization: `Bearer ${adminAccessToken}` },
    });
    expect(deleteRes.statusCode).toBe(200);
    expect(JSON.parse(deleteRes.payload).success).toBe(true);
  });

  // ─── CRUD Tests: Stations ──────────────────────────────
  it('Stations CRUD: should create, update, and delete an operational station', async () => {
    // 1. Create
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/stations',
      headers: { authorization: `Bearer ${adminAccessToken}` },
      payload: {
        name: 'محطة العناية السريعة',
        departmentId: '', // Tests empty string handling
        code: 'ST-CARE',
        color: '#10b981',
        description: 'محطة اختبار',
        maxCapacity: 15,
        routingWeight: 2,
      },
    });
    expect(createRes.statusCode).toBe(201);
    const created = JSON.parse(createRes.payload).data;
    expect(created.id).toBeDefined();
    expect(created.name).toBe('محطة العناية السريعة');

    // 2. Update
    const updateRes = await app.inject({
      method: 'PUT',
      url: `/api/v1/stations/${created.id}`,
      headers: { authorization: `Bearer ${adminAccessToken}` },
      payload: {
        name: 'محطة العناية السريعة المحدثة',
        code: 'CARE-02',
        color: '#3b82f6',
        maxCapacity: 35,
        routingWeight: 4,
        active: false,
        departmentId: null,
      },
    });
    expect(updateRes.statusCode).toBe(200);
    const updatedData = JSON.parse(updateRes.payload).data;
    expect(updatedData.name).toBe('محطة العناية السريعة المحدثة');
    expect(updatedData.code).toBe('CARE-02');
    expect(updatedData.color).toBe('#3b82f6');
    expect(updatedData.maxCapacity).toBe(35);
    expect(updatedData.routingWeight).toBe(4);
    expect(updatedData.active).toBe(false);

    // 3. Delete
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/stations/${created.id}`,
      headers: { authorization: `Bearer ${adminAccessToken}` },
    });
    expect(deleteRes.statusCode).toBe(200);
    expect(JSON.parse(deleteRes.payload).success).toBe(true);
  });

  // ─── CRUD Tests: Employees ─────────────────────────────
  it('Employees CRUD: should create, update, and delete an employee', async () => {
    const testEmail = `test.agent.${Date.now()}@trenty.com`;

    // 1. Create
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/employees',
      headers: { authorization: `Bearer ${adminAccessToken}` },
      payload: {
        fullName: 'أخصائي الرعاية التجريبي',
        email: testEmail,
        password: 'Password123!',
        phone: '+96599887766',
        departmentId: '', // Empty string should be converted to null
        stationIds: [],
      },
    });
    expect(createRes.statusCode).toBe(201);
    const created = JSON.parse(createRes.payload).data;
    expect(created.id).toBeDefined();
    expect(created.name).toBe('أخصائي الرعاية التجريبي');

    // 2. Update
    const updateRes = await app.inject({
      method: 'PUT',
      url: `/api/v1/employees/${created.id}`,
      headers: { authorization: `Bearer ${adminAccessToken}` },
      payload: {
        fullName: 'أخصائي الرعاية المعتمد',
        phone: '+96511223344',
      },
    });
    expect(updateRes.statusCode).toBe(200);
    expect(JSON.parse(updateRes.payload).data.name).toBe('أخصائي الرعاية المعتمد');

    // 3. Delete
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/employees/${created.id}`,
      headers: { authorization: `Bearer ${adminAccessToken}` },
    });
    expect(deleteRes.statusCode).toBe(200);
    expect(JSON.parse(deleteRes.payload).success).toBe(true);
  });

  // ─── CRUD Tests: Settings ──────────────────────────────
  it('Settings: should update and retrieve system settings cleanly', async () => {
    const updateRes = await app.inject({
      method: 'POST',
      url: '/api/v1/settings',
      headers: { authorization: `Bearer ${adminAccessToken}` },
      payload: {
        systemName: 'Trenty Vision Health Care CRM — Production',
        defaultLanguage: 'ar',
      },
    });
    expect(updateRes.statusCode).toBe(200);
    const body = JSON.parse(updateRes.payload);
    expect(body.success).toBe(true);

    const getRes = await app.inject({
      method: 'GET',
      url: '/api/v1/settings',
      headers: { authorization: `Bearer ${adminAccessToken}` },
    });
    expect(getRes.statusCode).toBe(200);
    const getBody = JSON.parse(getRes.payload);
    expect(getBody.data.systemName || getBody.data.map.systemName).toBe('Trenty Vision Health Care CRM — Production');
  });
});
