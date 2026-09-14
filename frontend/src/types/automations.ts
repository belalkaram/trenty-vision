export interface AutomationRule {
  id: string;
  name: string;
  keyword: string;
  matchType: 'exact' | 'contains' | 'starts_with';
  replyText: string;
  stationId?: string;
  isActive: boolean;
  priority: number;
  triggerCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationSettings {
  greetingBotEnabled: boolean;
  greetingMessage: string;
  // outOfOfficeEnabled is the canonical frontend field
  outOfOfficeEnabled: boolean;
  outOfOfficeBotEnabled: boolean;
  outOfOfficeMessage: string;
  routingStrategy: 'round_robin' | 'least_busy' | 'manual';
  assignmentTimeoutMinutes: number;
  automationEnabled: boolean;
  assignmentEnabled: boolean;
  businessHoursStart: string;
  businessHoursEnd: string;
  activeDays: number[];
}
