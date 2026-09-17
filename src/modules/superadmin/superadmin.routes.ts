import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../database/client';
import { users } from '../../database/schema/users';
import { roles } from '../../database/schema/roles';
import { companies } from '../../database/schema/companies';
import * as schema from '../../database/schema';
import { eq, desc, not, count, sql } from 'drizzle-orm';
import { z } from 'zod';
import { PasswordService } from '../../services/password.service';
import { CompanyProvisioningService } from './company-provisioning.service';
import fs from 'fs';
import path from 'path';

const SUPER_ADMIN_EMAIL = 'belalkaram50@gmail.com';
const SUPER_ADMIN_PASSWORD = '12345678@Kag';
const SUPER_ADMIN_TOKEN = 'super_secret_token_12345678_kag';

export async function superAdminRoutes(fastify: FastifyInstance) {
  // Login
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const loginSchema = z.object({ email: z.string(), password: z.string() });
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'Invalid input' });
    }

    const inputEmail = parsed.data.email.trim().toLowerCase();
    const inputPassword = parsed.data.password.trim();

    if (inputEmail === SUPER_ADMIN_EMAIL.toLowerCase() && inputPassword === SUPER_ADMIN_PASSWORD) {
      return reply.send({
        success: true,
        token: SUPER_ADMIN_TOKEN,
        user: {
          email: SUPER_ADMIN_EMAIL,
          name: 'Super Admin',
          role: 'superadmin',
          isSuperAdmin: true,
        },
      });
    }

    return reply.code(401).send({ success: false, error: 'Invalid credentials' });
  });

  // Protect all other routes with Super Admin token
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.url.includes('/login')) return;
    const authHeader = request.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${SUPER_ADMIN_TOKEN}`) {
      return reply.code(401).send({ success: false, error: 'Unauthorized Super Admin' });
    }
  });

  // ==========================================
  // Companies Management (Multi-Tenant Hub)
  // ==========================================

  // List all companies with aggregate statistics
  fastify.get('/companies', async (request: FastifyRequest, reply: FastifyReply) => {
    const allCompanies = await db
      .select({
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        logoUrl: companies.logoUrl,
        status: companies.status,
        subscriptionPlan: companies.subscriptionPlan,
        maxUsers: companies.maxUsers,
        timezone: companies.timezone,
        settings: companies.settings,
        createdAt: companies.createdAt,
        updatedAt: companies.updatedAt,
      })
      .from(companies)
      .orderBy(desc(companies.createdAt));

    // Gather counts per company
    const userCounts = await db
      .select({
        companyId: users.companyId,
        count: count(users.id),
      })
      .from(users)
      .groupBy(users.companyId);

    const contactCounts = await db
      .select({
        companyId: schema.contacts.companyId,
        count: count(schema.contacts.id),
      })
      .from(schema.contacts)
      .groupBy(schema.contacts.companyId);

    const convCounts = await db
      .select({
        companyId: schema.conversations.companyId,
        count: count(schema.conversations.id),
      })
      .from(schema.conversations)
      .groupBy(schema.conversations.companyId);

    const userCountMap = new Map(userCounts.map((u) => [u.companyId, Number(u.count)]));
    const contactCountMap = new Map(contactCounts.map((c) => [c.companyId, Number(c.count)]));
    const convCountMap = new Map(convCounts.map((c) => [c.companyId, Number(c.count)]));

    const result = allCompanies.map((c) => ({
      ...c,
      usersCount: userCountMap.get(c.id) || 0,
      contactsCount: contactCountMap.get(c.id) || 0,
      conversationsCount: convCountMap.get(c.id) || 0,
    }));

    return reply.send({ success: true, data: result });
  });

  // Create a new company with automated provisioning (roles, permissions, admin user)
  fastify.post('/companies', async (request: FastifyRequest, reply: FastifyReply) => {
    const createSchema = z.object({
      name: z.string().min(2, 'Company name is required'),
      slug: z.string().optional(),
      logoUrl: z.string().optional(),
      status: z.enum(['active', 'suspended', 'inactive']).optional(),
      subscriptionPlan: z.string().optional(),
      maxUsers: z.number().optional(),
      timezone: z.string().optional(),
      adminName: z.string().optional(),
      adminEmail: z.string().email().optional(),
      adminPassword: z.string().min(6).optional(),
    });

    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'بيانات غير صالحة', details: parsed.error.format() });
    }

    try {
      const provisioned = await CompanyProvisioningService.provisionCompany(parsed.data);
      return reply.send({ success: true, data: provisioned });
    } catch (err: any) {
      request.log.error({ err }, 'Company provisioning failed');
      return reply.code(err.statusCode || 500).send({ success: false, error: err.message || 'فشل إنشاء الشركة' });
    }
  });

  // Get single company details with users and roles
  fastify.get('/companies/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, request.params.id));

    if (!company) {
      return reply.code(404).send({ success: false, error: 'الشركة غير موجودة' });
    }

    const companyUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        status: users.status,
        roleId: users.roleId,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.companyId, company.id));

    const companyRoles = await db
      .select({
        id: roles.id,
        name: roles.name,
        displayName: roles.displayName,
      })
      .from(roles)
      .where(eq(roles.companyId, company.id));

    return reply.send({
      success: true,
      data: {
        ...company,
        users: companyUsers,
        roles: companyRoles,
      },
    });
  });

  // Update company details (Name, Logo, Status, Subscription, etc.)
  fastify.patch('/companies/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const updateSchema = z.object({
      name: z.string().min(2).optional(),
      slug: z.string().optional(),
      logoUrl: z.string().nullable().optional(),
      status: z.enum(['active', 'suspended', 'inactive']).optional(),
      subscriptionPlan: z.string().optional(),
      maxUsers: z.number().optional(),
      timezone: z.string().optional(),
      settings: z.record(z.any()).optional(),
    });

    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'بيانات غير صالحة', details: parsed.error.format() });
    }

    const [updated] = await db
      .update(companies)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, request.params.id))
      .returning();

    if (!updated) {
      return reply.code(404).send({ success: false, error: 'الشركة غير موجودة' });
    }

    return reply.send({ success: true, data: updated });
  });

  // Delete company and all its cascaded data
  fastify.delete('/companies/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const [deleted] = await db
      .delete(companies)
      .where(eq(companies.id, request.params.id))
      .returning();

    if (!deleted) {
      return reply.code(404).send({ success: false, error: 'الشركة غير موجودة' });
    }

    return reply.send({ success: true, data: deleted });
  });

  // Update company logo directly
  fastify.post('/companies/:id/logo', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const logoSchema = z.object({
      logoUrl: z.string().min(1, 'Logo URL or Base64 is required'),
    });

    const parsed = logoSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'رابط الشعار مطلوب' });
    }

    const [updated] = await db
      .update(companies)
      .set({
        logoUrl: parsed.data.logoUrl,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, request.params.id))
      .returning();

    if (!updated) {
      return reply.code(404).send({ success: false, error: 'الشركة غير موجودة' });
    }

    return reply.send({ success: true, data: updated });
  });

  // Add user to a specific company
  fastify.post('/companies/:id/users', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const userSchema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      roleName: z.enum(['adminstrator', 'employer']).optional().default('adminstrator'),
    });

    const parsed = userSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'بيانات غير صالحة' });
    }

    const [existing] = await db.select().from(users).where(eq(users.email, parsed.data.email.trim().toLowerCase()));
    if (existing) {
      return reply.code(400).send({ success: false, error: 'البريد الإلكتروني مسجل مسبقاً' });
    }

    // Find role for this specific company
    const [companyRole] = await db
      .select()
      .from(roles)
      .where(
        sql`${roles.companyId} = ${request.params.id} AND ${roles.name} = ${parsed.data.roleName}`
      );

    const passwordHash = await PasswordService.hash(parsed.data.password);

    const [newUser] = await db
      .insert(users)
      .values({
        companyId: request.params.id,
        email: parsed.data.email.trim().toLowerCase(),
        name: parsed.data.name,
        passwordHash,
        roleId: companyRole ? companyRole.id : undefined,
        status: 'active',
        emailVerified: true,
      })
      .returning();

    return reply.send({ success: true, data: newUser });
  });

  // ==========================================
  // Global Users Management (Backwards Compatibility)
  // ==========================================

  // Get all administrators across all companies
  fastify.get('/users', async (request: FastifyRequest, reply: FastifyReply) => {
    const admins = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        status: users.status,
        companyId: users.companyId,
        companyName: companies.name,
        lastLoginAt: users.lastLoginAt,
        trialEndsAt: users.trialEndsAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(companies, eq(users.companyId, companies.id))
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(sql`${roles.name} = 'adminstrator' OR ${users.companyId} IS NULL`)
      .orderBy(desc(users.createdAt));

    return reply.send({ success: true, data: admins });
  });

  // Create new user/admin
  fastify.post('/users', async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      companyId: z.string().uuid().nullable().optional().or(z.literal('')),
      trialDays: z.number().nullable().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'بيانات غير صالحة' });
    }

    const [existing] = await db.select().from(users).where(eq(users.email, parsed.data.email.trim().toLowerCase()));
    if (existing) {
      return reply.code(400).send({ success: false, error: 'البريد الإلكتروني مسجل مسبقاً' });
    }

    let roleId: string | null = null;
    let companyIdToSave = parsed.data.companyId && parsed.data.companyId !== '' ? parsed.data.companyId : null;
    
    if (companyIdToSave) {
      const [compRole] = await db
        .select()
        .from(roles)
        .where(sql`${roles.companyId} = ${companyIdToSave} AND ${roles.name} = 'adminstrator'`);
      if (compRole) roleId = compRole.id;
    }

    const passwordHash = await PasswordService.hash(parsed.data.password);

    let trialEndsAt: Date | null = null;
    if (parsed.data.trialDays !== undefined && parsed.data.trialDays !== null) {
      const d = new Date();
      d.setDate(d.getDate() + parsed.data.trialDays);
      trialEndsAt = d;
    }

    const [newUser] = await db
      .insert(users)
      .values({
        companyId: companyIdToSave,
        email: parsed.data.email.trim().toLowerCase(),
        name: parsed.data.name,
        passwordHash,
        roleId,
        status: 'active',
        trialEndsAt,
      })
      .returning();

    return reply.send({ success: true, data: newUser });
  });

  // Update trial days or status
  fastify.patch('/users/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const schema = z.object({
      name: z.string().optional(),
      status: z.enum(['active', 'inactive', 'suspended']).optional(),
      trialDays: z.number().nullable().optional(),
      companyId: z.string().uuid().nullable().optional().or(z.literal('')),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'Invalid data' });
    }

    const updateData: any = {};
    if (parsed.data.name) updateData.name = parsed.data.name;
    if (parsed.data.status) updateData.status = parsed.data.status;
    if (parsed.data.companyId !== undefined) {
      const newCompanyId = parsed.data.companyId === '' ? null : parsed.data.companyId;
      updateData.companyId = newCompanyId;
      
      // Update role based on new company
      if (newCompanyId) {
        const [compRole] = await db
          .select()
          .from(roles)
          .where(sql`${roles.companyId} = ${newCompanyId} AND ${roles.name} = 'adminstrator'`);
        if (compRole) {
          updateData.roleId = compRole.id;
        }
      } else {
        updateData.roleId = null; // Global admin
      }
    }

    if (parsed.data.trialDays !== undefined) {
      if (parsed.data.trialDays === null) {
        updateData.trialEndsAt = null;
      } else {
        const d = new Date();
        d.setDate(d.getDate() + parsed.data.trialDays);
        updateData.trialEndsAt = d;
      }
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, request.params.id))
      .returning();

    if (!updated) {
      return reply.code(404).send({ success: false, error: 'User not found' });
    }

    return reply.send({ success: true, data: updated });
  });

  // Delete user
  fastify.delete('/users/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const [deleted] = await db
      .delete(users)
      .where(eq(users.id, request.params.id))
      .returning();

    if (!deleted) {
      return reply.code(404).send({ success: false, error: 'User not found' });
    }

    return reply.send({ success: true, data: deleted });
  });

  // Clear Company Data or System Reset
  fastify.post('/clear-company-data', async (request: FastifyRequest, reply: FastifyReply) => {
    const schemaObj = z.object({
      companyId: z.string().uuid(),
      confirmText: z.string(),
    });

    const parsed = schemaObj.safeParse(request.body);
    if (!parsed.success || parsed.data.confirmText !== 'تفريغ') {
      return reply.code(400).send({ success: false, error: 'تأكيد العملية غير صحيح' });
    }

    const compId = parsed.data.companyId;

    try {
      // Clear data for this company specifically
      await db.delete(schema.auditLogs).where(eq(schema.auditLogs.companyId, compId));
      await db.delete(schema.notifications).where(eq(schema.notifications.companyId, compId));
      await db.delete(schema.reminders).where(eq(schema.reminders.companyId, compId));
      await db.delete(schema.messages).where(
        sql`${schema.messages.conversationId} IN (SELECT id FROM conversations WHERE company_id = ${compId})`
      );
      await db.delete(schema.conversations).where(eq(schema.conversations.companyId, compId));
      await db.delete(schema.leads).where(eq(schema.leads.companyId, compId));
      await db.delete(schema.contacts).where(eq(schema.contacts.companyId, compId));
      await db.delete(schema.employees).where(eq(schema.employees.companyId, compId));
      await db.delete(schema.stations).where(eq(schema.stations.companyId, compId));
      await db.delete(schema.departments).where(eq(schema.departments.companyId, compId));
      await db.delete(schema.whatsappAccounts).where(eq(schema.whatsappAccounts.companyId, compId));

      return reply.send({ success: true, message: 'تم تفريغ بيانات الشركة المحددة بنجاح' });
    } catch (err: any) {
      request.log.error({ err }, 'Clear company data failed');
      return reply.code(500).send({ success: false, error: 'حدث خطأ أثناء تفريغ البيانات' });
    }
  });

  // Clear CRM & Inbox (Partial Reset)
  fastify.post('/clear-inbox', async (request: FastifyRequest, reply: FastifyReply) => {
    const schemaObj = z.object({ confirmText: z.string() });
    const parsed = schemaObj.safeParse(request.body);
    if (!parsed.success || parsed.data.confirmText !== 'تفريغ') {
      return reply.code(400).send({ success: false, error: 'تأكيد العملية غير صحيح' });
    }

    try {
      await db.delete(schema.auditLogs);
      await db.delete(schema.notifications);
      await db.delete(schema.reminders);
      await db.delete(schema.messages);
      await db.delete(schema.conversations);
      await db.delete(schema.leads);
      await db.delete(schema.crmConnections);
      await db.delete(schema.contacts);
      await db.delete(schema.employees);
      await db.delete(schema.stations);
      await db.delete(schema.departments);
      return reply.send({ success: true, message: 'تم تفريغ صندوق المحادثات وبيانات الموظفين بنجاح' });
    } catch (err: any) {
      request.log.error({ err }, 'Clear inbox failed');
      return reply.code(500).send({ success: false, error: 'حدث خطأ أثناء التفريغ. يرجى مراجعة سجلات الخادم.' });
    }
  });

  // Factory Reset
  fastify.post('/factory-reset', async (request: FastifyRequest, reply: FastifyReply) => {
    const schemaObj = z.object({ confirmText: z.string() });
    const parsed = schemaObj.safeParse(request.body);
    if (!parsed.success || parsed.data.confirmText !== 'حذف شامل') {
      return reply.code(400).send({ success: false, error: 'تأكيد العملية غير صحيح' });
    }

    try {
      await db.delete(schema.auditLogs);
      await db.delete(schema.notifications);
      await db.delete(schema.reminders);
      await db.delete(schema.messages);
      await db.delete(schema.conversations);
      await db.delete(schema.leads);
      await db.delete(schema.crmConnections);
      await db.delete(schema.contacts);
      await db.delete(schema.tags);
      await db.delete(schema.quickReplies);
      await db.delete(schema.automationRules);
      await db.delete(schema.whatsappSessions);
      await db.delete(schema.whatsappAuthKeys);
      await db.delete(schema.whatsappAccounts);
      await db.delete(schema.employees);
      await db.delete(schema.stations);
      await db.delete(schema.departments);
      
      const [adminRole] = await db.select().from(roles).where(eq(roles.name, 'adminstrator'));
      if (adminRole) {
        await db.delete(users).where(not(eq(users.roleId, adminRole.id)));
      }

      const uploadsPath = path.resolve(process.cwd(), 'storage', 'uploads');
      if (fs.existsSync(uploadsPath)) {
        const files = fs.readdirSync(uploadsPath);
        for (const file of files) {
          if (file !== '.gitkeep') {
            fs.unlinkSync(path.join(uploadsPath, file));
          }
        }
      }

      return reply.send({ success: true, message: 'تم إعادة ضبط المصنع بنجاح' });
    } catch (err: any) {
      request.log.error({ err }, 'Factory reset failed');
      return reply.code(500).send({ success: false, error: 'حدث خطأ أثناء ضبط المصنع. يرجى مراجعة سجلات الخادم.' });
    }
  });
}
