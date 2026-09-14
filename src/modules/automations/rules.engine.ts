import { db } from '../../database/client';
import * as schema from '../../database/schema/index';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import { OutboundQueueService } from '../../services/outbound-queue.service';
import { wsHub } from '../../websocket/ws.hub';
import { AssignmentService } from './assignment.service';

export interface BusinessHoursConfig {
  enabled: boolean;
  timezone: string;
  start: string; // '09:00'
  end: string;   // '18:00'
  workDays: number[]; // [0, 1, 2, 3, 4] where 0=Sun, 6=Sat
}

export class RulesEngine {
  /**
   * Check if current time is within configured business hours
   */
  static async isWithinBusinessHours(date: Date = new Date()): Promise<boolean> {
    const config = await AssignmentService.getSetting<any>('business_hours', null);
    const scheduleByDay = await AssignmentService.getSetting<any>('businessHours', null);

    // If master config is explicitly disabled, business hours are 24/7
    if (config && config.enabled === false) {
      return true;
    }

    try {
      const tz = config?.timezone || 'Asia/Kuwait';
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
        weekday: 'short',
      });

      const parts = formatter.formatToParts(date);
      let hour = 0;
      let minute = 0;
      let weekdayStr = '';

      for (const p of parts) {
        if (p.type === 'hour') hour = parseInt(p.value, 10);
        if (p.type === 'minute') minute = parseInt(p.value, 10);
        if (p.type === 'weekday') weekdayStr = p.value;
      }

      const dayKeyMap: Record<string, string> = {
        Sun: 'sunday',
        Mon: 'monday',
        Tue: 'tuesday',
        Wed: 'wednesday',
        Thu: 'thursday',
        Fri: 'friday',
        Sat: 'saturday',
      };

