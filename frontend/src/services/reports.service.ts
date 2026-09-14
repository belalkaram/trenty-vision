import { api } from './api.client';
import { 
  ReportOverview, 
  AgentPerformanceMetric, 
  StationVolumeMetric,
  EmployeeWhatsappPerformance,
  AutoRegisteredCustomer
} from '@/types/reports';

export interface FullMetricsResponse {
  overview: ReportOverview;
  leadsFunnel: Record<string, number>;
  stations: StationVolumeMetric[];
  employees: AgentPerformanceMetric[];
}

export const reportsService = {
  async getMetrics(period?: string): Promise<FullMetricsResponse> {
    const res = await api.get<FullMetricsResponse>('/api/v1/reports/metrics', {
      params: period ? { period } : undefined,
    });
    return res.data;
  },

  async getOverview(period?: string): Promise<ReportOverview> {
    try {
      const res = await api.get<ReportOverview>('/api/v1/reports/overview', {
        params: period ? { period } : undefined,
      });
      if (res.data) return res.data;
    } catch {}

    try {
      const full = await this.getMetrics(period);
      if (full?.overview) return full.overview;
    } catch {}

    return {
      totalConversations: 0,
      openConversations: 0,
      resolvedConversations: 0,
      avgResponseTimeSeconds: 0,
      totalMessagesSent: 0,
      totalMessagesReceived: 0,
      activeAgentsCount: 0,
    };
  },

  async getAgentMetrics(period?: string): Promise<AgentPerformanceMetric[]> {
    try {
      const res = await api.get<AgentPerformanceMetric[]>('/api/v1/reports/agents', {
        params: period ? { period } : undefined,
      });
      if (Array.isArray(res.data)) return res.data;
    } catch {}

    try {
      const full = await this.getMetrics(period);
      if (Array.isArray(full?.employees)) return full.employees;
    } catch {}

    return [];
  },

  async getStationMetrics(period?: string): Promise<StationVolumeMetric[]> {
    try {
      const res = await api.get<StationVolumeMetric[]>('/api/v1/reports/stations', {
        params: period ? { period } : undefined,
      });
      if (Array.isArray(res.data)) return res.data;
    } catch {}

    try {
      const full = await this.getMetrics(period);
      if (Array.isArray(full?.stations)) return full.stations;
    } catch {}

    return [];
  },

  getExportConversationsUrl(period?: string): string {
    return period && period !== 'all'
      ? `/api/v1/reports/conversations/export?period=${encodeURIComponent(period)}`
      : '/api/v1/reports/conversations/export';
  },

  getExportContactsUrl(period?: string): string {
    return period && period !== 'all'
      ? `/api/v1/reports/contacts/export?period=${encodeURIComponent(period)}`
      : '/api/v1/reports/contacts/export';
  },

  async getEmployeeWhatsappPerformance(period?: string): Promise<EmployeeWhatsappPerformance[]> {
    try {
      const res = await api.get<any>('/api/v1/reports/employee-whatsapp-performance', {
        params: period ? { period } : undefined,
      });
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data?.data)) return res.data.data;
      return [];
    } catch {
      return [];
    }
  },

  async getAutoRegisteredCustomers(period?: string): Promise<AutoRegisteredCustomer[]> {
    try {
      const res = await api.get<any>('/api/v1/reports/auto-registered-customers', {
        params: period ? { period } : undefined,
      });
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data?.data)) return res.data.data;
      return [];
    } catch {
      return [];
    }
  },
};
