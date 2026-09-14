import { eq } from 'drizzle-orm';
import { db } from '../database/client';
import { contacts } from '../database/schema/index';
import { config } from '../config/index';
import { logger } from '../utils/logger';
import { SettingsService } from '../modules/settings/settings.service';

export interface LandingSyncPayload {
  full_name: string;
  mobile: string;
  governorate?: string;
  notes?: string;
  ad_code?: string;
  center?: string | null;
  membership_type?: string | null;
}

export interface LandingSyncResult {
  success: boolean;
  status?: number;
  message?: string;
  payload?: LandingSyncPayload;
}

export class LandingSyncService {
  /**
   * Normalize any phone number (especially Egyptian numbers) into the 11-digit
   * local mobile format (01xxxxxxxxx) expected by the landing page validator.
   */
  public static normalizeMobile(rawPhone: string): string {
    if (!rawPhone) return '';

    // Strip all non-digit characters
    let digits = rawPhone.replace(/\D/g, '');

    // Case 1: International format for Egypt (+2010... / 2010...)
    // Example: 201080632351 -> 01080632351
    if (digits.startsWith('20') && digits.length === 12 && /^201[0125]/.test(digits)) {
      return '0' + digits.slice(2);
    }

    // Case 2: Double zero prefix 00201...
    if (digits.startsWith('0020') && digits.length === 14) {
      return '0' + digits.slice(4);
    }

    // Case 3: Already in Egyptian local format (010..., 011..., 012..., 015...) with 11 digits
    if (/^01[0125][0-9]{8}$/.test(digits)) {
      return digits;
    }

    // Case 4: Missing leading 0 (1080632351 -> 01080632351)
    if (/^1[0125][0-9]{8}$/.test(digits)) {
      return '0' + digits;
    }

    // Default fallback: return digits as-is
    return digits;
  }

  /**
   * Resolve the contact's name. If no valid name exists on WhatsApp or it equals the phone number,
   * provide a clean default to satisfy the landing page's mandatory full_name requirement.
   */
  public static resolveContactName(contact: {
    name?: string | null;
    phoneNumber?: string | null;
    metadata?: any;
  }): string {
    const rawName = (contact.name || '').trim();
    const rawPhone = (contact.phoneNumber || '').trim();
    const pushName = (contact.metadata?.whatsappPushName || '').trim();

    // Check if name is provided and distinct from phone number
    if (rawName && rawName !== rawPhone && !/^\+?[0-9\s\-()]+$/.test(rawName)) {
      return rawName;
    }

    // Check if pushName is provided and distinct from phone number
    if (pushName && pushName !== rawPhone && !/^\+?[0-9\s\-()]+$/.test(pushName)) {
      return pushName;
    }

    // Fallback: If no name exists, use clean placeholder
    return 'عميل واتساب';
  }

