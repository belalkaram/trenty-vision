import { api } from './api.client';
import { Reminder, CreateReminderInput, UpdateReminderInput } from '@/types/reminders';

export interface ListRemindersParams {
  status?: 'pending' | 'completed' | 'cancelled' | 'all';
  conversationId?: string;
  all?: boolean;
}

export const remindersService = {
  async list(params?: ListRemindersParams): Promise<Reminder[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.conversationId) query.append('conversationId', params.conversationId);
    if (params?.all) query.append('all', 'true');

    const url = `/api/v1/automations/reminders${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await api.get<Reminder[]>(url);
    return res.data || [];
  },

  async create(input: CreateReminderInput): Promise<Reminder> {
    const res = await api.post<Reminder>('/api/v1/automations/reminders', input);
    return res.data;
  },

  async updateStatus(id: string, status: 'pending' | 'completed' | 'cancelled'): Promise<Reminder> {
    const res = await api.patch<Reminder>(`/api/v1/automations/reminders/${id}/status`, { status });
    return res.data;
  },

  async update(id: string, input: UpdateReminderInput): Promise<Reminder> {
    const res = await api.patch<Reminder>(`/api/v1/automations/reminders/${id}`, input);
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/api/v1/automations/reminders/${id}`);
  },
};
