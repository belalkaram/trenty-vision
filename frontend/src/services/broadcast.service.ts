import { api } from './api.client';

export interface BroadcastCampaign {
  id: string;
  companyId: string;
  whatsappAccountId?: string | null;
  name: string;
  messageType: 'text' | 'image' | 'video' | 'document';
  messageContent: string;
  mediaUrl?: string | null;
  mediaFilename?: string | null;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled' | 'failed';
  minDelaySeconds: number;
  maxDelaySeconds: number;
  batchSize: number;
  batchSleepSeconds: number;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BroadcastRecipient {
  id: string;
  campaignId: string;
  phoneNumber: string;
  recipientName?: string | null;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  errorReason?: string | null;
  messageId?: string | null;
  sentAt?: string | null;
  createdAt: string;
}

export interface CreateCampaignPayload {
  name: string;
  whatsappAccountId?: string;
  messageType: 'text' | 'image' | 'video' | 'document';
  messageContent: string;
  mediaUrl?: string;
  mediaFilename?: string;
  minDelaySeconds?: number;
  maxDelaySeconds?: number;
  batchSize?: number;
  batchSleepSeconds?: number;
  recipients: Array<{
    phoneNumber: string;
    recipientName?: string;
  }>;
}

export const broadcastService = {
  async getCampaigns(): Promise<BroadcastCampaign[]> {
    const res = await api.get<BroadcastCampaign[]>('/api/v1/broadcast/campaigns');
    return res.data || [];
  },

  async getCampaign(id: string): Promise<{ campaign: BroadcastCampaign; recipients: BroadcastRecipient[] }> {
    const res = await api.get<{ campaign: BroadcastCampaign; recipients: BroadcastRecipient[] }>(
      `/api/v1/broadcast/campaigns/${id}`
    );
    return res.data;
  },

  async createCampaign(payload: CreateCampaignPayload): Promise<BroadcastCampaign> {
    const res = await api.post<BroadcastCampaign>('/api/v1/broadcast/campaigns', payload);
    return res.data;
  },

  async startCampaign(id: string): Promise<any> {
    const res = await api.post(`/api/v1/broadcast/campaigns/${id}/start`);
    return res;
  },

  async pauseCampaign(id: string): Promise<any> {
    const res = await api.post(`/api/v1/broadcast/campaigns/${id}/pause`);
    return res;
  },

  async resumeCampaign(id: string): Promise<any> {
    const res = await api.post(`/api/v1/broadcast/campaigns/${id}/resume`);
    return res;
  },

  async cancelCampaign(id: string): Promise<any> {
    const res = await api.post(`/api/v1/broadcast/campaigns/${id}/cancel`);
    return res;
  },

  async retryFailed(id: string): Promise<any> {
    const res = await api.post(`/api/v1/broadcast/campaigns/${id}/retry-failed`);
    return res;
  },

  async deleteCampaign(id: string): Promise<any> {
    const res = await api.delete(`/api/v1/broadcast/campaigns/${id}`);
    return res;
  },

  async checkNumbers(phoneNumbers: string[], whatsappAccountId?: string): Promise<Array<{ exists: boolean; jid: string; inputPhone: string }>> {
    const res = await api.post<Array<{ exists: boolean; jid: string; inputPhone: string }>>(
      '/api/v1/broadcast/check-numbers',
      { phoneNumbers, whatsappAccountId }
    );
    return res.data || [];
  },

  getExportUrl(id: string): string {
    return `/api/v1/broadcast/campaigns/${id}/export`;
  },
};
