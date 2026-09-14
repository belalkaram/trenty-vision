import { api } from './api.client';

export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  whatsappJid?: string;
  avatarUrl?: string | null;
  source?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
  assignedEmployeeName?: string | null;
  conversations?: any[];
  leads?: any[];
}

export const contactsService = {
  async list(params?: { search?: string; limit?: number; offset?: number }): Promise<Contact[]> {
    const res = await api.get<any>('/api/v1/contacts', { params });
    return res.data || [];
  },

  async get(id: string): Promise<Contact> {
    const res = await api.get<any>(`/api/v1/contacts/${id}`);
    return res.data;
  },

  async update(id: string, input: { name?: string; avatarUrl?: string | null; metadata?: Record<string, any> }): Promise<Contact> {
    const res = await api.patch<any>(`/api/v1/contacts/${id}`, input);
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/api/v1/contacts/${id}`);
  },
};
