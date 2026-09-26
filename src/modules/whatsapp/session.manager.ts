import { eq, and, or } from 'drizzle-orm';
import { db } from '../../database/client';
import { whatsappAccounts } from '../../database/schema/index';
import { BaileysProvider } from '../../providers/whatsapp/baileys.provider';
import { wsHub } from '../../websocket/ws.hub';
import { logger } from '../../utils/logger';
import { handleInboundMessage } from './inbound.handler';
import type { WhatsAppConnectionState } from '../../providers/whatsapp/whatsapp.provider';

/**
 * WhatsAppSessionManager — Singleton lifecycle manager for all WhatsApp connections.
 * 
 * Responsibilities:
 * - Tracks active sessions: Map<accountId, BaileysProvider>
 * - Handles reconnection with exponential backoff
 * - Emits events to WebSocket Hub
 * - On server startup: auto-restores sessions with status 'connected' or 'connecting'
 * - On graceful shutdown: disconnects all active sockets
 */
class WhatsAppSessionManager {
  private sessions: Map<string, BaileysProvider> = new Map();
  private connectingLocks: Set<string> = new Set();
  private static instance: WhatsAppSessionManager;

  private constructor() {}

  static getInstance(): WhatsAppSessionManager {
    if (!WhatsAppSessionManager.instance) {
      WhatsAppSessionManager.instance = new WhatsAppSessionManager();
    }
    return WhatsAppSessionManager.instance;
  }

  /**
   * Initialize — restore all previously connected sessions on server startup.
   */
  async initialize(): Promise<void> {
    logger.info('WhatsAppSessionManager: Initializing and restoring sessions...');

    try {
      const accounts = await db
        .select()
        .from(whatsappAccounts)
        .where(eq(whatsappAccounts.status, 'connected'));

      logger.info({ count: accounts.length }, 'WhatsAppSessionManager: Found accounts to restore');

      for (const account of accounts) {
        try {
          await this.connectAccount(account.id);
          logger.info({ accountId: account.id, displayName: account.displayName }, 'Session restored');
        } catch (err) {
          logger.error({ accountId: account.id, err }, 'Failed to restore session');
          // Update status to disconnected
          await db
            .update(whatsappAccounts)
            .set({ status: 'disconnected', updatedAt: new Date() })
            .where(eq(whatsappAccounts.id, account.id));
        }
      }
    } catch (err) {
      logger.error({ err }, 'WhatsAppSessionManager: Failed to initialize');
    }
  }

