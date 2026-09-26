import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  WASocket,
  BaileysEventEmitter,
  ConnectionState,
  AnyMessageContent,
  delay,
  getContentType,
} from '@whiskeysockets/baileys';
import * as QRCode from 'qrcode';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../../utils/logger';
import type { WhatsAppProvider, WhatsAppConnectionState, SendMessageOptions } from './whatsapp.provider';

export interface BaileysProviderEvents {
  'qr': (accountId: string, qrDataUrl: string) => void;
  'status': (accountId: string, state: WhatsAppConnectionState) => void;
  'message': (accountId: string, message: any) => void;
  'message.update': (accountId: string, updates: any[]) => void;
  'contacts.sync': (accountId: string, contacts: any[]) => void;
}

/**
 * BaileysProvider — Full WhatsApp provider implementation wrapping Baileys.
 * Uses high-performance local multi-file auth state (storage/whatsapp_sessions/<id>)
 * for zero-latency cryptographic key operations and rock-solid connection stability.
 */
export class BaileysProvider extends EventEmitter implements WhatsAppProvider {
  private sock: WASocket | null = null;
  private accountId: string;
  private state: WhatsAppConnectionState = { status: 'disconnected' };
  private reconnectAttempt = 0;
  private maxReconnectAttempts = 3;
  private saveCreds: (() => Promise<void>) | null = null;
  private clearAuthState: (() => Promise<void>) | null = null;
  private isReconnecting = false;
  private isShuttingDown = false;
  private sessionDir: string;

  constructor(accountId: string) {
    super();
    this.accountId = accountId;
    this.sessionDir = path.join(process.cwd(), 'storage', 'whatsapp_sessions', accountId);
  }

  get connectionState(): WhatsAppConnectionState {
    return { ...this.state };
  }

