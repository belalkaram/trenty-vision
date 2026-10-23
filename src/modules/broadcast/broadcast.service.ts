import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../database/client';
import { broadcastCampaigns, broadcastRecipients } from '../../database/schema/broadcast';
import { sessionManager } from '../whatsapp/session.manager';
import { LocalStorageProvider } from '../../providers/storage/storage.provider';
import { wsHub } from '../../websocket/ws.hub';
import { logger } from '../../utils/logger';

interface ActiveJobState {
  campaignId: string;
  isPaused: boolean;
  isCancelled: boolean;
}

export class BroadcastService {
  private static instance: BroadcastService;
  private activeJobs: Map<string, ActiveJobState> = new Map();
  private storage = new LocalStorageProvider();

  private constructor() {}

  static getInstance(): BroadcastService {
    if (!BroadcastService.instance) {
      BroadcastService.instance = new BroadcastService();
    }
    return BroadcastService.instance;
  }

  /**
   * Spintax parser: replaces {opt1|opt2|opt3} with randomly selected option
   */
  public parseSpintax(text: string): string {
    const spintaxRegex = /\{([^{}]+)\}/g;
    let result = text;
    while (spintaxRegex.test(result)) {
      result = result.replace(spintaxRegex, (_, options) => {
        const choices = options.split('|');
        return choices[Math.floor(Math.random() * choices.length)];
      });
    }
    return result;
  }

  /**
   * Replace personalization tags like {name} and {phone}
   */
  public replaceTags(template: string, data: { name?: string | null; phone: string }): string {
    let output = template;
    const nameVal = data.name && data.name.trim() ? data.name.trim() : '';
    output = output.replace(/\{name\}/gi, nameVal);
    output = output.replace(/\{phone\}/gi, data.phone);
    return output;
  }

  /**
   * Helper delay in milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Random delay between min and max seconds
   */
  private async randomDelay(minSec: number, maxSec: number): Promise<void> {
    const min = Math.max(1, minSec);
    const max = Math.max(min, maxSec);
    const ms = Math.floor(Math.random() * (max - min + 1) + min) * 1000;
    await this.delay(ms);
  }

  /**
   * Start or resume a broadcast campaign
   */
  async startCampaign(campaignId: string): Promise<{ success: boolean; message: string }> {
    const [campaign] = await db
      .select()
      .from(broadcastCampaigns)
      .where(eq(broadcastCampaigns.id, campaignId))
      .limit(1);

    if (!campaign) {
      throw new Error('الحملة غير موجودة');
    }

    if (campaign.status === 'running') {
      return { success: true, message: 'الحملة قيد التشغيل بالفعل' };
    }

    if (campaign.status === 'completed') {
      return { success: false, message: 'هذه الحملة مكتملة بالفعل' };
    }

    if (!campaign.whatsappAccountId) {
      throw new Error('يجب تحديد حساب واتساب صالح للإرسال');
    }

    // Ensure session is connected
    const provider = await sessionManager.ensureSessionReady(campaign.whatsappAccountId);
    if (!provider) {
      throw new Error('حساب الواتساب المحدد غير متصل');
    }

    // Mark as running in DB
    await db
      .update(broadcastCampaigns)
      .set({
        status: 'running',
        startedAt: campaign.startedAt || new Date(),
        updatedAt: new Date(),
      })
      .where(eq(broadcastCampaigns.id, campaignId));

    // Register active job
    const jobState: ActiveJobState = {
      campaignId,
      isPaused: false,
      isCancelled: false,
    };
    this.activeJobs.set(campaignId, jobState);

    // Launch background execution
    this.processCampaignLoop(campaignId, jobState).catch((err) => {
      logger.error({ campaignId, err: err?.message }, 'Broadcast campaign worker encountered unhandled error');
    });

    return { success: true, message: 'تم بدء إرسال الحملة بنجاح في الخلفية' };
  }

  /**
   * Pause a running campaign
   */
  async pauseCampaign(campaignId: string): Promise<{ success: boolean; message: string }> {
    const jobState = this.activeJobs.get(campaignId);
    if (jobState) {
      jobState.isPaused = true;
    }

    await db
      .update(broadcastCampaigns)
      .set({
        status: 'paused',
        updatedAt: new Date(),
      })
      .where(eq(broadcastCampaigns.id, campaignId));

    return { success: true, message: 'تم إيقاف الحملة مؤقتاً' };
  }

