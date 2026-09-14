import { BridgeTransport } from '../transport/transport.interface';
import { sessionManager } from '../../src/modules/whatsapp/session.manager';
import { logger } from '../../src/utils/logger';

export class HeartbeatWorker {
  private transport: BridgeTransport;
  private bridgeId: string;
  private companyId: string;
  private intervalMs: number;
  private startTime = Date.now();
  private timer: NodeJS.Timeout | null = null;

  constructor(transport: BridgeTransport, bridgeId: string, companyId: string, intervalMs = 15000) {
    this.transport = transport;
    this.bridgeId = bridgeId;
    this.companyId = companyId;
    this.intervalMs = intervalMs;
  }

  start(): void {
    if (this.timer) clearInterval(this.timer);
    logger.info({ intervalMs: this.intervalMs }, 'HeartbeatWorker started');

    // Run first heartbeat immediately
    this.send().catch((err) => logger.error({ err }, 'Initial heartbeat failed'));

    this.timer = setInterval(() => {
      this.send().catch((err) => {
        logger.error({ err }, 'Error in HeartbeatWorker cycle');
      });
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    logger.info('HeartbeatWorker stopped');
  }

  private async send(): Promise<void> {
    try {
      const activeSessions = sessionManager.getActiveSessions();
      const accountsSummary: any[] = [];

      for (const [accountId, provider] of activeSessions) {
        const state = provider.connectionState;
        accountsSummary.push({
          accountId,
          status: state.status,
          phoneNumber: state.phoneNumber || null,
          deviceName: state.deviceName || null,
        });

        // Ensure database reflects active bridge connection for each account
        await this.transport.updateAccountBridgeStatus(accountId, {
          bridgeStatus: 'online',
          accountStatus: state.status,
          bridgeQrCode: state.qrCode || null,
        });
      }

      const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

      await this.transport.sendHeartbeat({
        companyId: this.companyId,
        bridgeId: this.bridgeId,
        isOnline: true,
        version: '1.0.0',
        uptimeSeconds,
        accountsSummary,
      });

      logger.debug({ uptimeSeconds, activeCount: accountsSummary.length }, 'Heartbeat sent successfully');
    } catch (err: any) {
      logger.error({ err: err?.message }, 'Failed to send heartbeat to database');
    }
  }
}
