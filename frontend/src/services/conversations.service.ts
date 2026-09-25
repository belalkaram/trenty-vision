import { api } from './api.client';
import { Conversation, Message, ConversationStatus } from '@/types/conversations';

export interface ListConversationsParams {
  status?: string;
  stationId?: string;
  search?: string;
  unassigned?: boolean;
}

export function normalizeConversation(c: any): Conversation {
  if (!c) return c;
  const phone = c.contactPhone || c.contact?.phoneNumber || '';
  const name = c.contactName || c.contact?.name || phone || 'عميل واتساب';
  const stationName = c.stationName || c.station?.name || '';
  const assignedAgentName = c.assignedAgentName || c.assignedEmployee?.name || '';
  const lastMessageTimestamp = c.lastMessageTimestamp || c.lastMessageAt || c.updatedAt;
  const rawUnread = c.unreadCount ?? c.unread_count ?? 0;
  const unreadCount = parseInt(String(rawUnread), 10) || 0;

  return {
    ...c,
    unreadCount,
    contactId: c.contactId || c.contact?.id || '',
    contactPhone: phone,
    contactName: name,
    contactAvatar: c.contactAvatar || c.contact?.avatarUrl,
    stationId: c.stationId || c.station?.id,
    stationName,
    assignedAgentId: c.assignedAgentId || c.assignedEmployee?.id,
    assignedAgentName,
    lastMessageTimestamp,
  };
}

export const conversationsService = {
  async list(params?: ListConversationsParams): Promise<Conversation[]> {
    const formattedParams: any = { ...params };
    if (formattedParams.status === 'resolved') {
      formattedParams.status = 'closed';
    }
    const res = await api.get<Conversation[]>('/api/v1/conversations', { params: formattedParams });
    const rawList = res.data || [];
    return rawList.map(normalizeConversation);
  },

  async start(payload: {
    phoneNumber: string;
    contactName?: string;
    messageText?: string;
    whatsappAccountId?: string;
    stationId?: string;
    assignedEmployeeId?: string;
  }): Promise<Conversation> {
    const res = await api.post<Conversation>('/api/v1/conversations/start', payload);
    return normalizeConversation(res.data);
  },

  async getTimeline(conversationId: string): Promise<any[]> {
    try {
      const res = await api.get<any[]>(`/api/v1/conversations/${conversationId}/timeline`);
      return res.data || [];
    } catch {
      return [];
    }
  },

  async get(id: string): Promise<Conversation> {
    const res = await api.get<Conversation>(`/api/v1/conversations/${id}`);
    return normalizeConversation(res.data);
  },

  async updateContact(contactId: string, payload: { name?: string; avatarUrl?: string | null }): Promise<any> {
    const res = await api.patch(`/api/v1/contacts/${contactId}`, payload);
    return res.data;
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const res = await api.get<Message[]>(`/api/v1/conversations/${conversationId}/messages`);
    return res.data || [];
  },

  async sendMessage(conversationId: string, payload: {
    text?: string;
    type?: string;
    metadata?: any;
    isInternalNote?: boolean;
    quotedMessageId?: string;
  }): Promise<Message> {
    if (payload.isInternalNote) {
      const res = await api.post<Message>(`/api/v1/conversations/${conversationId}/notes`, {
        text: payload.text || '',
      });
      return res.data;
    }
    const res = await api.post<Message>(`/api/v1/conversations/${conversationId}/messages`, payload);
    return res.data;
  },

  async addNote(conversationId: string, text: string): Promise<Message> {
    const res = await api.post<Message>(`/api/v1/conversations/${conversationId}/notes`, { text });
    return res.data;
  },

  async updateStatus(id: string, status: ConversationStatus): Promise<Conversation> {
    const backendStatus = status === 'resolved' ? 'closed' : status;
    const res = await api.patch<Conversation>(`/api/v1/conversations/${id}/status`, { status: backendStatus });
    return res.data;
  },

  async assign(id: string, payload: {
    assignedAgentId?: string | null;
    stationId?: string | null;
    notifyEmployeeWhatsApp?: boolean;
  }): Promise<Conversation> {
    const res = await api.post<Conversation>(`/api/v1/conversations/${id}/assign`, {
      assignedEmployeeId: payload.assignedAgentId,
      assignedStationId: payload.stationId,
      notifyEmployeeWhatsApp: payload.notifyEmployeeWhatsApp,
    });
    return res.data;
  },

  async markAsRead(id: string): Promise<void> {
    await api.post(`/api/v1/conversations/${id}/read`, {});
  },

  async toggleMode(id: string, payload: { humanMode?: boolean; automationEnabled?: boolean }): Promise<Conversation> {
    const res = await api.patch<Conversation>(`/api/v1/conversations/${id}/mode`, payload);
    return res.data;
  },

  async updateNotes(id: string, notes: string): Promise<Conversation> {
    const res = await api.post<Conversation>(`/api/v1/conversations/${id}/notes`, { text: notes });
    return res.data;
  },

  async updateMode(id: string, mode: { humanMode?: boolean; automationEnabled?: boolean }): Promise<any> {
    const res = await api.patch<any>(`/api/v1/conversations/${id}/mode`, mode);
    return res.data;
  },

  async suggestReply(id: string): Promise<{ suggestion: string }> {
    const res = await api.post<any>(`/api/v1/conversations/${id}/suggest-reply`);
    return res.data?.data || res.data;
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete<{ success: boolean; message: string }>(`/api/v1/conversations/${id}`);
    return res.data;
  },

  async getQuickReplies(): Promise<Array<{ id: string; shortcut: string; content: string; title: string }>> {
    try {
      const res = await api.get<any[]>('/api/v1/quick-replies');
      const list = res.data || [];
      return list.map((qr: any) => ({
        id: qr.id,
        shortcut: qr.shortcut,
        content: qr.body || qr.content,
        body: qr.body || qr.content,
        title: qr.name || qr.title,
        name: qr.name || qr.title,
      }));
    } catch {
      return [];
    }
  },

  async uploadMedia(file: File): Promise<{ url: string; fileName: string; fileLength: number; mimeType: string }> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const res = await api.post<any>('/api/v1/media/upload', {
      dataUrl,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
    });

    const data = res.data || {};
    return {
      url: data.url,
      fileName: data.fileName || file.name,
      fileLength: data.size || file.size,
      mimeType: data.mimeType || file.type,
    };
  },
};

