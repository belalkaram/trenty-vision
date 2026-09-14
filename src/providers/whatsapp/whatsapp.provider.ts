export interface WhatsAppConnectionState {
  status: 'disconnected' | 'initializing' | 'qr_required' | 'connecting' | 'connected' | 'logged_out' | 'error';
  qrCode?: string;
  pairingCode?: string;
  phoneNumber?: string;
  jid?: string;
  deviceName?: string;
  lastSeenAt?: Date;
  error?: string;
}

export interface SendMessageOptions {
  quotedMessageId?: string;
  caption?: string;
}

export interface WhatsAppProvider {
  connect(accountId: string): Promise<void>;
  disconnect(accountId: string): Promise<void>;
  logout(accountId: string): Promise<void>;
  getStatus(accountId: string): Promise<WhatsAppConnectionState>;
  getQRCode(accountId: string): Promise<string | null>;

  sendText(toJid: string, text: string, options?: SendMessageOptions): Promise<{ id: string; timestamp: Date }>;
  sendImage(toJid: string, buffer: Buffer, mimeType: string, options?: SendMessageOptions): Promise<{ id: string; timestamp: Date }>;
  sendVideo(toJid: string, buffer: Buffer, mimeType: string, options?: SendMessageOptions): Promise<{ id: string; timestamp: Date }>;
  sendAudio(toJid: string, buffer: Buffer, isVoiceNote?: boolean, options?: SendMessageOptions): Promise<{ id: string; timestamp: Date }>;
  sendDocument(toJid: string, buffer: Buffer, fileName: string, mimeType: string, options?: SendMessageOptions): Promise<{ id: string; timestamp: Date }>;
  sendLocation(toJid: string, latitude: number, longitude: number, name?: string, address?: string): Promise<{ id: string; timestamp: Date }>;
  sendContact(toJid: string, contactJid: string, displayName: string): Promise<{ id: string; timestamp: Date }>;
  sendReaction(toJid: string, messageId: string, emoji: string): Promise<void>;
  markRead(jid: string, messageIds: string[]): Promise<void>;
  sendTyping(jid: string, isTyping: boolean): Promise<void>;
}

/**
 * MockWhatsAppProvider for automated unit & integration testing (Requirement 67 & 68)
 */
export class MockWhatsAppProvider implements WhatsAppProvider {
  private state: WhatsAppConnectionState = { status: 'disconnected' };

  async connect(accountId: string): Promise<void> {
    this.state = { status: 'connected', phoneNumber: '+96512345678', jid: '96512345678@s.whatsapp.net', deviceName: 'Mock Device' };
  }

  async disconnect(accountId: string): Promise<void> {
    this.state = { status: 'disconnected' };
  }

  async logout(accountId: string): Promise<void> {
    this.state = { status: 'logged_out' };
  }

  async getStatus(accountId: string): Promise<WhatsAppConnectionState> {
    return this.state;
  }

  async getQRCode(accountId: string): Promise<string | null> {
    return 'mock_qr_string_data';
  }

  async sendText(toJid: string, text: string): Promise<{ id: string; timestamp: Date }> {
    return { id: `mock_msg_${Date.now()}`, timestamp: new Date() };
  }

  async sendImage(toJid: string, buffer: Buffer, mimeType: string): Promise<{ id: string; timestamp: Date }> {
    return { id: `mock_img_${Date.now()}`, timestamp: new Date() };
  }

  async sendVideo(toJid: string, buffer: Buffer, mimeType: string): Promise<{ id: string; timestamp: Date }> {
    return { id: `mock_vid_${Date.now()}`, timestamp: new Date() };
  }

  async sendAudio(toJid: string, buffer: Buffer, isVoiceNote?: boolean): Promise<{ id: string; timestamp: Date }> {
    return { id: `mock_aud_${Date.now()}`, timestamp: new Date() };
  }

  async sendDocument(toJid: string, buffer: Buffer, fileName: string, mimeType: string): Promise<{ id: string; timestamp: Date }> {
    return { id: `mock_doc_${Date.now()}`, timestamp: new Date() };
  }

  async sendLocation(toJid: string, lat: number, lng: number): Promise<{ id: string; timestamp: Date }> {
    return { id: `mock_loc_${Date.now()}`, timestamp: new Date() };
  }

  async sendContact(toJid: string, contactJid: string, name: string): Promise<{ id: string; timestamp: Date }> {
    return { id: `mock_cnt_${Date.now()}`, timestamp: new Date() };
  }

  async sendReaction(toJid: string, messageId: string, emoji: string): Promise<void> {}
  async markRead(jid: string, messageIds: string[]): Promise<void> {}
  async sendTyping(jid: string, isTyping: boolean): Promise<void> {}
}
