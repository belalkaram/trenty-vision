import { BridgeTransport, OutboundMessagePayload } from '../transport/transport.interface';
import { sessionManager } from '../../src/modules/whatsapp/session.manager';
import { logger } from '../../src/utils/logger';

export class OutboundWorker {
  private transport: BridgeTransport;
  private companyId?: string;
  private pollIntervalMs: number;
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(transport: BridgeTransport, pollIntervalMs = 2000, companyId?: string) {
    this.transport = transport;
    this.pollIntervalMs = pollIntervalMs;
    this.companyId = companyId;
  }

  start(): void {
    if (this.timer) clearInterval(this.timer);
    logger.info({ intervalMs: this.pollIntervalMs }, 'OutboundWorker started');

    this.timer = setInterval(() => {
      this.tick().catch((err) => {
        logger.error({ err }, 'Error in OutboundWorker cycle');
      });
    }, this.pollIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    logger.info('OutboundWorker stopped');
  }

  private async tick(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const items = await this.transport.fetchPendingOutbound(this.companyId, 10);
      if (!items || items.length === 0) return;

      logger.info({ count: items.length }, 'OutboundWorker: Processing outgoing messages');

      for (const item of items) {
        await this.processItem(item);
      }
    } catch (err: any) {
      logger.error({ err: err?.message }, 'Failed to fetch outbound queue in worker');
    } finally {
      this.isProcessing = false;
    }
  }

  private async processItem(item: OutboundMessagePayload): Promise<void> {
    try {
      const provider = sessionManager.getProvider(item.accountId);
      if (!provider || provider.connectionState.status !== 'connected') {
        logger.warn(
          { accountId: item.accountId, itemId: item.id },
          'OutboundWorker: Account not connected, will retry next cycle'
        );
        // Leave for next cycle or mark retry
        return;
      }

      let resId = `msg_${Date.now()}`;
      const toJid = item.toJid;

      let mediaBuffer: Buffer | null = null;
      if (item.mediaData) {
        try {
          const rawBase64 = item.mediaData.includes(';base64,')
            ? item.mediaData.split(';base64,')[1]
            : item.mediaData;
          mediaBuffer = Buffer.from(rawBase64, 'base64');
        } catch (_e) {
          mediaBuffer = null;
        }
      }

      if (item.type === 'text' && item.text) {
        const res = await provider.sendText(toJid, item.text, {
          quotedMessageId: item.quotedMessageId || undefined,
        });
        if (res?.id) resId = res.id;
      } else if (item.type === 'image' && mediaBuffer) {
        const res = await provider.sendImage(toJid, mediaBuffer, item.mediaMime || 'image/jpeg', {
          caption: item.caption || item.text || undefined,
          quotedMessageId: item.quotedMessageId || undefined,
        });
        if (res?.id) resId = res.id;
      } else if (item.type === 'video' && mediaBuffer) {
        const res = await provider.sendVideo(toJid, mediaBuffer, item.mediaMime || 'video/mp4', {
          caption: item.caption || item.text || undefined,
          quotedMessageId: item.quotedMessageId || undefined,
        });
        if (res?.id) resId = res.id;
      } else if ((item.type === 'audio' || item.type === 'voice_note') && mediaBuffer) {
        const res = await provider.sendAudio(toJid, mediaBuffer, item.type === 'voice_note', {
          quotedMessageId: item.quotedMessageId || undefined,
        });
        if (res?.id) resId = res.id;
      } else if (item.type === 'document' && mediaBuffer) {
        const res = await provider.sendDocument(
          toJid,
          mediaBuffer,
          item.mediaFilename || 'file',
          item.mediaMime || 'application/octet-stream',
          {
            caption: item.caption || item.text || undefined,
            quotedMessageId: item.quotedMessageId || undefined,
          }
        );
        if (res?.id) resId = res.id;
      } else {
        // Fallback text send
        const fallbackText = item.text || `[${item.type}]`;
        const res = await provider.sendText(toJid, fallbackText);
        if (res?.id) resId = res.id;
      }

      await this.transport.markOutboundSent(item.id, resId, item.messageId);
      logger.info({ itemId: item.id, toJid, resId }, 'OutboundWorker: Sent message successfully');
    } catch (err: any) {
      logger.error({ itemId: item.id, err: err?.message }, 'OutboundWorker: Failed to send message');
      await this.transport.markOutboundFailed(item.id, err?.message || 'Send error', item.messageId);
    }
  }
}