  /**
   * Connect a WhatsApp account — creates a new BaileysProvider and starts connection.
   */
  async connectAccount(accountId: string): Promise<void> {
    // Prevent overlapping connection attempts
    if (this.connectingLocks.has(accountId)) {
      logger.warn({ accountId }, 'Connection already in progress, skipping duplicate connect');
      return;
    }
    this.connectingLocks.add(accountId);

    try {
      // Prevent duplicate active connections
      if (this.sessions.has(accountId)) {
        const existing = this.sessions.get(accountId)!;
        const status = await existing.getStatus();
        if (status.status === 'connected' || status.status === 'connecting' || status.status === 'qr_required') {
          logger.warn({ accountId }, 'Session already active, skipping duplicate connect');
          return;
        }
        // Clean up stale session
        await existing.disconnect();
        this.sessions.delete(accountId);
      }

      const provider = new BaileysProvider(accountId);

      // Wire up event listeners to broadcast via WebSocket Hub
      provider.on('qr', async (accId: string, qrDataUrl: string) => {
        wsHub.broadcast('whatsapp.qr', { accountId: accId, qrCode: qrDataUrl });
        try {
          await db
            .update(whatsappAccounts)
            .set({
              bridgeQrCode: qrDataUrl,
              bridgeStatus: 'online',
              bridgeLastSeen: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(whatsappAccounts.id, accId));
        } catch (err) {
          logger.debug({ accountId: accId, err }, 'Failed to persist bridge QR code');
        }
      });

      provider.on('status', async (accId: string, state: WhatsAppConnectionState) => {
        wsHub.broadcast('whatsapp.status', { accountId: accId, ...state });

        // Persist status changes to database
        try {
          const updateData: any = {
            status: state.status as any,
            bridgeStatus: 'online',
            bridgeLastSeen: new Date(),
            updatedAt: new Date(),
          };
          if (state.phoneNumber) updateData.phoneNumber = state.phoneNumber;
          if (state.jid) updateData.jid = state.jid;
          if (state.deviceName) updateData.deviceName = state.deviceName;
          if (state.status === 'connected') {
            updateData.connectedAt = new Date();
            updateData.bridgeQrCode = null; // Clear QR code once connected
          }
          if (state.lastSeenAt) updateData.lastSeenAt = state.lastSeenAt;

          await db
            .update(whatsappAccounts)
            .set(updateData)
            .where(eq(whatsappAccounts.id, accId));
        } catch (err) {
          logger.error({ accountId: accId, err }, 'Failed to persist WhatsApp status to database');
        }
      });

      provider.on('message', async (accId: string, message: any) => {
        try {
          await handleInboundMessage(accId, message);
        } catch (inboundErr) {
          logger.error({ accountId: accId, err: inboundErr }, 'Failed to process inbound message in session manager');
        }
      });

      provider.on('message.update', (accId: string, updates: any[]) => {
        wsHub.broadcast('message.updated', { accountId: accId, updates });
      });

      provider.on('contacts.sync', async (accId: string, syncList: any[]) => {
        try {
          if (!Array.isArray(syncList) || syncList.length === 0) return;

          const [account] = await db
            .select({ companyId: whatsappAccounts.companyId })
            .from(whatsappAccounts)
            .where(eq(whatsappAccounts.id, accId))
            .limit(1);

          if (!account) return;
          const { contacts: contactsTable } = await import('../../database/schema/index');
          const { validateAndFormatPhone } = await import('../../utils/phone.validator');

          for (const c of syncList) {
            const rawJid = c.id || '';
            if (!rawJid || rawJid.includes('@g.us') || rawJid === 'status@broadcast') continue;

            const name = c.name || c.notify || c.verifiedName;
            const digits = rawJid.split('@')[0].split(':')[0];
            const phoneValidation = validateAndFormatPhone(digits);
            if (!phoneValidation.isValid) continue;

            const formattedPhone = phoneValidation.formatted;

            const [existing] = await db
              .select()
              .from(contactsTable)
              .where(
                and(
                  eq(contactsTable.companyId, account.companyId),
                  or(
                    eq(contactsTable.phoneNumber, formattedPhone),
                    eq(contactsTable.whatsappJid, rawJid)
                  )
                )
              )
              .limit(1);

            if (existing) {
              const meta = (existing.metadata || {}) as Record<string, any>;
              const updateData: Record<string, any> = {
                metadata: { ...meta, isSavedOnPhone: true, phoneBookName: name || meta.phoneBookName },
                updatedAt: new Date(),
              };
              if (name && (existing.name === existing.phoneNumber || !existing.name)) {
                updateData.name = name;
              }
              await db.update(contactsTable).set(updateData).where(eq(contactsTable.id, existing.id));
            } else if (name) {
              // Create contact if it has an address book name from the phone
              await db.insert(contactsTable).values({
                companyId: account.companyId,
                name,
                phoneNumber: formattedPhone,
                whatsappJid: rawJid,
                source: 'phone_address_book',
                metadata: { isSavedOnPhone: true, phoneBookName: name },
              });
            }
          }
        } catch (syncErr) {
          logger.debug({ accountId: accId, err: syncErr }, 'Error syncing address book contacts');
        }
      });

      this.sessions.set(accountId, provider);

      // Update database status
      await db
        .update(whatsappAccounts)
        .set({ status: 'initializing', updatedAt: new Date() })
        .where(eq(whatsappAccounts.id, accountId));

      // Start connection
      await provider.connect();
    } finally {
      this.connectingLocks.delete(accountId);
    }
  }

  /**
   * Disconnect a WhatsApp account (keeps auth state for reconnect).
   */
  async disconnectAccount(accountId: string): Promise<void> {
    const provider = this.sessions.get(accountId);
    if (!provider) {
      logger.warn({ accountId }, 'No active session to disconnect');
      return;
    }

    await provider.disconnect();
    this.sessions.delete(accountId);

    await db
      .update(whatsappAccounts)
      .set({ status: 'disconnected', updatedAt: new Date() })
      .where(eq(whatsappAccounts.id, accountId));

    logger.info({ accountId }, 'WhatsApp account disconnected');
  }

  /**
   * Logout a WhatsApp account (clears auth state, requires new QR scan).
   */
  async logoutAccount(accountId: string): Promise<void> {
    const provider = this.sessions.get(accountId);
    if (provider) {
      try {
        await provider.logout();
      } catch (err) {
        logger.warn({ accountId, err }, 'Error during provider.logout()');
      }
      this.sessions.delete(accountId);
    }

    // Always guarantee complete wipe of auth state from disk and PostgreSQL
    try {
      const path = await import('path');
      const fs = await import('fs/promises');
      const sessionDir = path.join(process.cwd(), 'storage', 'whatsapp_sessions', accountId);
      await fs.rm(sessionDir, { recursive: true, force: true });
    } catch (err) {
      logger.warn({ accountId, err }, 'Failed to remove local session dir');
    }

    try {
      const { whatsappAuthKeys: authKeysTable, whatsappSessions: sessionsTable } = await import('../../database/schema/index');
      await db.delete(authKeysTable).where(eq(authKeysTable.accountId, accountId));
      await db
        .update(sessionsTable)
        .set({
          encryptedAuthState: null,
          qrCode: null,
          updatedAt: new Date(),
        })
        .where(eq(sessionsTable.accountId, accountId));
    } catch (err) {
      logger.warn({ accountId, err }, 'Failed to clear auth tables in PostgreSQL');
    }

    await db
      .update(whatsappAccounts)
      .set({
        status: 'disconnected',
        phoneNumber: null,
        jid: null,
        deviceName: null,
        connectedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(whatsappAccounts.id, accountId));

    wsHub.broadcast('whatsapp.status', {
      accountId,
      status: 'disconnected',
    });

    logger.info({ accountId }, 'WhatsApp account logged out and auth state wiped');
  }

  /**
   * Reset an account: complete wipe and clean re-initialization
   */
  async resetAccount(accountId: string): Promise<void> {
    await this.logoutAccount(accountId);
    await this.connectAccount(accountId);
  }

  /**
   * Reconnect a disconnected account.
   */
  async reconnectAccount(accountId: string): Promise<void> {
    await this.disconnectAccount(accountId);
    await this.connectAccount(accountId);
  }

  /**
   * Restart an account completely (alias for reconnect).
   */
  async restartAccount(accountId: string): Promise<void> {
    await this.reconnectAccount(accountId);
  }

  /**
   * Request pairing code for an account using phone number.
   */
  async requestPairingCode(accountId: string, phoneNumber: string): Promise<string> {
    let provider = this.sessions.get(accountId);
    if (!provider) {
      await this.connectAccount(accountId);
      provider = this.sessions.get(accountId);
    }
    if (!provider) {
      throw new Error('Failed to create or find session for account ' + accountId);
    }

    return await provider.requestPairingCode(phoneNumber);
  }

  /**
   * Get the current pairing code for an account.
   */
  async getPairingCode(accountId: string): Promise<string | null> {
    const provider = this.sessions.get(accountId);
    if (provider) {
      return provider.getPairingCode();
    }
    return null;
  }

  /**
   * Get the current connection status for an account.
   */
  async getAccountStatus(accountId: string): Promise<WhatsAppConnectionState> {
    const provider = this.sessions.get(accountId);
    if (provider) {
      return provider.getStatus();
    }
    return { status: 'disconnected' };
  }

  /**
   * Delete a WhatsApp account permanently (logout + DB erase).
   */
  async deleteAccount(accountId: string): Promise<void> {
    logger.info({ accountId }, 'WhatsAppSessionManager: Deleting account permanently');
    try {
      await this.logoutAccount(accountId);
    } catch (e) {
      logger.warn({ accountId, e }, 'Logout failed during delete, forcing deletion anyway');
    }
    
    try {
      await db.delete(whatsappAccounts).where(eq(whatsappAccounts.id, accountId));
      logger.info({ accountId }, 'Account deleted from postgres');
    } catch (e) {
      logger.error({ accountId, e }, 'Failed to delete account from postgres');
      throw e;
    }
  }

  /**
   * Get the current QR code for an account.
   */
  async getQRCode(accountId: string): Promise<string | null> {
    const provider = this.sessions.get(accountId);
    if (provider) {
      return provider.getQRCode();
    }
    return null;
  }

  /**
   * Get the BaileysProvider instance for sending messages.
   */
  getProvider(accountId: string): BaileysProvider | undefined {
    return this.sessions.get(accountId);
  }

  /**
   * Get all active sessions.
   */
  getActiveSessions(): Map<string, BaileysProvider> {
    return this.sessions;
  }

  /**
   * Fetch all participating groups for an account
   */
  async fetchAllGroups(accountId: string): Promise<Array<{ id: string; subject: string; size: number }>> {
    const provider = this.sessions.get(accountId);
    if (!provider) {
      throw new Error('حساب واتساب غير متصل حالياً');
    }
    return await provider.fetchAllGroups();
  }

  /**
   * Get metadata and participants of a specific group
   */
  async getGroupMetadata(accountId: string, groupJid: string) {
    const provider = this.sessions.get(accountId);
    if (!provider) {
      throw new Error('حساب واتساب غير متصل حالياً');
    }
    return await provider.getGroupMetadata(groupJid);
  }

  /**
   * Add participants to a WhatsApp group
   */
  async addGroupParticipants(accountId: string, groupJid: string, participants: string[]) {
    const provider = this.sessions.get(accountId);
    if (!provider) {
      throw new Error('حساب واتساب غير متصل حالياً');
    }
    return await provider.addGroupParticipants(groupJid, participants);
  }

  /**
   * Get invite code for a WhatsApp group
   */
  async getGroupInviteCode(accountId: string, groupJid: string): Promise<string | undefined> {
    const provider = this.sessions.get(accountId);
    if (!provider) return undefined;
    return await provider.getGroupInviteCode(groupJid);
  }

  /**
   * Get group information from an invite code
   */
  async getGroupInviteInfo(accountId: string, code: string) {
    const provider = this.sessions.get(accountId);
    if (!provider) {
      throw new Error('حساب واتساب غير متصل حالياً');
    }
    return await provider.getGroupInviteInfo(code);
  }

  /**
   * Graceful shutdown — disconnect all active sessions cleanly.
   */
  async shutdown(): Promise<void> {
    logger.info({ activeSessions: this.sessions.size }, 'WhatsAppSessionManager: Shutting down...');

    const promises: Promise<void>[] = [];
    for (const [accountId, provider] of this.sessions) {
      promises.push(
        provider.disconnect().catch((err) => {
          logger.error({ accountId, err }, 'Error disconnecting session during shutdown');
        })
      );
    }

    await Promise.allSettled(promises);
    this.sessions.clear();
    logger.info('WhatsAppSessionManager: All sessions disconnected');
  }
}

export const sessionManager = WhatsAppSessionManager.getInstance();
