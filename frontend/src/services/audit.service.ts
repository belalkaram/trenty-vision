import { api } from './api.client';
import { AuditLog, AuditFilter } from '@/types/audit';

export const auditService = {
  async list(filter?: AuditFilter): Promise<{ items: AuditLog[]; pagination?: any }> {
    const res = await api.get<AuditLog[]>('/api/v1/audit', {
      params: {
        page: filter?.page || 1,
        limit: filter?.limit || 50,
        entityType: filter?.entityType,
        actorId: filter?.actorId,
      },
    });
    return {
      items: res.data || [],
      pagination: res.pagination,
    };
  },
};
