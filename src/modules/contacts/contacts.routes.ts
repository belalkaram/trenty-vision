import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, or, ilike, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../database/client';
import { contacts, conversations, leads } from '../../database/schema/index';
import { authenticate } from '../../middleware/auth.middleware';
import { validateAndFormatPhone } from '../../utils/phone.validator';
import { LandingSyncService } from '../../services/landing-sync.service';

const listContactsQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const updateContactSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function contactsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/contacts — Search and list contacts
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = listContactsQuerySchema.parse(request.query);

    let whereClause = undefined;
    if (query.search && query.search.trim() !== '') {
      const rawSearch = query.search.trim();
      const s = `%${rawSearch}%`;
      const searchConditions = [
        ilike(contacts.name, s),
        ilike(contacts.phoneNumber, s),
        ilike(contacts.whatsappJid, s),
      ];

      const cleanDigits = rawSearch.replace(/\D/g, '');
      if (cleanDigits.length >= 3) {
        searchConditions.push(ilike(contacts.phoneNumber, `%${cleanDigits}%`));
        const strippedZero = cleanDigits.replace(/^0+/, '');
        if (strippedZero.length >= 3 && strippedZero !== cleanDigits) {
          searchConditions.push(ilike(contacts.phoneNumber, `%${strippedZero}%`));
        }
      }

      const formatted = validateAndFormatPhone(rawSearch);
      if (formatted.isValid && formatted.e164) {
        searchConditions.push(ilike(contacts.phoneNumber, `%${formatted.e164}%`));
      }

      whereClause = or(...searchConditions);
    }

    const rows = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        phoneNumber: contacts.phoneNumber,
        whatsappJid: contacts.whatsappJid,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
      })
      .from(contacts)
      .where(whereClause)
      .orderBy(desc(contacts.updatedAt))
      .limit(query.limit)
      .offset(query.offset);

    // Fetch latest assigned employee for these contacts
    const contactIds = rows.map((r) => r.id);
    let enhancedRows = rows as any[];

    if (contactIds.length > 0) {
      const pgArrayLiteral = `{${contactIds.join(',')}}`;
      const latestConversations = await db.execute(sql`
        SELECT DISTINCT ON (c.contact_id)
          c.contact_id,
          u.name AS "assignedEmployeeName"
        FROM conversations c
        LEFT JOIN employees e ON c.assigned_employee_id = e.id
        LEFT JOIN users u ON e.user_id = u.id
        WHERE c.contact_id = ANY(${pgArrayLiteral}::uuid[])
        ORDER BY c.contact_id, c.created_at DESC
      `);

      const employeeMap = new Map();
      for (const row of latestConversations.rows as any[]) {
        employeeMap.set(row.contact_id, row.assignedEmployeeName);
      }

      enhancedRows = rows.map((r) => ({
        ...r,
        assignedEmployeeName: employeeMap.get(r.id) || null,
      }));
    }

    return reply.send({ success: true, data: enhancedRows });
  });

  /**
   * GET /api/v1/contacts/:id — Single contact detail with conversations & leads
   */
  app.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);

    if (!contact) {
      return reply.status(404).send({ success: false, error: 'Contact not found' });
    }

    const contactConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.contactId, id))
      .orderBy(desc(conversations.updatedAt));

    const contactLeads = await db
      .select()
      .from(leads)
      .where(eq(leads.contactId, id))
      .orderBy(desc(leads.createdAt));

    return reply.send({
      success: true,
      data: {
        ...contact,
        conversations: contactConversations,
        leads: contactLeads,
      },
    });
  });

  /**
   * PATCH /api/v1/contacts/:id — Update contact info
   */
  app.patch('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const parsed = updateContactSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: 'Invalid contact updates', details: parsed.error.format() });
    }

    const [existing] = await db
      .select({ metadata: contacts.metadata })
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ success: false, error: 'Contact not found' });
    }

    const mergedMetadata = parsed.data.metadata 
      ? { ...(existing.metadata as Record<string, any> || {}), ...parsed.data.metadata }
      : existing.metadata;

    const [updated] = await db
      .update(contacts)
      .set({ ...parsed.data, metadata: mergedMetadata, updatedAt: new Date() })
      .where(eq(contacts.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({ success: false, error: 'Contact not found' });
    }

    return reply.send({ success: true, data: updated });
  });

  /**
   * DELETE /api/v1/contacts/:id — Delete a contact
   */
  app.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    const [deleted] = await db
      .delete(contacts)
      .where(eq(contacts.id, id))
      .returning();

    if (!deleted) {
      return reply.status(404).send({ success: false, error: 'Contact not found' });
    }

    return reply.send({ success: true, data: { id } });
  });

  /**
   * POST /api/v1/contacts/:id/sync-landing — Manually sync a specific contact to Trinity Vision landing page
   */
  app.post('/:id/sync-landing', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);

    if (!contact) {
      return reply.status(404).send({ success: false, error: 'Contact not found' });
    }

    // Force re-sync by resetting trinityLandingSynced flag in copy
    const contactForSync = {
      ...contact,
      metadata: {
        ...(contact.metadata as any || {}),
        trinityLandingSynced: false,
      },
    };

    const result = await LandingSyncService.syncContact(contactForSync);
    return reply.send(result);
  });

  /**
   * POST /api/v1/contacts/sync-all-landing — Sync all unsynced contacts to Trinity Vision landing page
   */
  app.post('/sync-all-landing', async (_request: FastifyRequest, reply: FastifyReply) => {
    const allContacts = await db
      .select()
      .from(contacts)
      .limit(200);

    const unsynced = allContacts.filter(c => {
      const meta = (c.metadata || {}) as Record<string, any>;
      return meta.trinityLandingSynced !== true;
    });

    let syncedCount = 0;
    let failedCount = 0;

    for (const c of unsynced) {
      const res = await LandingSyncService.syncContact(c);
      if (res.success) {
        syncedCount++;
      } else {
        failedCount++;
      }
    }

    return reply.send({
      success: true,
      data: {
        totalEvaluated: unsynced.length,
        syncedCount,
        failedCount,
      },
    });
  });
}
