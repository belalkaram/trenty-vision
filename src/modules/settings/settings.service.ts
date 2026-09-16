import { db } from '../../database/client';
import { settings, companies } from '../../database/schema/index';
import { eq, and, inArray } from 'drizzle-orm';
import { NotFoundError } from '../../utils/errors';
import { AuditService } from '../audit/audit.service';
import { logger } from '../../utils/logger';
import { unifyBusinessHours } from '../../utils/business-hours.converter';

const IGNORED_KEYS = new Set(['list', 'map', 'results', 'undefined', 'null']);

export class SettingsService {
  /**
   * Cleans up junk keys (e.g. list, map) accidentally stored in the settings table
   */
  public static async cleanupJunkSettings(companyId?: string): Promise<void> {
    try {
      if (companyId) {
        await db
          .delete(settings)
          .where(and(eq(settings.companyId, companyId), inArray(settings.key, Array.from(IGNORED_KEYS))));
      } else {
        await db.delete(settings).where(inArray(settings.key, Array.from(IGNORED_KEYS)));
      }
    } catch (err) {
      logger.debug({ err }, 'Error cleaning up junk settings');
    }
  }

  public static async getAll(companyId?: string) {
    await this.cleanupJunkSettings(companyId);
    const list = companyId
      ? await db.select().from(settings).where(eq(settings.companyId, companyId))
      : await db.select().from(settings);

    const map: Record<string, any> = {};

    for (const item of list) {
      if (IGNORED_KEYS.has(item.key)) continue;
      map[item.key] = item.value;
    }

    // Attach company branding directly if companyId is present
    if (companyId) {
      const comp = await db.query.companies.findFirst({
        where: eq(companies.id, companyId),
      });
      if (comp) {
        if (!map['companyName']) map['companyName'] = comp.name;
        if (!map['company_name']) map['company_name'] = comp.name;
        if (comp.logoUrl && !map['companyLogo']) map['companyLogo'] = comp.logoUrl;
        if (comp.logoUrl && !map['company_logo']) map['company_logo'] = comp.logoUrl;
      }
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

  public static async get(key: string, companyId?: string): Promise<any> {
    if (IGNORED_KEYS.has(key)) return null;

    const condition = companyId
      ? and(eq(settings.companyId, companyId), eq(settings.key, key))
      : eq(settings.key, key);

    const setting = await db.query.settings.findFirst({
      where: condition,
    });

    if (!setting) {
      // Fallback check mirrored keys
      if (key === 'routingStrategy') return this.get('assignment_mode', companyId);
      if (key === 'assignment_mode') return this.get('routingStrategy', companyId);
      if (key === 'autoAssignmentEnabled') return this.get('assignment_enabled', companyId);
      if (key === 'assignment_enabled') return this.get('autoAssignmentEnabled', companyId);
      if (key === 'businessHoursStart' || key === 'businessHoursEnd' || key === 'activeDays') {
        const bh = await this.get('business_hours', companyId);
        return bh ? unifyBusinessHours(bh)[key === 'activeDays' ? 'workDays' : key] : null;
      }
      return null;
    }

    if (key === 'businessHours' || key === 'business_hours') {
      return unifyBusinessHours(setting.value);
    }

    return setting.value;
  }

  public static async set(key: string, value: any, actorId?: string, companyId?: string) {
    if (!key || IGNORED_KEYS.has(key)) return null;

    if (key === 'businessHours' || key === 'business_hours') {
      value = unifyBusinessHours(value);
    }

    // Sync company branding to companies table if updated
    if (companyId) {
      if (key === 'companyName' || key === 'company_name') {
        await db.update(companies).set({ name: String(value), updatedAt: new Date() }).where(eq(companies.id, companyId));
      } else if (key === 'companyLogo' || key === 'company_logo' || key === 'logoUrl') {
        await db.update(companies).set({ logoUrl: String(value), updatedAt: new Date() }).where(eq(companies.id, companyId));
      }
    }

    // Determine target companyId
    let effectiveCompanyId = companyId;
    if (!effectiveCompanyId) {
      const firstCompany = await db.query.companies.findFirst();
      effectiveCompanyId = firstCompany?.id;
    }

    if (!effectiveCompanyId) {
      throw new Error('No company found to associate setting.');
    }

    const existing = await db.query.settings.findFirst({
      where: and(eq(settings.companyId, effectiveCompanyId), eq(settings.key, key)),
    });

    let updated;
    if (existing) {
      [updated] = await db
        .update(settings)
        .set({
          value,
          updatedAt: new Date(),
        })
        .where(eq(settings.id, existing.id))
        .returning();

      await AuditService.log({
        actorId,
        companyId: effectiveCompanyId,
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
          companyId: effectiveCompanyId,
          key,
          value,
          groupName: 'custom',
        })
        .returning();

      await AuditService.log({
        actorId,
        companyId: effectiveCompanyId,
        action: 'setting.create',
        entityType: 'setting',
        entityId: updated.id,
        newValues: { [key]: value },
      });
    }

    // Mirror paired keys
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
      companyName: ['company_name'],
      company_name: ['companyName'],
      companyLogo: ['company_logo'],
      company_logo: ['companyLogo'],
    };

    const targets = mirrorPairs[key];
    if (targets) {
      for (const targetKey of targets) {
        const mirroredExisting = await db.query.settings.findFirst({
          where: and(eq(settings.companyId, effectiveCompanyId), eq(settings.key, targetKey)),
        });
        if (mirroredExisting) {
          await db
            .update(settings)
            .set({ value, updatedAt: new Date() })
            .where(eq(settings.id, mirroredExisting.id));
        } else {
          await db
            .insert(settings)
            .values({ companyId: effectiveCompanyId, key: targetKey, value, groupName: 'synced' });
        }
      }
    }

    return updated;
  }

  public static async updateBatch(items: Record<string, any>, actorId?: string, companyId?: string) {
    const results = [];
    for (const [key, value] of Object.entries(items)) {
      if (IGNORED_KEYS.has(key) || !key || value === undefined) continue;
      const res = await this.set(key, value, actorId, companyId);
      if (res) results.push(res);
    }
    return results;
  }
}
