import { api } from './api.client';

export type LeadStage = 'new' | 'contacted' | 'qualified' | 'waiting' | 'converted' | 'lost';

export interface Lead {
  id: string;
  contactId: string;
  source?: string;
  campaign?: string;
  destination?: string;
  travelDate?: string;
  stage: LeadStage;
  stationId?: string | null;
  assignedEmployeeId?: string | null;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
  contact?: {
    id: string;
    name: string;
    phoneNumber: string;
  };
  station?: {
    id: string;
    name: string;
  };
  assignedEmployee?: {
    id: string;
    name: string;
  };
}

export interface CreateLeadInput {
  contactId: string;
  source?: string;
  campaign?: string;
  destination?: string;
  travelDate?: string;
  stage?: LeadStage;
  stationId?: string;
  assignedEmployeeId?: string;
  metadata?: Record<string, any>;
}

export const leadsService = {
  async list(params?: {
    stage?: LeadStage;
    stationId?: string;
    assignedEmployeeId?: string;
    contactId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Lead[]> {
    const res = await api.get<Lead[]>('/api/v1/leads', { params });
    return res.data || [];
  },

  async create(input: CreateLeadInput): Promise<Lead> {
    const res = await api.post<Lead>('/api/v1/leads', input);
    return res.data;
  },

  async updateStage(id: string, stage: LeadStage): Promise<Lead> {
    const res = await api.patch<Lead>(`/api/v1/leads/${id}/stage`, { stage });
    return res.data;
  },

  async update(id: string, input: Partial<CreateLeadInput>): Promise<Lead> {
    const res = await api.patch<Lead>(`/api/v1/leads/${id}`, input);
    return res.data;
  },
};
