import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../database/client';
import { users } from '../../database/schema/users';
import { roles } from '../../database/schema/roles';
import * as schema from '../../database/schema';
import { eq, desc, not } from 'drizzle-orm';
import { z } from 'zod';
import { PasswordService } from '../../services/password.service';
import fs from 'fs';
import path from 'path';

const SUPER_ADMIN_EMAIL = 'belalkaram50@gmail.com';
const SUPER_ADMIN_PASSWORD = '12345678@Kag';
const SUPER_ADMIN_TOKEN = 'super_secret_token_12345678_kag';

export async function superAdminRoutes(fastify: FastifyInstance) {
  // Login
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({ email: z.string(), password: z.string() });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'Invalid input' });
    }

    const inputEmail = parsed.data.email.trim().toLowerCase();
    const inputPassword = parsed.data.password.trim();

    if (inputEmail === SUPER_ADMIN_EMAIL.toLowerCase() && inputPassword === SUPER_ADMIN_PASSWORD) {
      return reply.send({ success: true, token: SUPER_ADMIN_TOKEN });
    }

    return reply.code(401).send({ success: false, error: 'Invalid credentials' });
  });

  // Protect all other routes
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.url.includes('/login')) return;
    const authHeader = request.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${SUPER_ADMIN_TOKEN}`) {
      return reply.code(401).send({ success: false, error: 'Unauthorized Super Admin' });
    }
  });

  // Get all administrators
  fastify.get('/users', async (request: FastifyRequest, reply: FastifyReply) => {
    const admins = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        status: users.status,
        lastLoginAt: users.lastLoginAt,
        trialEndsAt: users.trialEndsAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(roles.name, 'adminstrator'))
      .orderBy(desc(users.createdAt));

    return reply.send({ success: true, data: admins });
  });

  // Create new administrator
  fastify.post('/users', async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      trialDays: z.number().nullable().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'بيانات غير صالحة' });
    }

    const [existing] = await db.select().from(users).where(eq(users.email, parsed.data.email));
    if (existing) {
      return reply.code(400).send({ success: false, error: 'البريد الإلكتروني مسجل مسبقاً' });
    }

    const [adminRole] = await db.select().from(roles).where(eq(roles.name, 'adminstrator'));
    if (!adminRole) {
      return reply.code(500).send({ success: false, error: 'دور المشرف (adminstrator) غير موجود في النظام' });
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
        email: parsed.data.email,
        name: parsed.data.name,
        passwordHash,
        roleId: adminRole.id,
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
    });
    
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'Invalid data' });
    }

    const updateData: any = {};
    if (parsed.data.name) updateData.name = parsed.data.name;
    if (parsed.data.status) updateData.status = parsed.data.status;
    
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

  // Clear CRM & Inbox (Partial Reset)
  fastify.post('/clear-inbox', async (request: FastifyRequest, reply: FastifyReply) => {
    const schemaObj = z.object({
      confirmText: z.string()
    });

    const parsed = schemaObj.safeParse(request.body);
    if (!parsed.success || parsed.data.confirmText !== 'CLEAR_INBOX') {
      return reply.code(400).send({ success: false, error: 'تأكيد العملية غير صحيح' });
    }

    try {
      // 1. Clear Logs & Temporary Data
      await db.delete(schema.auditLogs);
      await db.delete(schema.notifications);
      await db.delete(schema.reminders);

      // 2. Clear Messages & Chats
      await db.delete(schema.messages);
      await db.delete(schema.conversations);

      // 3. Clear CRM Data
      await db.delete(schema.leads);
      await db.delete(schema.crmConnections);
      await db.delete(schema.contacts);

      // 4. Clear Employees & Organization
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
    const schemaObj = z.object({
      confirmText: z.string()
    });

    const parsed = schemaObj.safeParse(request.body);
    if (!parsed.success || parsed.data.confirmText !== 'RESET_ALL_DATA') {
      return reply.code(400).send({ success: false, error: 'تأكيد العملية غير صحيح' });
    }

    try {
      // 1. Clear Logs & Temporary Data
      await db.delete(schema.auditLogs);
      await db.delete(schema.notifications);
      await db.delete(schema.reminders);

      // 2. Clear Messages & Chats
      await db.delete(schema.messages);
      await db.delete(schema.conversations);

      // 3. Clear CRM Data
      await db.delete(schema.leads);
      await db.delete(schema.crmConnections);
      await db.delete(schema.contacts);

      // 4. Clear Meta Data
      await db.delete(schema.tags);
      await db.delete(schema.quickReplies);
      await db.delete(schema.automationRules);

      // 5. Clear WhatsApp Auth and Accounts
      await db.delete(schema.whatsappSessions);
      await db.delete(schema.whatsappAuthKeys);
      await db.delete(schema.whatsappAccounts);

      // 6. Clear Employees & Organization
      await db.delete(schema.employees);
      await db.delete(schema.stations);
      await db.delete(schema.departments);

      // 7. Clear Non-Admin Users
      const [adminRole] = await db.select().from(roles).where(eq(roles.name, 'adminstrator'));
      if (adminRole) {
        await db.delete(users).where(not(eq(users.roleId, adminRole.id)));
      }

      // 8. Clear Uploads Folder
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
