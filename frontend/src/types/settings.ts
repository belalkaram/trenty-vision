export interface BusinessHoursDay {
  enabled: boolean;
  start: string;
  end: string;
}

export interface BusinessHoursSchedule {
  sunday: BusinessHoursDay;
  monday: BusinessHoursDay;
  tuesday: BusinessHoursDay;
  wednesday: BusinessHoursDay;
  thursday: BusinessHoursDay;
  friday: BusinessHoursDay;
  saturday: BusinessHoursDay;
}

export interface SystemSettings {
  systemName: string;
  timezone: string;
  businessHours: BusinessHoursSchedule;
  defaultLanguage: string;
  autoAssignmentEnabled: boolean;
  routingStrategy: 'round_robin' | 'least_busy' | 'manual';
  maxConcurrentChatsPerAgent: number;
  // AI Bot & Assistant Settings
  aiEnabled?: boolean;
  aiProvider?: 'openai' | 'anthropic' | 'gemini' | 'custom';
  aiApiKey?: string;
  aiModel?: string;
  aiSystemPrompt?: string;
  aiAutoSuggestReplies?: boolean;
  aiAutoSummarize?: boolean;
  // Landing Page Sync Settings
  landingSyncEnabled?: boolean;
  landingSyncUrl?: string;
}
