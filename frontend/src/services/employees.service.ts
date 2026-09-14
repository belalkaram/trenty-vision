import { api } from './api.client';
import { Employee, CreateEmployeeInput } from '@/types/employees';

export const employeesService = {
  async list(): Promise<Employee[]> {
    const res = await api.get<any[]>('/api/v1/employees');
    return (res.data || []).map(emp => {
      const p = emp.whatsappNumber || emp.phone || '';
      return {
        ...emp,
        fullName: emp.name || emp.fullName || '',
        phone: p,
        whatsappNumber: p,
        role: emp.roleDisplayName || emp.roleName || '',
        presenceStatus: emp.presenceStatus || (emp.status === 'active' ? 'online' : 'offline'),
        activeChatsCount: emp.workload?.openConversations || 0,
      };
    });
  },

  async get(id: string): Promise<Employee> {
    const res = await api.get<any>(`/api/v1/employees/${id}`);
    const emp = res.data;
    const p = emp?.whatsappNumber || emp?.phone || '';
    return {
      ...emp,
      fullName: emp?.name || emp?.fullName || '',
      phone: p,
      whatsappNumber: p,
      role: emp?.roleDisplayName || emp?.roleName || '',
      presenceStatus: emp?.presenceStatus || (emp?.status === 'active' ? 'online' : 'offline'),
      activeChatsCount: emp?.workload?.openConversations || 0,
    };
  },

  async create(input: CreateEmployeeInput): Promise<Employee> {
    const phoneVal = (input.phone || input.whatsappNumber || '').trim();
    const payload = {
      name: input.fullName || (input as any).name,
      fullName: input.fullName || (input as any).name,
      email: input.email,
      password: input.password || 'Password123!',
      phone: phoneVal || undefined,
      whatsappNumber: phoneVal || undefined,
      roleId: input.roleId || undefined,
      departmentId: (input as any).departmentId || null,
      stationId: (input.stationIds && input.stationIds.length > 0 ? input.stationIds[0] : (input as any).stationId) || null,
      status: 'active',
    };
    const res = await api.post<any>('/api/v1/employees', payload);
    const emp = res.data;
    const p = emp?.whatsappNumber || emp?.phone || phoneVal;
    return {
      ...emp,
      fullName: emp?.name || emp?.fullName || '',
      phone: p,
      whatsappNumber: p,
      role: emp?.roleDisplayName || emp?.roleName || '',
      presenceStatus: emp?.presenceStatus || (emp?.status === 'active' ? 'online' : 'offline'),
    };
  },

  async update(id: string, input: Partial<CreateEmployeeInput>): Promise<Employee> {
    const payload: Record<string, any> = {};
    if (input.fullName) {
      payload.name = input.fullName;
      payload.fullName = input.fullName;
    }
    if (input.email) payload.email = input.email;
    if (input.phone !== undefined || input.whatsappNumber !== undefined) {
      const rawPhone = input.phone !== undefined ? input.phone : input.whatsappNumber;
      payload.phone = rawPhone ? rawPhone.trim() : null;
      payload.whatsappNumber = rawPhone ? rawPhone.trim() : null;
    }
    if (input.roleId) payload.roleId = input.roleId;
    if ((input as any).departmentId !== undefined) payload.departmentId = (input as any).departmentId || null;
    if (input.stationIds !== undefined) {
      payload.stationId = input.stationIds.length > 0 ? input.stationIds[0] : null;
    }
    const res = await api.put<any>(`/api/v1/employees/${id}`, payload);
    const emp = res.data;
    const p = emp?.whatsappNumber || emp?.phone || input.phone || input.whatsappNumber || '';
    return {
      ...emp,
      fullName: emp?.name || emp?.fullName || '',
      phone: p,
      whatsappNumber: p,
      role: emp?.roleDisplayName || emp?.roleName || '',
      presenceStatus: emp?.presenceStatus || (emp?.status === 'active' ? 'online' : 'offline'),
    };
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/api/v1/employees/${id}`);
  },

  async getRoles(): Promise<Array<{ id: string; name: string; displayName?: string }>> {
    const res = await api.get<any[]>('/api/v1/roles');
    return res.data || [];
  },

  async getSupervisors(): Promise<Array<{ id: string; name: string; email?: string }>> {
    const res = await api.get<any[]>('/api/v1/employees/supervisors');
    return res.data || [];
  },

  async updateStatus(id: string, status: 'active' | 'inactive' | 'away' | 'offline'): Promise<Employee> {
    const res = await api.patch<any>(`/api/v1/employees/${id}/status`, { status });
    return res.data;
  },
};

