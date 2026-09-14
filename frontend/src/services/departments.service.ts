import { api } from './api.client';
import { Department, CreateDepartmentInput } from '@/types/departments';

export const departmentsService = {
  async list(): Promise<Department[]> {
    const res = await api.get<Department[]>('/api/v1/departments');
    return res.data || [];
  },

  async create(input: CreateDepartmentInput): Promise<Department> {
    const res = await api.post<Department>('/api/v1/departments', input);
    return res.data;
  },

  async update(id: string, input: Partial<CreateDepartmentInput>): Promise<Department> {
    const res = await api.put<Department>(`/api/v1/departments/${id}`, input);
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/api/v1/departments/${id}`);
  },
};
