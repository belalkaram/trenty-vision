// Stub for WhatsAppSessionManager in Vercel Serverless environment
// In Vercel mode, WhatsApp sessions are handled remotely by the portable bridge via PostgreSQL.

export class WhatsAppSessionManager {
  private static instance: WhatsAppSessionManager;

  static getInstance(): WhatsAppSessionManager {
    if (!WhatsAppSessionManager.instance) {
      WhatsAppSessionManager.instance = new WhatsAppSessionManager();
    }
    return WhatsAppSessionManager.instance;
  }

  async initialize(): Promise<void> {}

  async connectAccount(_accountId: string): Promise<void> {}

  async disconnectAccount(_accountId: string): Promise<void> {}

  async logoutAccount(_accountId: string): Promise<void> {}

  async resetAccount(_accountId: string): Promise<void> {}

  async reconnectAccount(_accountId: string): Promise<void> {}

  async restartAccount(_accountId: string): Promise<void> {}

  async requestPairingCode(_accountId: string, _phoneNumber: string): Promise<string> {
    throw new Error('Pairing code requests on Vercel must be queued to the bridge');
  }

  async getPairingCode(_accountId: string): Promise<string | null> {
    return null;
  }

  async getAccountStatus(_accountId: string): Promise<{ status: string }> {
    return { status: 'disconnected' };
  }

  async deleteAccount(_accountId: string): Promise<void> {}

  async getQRCode(_accountId: string): Promise<string | null> {
    return null;
  }

  getProvider(_accountId: string): undefined {
    return undefined;
  }

  getActiveSessions(): Map<string, any> {
    return new Map();
  }

  async ensureSessionReady(_accountId: string): Promise<any> {
    throw new Error('Local sessionManager not available in Vercel mode');
  }

  async fetchAllGroups(_accountId: string): Promise<any[]> {
    return [];
  }

  async getGroupMetadata(_accountId: string, _groupJid: string): Promise<any> {
    return null;
  }

  async addGroupParticipants(_accountId: string, _groupJid: string, _participants: string[]): Promise<any> {
    return [];
  }

  async getGroupInviteCode(_accountId: string, _groupJid: string): Promise<string | undefined> {
    return undefined;
  }

  async getGroupInviteInfo(_accountId: string, _inviteCode: string): Promise<any> {
    return undefined;
  }

  async shutdown(): Promise<void> {}
}

export const sessionManager = WhatsAppSessionManager.getInstance();
export default sessionManager;
