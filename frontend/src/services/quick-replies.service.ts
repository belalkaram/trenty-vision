import { api } from './api.client';

export interface QuickReply {
  id: string;
  name: string;
  shortcut: string;
  body: string;
  departmentId?: string | null;
  departmentName?: string | null;
  active: boolean;
  createdAt: string;
}

export const quickRepliesService = {
  async list(): Promise<QuickReply[]> {
    const res = await api.get<QuickReply[]>('/api/v1/quick-replies');
    return res.data || [];
  },

  async create(input: { name: string; shortcut: string; body: string; departmentId?: string }): Promise<QuickReply> {
    const res = await api.post<QuickReply>('/api/v1/quick-replies', input);
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/api/v1/quick-replies/${id}`);
  },
};
