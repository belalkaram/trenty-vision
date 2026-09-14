import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../database/client';
import { quickReplies, departments } from '../../database/schema/index';
import { authenticate } from '../../middleware/auth.middleware';

const createQuickReplySchema = z.object({
  name: z.string().min(1, 'يرجى إدخال اسم للرد').max(150),
  shortcut: z
    .string()
    .min(1, 'يرجى إدخال اختصار للرد')
    .max(50)
    .transform((val) => (val.startsWith('/') ? val : `/${val}`))
    .refine((val) => /^\/[a-zA-Z0-9_\u0600-\u06FF-]+$/.test(val), {
      message: 'يجب ألا يحتوي الاختصار على مسافات أو رموز غير مدعومة',
    }),
  body: z.string().min(1, 'يرجى إدخال محتوى الرد'),
  departmentId: z.string().uuid().nullable().optional(),
});

export async function quickRepliesRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/quick-replies — List all active quick replies
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const rows = await db
      .select({
        id: quickReplies.id,
        name: quickReplies.name,
        shortcut: quickReplies.shortcut,
        body: quickReplies.body,
        departmentId: quickReplies.departmentId,
        departmentName: departments.name,
        active: quickReplies.active,
        createdAt: quickReplies.createdAt,
      })
      .from(quickReplies)
      .leftJoin(departments, eq(quickReplies.departmentId, departments.id))
      .where(eq(quickReplies.active, true))
      .orderBy(desc(quickReplies.createdAt));

    return reply.send({ success: true, data: rows });
  });

  /**
   * POST /api/v1/quick-replies — Create canned reply
   */
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = createQuickReplySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: 'Invalid quick reply payload', details: parsed.error.format() });
    }

    const [created] = await db
      .insert(quickReplies)
      .values({
        name: parsed.data.name,
        shortcut: parsed.data.shortcut.startsWith('/') ? parsed.data.shortcut : `/${parsed.data.shortcut}`,
        body: parsed.data.body,
        departmentId: parsed.data.departmentId || null,
        active: true,
      })
      .returning();

    return reply.status(201).send({ success: true, data: created });
  });

  /**
   * DELETE /api/v1/quick-replies/:id — Delete canned reply
   */
  app.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    const [deleted] = await db
      .delete(quickReplies)
      .where(eq(quickReplies.id, id))
      .returning();

    if (!deleted) {
      return reply.status(404).send({ success: false, error: 'Quick reply not found' });
    }

    return reply.send({ success: true, message: 'Quick reply deleted' });
  });
}
