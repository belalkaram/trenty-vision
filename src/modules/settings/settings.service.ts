import { db } from '../../database/client';
import { settings } from '../../database/schema/index';
import { eq, inArray } from 'drizzle-orm';
import { NotFoundError } from '../../utils/errors';
import { AuditService } from '../audit/audit.service';
import { logger } from '../../utils/logger';
import { unifyBusinessHours } from '../../utils/business-hours.converter';

const IGNORED_KEYS = new Set(['list', 'map', 'results', 'undefined', 'null']);

export class SettingsService {
  /**
   * Cleans up junk keys (e.g. list, map) accidentally stored in the settings table
   */
  public static async cleanupJunkSettings(): Promise<void> {
    try {
      await db.delete(settings).where(inArray(settings.key, Array.from(IGNORED_KEYS)));
    } catch (err) {
      logger.debug({ err }, 'Error cleaning up junk settings');
    }
  }

  public static async getAll() {
    await this.cleanupJunkSettings();
    const list = await db.select().from(settings);
    const map: Record<string, any> = {};

    for (const item of list) {
      if (IGNORED_KEYS.has(item.key)) continue;
      map[item.key] = item.value;
    }

    // Bidirectional normalization to guarantee both camelCase and snake_case exist
    if (map['assignment_mode'] !== undefined && map['routingStrategy'] === undefined) {
      map['routingStrategy'] = map['assignment_mode'];
    } else if (map['routingStrategy'] !== undefined && map['assignment_mode'] === undefined) {
      map['assignment_mode'] = map['routingStrategy'];
    }

    if (map['assignment_enabled'] !== undefined && map['autoAssignmentEnabled'] === undefined) {
      map['autoAssignmentEnabled'] = map['assignment_enabled'];
    } else if (map['autoAssignmentEnabled'] !== undefined && map['assignment_enabled'] === undefined) {
      map['assignment_enabled'] = map['autoAssignmentEnabled'];
    }

    if (map['welcome_message_enabled'] !== undefined) {
      map['greetingBotEnabled'] = map['welcome_message_enabled'];
      map['welcomeMessageEnabled'] = map['welcome_message_enabled'];
    }

    if (map['welcome_message_template'] !== undefined) {
      map['greetingMessage'] = map['welcome_message_template'];
      map['welcomeMessageTemplate'] = map['welcome_message_template'];
    }

    const oohVal =
      map['out_of_hours_message_enabled'] ??
      map['outOfHoursMessageEnabled'] ??
      map['outOfOfficeBotEnabled'] ??
      map['outOfOfficeEnabled'];

    if (oohVal !== undefined) {
      map['out_of_hours_message_enabled'] = oohVal;
      map['outOfHoursMessageEnabled'] = oohVal;
      map['outOfOfficeBotEnabled'] = oohVal;
      map['outOfOfficeEnabled'] = oohVal;
    }

    const oohTmpl =
      map['out_of_hours_message_template'] ??
      map['outOfHoursMessageTemplate'] ??
      map['outOfOfficeMessage'];

    if (oohTmpl !== undefined) {
      map['out_of_hours_message_template'] = oohTmpl;
      map['outOfHoursMessageTemplate'] = oohTmpl;
      map['outOfOfficeMessage'] = oohTmpl;
    }

    const rawBHours = map['business_hours'] ?? map['businessHours'];
    if (rawBHours) {
      const unified = unifyBusinessHours(rawBHours);
      map['business_hours'] = unified;
      map['businessHours'] = unified;
      map['businessHoursStart'] = unified.start;
      map['businessHoursEnd'] = unified.end;
      map['activeDays'] = unified.activeDays;
    }

    return {
      list: list.filter((i) => !IGNORED_KEYS.has(i.key)),
      map,
    };
  }

  public static async get(key: string): Promise<any> {
    if (IGNORED_KEYS.has(key)) return null;

    const setting = await db.query.settings.findFirst({
      where: eq(settings.key, key),
    });

    if (!setting) {
      // Fallback check mirrored keys
      if (key === 'routingStrategy') return this.get('assignment_mode');
      if (key === 'assignment_mode') return this.get('routingStrategy');
      if (key === 'autoAssignmentEnabled') return this.get('assignment_enabled');
      if (key === 'assignment_enabled') return this.get('autoAssignmentEnabled');
      if (key === 'businessHoursStart' || key === 'businessHoursEnd' || key === 'activeDays') {
        const bh = await this.get('business_hours');
        return bh ? unifyBusinessHours(bh)[key === 'activeDays' ? 'workDays' : key] : null;
      }
      throw new NotFoundError(`Setting "${key}" not found`);
    }

    if (key === 'businessHours' || key === 'business_hours') {
      return unifyBusinessHours(setting.value);
    }

    return setting.value;
  }