      const dayNumMap: Record<string, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
      };

      const currentMinutes = hour * 60 + minute;
      const dayKey = dayKeyMap[weekdayStr];

      // 1. If daily schedule (SettingsPage format) is present
      if (scheduleByDay && typeof scheduleByDay === 'object' && dayKey && scheduleByDay[dayKey]) {
        const todaySchedule = scheduleByDay[dayKey];
        if (todaySchedule.enabled === false) {
          return false; // Closed today
        }
        if (todaySchedule.start && todaySchedule.end) {
          const [startH, startM] = todaySchedule.start.split(':').map((v: string) => parseInt(v, 10));
          const [endH, endM] = todaySchedule.end.split(':').map((v: string) => parseInt(v, 10));
          const startMin = startH * 60 + (startM || 0);
          const endMin = endH * 60 + (endM || 0);
          return currentMinutes >= startMin && currentMinutes <= endMin;
        }
      }

      // 2. Fallback to general config format
      if (config && config.workDays && config.start && config.end) {
        const dayNum = dayNumMap[weekdayStr] ?? date.getDay();
        if (!config.workDays.includes(dayNum)) {
          return false;
        }

        const [startH, startM] = config.start.split(':').map((v: string) => parseInt(v, 10));
        const [endH, endM] = config.end.split(':').map((v: string) => parseInt(v, 10));
        const startMinutes = startH * 60 + (startM || 0);
        const endMinutes = endH * 60 + (endM || 0);
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      }

      // If no config found at all, assume 24/7 open
      return true;
    } catch (err) {
      logger.error({ err }, 'Error calculating business hours, failing open');
      return true;
    }
  }

  /**
   * Check if this is the first interaction from a contact
   */
  static async isFirstInbound(contactId: string): Promise<boolean> {
    const messageCount = await db.execute<{ count: string }>(sql`
      SELECT COUNT(m.id) as count
      FROM messages m
      INNER JOIN conversations c ON c.id = m.conversation_id
      WHERE c.contact_id = ${contactId}
    `);

    const count = parseInt(messageCount.rows[0]?.count || '0', 10);
    // If count is 1 (the message just received) or 0, this is the first inbound
    return count <= 1;
  }

  /**
   * Cooldown cache to prevent bot reply loops (conversationId:reason:hash -> timestamp)
   */
  private static recentReplies: Map<string, number> = new Map();

  /**
   * Helper to normalize Arabic and English text for accurate comparison
   */
  static normalizeText(text: string): string {
    if (!text || typeof text !== 'string') return '';
    return text
      .toLowerCase()
      .trim()
      // Remove Arabic diacritics / tashkeel
      .replace(/[\u064B-\u065F\u0670]/g, '')
      // Normalize Alefs (أ, إ, آ, ٱ -> ا)
      .replace(/[أإآٱ]/g, 'ا')
      // Normalize Taa Marbouta (ة -> ه)
      .replace(/ة/g, 'ه')
      // Normalize Yaa (ى -> ي)
      .replace(/ى/g, 'ي')
      // Collapse multiple whitespace
      .replace(/\s+/g, ' ');
  }

  /**
   * Match inbound message text against active keyword rules
   * Supports both frontend data structure and legacy formats:
   * - conditions.keyword (singular string) or conditions.keywords / contains (array)
   * - matchType: 'exact', 'contains', 'starts_with'
   * - actions: [{ type: 'reply', text: '...' }, { type: 'assign_station', stationId: '...' }]
   */
  static async matchKeywordRules(text: string): Promise<{
    matchedRules: any[];
    targetStationId?: string;
    tagsToAdd: string[];
    autoReplyText?: string;
  }> {
    if (!text || typeof text !== 'string') {
      return { matchedRules: [], tagsToAdd: [] };
    }

    const rawInput = text.toLowerCase().trim();
    const normInput = this.normalizeText(text);

    const rules = await db.query.automationRules.findMany({
      where: eq(schema.automationRules.enabled, true),
      orderBy: [schema.automationRules.priority],
    });

    const matchedRules: any[] = [];
    const tagsToAdd: string[] = [];
    let targetStationId: string | undefined;
    let autoReplyText: string | undefined;

    for (const rule of rules) {
      const conditions = (rule.conditions || {}) as Record<string, any>;

      // Extract all candidate keywords from both modern and legacy formats
      const candidateKeywords: string[] = [];
      if (typeof conditions.keyword === 'string' && conditions.keyword.trim() !== '') {
        candidateKeywords.push(conditions.keyword.trim());
      }
      if (Array.isArray(conditions.keywords)) {
        candidateKeywords.push(...conditions.keywords.filter((k: any) => typeof k === 'string' && k.trim() !== ''));
      }
      if (Array.isArray(conditions.contains)) {
        candidateKeywords.push(...conditions.contains.filter((k: any) => typeof k === 'string' && k.trim() !== ''));
      }

      if (candidateKeywords.length === 0) continue;

      const matchType = (conditions.matchType || 'contains').toLowerCase();

      const isMatch = candidateKeywords.some((kw) => {
        if (!kw) return false;
        const rawKw = kw.toLowerCase().trim();
        const normKw = this.normalizeText(kw);

        if (matchType === 'exact') {
          return normInput === normKw || rawInput === rawKw;
        } else if (matchType === 'starts_with') {
          return normInput.startsWith(normKw) || rawInput.startsWith(rawKw);
        } else {
          // Default: 'contains'
          return normInput.includes(normKw) || rawInput.includes(rawKw);
        }
      });

      if (isMatch) {
        matchedRules.push(rule);
        const actions = (rule.actions || []) as Record<string, any>[];

        for (const action of actions) {
          // Extract reply text from all possible formats
          if (action.type === 'reply' && action.text) {
            autoReplyText = action.text;
          } else if (action.replyText) {
            autoReplyText = action.replyText;
          } else if (action.autoReply) {
            autoReplyText = action.autoReply;
          } else if (action.text && !autoReplyText) {
            autoReplyText = action.text;
          }

          // Extract target station from all possible formats
          if (action.type === 'assign_station' && action.stationId) {
            targetStationId = action.stationId;
          } else if (action.assignStationId) {
            targetStationId = action.assignStationId;
          } else if (action.targetStationId) {
            targetStationId = action.targetStationId;
          } else if (action.stationId) {
            targetStationId = action.stationId;
          }

          if (action.addTags && Array.isArray(action.addTags)) {
            tagsToAdd.push(...action.addTags);
          }
        }

        logger.info(
          { ruleId: rule.id, ruleName: rule.name, matchType, autoReplyText, targetStationId },
          'Automation rule successfully matched incoming message'
        );

        // If this rule provided a reply, take the highest priority match
        if (autoReplyText) {
          break;
        }
      }
    }

    return { matchedRules, targetStationId, tagsToAdd, autoReplyText };
  }

  /**
   * Dispatch an automated WhatsApp response message from the bot
   * Includes anti-loop debounce protection and real-time broadcasts
   */
  static async sendAutomatedReply(params: {
    conversationId: string;
    contactId: string;
    accountId: string;
    toJid: string;
    text: string;
    triggerReason: 'welcome' | 'out_of_hours' | 'keyword';
  }): Promise<boolean> {
    const { conversationId, contactId, accountId, toJid, text, triggerReason } = params;

    if (!text || text.trim() === '') return false;

    // Anti-loop debounce: prevent sending identical reply to same conversation within 10 seconds
    const now = Date.now();
    const replyHash = `${conversationId}:${triggerReason}:${text.trim().slice(0, 30)}`;
    const lastSent = this.recentReplies.get(replyHash);
    if (lastSent && now - lastSent < 10000) {
      logger.warn(
        { conversationId, triggerReason, elapsedMs: now - lastSent },
        'Skipped duplicate automated reply due to loop-prevention cooldown'
      );
      return false;
    }
    this.recentReplies.set(replyHash, now);

    // Clean up cache periodically
    if (this.recentReplies.size > 500) {
      for (const [k, v] of this.recentReplies.entries()) {
        if (now - v > 60000) this.recentReplies.delete(k);
      }
    }

    // Resolve companyId for account
    const [acc] = await db
      .select({ companyId: schema.whatsappAccounts.companyId })
      .from(schema.whatsappAccounts)
      .where(eq(schema.whatsappAccounts.id, accountId))
      .limit(1);
    const companyId = acc?.companyId;

    // Persist bot message in database
    const [savedMsg] = await db
      .insert(schema.messages)
      .values({
        conversationId,
        contactId,
        whatsappMessageId: undefined,
        direction: 'outgoing',
        senderType: 'automation',
        type: 'text',
        text,
        status: 'pending',
        metadata: { triggerReason, automated: true },
      })
      .returning();

    let providerMessageId: string | undefined;
    let status: 'sent' | 'pending' | 'queued' = 'pending';

    if (companyId) {
      const sendResult = await OutboundQueueService.sendMessage({
        companyId,
        accountId,
        conversationId,
        messageId: savedMsg.id,
        toJid,
        type: 'text',
        text,
        priority: 1, // High priority for automated replies
      });
      status = sendResult.status === 'sent' ? 'sent' : 'queued';
      if (sendResult.whatsappMessageId) {
        providerMessageId = sendResult.whatsappMessageId;
      }
      await db
        .update(schema.messages)
        .set({
          status,
          whatsappMessageId: providerMessageId,
          updatedAt: new Date(),
        })
        .where(eq(schema.messages.id, savedMsg.id));
    }

    // Update conversation snippet
    await db
      .update(schema.conversations)
      .set({
        lastMessageText: text,
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.conversations.id, conversationId));

    // Broadcast across all recognized event channels for instant UI reactivity
    const broadcastPayload = {
      ...savedMsg,
      conversationId,
    };

    wsHub.broadcast('whatsapp.message', broadcastPayload);
    wsHub.broadcast('message.created', { accountId, message: broadcastPayload });
    wsHub.broadcast('new_message', { conversationId, message: broadcastPayload });
    wsHub.broadcast('conversation.updated', {
      id: conversationId,
      conversationId,
      lastMessageText: text,
      lastMessageAt: new Date().toISOString(),
    });
    wsHub.broadcast('conversation_update', {
      id: conversationId,
      conversationId,
      lastMessageText: text,
      lastMessageAt: new Date().toISOString(),
    });

    logger.info({ conversationId, triggerReason, providerMessageId }, 'Automated bot response sent and persisted');
    return true;
  }

  /**
   * Main processor for incoming messages
   */
  static async processInboundMessage(params: {
    conversationId: string;
    contactId: string;
    accountId: string;
    toJid: string;
    messageText: string;
  }): Promise<{
    welcomeSent: boolean;
    outOfHoursSent: boolean;
    keywordMatched: boolean;
  }> {
    const { conversationId, contactId, accountId, toJid, messageText } = params;

    const conversation = await db.query.conversations.findFirst({
      where: eq(schema.conversations.id, conversationId),
    });

    if (!conversation) {
      return { welcomeSent: false, outOfHoursSent: false, keywordMatched: false };
    }

    // Check system-wide automation toggle (read both snake_case and camelCase)
    const systemAutomation =
      (await AssignmentService.getSetting<any>('automation_enabled', null)) ??
      (await AssignmentService.getSetting<any>('automationEnabled', true));

    const botRepliesAllowed =
      Boolean(systemAutomation) && conversation.automationEnabled && !conversation.humanMode;

    let keywordMatched = false;
    let preferredStationId: string | undefined;

    // 1. Keyword rule evaluation (if bot replies are allowed)
    if (messageText && botRepliesAllowed) {
      const match = await this.matchKeywordRules(messageText);
      if (match.matchedRules.length > 0) {
        keywordMatched = true;
        preferredStationId = match.targetStationId;

        // Auto-reply from rule if configured
        if (match.autoReplyText) {
          await this.sendAutomatedReply({
            conversationId,
            contactId,
            accountId,
            toJid,
            text: match.autoReplyText,
            triggerReason: 'keyword',
          });
        }
      }
    }

    // 2. Automated routing & assignment (only assign employee if currently unassigned)
    if (!conversation.assignedEmployeeId) {
      await AssignmentService.autoAssignConversation(conversationId, {
        preferredStationId,
      });
    } else if (preferredStationId && preferredStationId !== conversation.assignedStationId) {
      // If conversation already assigned to employee, only update station if rule specifies new station
      await db
        .update(schema.conversations)
        .set({ assignedStationId: preferredStationId, updatedAt: new Date() })
        .where(eq(schema.conversations.id, conversationId));
    }

    let welcomeSent = false;
    let outOfHoursSent = false;

    if (!botRepliesAllowed) {
      return { welcomeSent, outOfHoursSent, keywordMatched };
    }

    // 3. Welcome message check for first-time contacts
    const welcomeEnabled = await AssignmentService.getSetting<boolean>('welcome_message_enabled', true);
    if (welcomeEnabled) {
      const isFirst = await this.isFirstInbound(contactId);
      if (isFirst) {
        const welcomeTemplate = await AssignmentService.getSetting<string>(
          'welcome_message_template',
          'مرحباً بك في ترينتي فيجن (Trenty Vision) للخدمات والرعاية الصحية! يسعدنا تواصلك معنا، سيقوم أحد أخصائيي الرعاية بالرد عليك ومساعدتك في أقرب وقت.'
        );

        await this.sendAutomatedReply({
          conversationId,
          contactId,
          accountId,
          toJid,
          text: welcomeTemplate,
          triggerReason: 'welcome',
        });
        welcomeSent = true;
        // Don't double-reply with out-of-hours immediately after welcome
        return { welcomeSent, outOfHoursSent, keywordMatched };
      }
    }

    // 4. Out-of-hours check
    const oohEnabledRaw = await AssignmentService.getSetting<any>('out_of_hours_message_enabled', false);
    const oohBotEnabledRaw = await AssignmentService.getSetting<any>('outOfOfficeBotEnabled', null);
    const oohMessageEnabledRaw = await AssignmentService.getSetting<any>('outOfHoursMessageEnabled', null);
    const oohEnabledFrontendRaw = await AssignmentService.getSetting<any>('outOfOfficeEnabled', null);

    // If any setting is explicitly false, it is strictly disabled!
    const isExplicitlyDisabled =
      oohEnabledRaw === false ||
      oohEnabledRaw === 'false' ||
      oohBotEnabledRaw === false ||
      oohBotEnabledRaw === 'false' ||
      oohMessageEnabledRaw === false ||
      oohMessageEnabledRaw === 'false' ||
      oohEnabledFrontendRaw === false ||
      oohEnabledFrontendRaw === 'false';

    const isOohEnabled =
      !isExplicitlyDisabled &&
      (oohEnabledRaw === true ||
        oohEnabledRaw === 'true' ||
        oohBotEnabledRaw === true ||
        oohMessageEnabledRaw === true ||
        oohEnabledFrontendRaw === true);

    if (isOohEnabled) {
      const withinHours = await this.isWithinBusinessHours();
      if (!withinHours) {
        const oohTemplate = await AssignmentService.getSetting<string>(
          'out_of_hours_message_template',
          'شكراً لتواصلك مع ترينتي فيجن (Trenty Vision) للرعاية الصحية! نحن حالياً خارج أوقات العمل الرسمية. سنقوم بالرد عليك وتقديم الرعاية المطلوبة فور بدء دوام العمل القادم.'
        );

        await this.sendAutomatedReply({
          conversationId,
          contactId,
          accountId,
          toJid,
          text: oohTemplate,
          triggerReason: 'out_of_hours',
        });
        outOfHoursSent = true;
      }
    }

    return { welcomeSent, outOfHoursSent, keywordMatched };
  }
}
