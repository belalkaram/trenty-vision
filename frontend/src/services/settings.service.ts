import { api } from './api.client';
import { SystemSettings } from '@/types/settings';

export const settingsService = {
  async get(): Promise<SystemSettings> {
    const res = await api.get<any>('/api/v1/settings');
    const data = res.data;
    return (data?.map || data || {}) as SystemSettings;
  },

  async getByKey(key: string): Promise<any> {
    const res = await api.get<any>(`/api/v1/settings/${key}`);
    return res.data?.value;
  },

  async update(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const res = await api.post<any>('/api/v1/settings', { settings });
    const data = res.data;
    return (data?.map || data || {}) as SystemSettings;
  },

  async updateKey(key: string, value: any): Promise<any> {
    const res = await api.put<any>(`/api/v1/settings/${key}`, { value });
    return res.data;
  },

  async syncAllLanding(): Promise<{ totalEvaluated: number; syncedCount: number; failedCount: number }> {
    const res = await api.post<any>('/api/v1/contacts/sync-all-landing');
    return res.data;
  },
};

