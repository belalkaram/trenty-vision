import { eq, and, desc, asc } from 'drizzle-orm';
import { db } from '../../src/database/client';
import {
  outboundQueue,
  bridgeCommands,
  bridgeHeartbeats,
  whatsappAccounts,
  messages,
  companies,
} from '../../src/database/schema/index';
import {
  BridgeTransport,
  OutboundMessagePayload,
  BridgeCommandPayload,
  HeartbeatPayload,
} from './transport.interface';
import { logger } from '../../src/utils/logger';

export class DbTransport implements BridgeTransport {
  private cachedCompanyId: string | null = null;

  async resolveCompanyId(): Promise<string> {
    if (this.cachedCompanyId) return this.cachedCompanyId;

    const [comp] = await db.select({ id: companies.id }).from(companies).limit(1);
    if (!comp) {
      throw new Error('No company found in database to attach Bridge to');
    }
    this.cachedCompanyId = comp.id;
    return comp.id;
  }

  async fetchPendingOutbound(companyId?: string, limit = 10): Promise<OutboundMessagePayload[]> {
    const conditions = [eq(outboundQueue.status, 'pending')];
    if (companyId) {
      conditions.push(eq(outboundQueue.companyId, companyId));
    }

    const items = await db
      .select()
      .from(outboundQueue)
      .where(and(...conditions))
      .orderBy(desc(outboundQueue.priority), asc(outboundQueue.createdAt))
      .limit(limit);

    // Mark items as processing immediately to prevent duplicate polling pickup
    if (items.length > 0) {
      for (const item of items) {
        await db
          .update(outboundQueue)
          .set({ status: 'processing', updatedAt: new Date() })
          .where(eq(outboundQueue.id, item.id));
      }
    }

    return items.map((i) => ({
      id: i.id,
      companyId: i.companyId,
      accountId: i.accountId || '',
      conversationId: i.conversationId,
      messageId: i.messageId,
      toJid: i.toJid,
      type: i.type,
      text: i.text,
      mediaData: i.mediaData,
      mediaMime: i.mediaMime,
      mediaFilename: i.mediaFilename,
      caption: i.caption,
      quotedMessageId: i.quotedMessageId,
      priority: i.priority,
    }));
  }

  async markOutboundSent(id: string, whatsappMessageId: string, messageId?: string | null): Promise<void> {
    await db
      .update(outboundQueue)
      .set({
        status: 'sent',
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(outboundQueue.id, id));

    if (messageId) {
      await db
        .update(messages)
        .set({
          status: 'sent',
          whatsappMessageId,
          updatedAt: new Date(),
        })
        .where(eq(messages.id, messageId));
    }
  }

  async markOutboundFailed(id: string, error: string, messageId?: string | null): Promise<void> {
    await db
      .update(outboundQueue)
      .set({
        status: 'failed',
        error,
        updatedAt: new Date(),
      })
      .where(eq(outboundQueue.id, id));

    if (messageId) {
      await db
        .update(messages)
        .set({
          status: 'failed',
          updatedAt: new Date(),
        })
        .where(eq(messages.id, messageId));
    }
  }

  async fetchPendingCommands(companyId?: string, limit = 5): Promise<BridgeCommandPayload[]> {
    const conditions = [eq(bridgeCommands.status, 'pending')];
    if (companyId) {
      conditions.push(eq(bridgeCommands.companyId, companyId));
    }

    const cmds = await db
      .select()
      .from(bridgeCommands)
      .where(and(...conditions))
      .orderBy(asc(bridgeCommands.createdAt))
      .limit(limit);

    if (cmds.length > 0) {
      for (const cmd of cmds) {
        await db
          .update(bridgeCommands)
          .set({ status: 'processing' })
          .where(eq(bridgeCommands.id, cmd.id));
      }
    }

    return cmds.map((c) => ({
      id: c.id,
      companyId: c.companyId,
      accountId: c.accountId,
      action: c.action,
      payload: c.payload || {},
    }));
  }

  async markCommandCompleted(id: string, result?: Record<string, any>): Promise<void> {
    await db
      .update(bridgeCommands)
      .set({
        status: 'completed',
        result: result || null,
        completedAt: new Date(),
      })
      .where(eq(bridgeCommands.id, id));
  }

  async markCommandFailed(id: string, error: string): Promise<void> {
    await db
      .update(bridgeCommands)
      .set({
        status: 'failed',
        error,
        completedAt: new Date(),
      })
      .where(eq(bridgeCommands.id, id));
  }

  async sendHeartbeat(payload: HeartbeatPayload): Promise<void> {
    const [existing] = await db
      .select({ id: bridgeHeartbeats.id })
      .from(bridgeHeartbeats)
      .where(eq(bridgeHeartbeats.companyId, payload.companyId))
      .limit(1);

    if (existing) {
      await db
        .update(bridgeHeartbeats)
        .set({
          bridgeId: payload.bridgeId,
          isOnline: payload.isOnline,
          version: payload.version,
          uptimeSeconds: payload.uptimeSeconds,
          accountsSummary: payload.accountsSummary,
          lastSeenAt: new Date(),
        })
        .where(eq(bridgeHeartbeats.id, existing.id));
    } else {
      await db.insert(bridgeHeartbeats).values({
        companyId: payload.companyId,
        bridgeId: payload.bridgeId,
        isOnline: payload.isOnline,
        version: payload.version,
        uptimeSeconds: payload.uptimeSeconds,
        accountsSummary: payload.accountsSummary,
        lastSeenAt: new Date(),
      });
    }
  }

  async updateAccountBridgeStatus(
    accountId: string,
    status: { bridgeStatus: string; bridgeQrCode?: string | null; accountStatus?: string }
  ): Promise<void> {
    const updateData: any = {
      bridgeStatus: status.bridgeStatus,
      bridgeLastSeen: new Date(),
      updatedAt: new Date(),
    };

    if (status.bridgeQrCode !== undefined) {
      updateData.bridgeQrCode = status.bridgeQrCode;
    }

    if (status.accountStatus) {
      updateData.status = status.accountStatus;
    }

    await db
      .update(whatsappAccounts)
      .set(updateData)
      .where(eq(whatsappAccounts.id, accountId));
  }
}
