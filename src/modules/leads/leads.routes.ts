import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../database/client';
import { leads, contacts, stations, employees, users, companies } from '../../database/schema/index';
import { authenticate, requireCrmCompany } from '../../middleware/auth.middleware';
import { wsHub } from '../../websocket/ws.hub';

const leadStages = ['new', 'contacted', 'qualified', 'waiting', 'converted', 'lost'] as const;

const listLeadsQuerySchema = z.object({
  stage: z.enum(leadStages).optional(),
  stationId: z.string().uuid().optional(),
  assignedEmployeeId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const createLeadSchema = z.object({
  contactId: z.string().uuid(),
  source: z.string().optional(),
  campaign: z.string().optional(),
  destination: z.string().optional(),
  travelDate: z.string().optional(),
  stage: z.enum(leadStages).default('new'),
  stationId: z.string().uuid().optional(),
  assignedEmployeeId: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
});

const updateStageSchema = z.object({
  stage: z.enum(leadStages),
});

const updateLeadSchema = z.object({
  destination: z.string().optional(),
  travelDate: z.string().optional(),
  campaign: z.string().optional(),
  assignedEmployeeId: z.string().uuid().nullable().optional(),
  stationId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function leadsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireCrmCompany);

  /**
   * GET /api/v1/leads — List leads with filters for current company
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = listLeadsQuerySchema.parse(request.query);
    const companyId = request.companyId || request.user?.companyId;

    const conditions = [];
    if (companyId) conditions.push(eq(leads.companyId, companyId));
    if (query.stage) conditions.push(eq(leads.stage, query.stage));
    if (query.stationId) conditions.push(eq(leads.stationId, query.stationId));
    if (query.assignedEmployeeId) conditions.push(eq(leads.assignedEmployeeId, query.assignedEmployeeId));
    if (query.contactId) conditions.push(eq(leads.contactId, query.contactId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: leads.id,
        source: leads.source,
        campaign: leads.campaign,
        destination: leads.destination,
        travelDate: leads.travelDate,
        stage: leads.stage,
        metadata: leads.metadata,
        createdAt: leads.createdAt,
        updatedAt: leads.updatedAt,
        contact: {
          id: contacts.id,
          name: contacts.name,
          phoneNumber: contacts.phoneNumber,
        },
        station: {
          id: stations.id,
          name: stations.name,
        },
        assignedEmployee: {
          id: employees.id,
          name: users.name,
        },
      })
      .from(leads)
      .innerJoin(contacts, eq(leads.contactId, contacts.id))
      .leftJoin(stations, eq(leads.stationId, stations.id))
      .leftJoin(employees, eq(leads.assignedEmployeeId, employees.id))
      .leftJoin(users, eq(employees.userId, users.id))
      .where(whereClause)
      .orderBy(desc(leads.createdAt))
      .limit(query.limit)
      .offset(query.offset);

    return reply.send({ success: true, data: rows });
  });

  /**
   * POST /api/v1/leads — Create lead for contact
   */
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = createLeadSchema.parse(request.body);
    let targetCompanyId = request.companyId || request.user?.companyId;
    if (!targetCompanyId) {
      const [firstComp] = await db.select().from(companies).limit(1);
      targetCompanyId = firstComp?.id;
    }

    const [created] = await db
      .insert(leads)
      .values({
        ...parsed,
        companyId: targetCompanyId,
      })
      .returning();

    wsHub.broadcast('lead.created', created);
    return reply.status(201).send({ success: true, data: created });
  });

  /**
   * PATCH /api/v1/leads/:id/stage — Advance or change lead pipeline stage
   */
  app.patch('/:id/stage', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const companyId = request.companyId || request.user?.companyId;
    const parsed = updateStageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: 'Invalid stage', details: parsed.error.format() });
    }

    const condition = companyId
      ? and(eq(leads.id, id), eq(leads.companyId, companyId))
      : eq(leads.id, id);

    const [updated] = await db
      .update(leads)
      .set({ stage: parsed.data.stage, updatedAt: new Date() })
      .where(condition)
      .returning();

    if (!updated) {
      return reply.status(404).send({ success: false, error: 'Lead not found' });
    }

    wsHub.broadcast('lead.updated', { leadId: id, stage: parsed.data.stage });
    return reply.send({ success: true, data: updated });
  });

  /**
   * PATCH /api/v1/leads/:id — Update lead info
   */
  app.patch('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const companyId = request.companyId || request.user?.companyId;
    const parsed = updateLeadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: 'Invalid lead update', details: parsed.error.format() });
    }

    const condition = companyId
      ? and(eq(leads.id, id), eq(leads.companyId, companyId))
      : eq(leads.id, id);

    const [updated] = await db
      .update(leads)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(condition)
      .returning();

    if (!updated) {
      return reply.status(404).send({ success: false, error: 'Lead not found' });
    }

    return reply.send({ success: true, data: updated });
  });
}
