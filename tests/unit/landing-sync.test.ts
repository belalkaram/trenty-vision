import { describe, it, expect } from 'vitest';
import { LandingSyncService } from '../../src/services/landing-sync.service';

describe('LandingSyncService', () => {
  describe('normalizeMobile', () => {
    it('should format Egyptian numbers with international prefix +20 to 11-digit local format', () => {
      expect(LandingSyncService.normalizeMobile('+201080632351')).toBe('01080632351');
      expect(LandingSyncService.normalizeMobile('201080632351')).toBe('01080632351');
      expect(LandingSyncService.normalizeMobile('+201123456789')).toBe('01123456789');
      expect(LandingSyncService.normalizeMobile('+201234567890')).toBe('01234567890');
      expect(LandingSyncService.normalizeMobile('+201555555555')).toBe('01555555555');
    });

    it('should format Egyptian numbers with 0020 prefix', () => {
      expect(LandingSyncService.normalizeMobile('00201080632351')).toBe('01080632351');
    });

    it('should keep already formatted 11-digit local numbers intact', () => {
      expect(LandingSyncService.normalizeMobile('01080632351')).toBe('01080632351');
      expect(LandingSyncService.normalizeMobile('01123456789')).toBe('01123456789');
    });

    it('should add leading 0 to 10-digit Egyptian numbers missing the leading zero', () => {
      expect(LandingSyncService.normalizeMobile('1080632351')).toBe('01080632351');
    });

    it('should clean non-Egyptian numbers to digits', () => {
      expect(LandingSyncService.normalizeMobile('+965 1234 5678')).toBe('96512345678');
    });
  });

  describe('resolveContactName', () => {
    it('should return contact name when valid', () => {
      const contact = {
        name: 'محمد أحمد',
        phoneNumber: '+201080632351',
      };
      expect(LandingSyncService.resolveContactName(contact)).toBe('محمد أحمد');
    });

    it('should use whatsappPushName if name equals phone number', () => {
      const contact = {
        name: '+201080632351',
        phoneNumber: '+201080632351',
        metadata: {
          whatsappPushName: 'محمود حسن',
        },
      };
      expect(LandingSyncService.resolveContactName(contact)).toBe('محمود حسن');
    });

    it('should fallback to clean placeholder when no name exists', () => {
      const contact = {
        name: '+201080632351',
        phoneNumber: '+201080632351',
        metadata: {},
      };
      expect(LandingSyncService.resolveContactName(contact)).toBe('عميل واتساب');
    });
  });

  describe('syncContact idempotency', () => {
    it('should skip syncing if contact is already marked as synced', async () => {
      const contact = {
        id: 'c8789b53-4632-4217-a068-19e4da77341e',
        name: 'عميل مسجل مسبقاً',
        phoneNumber: '+201080632351',
        metadata: {
          trinityLandingSynced: true,
          trinityLandingSyncedAt: '2026-09-11T12:00:00.000Z',
        },
      };

      const result = await LandingSyncService.syncContact(contact);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Already synced');
    });

    it('should respect disabled toggle when landingSyncEnabled is false', async () => {
      const { SettingsService } = await import('../../src/modules/settings/settings.service');
      const origGet = SettingsService.get;
      SettingsService.get = async (key: string) => {
        if (key === 'landingSyncEnabled') return false;
        return origGet.call(SettingsService, key);
      };

      const contact = {
        id: 'd9889b53-4632-4217-a068-19e4da77341f',
        name: 'عميل جديد',
        phoneNumber: '+201080632351',
        metadata: {},
      };

      const result = await LandingSyncService.syncContact(contact);
      expect(result.success).toBe(false);
      expect(result.message).toContain('disabled');

      // Restore original get
      SettingsService.get = origGet;
    });
  });
});
