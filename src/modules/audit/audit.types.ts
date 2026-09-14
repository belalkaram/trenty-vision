export interface CreateAuditLogParams {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  metadata?: Record<string, any>;
}
