import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, sql, desc, gte } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  conversations,
  messages,
  contacts,
  leads,
  employees,
  users,
  stations,
} from '../../database/schema/index';
import { authenticate } from '../../middleware/auth.middleware';
import { logger } from '../../utils/logger';

function escapeCsv(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value).replace(/"/g, '""');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str}"`;
  }
  return str;
}

function getPeriodDate(period?: string): Date | null {
  if (!period || period === 'all') return null;
  const now = new Date();
  if (period === 'today') {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    return today;
  }
  if (period === '24h') {
    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  if (period === '7d') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (period === '30d') {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  if (period === 'this_month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return null;
}

export async function reportsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  /**
   * Aggregated metrics for operations & dashboard
   */
  async function getMetricsData(period?: string, companyId?: string) {
    const fromDate = getPeriodDate(period);

    // 1. Conversations breakdown
    const convConds = [];
    if (companyId) convConds.push(sql`company_id = ${companyId}`);
    if (fromDate) convConds.push(sql`created_at >= ${fromDate}`);
    const convWhere = convConds.length > 0 ? sql`WHERE ${sql.join(convConds, sql` AND `)}` : sql``;

    const convResult = await db.execute(sql`
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'open') AS open,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE status = 'waiting') AS waiting,
        COUNT(*) FILTER (WHERE status = 'closed') AS closed
      FROM conversations
      ${convWhere}
    `);
    const convStats = convResult.rows[0] as any;

    // 2. Messages breakdown
    const msgConds = [];
    if (companyId) msgConds.push(sql`conversation_id IN (SELECT id FROM conversations WHERE company_id = ${companyId})`);
    if (fromDate) msgConds.push(sql`created_at >= ${fromDate}`);
    const msgWhere = msgConds.length > 0 ? sql`WHERE ${sql.join(msgConds, sql` AND `)}` : sql``;

    const msgResult = await db.execute(sql`
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE direction = 'incoming') AS incoming,
        COUNT(*) FILTER (WHERE direction = 'outgoing') AS outgoing
      FROM messages
      ${msgWhere}
    `);
    const msgStats = msgResult.rows[0] as any;

    // 3. Contacts total
    const contactConds = [];
    if (companyId) contactConds.push(sql`company_id = ${companyId}`);
    if (fromDate) contactConds.push(sql`created_at >= ${fromDate}`);
    const contactWhere = contactConds.length > 0 ? sql`WHERE ${sql.join(contactConds, sql` AND `)}` : sql``;

    const contactResult = await db.execute(sql`
      SELECT COUNT(*) AS total
      FROM contacts
      ${contactWhere}
    `);
    const contactStats = contactResult.rows[0] as any;

    // 4. Leads funnel breakdown
    const leadConds = [];
    if (companyId) leadConds.push(sql`company_id = ${companyId}`);
    if (fromDate) leadConds.push(sql`created_at >= ${fromDate}`);
    const leadWhere = leadConds.length > 0 ? sql`WHERE ${sql.join(leadConds, sql` AND `)}` : sql``;

    const leadResult = await db.execute(sql`
      SELECT stage, COUNT(*) AS count
      FROM leads
      ${leadWhere}
      GROUP BY stage
    `);

    const funnel: Record<string, number> = {
      new: 0,
      contacted: 0,
      qualified: 0,
      waiting: 0,
      converted: 0,
      lost: 0,
    };
    for (const r of leadResult.rows as any[]) {
      if (r.stage) funnel[r.stage] = Number(r.count || 0);
    }

    // 5. Avg response time overall
    const avgRespConds = [sql`m_in.direction = 'incoming'`];
    if (companyId) avgRespConds.push(sql`m_in.conversation_id IN (SELECT id FROM conversations WHERE company_id = ${companyId})`);
    if (fromDate) avgRespConds.push(sql`m_in.created_at >= ${fromDate}`);
    const avgRespWhere = sql`WHERE ${sql.join(avgRespConds, sql` AND `)}`;

    const avgRespResult = await db.execute(sql`
      WITH message_pairs AS (
        SELECT 
          m_in.id,
          m_in.conversation_id,
          m_in.created_at AS in_time,
          MIN(m_out.created_at) AS out_time
        FROM messages m_in
        INNER JOIN messages m_out 
          ON m_in.conversation_id = m_out.conversation_id
          AND m_out.direction = 'outgoing'
          AND m_out.created_at > m_in.created_at
        ${avgRespWhere}
        GROUP BY m_in.id, m_in.conversation_id, m_in.created_at
      )
      SELECT 
        COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (out_time - in_time)))), 0) AS avg_response_seconds
      FROM message_pairs
    `);
    const avgResp = avgRespResult.rows[0] as any;

    // 6. Stations distribution
    const stationConds = [sql`s.active = true OR s.active IS NULL`];
    if (companyId) stationConds.push(sql`s.company_id = ${companyId}`);
    const stationWhere = sql`WHERE ${sql.join(stationConds, sql` AND `)}`;

    const stationsResult = await db.execute(sql`
      SELECT 
        s.id,
        s.name,
        s.color,
        COUNT(c.id) AS total_conversations,
        COUNT(c.id) FILTER (WHERE c.status = 'open') AS open_conversations
      FROM stations s
      LEFT JOIN conversations c ON s.id = c.assigned_station_id ${fromDate ? sql`AND c.created_at >= ${fromDate}` : sql``}
      ${stationWhere}
      GROUP BY s.id, s.name, s.color
      ORDER BY total_conversations DESC, s.name ASC
    `);

    // 7. Employees performance
    const empConds = [];
    if (companyId) empConds.push(sql`e.company_id = ${companyId}`);
    const empWhere = empConds.length > 0 ? sql`WHERE ${sql.join(empConds, sql` AND `)}` : sql``;

    const employeesResult = await db.execute(sql`
      WITH employee_convs AS (
        SELECT 
          assigned_employee_id,
          COUNT(id) AS total_assigned,
          COUNT(id) FILTER (WHERE status = 'closed') AS total_resolved
        FROM conversations
        ${convWhere}
        GROUP BY assigned_employee_id
      ),
      employee_msgs AS (
        SELECT 
          sender_user_id,
          COUNT(id) AS outgoing_messages
        FROM messages
        ${msgWhere ? sql`${msgWhere} AND direction = 'outgoing'` : sql`WHERE direction = 'outgoing'`}
        GROUP BY sender_user_id
      ),
      employee_resp AS (
        WITH emp_pairs AS (
          SELECT 
            c.assigned_employee_id,
            m_in.id,
            m_in.created_at AS in_time,
            MIN(m_out.created_at) AS out_time
          FROM messages m_in
          INNER JOIN conversations c ON m_in.conversation_id = c.id
          INNER JOIN messages m_out 
            ON m_in.conversation_id = m_out.conversation_id
            AND m_out.direction = 'outgoing'
            AND m_out.created_at > m_in.created_at
          ${avgRespWhere}
          GROUP BY c.assigned_employee_id, m_in.id, m_in.created_at
        )
        SELECT 
          assigned_employee_id,
          COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (out_time - in_time)))), 0) AS avg_seconds
        FROM emp_pairs
        GROUP BY assigned_employee_id
      )
      SELECT 
        e.id,
        e.status,
        u.name,
        u.email,
        s.name AS station_name,
        COALESCE(ec.total_assigned, 0) AS total_assigned,
        COALESCE(ec.total_resolved, 0) AS total_resolved,
        COALESCE(em.outgoing_messages, 0) AS outgoing_messages,
        COALESCE(er.avg_seconds, 0) AS avg_response_seconds
      FROM employees e
      INNER JOIN users u ON e.user_id = u.id
      LEFT JOIN stations s ON e.station_id = s.id
      LEFT JOIN employee_convs ec ON e.id = ec.assigned_employee_id
      LEFT JOIN employee_msgs em ON u.id = em.sender_user_id
      LEFT JOIN employee_resp er ON e.id = er.assigned_employee_id
      ${empWhere}
      ORDER BY total_assigned DESC, u.name ASC
    `);

    const totalConvs = Number(convStats?.total || 0);
    const closedConvs = Number(convStats?.closed || 0);
    const resolutionRate = totalConvs > 0 ? Math.round((closedConvs / totalConvs) * 100) : 0;
    const employeeRows = employeesResult.rows as any[];
    const stationRows = stationsResult.rows as any[];

    return {
      overview: {
        totalConversations: totalConvs,
        openConversations: Number(convStats?.open || 0),
        pendingConversations: Number(convStats?.pending || 0),
        waitingConversations: Number(convStats?.waiting || 0),
        closedConversations: closedConvs,
        resolvedConversations: closedConvs,
        resolutionRate,
        totalMessages: Number(msgStats?.total || 0),
        totalMessagesSent: Number(msgStats?.outgoing || 0),
        totalMessagesReceived: Number(msgStats?.incoming || 0),
        incomingMessages: Number(msgStats?.incoming || 0),
        outgoingMessages: Number(msgStats?.outgoing || 0),
        totalContacts: Number(contactStats?.total || 0),
        activeAgentsCount: employeeRows.filter((e) => e.status === 'active').length,
        avgResponseTimeSeconds: Number(avgResp?.avg_response_seconds || 0),
      },
      leadsFunnel: funnel,
      stations: stationRows.map((s) => ({
        id: s.id,
        stationId: s.id,
        name: s.name,
        stationName: s.name,
        color: s.color || '#1c9770',
        totalChats: Number(s.total_conversations || 0),
        activeChats: Number(s.open_conversations || 0),
        totalConversations: Number(s.total_conversations || 0),
        openConversations: Number(s.open_conversations || 0),
        conversationCount: Number(s.total_conversations || 0),
      })),
      employees: employeeRows.map((e) => {
        const avgSecs = Number(e.avg_response_seconds || 0);
        return {
          id: e.id,
          agentId: e.id,
          name: e.name,
          agentName: e.name,
          email: e.email,
          status: e.status,
          stationName: e.station_name || 'غير مسند',
          totalAssigned: Number(e.total_assigned || 0),
          assignedConversations: Number(e.total_assigned || 0),
          totalResolved: Number(e.total_resolved || 0),
          closedConversations: Number(e.total_resolved || 0),
          resolvedConversations: Number(e.total_resolved || 0),
          outgoingMessages: Number(e.outgoing_messages || 0),
          avgResponseTimeSeconds: avgSecs,
          avgResponseMinutes: Math.round(avgSecs / 60),
          onlineHours: e.status === 'active' ? 8 : 0,
        };
      }),
    };
  }

  /**
   * GET /api/v1/reports/metrics — Aggregated metrics for operations & dashboard
   */
  app.get('/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const period = (request.query as any)?.period;
      const companyId = (request as any).user?.companyId;
      const data = await getMetricsData(period, companyId);
      return reply.send({ success: true, data });
    } catch (err: any) {
      logger.error({ err }, 'Failed to fetch reports metrics');
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  /**
   * GET /api/v1/reports/overview — Overview metrics
   */
  app.get('/overview', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const period = (request.query as any)?.period;
      const companyId = (request as any).user?.companyId;
      const data = await getMetricsData(period, companyId);
      return reply.send({ success: true, data: data.overview });
    } catch (err: any) {
      logger.error({ err }, 'Failed to fetch overview metrics');
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  /**
   * GET /api/v1/reports/agents — Agent performance metrics
   */
  app.get('/agents', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const period = (request.query as any)?.period;
      const companyId = (request as any).user?.companyId;
      const data = await getMetricsData(period, companyId);
      return reply.send({ success: true, data: data.employees });
    } catch (err: any) {
      logger.error({ err }, 'Failed to fetch agent metrics');
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  /**
   * GET /api/v1/reports/stations — Station volume metrics
   */
  app.get('/stations', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const period = (request.query as any)?.period;
      const companyId = (request as any).user?.companyId;
      const data = await getMetricsData(period, companyId);
      return reply.send({ success: true, data: data.stations });
    } catch (err: any) {
      logger.error({ err }, 'Failed to fetch station metrics');
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  /**
   * GET /api/v1/reports/conversations/export — Export conversations to CSV
   */
  app.get('/conversations/export', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const period = (request.query as any)?.period;
      const fromDate = getPeriodDate(period);
      const companyId = (request as any).user?.companyId;

      let query = db
        .select({
          id: conversations.id,
          status: conversations.status,
          contactName: contacts.name,
          contactPhone: contacts.phoneNumber,
          stationName: stations.name,
          employeeName: users.name,
          unreadCount: conversations.unreadCount,
          lastMessageText: conversations.lastMessageText,
          createdAt: conversations.createdAt,
          updatedAt: conversations.updatedAt,
        })
        .from(conversations)
        .innerJoin(contacts, eq(conversations.contactId, contacts.id))
        .leftJoin(stations, eq(conversations.assignedStationId, stations.id))
        .leftJoin(employees, eq(conversations.assignedEmployeeId, employees.id))
        .leftJoin(users, eq(employees.userId, users.id));

      const conditions = [];
      if (companyId) conditions.push(eq(conversations.companyId, companyId));
      if (fromDate) conditions.push(gte(conversations.createdAt, fromDate));

      const rows = conditions.length > 1
        ? await query.where(sql`${conversations.companyId} = ${companyId} AND ${conversations.createdAt} >= ${fromDate}`).orderBy(desc(conversations.createdAt))
        : conditions.length === 1
        ? (companyId
            ? await query.where(eq(conversations.companyId, companyId)).orderBy(desc(conversations.createdAt))
            : await query.where(gte(conversations.createdAt, fromDate!)).orderBy(desc(conversations.createdAt)))
        : await query.orderBy(desc(conversations.createdAt));

      const headers = [
        'معرف المحادثة',
        'اسم العميل',
        'رقم الهاتف',
        'المحطة',
        'الموظف المسند',
        'الحالة',
        'غير مقروءة',
        'آخر رسالة',
        'تاريخ البدء',
        'آخر تحديث',
      ];

      const csvLines = [headers.map(escapeCsv).join(',')];

      for (const r of rows) {
        const line = [
          r.id,
          r.contactName,
          r.contactPhone,
          r.stationName || 'غير مسند',
          r.employeeName || 'غير مسند',
          r.status,
          r.unreadCount,
          r.lastMessageText || '',
          r.createdAt ? new Date(r.createdAt).toISOString() : '',
          r.updatedAt ? new Date(r.updatedAt).toISOString() : '',
        ];
        csvLines.push(line.map(escapeCsv).join(','));
      }

      // Prepend UTF-8 BOM so Arabic displays correctly in Excel
      const csvContent = '\uFEFF' + csvLines.join('\r\n');
      const dateStr = new Date().toISOString().split('T')[0];

      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="conversations_${dateStr}.csv"`);
      return reply.send(csvContent);
    } catch (err: any) {
      logger.error({ err }, 'Failed to export conversations CSV');
      return reply.status(500).send({ success: false, error: 'Failed to export conversations' });
    }
  });

  /**
   * GET /api/v1/reports/contacts/export — Export contacts & leads to CSV
   */
  app.get('/contacts/export', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const period = (request.query as any)?.period;
      const fromDate = getPeriodDate(period);
      const companyId = (request as any).user?.companyId;

      let query = db
        .select({
          id: contacts.id,
          name: contacts.name,
          phoneNumber: contacts.phoneNumber,
          whatsappJid: contacts.whatsappJid,
          source: contacts.source,
          createdAt: contacts.createdAt,
          leadStage: leads.stage,
          campaign: leads.campaign,
          destination: leads.destination,
        })
        .from(contacts)
        .leftJoin(leads, eq(contacts.id, leads.contactId));

      const conditions = [];
      if (companyId) conditions.push(eq(contacts.companyId, companyId));
      if (fromDate) conditions.push(gte(contacts.createdAt, fromDate));

      const rows = conditions.length > 1
        ? await query.where(sql`${contacts.companyId} = ${companyId} AND ${contacts.createdAt} >= ${fromDate}`).orderBy(desc(contacts.createdAt))
        : conditions.length === 1
        ? (companyId
            ? await query.where(eq(contacts.companyId, companyId)).orderBy(desc(contacts.createdAt))
            : await query.where(gte(contacts.createdAt, fromDate!)).orderBy(desc(contacts.createdAt)))
        : await query.orderBy(desc(contacts.createdAt));

      const headers = [
        'معرف العميل',
        'اسم العميل',
        'رقم الهاتف',
        'معرف واتساب',
        'المصدر',
        'مرحلة العميل (Lead Stage)',
        'الحملة التسويقية',
        'الخدمة أو المنتج المطلوب',
        'تاريخ التسجيل',
      ];

      const csvLines = [headers.map(escapeCsv).join(',')];

      for (const r of rows) {
        const line = [
          r.id,
          r.name,
          r.phoneNumber,
          r.whatsappJid || '',
          r.source || 'direct',
          r.leadStage || 'none',
          r.campaign || '',
          r.destination || '',
          r.createdAt ? new Date(r.createdAt).toISOString() : '',
        ];
        csvLines.push(line.map(escapeCsv).join(','));
      }

      // Prepend UTF-8 BOM so Arabic displays correctly in Excel
      const csvContent = '\uFEFF' + csvLines.join('\r\n');
      const dateStr = new Date().toISOString().split('T')[0];

      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="contacts_leads_${dateStr}.csv"`);
      return reply.send(csvContent);
    } catch (err: any) {
      logger.error({ err }, 'Failed to export contacts CSV');
      return reply.status(500).send({ success: false, error: 'Failed to export contacts' });
    }
  });

  /**
   * GET /api/v1/reports/employee-whatsapp-performance — Track employees with linked WhatsApp numbers
   */
  app.get('/employee-whatsapp-performance', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const period = (request.query as any)?.period;
      const fromDate = getPeriodDate(period);
      const companyId = (request as any).user?.companyId;

      const convFilter = [];
      if (companyId) convFilter.push(sql`company_id = ${companyId}`);
      if (fromDate) convFilter.push(sql`created_at >= ${fromDate}`);
      const convWhereClause = convFilter.length > 0 ? sql`WHERE ${sql.join(convFilter, sql` AND `)}` : sql``;

      const msgFilter = [sql`direction = 'outgoing'`];
      if (companyId) msgFilter.push(sql`conversation_id IN (SELECT id FROM conversations WHERE company_id = ${companyId})`);
      if (fromDate) msgFilter.push(sql`created_at >= ${fromDate}`);
      const msgWhereClause = sql`WHERE ${sql.join(msgFilter, sql` AND `)}`;

      const respFilter = [sql`m_in.direction = 'incoming'`];
      if (companyId) respFilter.push(sql`m_in.conversation_id IN (SELECT id FROM conversations WHERE company_id = ${companyId})`);
      if (fromDate) respFilter.push(sql`m_in.created_at >= ${fromDate}`);
      const respWhereClause = sql`WHERE ${sql.join(respFilter, sql` AND `)}`;

      const employeesResult = await db.execute(sql`
        WITH employee_convs AS (
          SELECT 
            assigned_employee_id,
            COUNT(id) AS total_assigned,
            COUNT(id) FILTER (WHERE status = 'closed') AS total_resolved
          FROM conversations
          ${convWhereClause}
          GROUP BY assigned_employee_id
        ),
        employee_msgs AS (
          SELECT 
            sender_user_id,
            COUNT(id) AS outgoing_messages
          FROM messages
          ${msgWhereClause}
          GROUP BY sender_user_id
        ),
        employee_replied_convs AS (
          SELECT 
            sender_user_id,
            COUNT(DISTINCT conversation_id) AS replied_convs_count
          FROM messages
          ${msgWhereClause}
          GROUP BY sender_user_id
        ),
        employee_resp AS (
          WITH emp_pairs AS (
            SELECT 
              c.assigned_employee_id,
              m_in.id,
              m_in.created_at AS in_time,
              MIN(m_out.created_at) AS out_time
            FROM messages m_in
            INNER JOIN conversations c ON m_in.conversation_id = c.id
            INNER JOIN messages m_out 
              ON m_in.conversation_id = m_out.conversation_id
              AND m_out.direction = 'outgoing'
              AND m_out.created_at > m_in.created_at
            ${respWhereClause}
            GROUP BY c.assigned_employee_id, m_in.id, m_in.created_at
          )
          SELECT 
            assigned_employee_id,
            COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (out_time - in_time)))), 0) AS avg_seconds
          FROM emp_pairs
          GROUP BY assigned_employee_id
        )
        SELECT 
          e.id,
          e.status,
          e.whatsapp_number,
          u.name,
          s.name AS station_name,
          COALESCE(ec.total_assigned, 0) AS total_assigned,
          COALESCE(em.outgoing_messages, 0) AS outgoing_messages,
          COALESCE(erc.replied_convs_count, 0) AS replied_customers,
          COALESCE(er.avg_seconds, 0) AS avg_response_seconds
        FROM employees e
        INNER JOIN users u ON e.user_id = u.id
        LEFT JOIN stations s ON e.station_id = s.id
        LEFT JOIN employee_convs ec ON e.id = ec.assigned_employee_id
        LEFT JOIN employee_msgs em ON u.id = em.sender_user_id
        LEFT JOIN employee_replied_convs erc ON u.id = erc.sender_user_id
        LEFT JOIN employee_resp er ON e.id = er.assigned_employee_id
        WHERE e.whatsapp_number IS NOT NULL AND e.whatsapp_number != ''
        ${companyId ? sql`AND e.company_id = ${companyId}` : sql``}
        ORDER BY total_assigned DESC, u.name ASC
      `);

      const employeeRows = employeesResult.rows as any[];
      const data = employeeRows.map((e) => {
        const avgSecs = Number(e.avg_response_seconds || 0);
        return {
          id: e.id,
          name: e.name,
          status: e.status,
          whatsappNumber: e.whatsapp_number,
          stationName: e.station_name || 'غير مسند',
          totalAssigned: Number(e.total_assigned || 0),
          totalRepliedToCustomers: Number(e.replied_customers || 0),
          totalOutgoingMessages: Number(e.outgoing_messages || 0),
          avgResponseTimeSeconds: avgSecs,
          avgResponseMinutes: Math.round(avgSecs / 60),
        };
      });

      return reply.send({ success: true, data });
    } catch (err: any) {
      logger.error({ err }, 'Failed to fetch employee whatsapp performance');
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  /**
   * GET /api/v1/reports/auto-registered-customers — Track customers originating from primary dispatchers
   */
  app.get('/auto-registered-customers', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const period = (request.query as any)?.period;
      const fromDate = getPeriodDate(period);
      const companyId = (request as any).user?.companyId;

      const firstConvFilter = [];
      if (companyId) firstConvFilter.push(sql`company_id = ${companyId}`);
      const firstConvWhere = firstConvFilter.length > 0 ? sql`WHERE ${sql.join(firstConvFilter, sql` AND `)}` : sql``;

      // Find all contacts that have their first conversation on a primary dispatcher account
      const queryResult = await db.execute(sql`
        WITH first_conversations AS (
          SELECT DISTINCT ON (contact_id)
            id AS conversation_id,
            contact_id,
            assigned_employee_id,
            whatsapp_account_id,
            created_at
          FROM conversations
          ${firstConvWhere}
          ORDER BY contact_id, created_at ASC
        )
        SELECT 
          c.id,
          c.name,
          c.phone_number AS "phoneNumber",
          c.created_at AS "contactCreatedAt",
          fc.created_at AS "conversationCreatedAt",
          u.name AS "assignedEmployeeName",
          wa.display_name AS "dispatcherName"
        FROM contacts c
        INNER JOIN first_conversations fc ON c.id = fc.contact_id
        LEFT JOIN employees e ON fc.assigned_employee_id = e.id
        LEFT JOIN users u ON e.user_id = u.id
        INNER JOIN whatsapp_accounts wa ON fc.whatsapp_account_id = wa.id
        WHERE wa.is_primary_dispatcher = true
        ${companyId ? sql`AND c.company_id = ${companyId}` : sql``}
        ${fromDate ? sql`AND c.created_at >= ${fromDate}` : sql``}
        ORDER BY c.created_at DESC
      `);

      const rows = queryResult.rows as any[];
      return reply.send({ success: true, data: rows });
    } catch (err: any) {
      logger.error({ err }, 'Failed to fetch auto-registered customers');
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });
}
