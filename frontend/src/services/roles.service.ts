import { api } from './api.client';

export interface Role {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  permissions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export const rolesService = {
  async list(): Promise<Role[]> {
    const res = await api.get<Role[]>('/api/v1/roles');
    return res.data || [];
  },

  async get(id: string): Promise<Role> {
    const res = await api.get<Role>(`/api/v1/roles/${id}`);
    return res.data;
  },

  async listPermissions(): Promise<Array<{ id: string; name: string; description?: string }>> {
    const res = await api.get<any[]>('/api/v1/roles/permissions');
    return res.data || [];
  },

  async create(input: { name: string; displayName?: string; description?: string; permissions?: string[] }): Promise<Role> {
    const res = await api.post<Role>('/api/v1/roles', input);
    return res.data;
  },

  async update(id: string, input: { displayName?: string; description?: string; permissions?: string[] }): Promise<Role> {
    const res = await api.put<Role>(`/api/v1/roles/${id}`, input);
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/api/v1/roles/${id}`);
  },
};
