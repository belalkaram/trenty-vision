export interface ReportOverview {
  totalConversations: number;
  openConversations: number;
  resolvedConversations: number;
  avgResponseTimeSeconds: number;
  totalMessagesSent: number;
  totalMessagesReceived: number;
  activeAgentsCount: number;
  pendingConversations?: number;
  waitingConversations?: number;
  closedConversations?: number;
  resolutionRate?: number;
  totalMessages?: number;
  incomingMessages?: number;
  outgoingMessages?: number;
  totalContacts?: number;
}

export interface AgentPerformanceMetric {
  agentId: string;
  agentName: string;
  totalAssigned: number;
  totalResolved: number;
  avgResponseMinutes: number;
  onlineHours: number;
  id?: string;
  email?: string;
  status?: string;
  stationName?: string;
  outgoingMessages?: number;
  avgResponseTimeSeconds?: number;
}

export interface StationVolumeMetric {
  stationId: string;
  stationName: string;
  color?: string;
  totalChats: number;
  activeChats: number;
  id?: string;
  name?: string;
  totalConversations?: number;
  openConversations?: number;
}

export interface EmployeeWhatsappPerformance {
  id: string;
  name: string;
  status: string;
  whatsappNumber: string;
  stationName: string;
  totalAssigned: number;
  totalRepliedToCustomers: number;
  totalOutgoingMessages: number;
  avgResponseTimeSeconds: number;
  avgResponseMinutes: number;
}

export interface AutoRegisteredCustomer {
  id: string;
  name: string;
  phoneNumber: string;
  contactCreatedAt: string;
  conversationCreatedAt: string;
  assignedEmployeeName: string | null;
  dispatcherName: string | null;
}
