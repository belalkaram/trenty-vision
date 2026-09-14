import { api } from './api.client';
import { AutomationRule, AutomationSettings } from '@/types/automations';

export interface Reminder {
  id: string;
  assignedUserId: string;
  conversationId?: string;
  leadId?: string;
  title: string;
  note?: string;
  dueAt: string;
  status: 'pending' | 'completed' | 'cancelled';
  completedAt?: string;
  createdAt?: string;
}

export const automationsService = {
  async getSettings(): Promise<AutomationSettings> {
    const res = await api.get<any>('/api/v1/automations/settings');
    const d = res.data || {};
    const outOfOfficeEnabled = d.outOfOfficeBotEnabled ?? d.outOfHoursMessageEnabled ?? false;
    return {
      greetingBotEnabled: d.greetingBotEnabled ?? d.welcomeMessageEnabled ?? true,
      greetingMessage: d.greetingMessage || d.welcomeMessageTemplate || '',
      outOfOfficeBotEnabled: outOfOfficeEnabled,
      outOfOfficeEnabled: outOfOfficeEnabled,
      outOfOfficeMessage: d.outOfOfficeMessage || d.outOfHoursMessageTemplate || '',
      routingStrategy: d.routingStrategy || d.assignmentMode || 'round_robin',
      businessHoursStart: d.businessHours?.start || '09:00',
      businessHoursEnd: d.businessHours?.end || '18:00',
      activeDays: d.businessHours?.workDays || [0, 1, 2, 3, 4, 6],
      automationEnabled: d.automationEnabled ?? true,
      assignmentEnabled: d.assignmentEnabled ?? true,
      assignmentTimeoutMinutes: d.assignmentTimeoutMinutes ?? 30,
    } as AutomationSettings;
  },

  async updateSettings(settings: Partial<AutomationSettings>): Promise<any> {
    const payload: any = { ...settings };
    if (settings.greetingBotEnabled !== undefined) payload.welcomeMessageEnabled = settings.greetingBotEnabled;
    if (settings.greetingMessage !== undefined) payload.welcomeMessageTemplate = settings.greetingMessage;
    // Handle both canonical and legacy names
    const oohEnabled = settings.outOfOfficeEnabled ?? settings.outOfOfficeBotEnabled;
    if (oohEnabled !== undefined) {
      payload.outOfHoursMessageEnabled = oohEnabled;
      payload.outOfOfficeBotEnabled = oohEnabled;
    }
    if (settings.outOfOfficeMessage !== undefined) payload.outOfHoursMessageTemplate = settings.outOfOfficeMessage;
    if (settings.routingStrategy !== undefined) payload.assignmentMode = settings.routingStrategy;

    const res = await api.put<any>('/api/v1/automations/settings', payload);
    return res.data;
  },

  async listRules(): Promise<AutomationRule[]> {
    const res = await api.get<any[]>('/api/v1/automations/rules');
    const list = res.data || [];
    return list.map((r: any) => {
      const cond = r.conditions || {};
      const actions = r.actions || [];
      const replyAction = actions.find((a: any) => a.type === 'reply');
      const stationAction = actions.find((a: any) => a.type === 'assign_station');

      return {
        id: r.id,
        name: r.name,
        keyword: cond.keyword || r.keyword || '',
        matchType: cond.matchType || r.matchType || 'exact',
        replyText: replyAction?.text || r.replyText || '',
        stationId: stationAction?.stationId || r.stationId || undefined,
        priority: r.priority || 0,
        isActive: r.enabled ?? r.isActive ?? true,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      } as AutomationRule;
    });
  },

  async createRule(input: any): Promise<AutomationRule> {
    const payload = {
      name: input.name,
      triggerType: 'keyword',
      conditions: {
        keyword: input.keyword,
        matchType: input.matchType || 'exact',
      },
      actions: [
        ...(input.replyText ? [{ type: 'reply', text: input.replyText }] : []),
        ...(input.stationId ? [{ type: 'assign_station', stationId: input.stationId }] : []),
      ],
      priority: input.priority || 0,
      enabled: input.isActive ?? true,
    };

    const res = await api.post<any>('/api/v1/automations/rules', payload);
    return res.data;
  },

  async updateRule(id: string, input: Partial<AutomationRule>): Promise<AutomationRule> {
    const payload: any = {
      name: input.name,
      priority: input.priority,
      enabled: input.isActive,
    };

    if (input.keyword || input.matchType) {
      payload.conditions = {
        keyword: input.keyword,
        matchType: input.matchType || 'exact',
      };
    }

    if (input.replyText !== undefined || input.stationId !== undefined) {
      payload.actions = [
        ...(input.replyText ? [{ type: 'reply', text: input.replyText }] : []),
        ...(input.stationId ? [{ type: 'assign_station', stationId: input.stationId }] : []),
      ];
    }

    const res = await api.patch<any>(`/api/v1/automations/rules/${id}`, payload);
    return res.data;
  },

  async deleteRule(id: string): Promise<void> {
    await api.delete(`/api/v1/automations/rules/${id}`);
  },

  // Reminders subsystem
  async listReminders(): Promise<Reminder[]> {
    const res = await api.get<Reminder[]>('/api/v1/automations/reminders');
    return res.data || [];
  },

  async createReminder(input: {
    conversationId?: string;
    leadId?: string;
    title: string;
    note?: string;
    dueAt: string;
  }): Promise<Reminder> {
    const res = await api.post<Reminder>('/api/v1/automations/reminders', input);
    return res.data;
  },

  async updateReminderStatus(id: string, status: 'pending' | 'completed' | 'cancelled'): Promise<Reminder> {
    const res = await api.patch<Reminder>(`/api/v1/automations/reminders/${id}/status`, { status });
    return res.data;
  },
};

