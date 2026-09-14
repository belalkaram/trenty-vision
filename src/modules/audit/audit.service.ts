import { db } from '../../database/client';
import { auditLogs } from '../../database/schema/index';
import { CreateAuditLogParams } from './audit.types';
import { desc, eq, and } from 'drizzle-orm';
import { logger } from '../../utils/logger';

export class AuditService {
  /**
   * Append an audit log entry.
   * Audit logs are strictly append-only.
   */
  public static async log(params: CreateAuditLogParams): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        actorId: params.actorId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        oldValues: params.oldValues || null,
        newValues: params.newValues || null,
        metadata: params.metadata || {},
      });
    } catch (error) {
      // Audit logging should never crash the main transaction, but we log errors
      logger.error({ error, params }, 'Failed to write audit log');
    }
  }

  /**
   * List audit logs with pagination and optional filters
   */
  public static async list(options: {
    page?: number;
    limit?: number;
    entityType?: string;
    actorId?: string;
  }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    const conditions = [];
    if (options.entityType) {
      conditions.push(eq(auditLogs.entityType, options.entityType));
    }
    if (options.actorId) {
      conditions.push(eq(auditLogs.actorId, options.actorId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, totalResult] = await Promise.all([
      db
        .select()
        .from(auditLogs)
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: auditLogs.id })
        .from(auditLogs)
        .where(whereClause),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total: totalResult.length,
        totalPages: Math.ceil(totalResult.length / limit),
      },
    };
  }
}
