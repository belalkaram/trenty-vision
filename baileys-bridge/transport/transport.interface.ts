export interface OutboundMessagePayload {
  id: string;
  companyId: string;
  accountId: string;
  conversationId?: string | null;
  messageId?: string | null;
  toJid: string;
  type: string;
  text?: string | null;
  mediaData?: string | null;
  mediaMime?: string | null;
  mediaFilename?: string | null;
  caption?: string | null;
  quotedMessageId?: string | null;
  priority: number;
}

export interface BridgeCommandPayload {
  id: string;
  companyId: string;
  accountId?: string | null;
  action: string;
  payload: Record<string, any>;
}

export interface HeartbeatPayload {
  companyId: string;
  bridgeId: string;
  isOnline: boolean;
  version: string;
  uptimeSeconds: number;
  accountsSummary: any[];
}

export interface BridgeTransport {
  fetchPendingOutbound(companyId?: string, limit?: number): Promise<OutboundMessagePayload[]>;
  markOutboundSent(id: string, whatsappMessageId: string, messageId?: string | null): Promise<void>;
  markOutboundFailed(id: string, error: string, messageId?: string | null): Promise<void>;

  fetchPendingCommands(companyId?: string, limit?: number): Promise<BridgeCommandPayload[]>;
  markCommandCompleted(id: string, result?: Record<string, any>): Promise<void>;
  markCommandFailed(id: string, error: string): Promise<void>;

  sendHeartbeat(payload: HeartbeatPayload): Promise<void>;
  updateAccountBridgeStatus(
    accountId: string,
    status: { bridgeStatus: string; bridgeQrCode?: string | null; accountStatus?: string }
  ): Promise<void>;
  resolveCompanyId(): Promise<string>;
}