  async connect(): Promise<void> {
    if (this.sock && this.state.status === 'connected') {
      logger.warn({ accountId: this.accountId }, 'Already connected, skipping connect()');
      return;
    }

    this.isShuttingDown = false;
    this.updateState({ status: 'initializing', error: undefined });

    try {
      // Ensure local session storage directory exists
      await fs.mkdir(this.sessionDir, { recursive: true });

      // Fast, native local auth state
      const { state: authState, saveCreds } = await useMultiFileAuthState(this.sessionDir);
      this.saveCreds = saveCreds;
      this.clearAuthState = async () => {
        try {
          await fs.rm(this.sessionDir, { recursive: true, force: true });
          logger.info({ accountId: this.accountId }, 'Local session files purged');
        } catch (err) {
          logger.warn({ accountId: this.accountId, err }, 'Failed to clear local session files');
        }
      };

      const { version } = await fetchLatestBaileysVersion();
      logger.info({ accountId: this.accountId, version }, 'Fetched latest Baileys version');

      this.sock = makeWASocket({
        version,
        auth: {
          creds: authState.creds,
          keys: makeCacheableSignalKeyStore(authState.keys, logger as any),
        },
        printQRInTerminal: false,
        generateHighQualityLinkPreview: false,
        logger: logger as any,
        markOnlineOnConnect: true,
        syncFullHistory: false,
        browser: ['Trenty Vision CRM', 'Chrome', '1.0.0'],
      });

      this.registerEventHandlers(this.sock.ev);

    } catch (err) {
      logger.error({ accountId: this.accountId, err }, 'Failed to initialize Baileys socket');
      this.updateState({ status: 'error', error: (err as Error).message });
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    this.isShuttingDown = true;
    if (this.sock) {
      try {
        this.sock.end(undefined);
        this.sock = null;
      } catch (err) {
        logger.warn({ accountId: this.accountId, err }, 'Error during disconnect');
      }
    }
    this.updateState({ status: 'disconnected' });
    this.reconnectAttempt = 0;
  }

  async logout(): Promise<void> {
    this.isShuttingDown = true;
    if (this.sock) {
      try {
        await this.sock.logout();
      } catch (err) {
        logger.warn({ accountId: this.accountId, err }, 'Error during logout');
      }
      this.sock = null;
    }
    // Clear all stored auth state
    if (this.clearAuthState) {
      await this.clearAuthState();
    }
    this.updateState({ status: 'logged_out', error: undefined });
    this.reconnectAttempt = 0;
  }

  async getStatus(): Promise<WhatsAppConnectionState> {
    return this.connectionState;
  }

  async getQRCode(): Promise<string | null> {
    return this.state.qrCode || null;
  }

  async getPairingCode(): Promise<string | null> {
    return this.state.pairingCode || null;
  }

  /**
   * Request an 8-character pairing code to link phone via phone number
   */
  async requestPairingCode(phoneNumber: string): Promise<string> {
    if (this.state.status === 'connected') {
      throw new Error('حساب WhatsApp متصل ومقترن بالفعل. إذا كنت ترغب في ربط رقم جديد، يرجى تسجيل الخروج أولاً.');
    }

    let cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
    // Strip leading zero if typed after common country codes (e.g. 96605... -> 9665..., 2001... -> 201...)
    cleanNumber = cleanNumber.replace(/^(966|965|971|974|968|973|962|20)0+/, '$1');

    if (!cleanNumber || cleanNumber.length < 8) {
      throw new Error('رقم الهاتف غير صالح لطلب كود الاقتران. يرجى إدخال الرقم مع رمز الدولة (مثل: 9665XXXXXXXX أو 201XXXXXXXXX)');
    }

    // Ensure socket exists and is in open state
    const isSocketOpen = (this.sock as any)?.ws?.isOpen;
    if (!this.sock || !isSocketOpen) {
      logger.info({ accountId: this.accountId }, 'Socket not currently open for pairing code, preparing fresh connection...');
      if (this.sock) {
        try { this.sock.end(undefined); } catch { /* ignore */ }
        this.sock = null;
      }
      await this.connect();
    }

    if (!this.sock) {
      throw new Error('تعذر تهيئة مقبس WhatsApp');
    }

    try {
      if (typeof (this.sock as any).waitForSocketOpen === 'function') {
        await (this.sock as any).waitForSocketOpen();
      }
      await delay(1500);

      const code = await this.sock.requestPairingCode(cleanNumber);
      this.updateState({ status: 'qr_required', pairingCode: code });
      logger.info({ accountId: this.accountId, code, cleanNumber }, 'Pairing code generated successfully');
      return code;
    } catch (err: any) {
      logger.warn({ accountId: this.accountId, err: err?.message }, 'First pairing code attempt failed, retrying with fresh socket...');
      try {
        if (this.sock) {
          try { this.sock.end(undefined); } catch { /* ignore */ }
          this.sock = null;
        }
        await this.connect();
        if (typeof (this.sock as any).waitForSocketOpen === 'function') {
          await (this.sock as any).waitForSocketOpen();
        }
        await delay(2000);
        const activeSock = this.sock as any;
        if (!activeSock) {
          throw new Error('تعذر إعادة تهيئة مقبس WhatsApp');
        }
        const code = await activeSock.requestPairingCode(cleanNumber);
        this.updateState({ status: 'qr_required', pairingCode: code });
        logger.info({ accountId: this.accountId, code, cleanNumber }, 'Pairing code generated on retry');
        return code;
      } catch (retryErr: any) {
        logger.error({ accountId: this.accountId, retryErr }, 'Failed to request pairing code from Baileys after retry');
        throw new Error(retryErr?.message || 'فشل طلب رمز الاقتران من خوادم WhatsApp. تأكد من أن الرقم صحيح وغير مقترن بجهاز آخر.');
      }
    }
  }

  // ─── Messaging Methods ─────────────────────────────────

  async sendText(toJid: string, text: string, options?: SendMessageOptions): Promise<{ id: string; timestamp: Date }> {
    this.ensureConnected();
    const content: AnyMessageContent = { text };
    if (options?.quotedMessageId) {
      // Quote is handled at a higher level if needed
    }
    const result = await this.sock!.sendMessage(toJid, content);
    return {
      id: result?.key?.id || `msg_${Date.now()}`,
      timestamp: new Date((result?.messageTimestamp as number || Math.floor(Date.now() / 1000)) * 1000),
    };
  }

  async sendImage(toJid: string, buffer: Buffer, mimeType: string, options?: SendMessageOptions): Promise<{ id: string; timestamp: Date }> {
    this.ensureConnected();
    const result = await this.sock!.sendMessage(toJid, {
      image: buffer,
      mimetype: mimeType,
      caption: options?.caption,
    });
    return {
      id: result?.key?.id || `img_${Date.now()}`,
      timestamp: new Date((result?.messageTimestamp as number || Math.floor(Date.now() / 1000)) * 1000),
    };
  }

  async sendVideo(toJid: string, buffer: Buffer, mimeType: string, options?: SendMessageOptions): Promise<{ id: string; timestamp: Date }> {
    this.ensureConnected();
    const result = await this.sock!.sendMessage(toJid, {
      video: buffer,
      mimetype: mimeType,
      caption: options?.caption,
    });
    return {
      id: result?.key?.id || `vid_${Date.now()}`,
      timestamp: new Date((result?.messageTimestamp as number || Math.floor(Date.now() / 1000)) * 1000),
    };
  }

  async sendAudio(toJid: string, buffer: Buffer, isVoiceNote = false, options?: SendMessageOptions): Promise<{ id: string; timestamp: Date }> {
    this.ensureConnected();
    const result = await this.sock!.sendMessage(toJid, {
      audio: buffer,
      mimetype: 'audio/ogg; codecs=opus',
      ptt: isVoiceNote,
    });
    return {
      id: result?.key?.id || `aud_${Date.now()}`,
      timestamp: new Date((result?.messageTimestamp as number || Math.floor(Date.now() / 1000)) * 1000),
    };
  }

  async sendDocument(toJid: string, buffer: Buffer, fileName: string, mimeType: string, options?: SendMessageOptions): Promise<{ id: string; timestamp: Date }> {
    this.ensureConnected();
    const result = await this.sock!.sendMessage(toJid, {
      document: buffer,
      mimetype: mimeType,
      fileName,
      caption: options?.caption,
    });
    return {
      id: result?.key?.id || `doc_${Date.now()}`,
      timestamp: new Date((result?.messageTimestamp as number || Math.floor(Date.now() / 1000)) * 1000),
    };
  }

  async sendLocation(toJid: string, latitude: number, longitude: number, name?: string, address?: string): Promise<{ id: string; timestamp: Date }> {
    this.ensureConnected();
    const result = await this.sock!.sendMessage(toJid, {
      location: {
        degreesLatitude: latitude,
        degreesLongitude: longitude,
        name,
        address,
      },
    });
    return {
      id: result?.key?.id || `loc_${Date.now()}`,
      timestamp: new Date((result?.messageTimestamp as number || Math.floor(Date.now() / 1000)) * 1000),
    };
  }

  async sendContact(toJid: string, contactJid: string, displayName: string): Promise<{ id: string; timestamp: Date }> {
    this.ensureConnected();
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${displayName}\nTEL;type=CELL;type=VOICE;waid=${contactJid.split('@')[0]}:+${contactJid.split('@')[0]}\nEND:VCARD`;
    const result = await this.sock!.sendMessage(toJid, {
      contacts: {
        displayName,
        contacts: [{ vcard }],
      },
    });
    return {
      id: result?.key?.id || `cnt_${Date.now()}`,
      timestamp: new Date((result?.messageTimestamp as number || Math.floor(Date.now() / 1000)) * 1000),
    };
  }

  // ─── Group Management Methods ─────────────────────────

  /**
   * Fetch all participating WhatsApp groups with metadata
   */
  async fetchAllGroups(): Promise<Array<{ id: string; subject: string; size: number; desc?: string; owner?: string }>> {
    this.ensureConnected();
    const groups = await this.sock!.groupFetchAllParticipating();
    return Object.values(groups).map((g) => ({
      id: g.id,
      subject: g.subject || 'جروب بدون اسم',
      size: g.participants?.length || 0,
      desc: typeof g.desc === 'string' ? g.desc : undefined,
      owner: g.owner || undefined,
    }));
  }

  /**
   * Get metadata and participants of a specific group
   */
  async getGroupMetadata(groupJid: string) {
    this.ensureConnected();
    return await this.sock!.groupMetadata(groupJid);
  }

  /**
   * Add participants to a WhatsApp group
   */
  async addGroupParticipants(groupJid: string, participants: string[]) {
    this.ensureConnected();
    return await this.sock!.groupParticipantsUpdate(groupJid, participants, 'add');
  }

  async sendReaction(toJid: string, messageId: string, emoji: string): Promise<void> {
    this.ensureConnected();
    await this.sock!.sendMessage(toJid, {
      react: { text: emoji, key: { remoteJid: toJid, id: messageId } },
    });
  }

  async markRead(jid: string, messageIds: string[]): Promise<void> {
    this.ensureConnected();
    const keys = messageIds.map((id) => ({
      remoteJid: jid,
      id,
    }));
    await this.sock!.readMessages(keys);
  }

  async sendTyping(jid: string, isTyping: boolean): Promise<void> {
    this.ensureConnected();
    await this.sock!.sendPresenceUpdate(isTyping ? 'composing' : 'paused', jid);
  }

  /**
   * Resolves a WhatsApp LID (e.g. 6073184461040) to its real phone number
   */
  async getPhoneNumberForLid(lid: string): Promise<string | null> {
    try {
      const cleanLid = lid.replace(/[^0-9]/g, '');
      if (!cleanLid) return null;

      // 1. Check direct reverse mapping file in local session storage
      const reverseFilePath = path.join(this.sessionDir, `lid-mapping-${cleanLid}_reverse.json`);
      try {
        const fileContent = await fs.readFile(reverseFilePath, 'utf-8');
        const parsed = JSON.parse(fileContent.trim());
        if (parsed && typeof parsed === 'string') {
          return parsed.replace(/\D/g, '');
        }
      } catch {
        // File might not exist yet
      }

      // 2. Check in-memory signalRepository if available
      const signalRepo = (this.sock as any)?.signalRepository;
      if (signalRepo?.lidMapping?.getPNForLID) {
        const pn = await signalRepo.lidMapping.getPNForLID(cleanLid);
        if (pn) return String(pn).replace(/\D/g, '');
      }

      return null;
    } catch (err) {
      logger.debug({ accountId: this.accountId, lid, err }, 'Failed to resolve LID to PN');
      return null;
    }
  }

  // ─── Private Methods ───────────────────────────────────

  private ensureConnected(): void {
    if (!this.sock || this.state.status !== 'connected') {
      throw new Error(`WhatsApp account ${this.accountId} is not connected`);
    }
  }

  private updateState(partial: Partial<WhatsAppConnectionState>): void {
    this.state = { ...this.state, ...partial };
    this.emit('status', this.accountId, this.connectionState);
  }

  private registerEventHandlers(ev: BaileysEventEmitter): void {
    // Credentials update
    ev.on('creds.update', async () => {
      if (this.saveCreds) {
        await this.saveCreds();
      }
    });

    // Connection update
    ev.on('connection.update', async (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // Generate QR code as base64 data URL for the frontend
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, {
            width: 300,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' },
          });
          this.updateState({ status: 'qr_required', qrCode: qrDataUrl });
          this.emit('qr', this.accountId, qrDataUrl);
          logger.info({ accountId: this.accountId }, 'QR code generated, waiting for scan');
        } catch (err) {
          logger.error({ accountId: this.accountId, err }, 'Failed to generate QR code');
        }
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        const shouldReconnect = !isLoggedOut && statusCode !== 403;

        let errorMsg = 'انقطع الاتصال بمقبس WhatsApp';
        if (statusCode === DisconnectReason.loggedOut) {
          errorMsg = 'تم تسجيل الخروج من تطبيق WhatsApp على هاتفك. يلزم مسح رمز QR جديد للاتصال.';
        } else if (statusCode === DisconnectReason.timedOut) {
          errorMsg = 'انتهت صلاحية رمز الاستجابة السريعة (QR) أو انقطعت مهلة المقبس.';
        } else if (statusCode === DisconnectReason.connectionReplaced) {
          errorMsg = 'تم تسجيل الدخول إلى هذا الحساب من جهاز أو متصفح آخر.';
        } else if (statusCode === DisconnectReason.restartRequired) {
          errorMsg = 'جاري إعادة تشغيل الجلسة لتطبيق المفاتيح المشفرة.';
        }

        logger.info(
          { accountId: this.accountId, statusCode, shouldReconnect, errorMsg },
          'WhatsApp connection closed'
        );

        if (isLoggedOut) {
          // Logged out — clear auth state, do NOT reconnect
          this.updateState({ status: 'logged_out', error: errorMsg });
          if (this.clearAuthState) {
            await this.clearAuthState();
          }
        } else if (shouldReconnect && !this.isShuttingDown) {
          // Auto-reconnect with exponential backoff (max 3 times)
          this.scheduleReconnect();
        } else {
          this.updateState({ status: 'disconnected', error: errorMsg });
        }
      }

      if (connection === 'open') {
        // Successfully connected
        const phoneNumber = this.sock?.user?.id?.split(':')[0] || this.sock?.user?.id?.split('@')[0] || '';
        const jid = this.sock?.user?.id || '';
        const deviceName = this.sock?.user?.name || 'Unknown';

        this.reconnectAttempt = 0;
        this.isReconnecting = false;

        this.updateState({
          status: 'connected',
          qrCode: undefined,
          phoneNumber: `+${phoneNumber}`,
          jid,
          deviceName,
          lastSeenAt: new Date(),
          error: undefined,
        });

        logger.info({ accountId: this.accountId, phoneNumber, jid, deviceName }, 'WhatsApp connected successfully');
      }
    });

    // Inbound & synced messages
    ev.on('messages.upsert', async ({ messages: msgs, type }) => {
      for (const msg of msgs) {
        if (!msg.key.remoteJid) continue;
        if (msg.key.remoteJid === 'status@broadcast') continue;

        this.emit('message', this.accountId, msg);
        logger.debug(
          { accountId: this.accountId, from: msg.key.remoteJid, messageId: msg.key.id, type },
          'WhatsApp message received / upserted'
        );
      }
    });

    // Message status updates (delivered, read, etc.)
    ev.on('messages.update', async (updates) => {
      this.emit('message.update', this.accountId, updates);
    });

    // Synced contacts from phone address book
    ev.on('contacts.upsert', (newContacts) => {
      this.emit('contacts.sync', this.accountId, newContacts);
    });

    (ev as any).on('contacts.set', ({ contacts: setContacts }: any) => {
      this.emit('contacts.sync', this.accountId, setContacts);
    });

    ev.on('contacts.update', (updatedContacts) => {
      this.emit('contacts.sync', this.accountId, updatedContacts);
    });
  }

  private scheduleReconnect(): void {
    if (this.isReconnecting || this.isShuttingDown) return;
    if (this.reconnectAttempt >= this.maxReconnectAttempts) {
      logger.warn({ accountId: this.accountId }, 'Max reconnect attempts reached, stopping retry loop');
      this.updateState({
        status: 'error',
        error: 'تعذر إعادة الاتصال تلقائياً بعد عدة محاولات. يرجى الضغط على "إعادة ضبط نظيفة" لإعادة تهيئة المقبس.',
      });
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempt++;
    const backoffMs = Math.min(1500 * Math.pow(2, this.reconnectAttempt - 1), 15000);

    logger.info(
      { accountId: this.accountId, attempt: this.reconnectAttempt, backoffMs },
      'Scheduling reconnect'
    );
    this.updateState({ status: 'connecting' });

    setTimeout(async () => {
      this.isReconnecting = false;
      if (!this.isShuttingDown) {
        try {
          await this.connect();
        } catch (err) {
          logger.error({ accountId: this.accountId, err }, 'Reconnect failed');
        }
      }
    }, backoffMs);
  }
}