  /**
   * Resume a paused campaign
   */
  async resumeCampaign(campaignId: string): Promise<{ success: boolean; message: string }> {
    return this.startCampaign(campaignId);
  }

  /**
   * Cancel a campaign
   */
  async cancelCampaign(campaignId: string): Promise<{ success: boolean; message: string }> {
    const jobState = this.activeJobs.get(campaignId);
    if (jobState) {
      jobState.isCancelled = true;
    }

    await db
      .update(broadcastCampaigns)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(broadcastCampaigns.id, campaignId));

    this.activeJobs.delete(campaignId);
    return { success: true, message: 'تم إلغاء الحملة نهائياً' };
  }

  /**
   * Retry failed recipients
   */
  async retryFailed(campaignId: string): Promise<{ success: boolean; message: string }> {
    // Reset failed recipients to pending
    await db
      .update(broadcastRecipients)
      .set({
        status: 'pending',
        errorReason: null,
      })
      .where(
        and(
          eq(broadcastRecipients.campaignId, campaignId),
          eq(broadcastRecipients.status, 'failed')
        )
      );

    // Recalculate counts
    const recipients = await db
      .select()
      .from(broadcastRecipients)
      .where(eq(broadcastRecipients.campaignId, campaignId));

    const sentCount = recipients.filter((r) => r.status === 'sent').length;
    const failedCount = recipients.filter((r) => r.status === 'failed').length;
    const pendingCount = recipients.filter((r) => r.status === 'pending').length;

    await db
      .update(broadcastCampaigns)
      .set({
        sentCount,
        failedCount,
        pendingCount,
        status: 'draft',
        updatedAt: new Date(),
      })
      .where(eq(broadcastCampaigns.id, campaignId));

    return this.startCampaign(campaignId);
  }

  /**
   * Background campaign loop
   */
  private async processCampaignLoop(campaignId: string, jobState: ActiveJobState): Promise<void> {
    try {
      logger.info({ campaignId }, 'Broadcast worker: Starting execution loop');

      while (!jobState.isPaused && !jobState.isCancelled) {
        // Fetch current campaign state
        const [campaign] = await db
          .select()
          .from(broadcastCampaigns)
          .where(eq(broadcastCampaigns.id, campaignId))
          .limit(1);

        if (!campaign || campaign.status === 'cancelled' || campaign.status === 'paused') {
          break;
        }

        // Get next pending recipient
        const [recipient] = await db
          .select()
          .from(broadcastRecipients)
          .where(
            and(
              eq(broadcastRecipients.campaignId, campaignId),
              eq(broadcastRecipients.status, 'pending')
            )
          )
          .limit(1);

        // If no more pending recipients, we are done!
        if (!recipient) {
          logger.info({ campaignId }, 'Broadcast worker: All recipients processed. Marking campaign as completed');
          await db
            .update(broadcastCampaigns)
            .set({
              status: 'completed',
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(broadcastCampaigns.id, campaignId));

          wsHub.broadcast('broadcast.completed', { campaignId });
          break;
        }

        if (jobState.isPaused || jobState.isCancelled) {
          break;
        }

        // Prepare message content with Spintax & personal tags
        const spintaxContent = this.parseSpintax(campaign.messageContent);
        const finalContent = this.replaceTags(spintaxContent, {
          name: recipient.recipientName,
          phone: recipient.phoneNumber,
        });

        // Format destination JID
        const cleanNumber = recipient.phoneNumber.replace(/[^0-9]/g, '');
        const toJid = `${cleanNumber}@s.whatsapp.net`;

        const provider = sessionManager.getProvider(campaign.whatsappAccountId!);
        if (!provider || provider.connectionState.status !== 'connected') {
          logger.warn({ campaignId, accountId: campaign.whatsappAccountId }, 'Provider lost connection during broadcast, pausing');
          await this.pauseCampaign(campaignId);
          break;
        }

        let isSent = false;
        let messageId: string | null = null;
        let errorReason: string | null = null;

        try {
          if (campaign.messageType === 'text') {
            const sendRes = await provider.sendText(toJid, finalContent);
            messageId = sendRes.id;
            isSent = true;
          } else if (campaign.mediaUrl) {
            // Download media buffer
            let buffer: Buffer;
            const storageKey = campaign.mediaUrl.replace('/api/v1/media/', '');
            buffer = await this.storage.download(decodeURIComponent(storageKey));

            if (campaign.messageType === 'image') {
              const res = await provider.sendImage(toJid, buffer, 'image/jpeg', { caption: finalContent });
              messageId = res.id;
              isSent = true;
            } else if (campaign.messageType === 'video') {
              const res = await provider.sendVideo(toJid, buffer, 'video/mp4', { caption: finalContent });
              messageId = res.id;
              isSent = true;
            } else if (campaign.messageType === 'document') {
              const fileName = campaign.mediaFilename || 'document.pdf';
              const res = await provider.sendDocument(toJid, buffer, fileName, 'application/octet-stream', { caption: finalContent });
              messageId = res.id;
              isSent = true;
            } else {
              // Fallback to text
              const res = await provider.sendText(toJid, finalContent);
              messageId = res.id;
              isSent = true;
            }
          } else {
            // No media URL, fallback to text
            const res = await provider.sendText(toJid, finalContent);
            messageId = res.id;
            isSent = true;
          }
        } catch (sendErr: any) {
          errorReason = sendErr?.message || 'فشل إرسال الرسالة عبر خادم واتساب';
          logger.warn({ recipientId: recipient.id, phone: recipient.phoneNumber, err: sendErr?.message }, 'Failed to send message to recipient');
        }

        // Update recipient record
        if (isSent) {
          await db
            .update(broadcastRecipients)
            .set({
              status: 'sent',
              messageId,
              sentAt: new Date(),
            })
            .where(eq(broadcastRecipients.id, recipient.id));

          // Increment campaign sent count
          await db
            .update(broadcastCampaigns)
            .set({
              sentCount: sql`${broadcastCampaigns.sentCount} + 1`,
              pendingCount: sql`GREATEST(${broadcastCampaigns.pendingCount} - 1, 0)`,
              updatedAt: new Date(),
            })
            .where(eq(broadcastCampaigns.id, campaignId));
        } else {
          await db
            .update(broadcastRecipients)
            .set({
              status: 'failed',
              errorReason: errorReason || 'Unknown error',
            })
            .where(eq(broadcastRecipients.id, recipient.id));

          // Increment campaign failed count
          await db
            .update(broadcastCampaigns)
            .set({
              failedCount: sql`${broadcastCampaigns.failedCount} + 1`,
              pendingCount: sql`GREATEST(${broadcastCampaigns.pendingCount} - 1, 0)`,
              updatedAt: new Date(),
            })
            .where(eq(broadcastCampaigns.id, campaignId));
        }

        // Emit live progress
        wsHub.broadcast('broadcast.progress', {
          campaignId,
          recipientId: recipient.id,
          status: isSent ? 'sent' : 'failed',
        });

        // Check if job paused or cancelled while sending
        if (jobState.isPaused || jobState.isCancelled) {
          break;
        }

        // Fetch updated counts to check batch sleep
        const [updatedCampaign] = await db
          .select()
          .from(broadcastCampaigns)
          .where(eq(broadcastCampaigns.id, campaignId))
          .limit(1);

        const processed = (updatedCampaign?.sentCount || 0) + (updatedCampaign?.failedCount || 0);
        const batchSize = campaign.batchSize || 25;
        const batchSleepSec = campaign.batchSleepSeconds || 30;

        if (processed > 0 && processed % batchSize === 0 && (updatedCampaign?.pendingCount || 0) > 0) {
          logger.info({ campaignId, processed, batchSleepSec }, 'Batch sleep threshold reached, resting...');
          await this.delay(batchSleepSec * 1000);
        } else {
          // Standard random anti-ban delay
          await this.randomDelay(campaign.minDelaySeconds, campaign.maxDelaySeconds);
        }
      }
    } finally {
      this.activeJobs.delete(campaignId);
    }
  }
}

export const broadcastService = BroadcastService.getInstance();