  public static async set(key: string, value: any, actorId?: string) {
    if (!key || IGNORED_KEYS.has(key)) return null;

    if (key === 'businessHours' || key === 'business_hours') {
      value = unifyBusinessHours(value);
    }

    const existing = await db.query.settings.findFirst({
      where: eq(settings.key, key),
    });

    let updated;
    if (existing) {
      [updated] = await db
        .update(settings)
        .set({
          value,
          updatedAt: new Date(),
        })
        .where(eq(settings.key, key))
        .returning();

      await AuditService.log({
        actorId,
        action: 'setting.update',
        entityType: 'setting',
        entityId: existing.id,
        oldValues: { [key]: existing.value },
        newValues: { [key]: value },
      });
    } else {
      [updated] = await db
        .insert(settings)
        .values({
          key,
          value,
          groupName: 'custom',
        })
        .returning();

      await AuditService.log({
        actorId,
        action: 'setting.create',
        entityType: 'setting',
        entityId: updated.id,
        newValues: { [key]: value },
      });
    }

    // Mirror paired keys to ensure complete sync across Frontend & Backend
    const mirrorPairs: Record<string, string[]> = {
      routingStrategy: ['assignment_mode'],
      assignment_mode: ['routingStrategy'],
      autoAssignmentEnabled: ['assignment_enabled'],
      assignment_enabled: ['autoAssignmentEnabled'],
      welcomeMessageEnabled: ['welcome_message_enabled', 'greetingBotEnabled'],
      greetingBotEnabled: ['welcome_message_enabled', 'welcomeMessageEnabled'],
      welcome_message_enabled: ['welcomeMessageEnabled', 'greetingBotEnabled'],
      welcomeMessageTemplate: ['welcome_message_template', 'greetingMessage'],
      greetingMessage: ['welcome_message_template', 'welcomeMessageTemplate'],
      welcome_message_template: ['welcomeMessageTemplate', 'greetingMessage'],
      outOfOfficeEnabled: ['out_of_hours_message_enabled', 'outOfHoursMessageEnabled', 'outOfOfficeBotEnabled'],
      outOfOfficeBotEnabled: ['out_of_hours_message_enabled', 'outOfHoursMessageEnabled', 'outOfOfficeEnabled'],
      outOfHoursMessageEnabled: ['out_of_hours_message_enabled', 'outOfOfficeBotEnabled', 'outOfOfficeEnabled'],
      out_of_hours_message_enabled: ['outOfHoursMessageEnabled', 'outOfOfficeBotEnabled', 'outOfOfficeEnabled'],
      outOfOfficeMessage: ['out_of_hours_message_template', 'outOfHoursMessageTemplate'],
      outOfHoursMessageTemplate: ['out_of_hours_message_template', 'outOfOfficeMessage'],
      out_of_hours_message_template: ['outOfHoursMessageTemplate', 'outOfOfficeMessage'],
      businessHours: ['business_hours'],
      business_hours: ['businessHours'],
      landingSyncEnabled: ['landing_sync_enabled'],
      landing_sync_enabled: ['landingSyncEnabled'],
      landingSyncUrl: ['landing_sync_url'],
      landing_sync_url: ['landingSyncUrl'],
    };

    const targets = mirrorPairs[key];
    if (targets) {
      for (const targetKey of targets) {
        await db
          .insert(settings)
          .values({ key: targetKey, value, groupName: 'synced' })
          .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
      }
    }

    return updated;
  }

  public static async updateBatch(items: Record<string, any>, actorId?: string) {
    const results = [];
    for (const [key, value] of Object.entries(items)) {
      if (IGNORED_KEYS.has(key) || !key || value === undefined) continue;
      const res = await this.set(key, value, actorId);
      if (res) results.push(res);
    }
    return results;
  }
}
