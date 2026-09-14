import { db } from '../database/client';
import { outboundQueue } from '../database/schema/outbound-queue';
import { config } from '../config/index';
import { logger } from '../utils/logger';

export interface SendMessageOptions {
  companyId: string;
  accountId: string;
  conversationId?: string;
  messageId?: string;
  toJid: string;
  type?: 'text' | 'image' | 'video' | 'audio' | 'voice_note' | 'document' | 'location';
  text?: string;
  mediaBuffer?: Buffer | null;
  mediaUrl?: string | null;
  mediaMime?: string | null;
  mediaFilename?: string | null;
  caption?: string | null;
  quotedMessageId?: string | null;
  priority?: number; // 0 = normal, 1 = high
}

export interface SendResult {
  success: boolean;
  whatsappMessageId?: string;
  status: 'sent' | 'queued' | 'pending' | 'failed';
  queueId?: string;
  error?: string;
}

export class OutboundQueueService {
  /**
   * Universal message dispatcher:
   * - In local mode: attempts direct send via Baileys session socket
   * - In online mode (or if local socket offline): enqueues message into database outbound_queue
   */
  static async sendMessage(options: SendMessageOptions): Promise<SendResult> {
    const {
      companyId,
      accountId,
      conversationId,
      messageId,
      toJid,
      type = 'text',
      text,
      mediaBuffer,
      mediaUrl,
      mediaMime,
      mediaFilename,
      caption,
      quotedMessageId,
      priority = 0,
    } = options;

    // ─── 1. Local Deployment Mode (Direct Baileys) ───────────
    if (config.DEPLOYMENT_MODE === 'local') {
      try {
        // Dynamically import sessionManager so Baileys is never imported in online/serverless environments
        const { sessionManager } = await import('../modules/whatsapp/session.manager');
        const provider = sessionManager.getProvider(accountId);

        if (provider) {
          let whatsappMessageId = `crm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

          if (type === 'text' && text) {
            const res = await provider.sendText(toJid, text, { quotedMessageId: quotedMessageId || undefined });
            if (res?.id) whatsappMessageId = res.id;
          } else if (type === 'image' && mediaBuffer) {
            const res = await provider.sendImage(toJid, mediaBuffer, mediaMime || 'image/jpeg', {
              caption: caption || text || undefined,
              quotedMessageId: quotedMessageId || undefined,
            });
            if (res?.id) whatsappMessageId = res.id;
          } else if (type === 'video' && mediaBuffer) {
            const res = await provider.sendVideo(toJid, mediaBuffer, mediaMime || 'video/mp4', {
              caption: caption || text || undefined,
              quotedMessageId: quotedMessageId || undefined,
            });
            if (res?.id) whatsappMessageId = res.id;
          } else if ((type === 'audio' || type === 'voice_note') && mediaBuffer) {
            const res = await provider.sendAudio(toJid, mediaBuffer, type === 'voice_note', {
              quotedMessageId: quotedMessageId || undefined,
            });
            if (res?.id) whatsappMessageId = res.id;
          } else if (type === 'document' && mediaBuffer) {
            const res = await provider.sendDocument(
              toJid,
              mediaBuffer,
              mediaFilename || 'file',
              mediaMime || 'application/octet-stream',
              {
                caption: caption || text || undefined,
                quotedMessageId: quotedMessageId || undefined,
              }
            );
            if (res?.id) whatsappMessageId = res.id;
          }

          return {
            success: true,
            whatsappMessageId,
            status: 'sent',
          };
        } else {
          logger.warn({ accountId }, 'OutboundQueueService: Local provider not connected, falling back to queue');
        }
      } catch (err: any) {
        logger.error({ accountId, toJid, err: err?.message }, 'OutboundQueueService: Error in local direct send, queuing message');
      }
    }

    // ─── 2. Online Mode / Fallback: Enqueue into Neon DB ───────────
    try {
      const mediaData = mediaBuffer ? mediaBuffer.toString('base64') : (mediaUrl || null);

      const [record] = await db
        .insert(outboundQueue)
        .values({
          companyId,
          accountId,
          conversationId: conversationId || null,
          messageId: messageId || null,
          toJid,
          type,
          text: text || null,
          mediaData,
          mediaMime: mediaMime || null,
          mediaFilename: mediaFilename || null,
          caption: caption || null,
          quotedMessageId: quotedMessageId || null,
          priority,
          status: 'pending',
        })
        .returning();

      return {
        success: true,
        status: 'queued',
        queueId: record.id,
      };
    } catch (err: any) {
      logger.error({ err, companyId, accountId, toJid }, 'OutboundQueueService: Failed to enqueue outbound message');
      return {
        success: false,
        status: 'failed',
        error: err?.message || 'Failed to queue message',
      };
    }
  }
}