  /**
   * Synchronize contact directly to the Trinity Vision landing page API.
   * Performs deduplication check and records sync status in contact metadata.
   */
  public static async syncContact(contact: {
    id: string;
    name?: string | null;
    phoneNumber: string;
    metadata?: any;
  }): Promise<LandingSyncResult> {
    // Dynamic toggle check: First check database setting, fallback to env config
    let isSyncEnabled = config.LANDING_SYNC_ENABLED;
    try {
      const dbEnabled = await SettingsService.get('landingSyncEnabled');
      if (dbEnabled !== undefined && dbEnabled !== null) {
        isSyncEnabled = dbEnabled === true || dbEnabled === 'true';
      }
    } catch {
      // Setting not set in DB yet, fallback to env config
    }

    if (!isSyncEnabled) {
      logger.info({ contactId: contact.id }, 'Landing page sync is disabled in settings, skipping');
      return { success: false, message: 'Landing page sync is disabled in settings' };
    }

    const contactMeta = (contact.metadata || {}) as Record<string, any>;

    // Idempotency: Skip if already synced successfully
    if (contactMeta.trinityLandingSynced === true) {
      logger.debug(
        { contactId: contact.id, phoneNumber: contact.phoneNumber },
        'Contact already synced to Trinity Vision landing page, skipping'
      );
      return { success: true, message: 'Already synced' };
    }

    const mobile = this.normalizeMobile(contact.phoneNumber);
    const fullName = this.resolveContactName(contact);

    const payload: LandingSyncPayload = {
      full_name: fullName,
      mobile: mobile,
      governorate: 'كفر الشيخ',
      notes: 'مسجل تلقائياً عبر واتساب الأدمن CRM',
      ad_code: 'whatsapp_crm',
    };

    let targetUrl = config.LANDING_SYNC_URL;
    try {
      const dbUrl = await SettingsService.get('landingSyncUrl');
      if (dbUrl && typeof dbUrl === 'string' && dbUrl.trim() !== '') {
        targetUrl = dbUrl.trim();
      }
    } catch {
      // Fallback to config
    }

    try {
      logger.info(
        { contactId: contact.id, mobile, fullName, targetUrl },
        'Sending contact to Trinity Vision landing page'
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'TrentyVision-WhatsAppCRM/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseData: any = null;
      try {
        responseData = await response.json();
      } catch {
        // Response was not JSON
      }

      const isSuccess = response.ok && (!responseData || responseData.success !== false);

      if (isSuccess) {
        // Update contact metadata with successful sync status
        const updatedMeta = {
          ...contactMeta,
          trinityLandingSynced: true,
          trinityLandingSyncedAt: new Date().toISOString(),
          trinityLandingResponse: responseData || { status: response.status },
        };

        await db
          .update(contacts)
          .set({ metadata: updatedMeta, updatedAt: new Date() })
          .where(eq(contacts.id, contact.id));

        logger.info(
          { contactId: contact.id, mobile, status: response.status },
          'Contact successfully synced to Trinity Vision landing page'
        );

        return {
          success: true,
          status: response.status,
          message: responseData?.message || 'Successfully registered',
          payload,
        };
      } else {
        const errorMsg =
          responseData?.message ||
          `Landing page server responded with HTTP ${response.status}: ${response.statusText}`;

        // Record failed attempt in metadata for visibility & diagnostics
        const updatedMeta = {
          ...contactMeta,
          trinityLandingSynced: false,
          trinityLandingLastAttempt: new Date().toISOString(),
          trinityLandingLastError: errorMsg,
          trinityLandingHttpStatus: response.status,
        };

        await db
          .update(contacts)
          .set({ metadata: updatedMeta, updatedAt: new Date() })
          .where(eq(contacts.id, contact.id));

        logger.warn(
          { contactId: contact.id, mobile, status: response.status, error: errorMsg },
          'Trinity Vision landing page returned non-success response during contact sync'
        );

        return {
          success: false,
          status: response.status,
          message: errorMsg,
          payload,
        };
      }
    } catch (err: any) {
      const errorMsg = err.name === 'AbortError' ? 'Connection timed out (10s)' : (err.message || 'Unknown network error');

      // Record error in metadata
      try {
        const updatedMeta = {
          ...contactMeta,
          trinityLandingSynced: false,
          trinityLandingLastAttempt: new Date().toISOString(),
          trinityLandingLastError: errorMsg,
        };

        await db
          .update(contacts)
          .set({ metadata: updatedMeta, updatedAt: new Date() })
          .where(eq(contacts.id, contact.id));
      } catch (dbErr) {
        logger.error({ contactId: contact.id, dbErr }, 'Failed to persist landing sync error to contact metadata');
      }

      logger.warn(
        { contactId: contact.id, mobile, error: errorMsg },
        'Network/connection error when syncing contact to Trinity Vision landing page'
      );

      return {
        success: false,
        message: errorMsg,
        payload,
      };
    }
  }

  /**
   * Non-blocking asynchronous sync execution. Fire-and-forget so that
   * WhatsApp incoming message handling is never delayed or blocked.
   */
  public static syncContactAsync(contact: {
    id: string;
    name?: string | null;
    phoneNumber: string;
    metadata?: any;
  }): void {
    setImmediate(() => {
      this.syncContact(contact).catch((err) => {
        logger.error({ contactId: contact.id, err }, 'Unhandled error in syncContactAsync');
      });
    });
  }
}
