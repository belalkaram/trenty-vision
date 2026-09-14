import { api } from './api.client';
import { Station, CreateStationInput } from '@/types/stations';

function normalizeStation(raw: any): Station {
  if (!raw) return raw;
  const active = raw.active !== undefined ? Boolean(raw.active) : raw.status === 'active';
  const maxCapacity = raw.maxCapacity === null ? null : (raw.maxCapacity !== undefined ? Number(raw.maxCapacity) : 20);
  return {
    ...raw,
    active,
    status: raw.status || (active ? 'active' : 'inactive'),
    code: raw.code || '',
    color: raw.color || '#1c9770',
    description: raw.description || '',
    maxCapacity,
    isUnlimited: maxCapacity === null,
    routingWeight: raw.routingWeight !== undefined ? Number(raw.routingWeight) : 1,
    assignedAgentsCount: raw.assignedAgentsCount ?? raw.employeeCount ?? (raw.employees ? raw.employees.length : 0),
    employeeCount: raw.employeeCount ?? raw.assignedAgentsCount ?? (raw.employees ? raw.employees.length : 0),
    activeChatsCount: raw.activeChatsCount ?? 0,
    employeeIds: raw.employeeIds || (raw.employees ? raw.employees.map((e: any) => e.employeeId) : []),
    employees: raw.employees || [],
  };
}

export const stationsService = {
  async list(): Promise<Station[]> {
    const res = await api.get<any[]>('/api/v1/stations');
    const list = res.data || [];
    return list.map(normalizeStation);
  },

  async get(id: string): Promise<Station> {
    const res = await api.get<any>(`/api/v1/stations/${id}`);
    return normalizeStation(res.data);
  },

  async create(input: CreateStationInput): Promise<Station> {
    const payload = {
      name: input.name,
      code: input.code?.trim() || null,
      color: input.color || '#1c9770',
      description: input.description?.trim() || null,
      maxCapacity: input.maxCapacity === null ? null : (input.maxCapacity !== undefined ? Number(input.maxCapacity) : 20),
      routingWeight: input.routingWeight !== undefined ? Number(input.routingWeight) : 1,
      active: input.status ? input.status === 'active' : (input.active !== undefined ? input.active : true),
      status: input.status || (input.active === false ? 'inactive' : 'active'),
      employeeIds: input.employeeIds || [],
    };
    const res = await api.post<any>('/api/v1/stations', payload);
    return normalizeStation(res.data);
  },

  async update(id: string, input: Partial<CreateStationInput>): Promise<Station> {
    const payload: Record<string, any> = {};
    if (input.name !== undefined) payload.name = input.name;
    if (input.code !== undefined) payload.code = input.code?.trim() || null;
    if (input.color !== undefined) payload.color = input.color || '#1c9770';
    if (input.description !== undefined) payload.description = input.description?.trim() || null;
    if (input.maxCapacity !== undefined) payload.maxCapacity = input.maxCapacity === null ? null : Number(input.maxCapacity);
    if (input.routingWeight !== undefined) payload.routingWeight = Number(input.routingWeight);
    if (input.employeeIds !== undefined) payload.employeeIds = input.employeeIds;
    if (input.status !== undefined) {
      payload.status = input.status;
      payload.active = input.status === 'active';
    } else if (input.active !== undefined) {
      payload.active = input.active;
      payload.status = input.active ? 'active' : 'inactive';
    }

    const res = await api.put<any>(`/api/v1/stations/${id}`, payload);
    return normalizeStation(res.data);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/api/v1/stations/${id}`);
  },
};

