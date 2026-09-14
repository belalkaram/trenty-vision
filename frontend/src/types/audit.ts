export interface AuditLog {
  id: string;
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface AuditFilter {
  page?: number;
  limit?: number;
  entityType?: string;
  actorId?: string;
  search?: string;
}
