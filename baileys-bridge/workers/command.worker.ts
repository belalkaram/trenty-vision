import { BridgeTransport, BridgeCommandPayload } from '../transport/transport.interface';
import { sessionManager } from '../../src/modules/whatsapp/session.manager';
import { logger } from '../../src/utils/logger';
import { eq, and } from 'drizzle-orm';
import { db } from '../../src/database/client';
import { groupJobs, groupExtractedContacts } from '../../src/database/schema/group-manager';

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

        case 'list_groups': {
          const groups = await sessionManager.fetchAllGroups(accountId);
          await this.transport.markCommandCompleted(id, { groups });
          break;
        }

        case 'extract_group_participants': {
          const groupJid = payload?.groupJid;
          const jobId = payload?.jobId;
          if (!groupJid) throw new Error('groupJid is required');

          if (jobId) {
            await db
              .update(groupJobs)
              .set({ status: 'running', updatedAt: new Date() })
              .where(eq(groupJobs.id, jobId));
          }

          const provider = sessionManager.getProvider(accountId);
          const metadata = await sessionManager.getGroupMetadata(accountId, groupJid);
          const rawParticipants = metadata?.participants || [];

          // Resolve real phone numbers and clean display names
          const participants = await Promise.all(
            rawParticipants.map(async (p: any) => {
              let phone = '';
              if (p.phoneNumber) {
                phone = p.phoneNumber.replace(/[^0-9]/g, '');
              } else if (p.id && !p.id.endsWith('@lid')) {
                phone = p.id.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
              } else if (p.id && p.id.endsWith('@lid') && provider) {
                const cleanLid = p.id.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
                const resolved = await provider.getPhoneNumberForLid(cleanLid);
                phone = resolved ? resolved.replace(/[^0-9]/g, '') : cleanLid;
              } else {
                phone = (p.id || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
              }

              const displayName = p.notify || p.name || p.username || phone;
              const isAdmin = p.admin === 'admin' || p.admin === 'superadmin';
              return {
                phoneNumber: phone,
                displayName,
                isAdmin,
              };
            })
          );

          if (jobId) {
            const [jobRecord] = await db.select().from(groupJobs).where(eq(groupJobs.id, jobId)).limit(1);
            if (jobRecord && participants.length > 0) {
              for (let i = 0; i < participants.length; i += 100) {
                const chunk = participants.slice(i, i + 100);
                await db.insert(groupExtractedContacts).values(
                  chunk.map((p) => ({
                    companyId: jobRecord.companyId,
                    jobId,
                    phoneNumber: p.phoneNumber,
                    displayName: p.displayName,
                    groupJid,
                    groupName: metadata?.subject || null,
                    isAdmin: p.isAdmin,
                  }))
                );
              }
            }

            await db
              .update(groupJobs)
              .set({
                status: 'completed',
                sourceGroupName: metadata?.subject || null,
                totalContacts: participants.length,
                processedContacts: participants.length,
                completedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(groupJobs.id, jobId));
          }

          await this.transport.markCommandCompleted(id, {
            groupName: metadata?.subject,
            participantsCount: participants.length,
            jobId,
          });
          break;
        }

        case 'add_to_group': {
          const targetGroupJid = payload?.targetGroupJid;
          const phoneNumbers: string[] = payload?.phoneNumbers || [];
          const jobId = payload?.jobId;
          if (!targetGroupJid) throw new Error('targetGroupJid is required');

          const batchSize = Math.max(1, Number(payload?.batchSize) || (payload?.mode === 'smart' ? 3 : 5));
          const baseDelay = Math.max(1, Number(payload?.delaySeconds) || (payload?.mode === 'smart' ? 15 : 5));
          const randomize = payload?.randomizeDelay !== false;
          const cooldownAfter = Math.max(0, Number(payload?.cooldownAfter) || (payload?.mode === 'smart' ? 15 : 0));
          const cooldownSeconds = Math.max(0, Number(payload?.cooldownSeconds) || (payload?.mode === 'smart' ? 60 : 30));

          if (jobId) {
            await db
              .update(groupJobs)
              .set({ status: 'running', updatedAt: new Date() })
              .where(eq(groupJobs.id, jobId));
          }

          let processed = 0;
          let failed = 0;
          const allResults: any[] = [];
          const provider = sessionManager.getProvider(accountId);

          for (let i = 0; i < phoneNumbers.length; i += batchSize) {
            // Apply anti-ban cooldown pause
            if (i > 0 && cooldownAfter > 0 && i % cooldownAfter === 0) {
              logger.info(
                { jobId, processed, failed, cooldownSeconds },
                'CommandWorker: Applying anti-ban cooldown pause'
              );
              await new Promise((r) => setTimeout(r, cooldownSeconds * 1000));
            }

            const batch = phoneNumbers.slice(i, i + batchSize);
            const validPhones: string[] = [];

            for (const rawPhone of batch) {
              let phone = rawPhone.replace(/[^0-9]/g, '');
              if (phone.length >= 14 && provider) {
                const resolved = await provider.getPhoneNumberForLid(phone);
                if (resolved) phone = resolved.replace(/[^0-9]/g, '');
              }

              if (phone.length >= 14) {
                failed++;
                continue;
              }
              validPhones.push(phone);
            }

            if (validPhones.length > 0) {
              const jids = validPhones.map((p: string) => `${p}@s.whatsapp.net`);
              try {
                const results = await sessionManager.addGroupParticipants(accountId, targetGroupJid, jids);
                allResults.push(...(results || []));

                for (const res of results || []) {
                  const phone = res.jid ? res.jid.split('@')[0].split(':')[0] : '';
                  const isSuccess = String(res.status) === '200';

                  if (isSuccess) {
                    processed++;
                    await db
                      .update(groupExtractedContacts)
                      .set({ addedToTarget: true, addError: null })
                      .where(
                        and(
                          eq(groupExtractedContacts.groupJid, targetGroupJid),
                          eq(groupExtractedContacts.phoneNumber, phone)
                        )
                      );
                  } else {
                    failed++;
                    const errMsg =
                      String(res.status) === '403'
                        ? 'خصوصية المستخدم تمنع الإضافة المباشرة (يحتاج إرسال رابط دعوة الجروب)'
                        : String(res.status) === '409'
                        ? 'العضو موجود بالفعل في الجروب'
                        : String(res.status) === '408'
                        ? 'المستخدم غادر الجروب مؤخراً ولا يمكن إضافته مباشرة (يحتاج رابط دعوة)'
                        : String(res.status) === '401'
                        ? 'حساب الواتساب ليس مشرفاً (Admin) في هذا الجروب'
                        : String(res.status) === '400'
                        ? 'رقم الهاتف غير مسجل في واتساب أو غير صالح'
                        : `تعذر إضافة الرقم إلى الجروب (كود: ${res.status})`;

                    await db
                      .update(groupExtractedContacts)
                      .set({ addError: errMsg })
                      .where(
                        and(
                          eq(groupExtractedContacts.groupJid, targetGroupJid),
                          eq(groupExtractedContacts.phoneNumber, phone)
                        )
                      );
                  }
                }
              } catch (batchErr: any) {
                logger.warn({ err: batchErr?.message }, 'Bridge add_to_group batch failed');
                failed += validPhones.length;
                allResults.push(
                  ...validPhones.map((p: string) => ({
                    jid: `${p}@s.whatsapp.net`,
                    status: '500',
                    error: batchErr?.message,
                  }))
                );
              }
            }

            // Live progress update on groupJobs
            if (jobId) {
              await db
                .update(groupJobs)
                .set({
                  processedContacts: processed,
                  failedContacts: failed,
                  updatedAt: new Date(),
                })
                .where(eq(groupJobs.id, jobId));
            }

            if (i + batchSize < phoneNumbers.length) {
              const jitter = randomize ? 0.8 + Math.random() * 0.4 : 1;
              await new Promise((r) => setTimeout(r, Math.round(baseDelay * jitter * 1000)));
            }
          }

          if (jobId) {
            const finalStatus = processed === 0 && failed > 0 ? 'failed' : 'completed';
            await db
              .update(groupJobs)
              .set({
                status: finalStatus,
                processedContacts: processed,
                failedContacts: failed,
                completedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(groupJobs.id, jobId));
          }

          await this.transport.markCommandCompleted(id, {
            results: allResults,
            processed,
            failed,
            jobId,
          });
          break;
        }

        case 'resolve_group_invite': {
          const inviteCode = payload?.code;
          if (!inviteCode) throw new Error('Invite code is required');
          const groupInfo = await sessionManager.getGroupInviteInfo(accountId, inviteCode);
          await this.transport.markCommandCompleted(id, { groupInfo });
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
