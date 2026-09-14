import { BridgeTransport, BridgeCommandPayload } from '../transport/transport.interface';
import { sessionManager } from '../../src/modules/whatsapp/session.manager';
import { logger } from '../../src/utils/logger';

export class CommandWorker {
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
    logger.info({ intervalMs: this.pollIntervalMs }, 'CommandWorker started');

    this.timer = setInterval(() => {
      this.tick().catch((err) => {
        logger.error({ err }, 'Error in CommandWorker cycle');
      });
    }, this.pollIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    logger.info('CommandWorker stopped');
  }

  private async tick(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const cmds = await this.transport.fetchPendingCommands(this.companyId, 5);
      if (!cmds || cmds.length === 0) return;

      logger.info({ count: cmds.length }, 'CommandWorker: Processing pending bridge commands');

      for (const cmd of cmds) {
        await this.processCommand(cmd);
      }
    } catch (err: any) {
      logger.error({ err: err?.message }, 'Failed to fetch bridge commands in worker');
    } finally {
      this.isProcessing = false;
    }
  }

  private async processCommand(cmd: BridgeCommandPayload): Promise<void> {
    const { id, accountId, action, payload } = cmd;

    try {
      logger.info({ cmdId: id, action, accountId }, 'CommandWorker: Executing command');

      if (!accountId) {
        throw new Error('Command requires accountId');
      }

      switch (action) {
        case 'connect':
          await sessionManager.connectAccount(accountId);
          await this.transport.markCommandCompleted(id, { message: 'Connection started' });
          break;

        case 'disconnect':
          await sessionManager.disconnectAccount(accountId);
          await this.transport.markCommandCompleted(id, { message: 'Disconnected' });
          break;

        case 'logout':
          await sessionManager.logoutAccount(accountId);
          await this.transport.markCommandCompleted(id, { message: 'Logged out' });
          break;

        case 'reconnect':
        case 'restart':
          await sessionManager.reconnectAccount(accountId);
          await this.transport.markCommandCompleted(id, { message: 'Reconnected' });
          break;

        case 'reset':
          await sessionManager.resetAccount(accountId);
          await this.transport.markCommandCompleted(id, { message: 'Reset completed' });
          break;

        case 'pairing_code': {
          const phoneNumber = payload?.phoneNumber;
          if (!phoneNumber) {
            throw new Error('Phone number is required for pairing code');
          }
          const code = await sessionManager.requestPairingCode(accountId, phoneNumber);
          await this.transport.markCommandCompleted(id, {
            pairingCode: code,
            formattedCode: code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code,
          });
          break;
        }

        default:
          logger.warn({ action, cmdId: id }, 'Unknown bridge command action');
          await this.transport.markCommandFailed(id, `Unknown action: ${action}`);
          return;
      }

      logger.info({ cmdId: id, action }, 'CommandWorker: Command completed successfully');
    } catch (err: any) {
      logger.error({ cmdId: id, action, err: err?.message }, 'CommandWorker: Command failed');
      await this.transport.markCommandFailed(id, err?.message || 'Execution error');
    }
  }
}
