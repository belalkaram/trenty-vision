import { describe, it, expect } from 'vitest';
import { unifyBusinessHours } from '../../src/utils/business-hours.converter';

describe('unifyBusinessHours', () => {
  it('should convert 7-day schedule map (SettingsPage format) to aggregate format (AutomationsPage)', () => {
    const settingsFormat = {
      sunday: { enabled: true, start: '08:30', end: '16:30' },
      monday: { enabled: true, start: '08:30', end: '16:30' },
      tuesday: { enabled: true, start: '08:30', end: '16:30' },
      wednesday: { enabled: true, start: '08:30', end: '16:30' },
      thursday: { enabled: true, start: '08:30', end: '16:30' },
      friday: { enabled: false, start: '08:30', end: '16:30' },
      saturday: { enabled: true, start: '10:00', end: '14:00' },
    };

    const unified = unifyBusinessHours(settingsFormat);

    expect(unified.start).toBe('08:30');
    expect(unified.end).toBe('16:30');
    expect(unified.workDays).toEqual([0, 1, 2, 3, 4, 6]); // Friday (5) is excluded
    expect(unified.activeDays).toEqual([0, 1, 2, 3, 4, 6]);
    expect(unified.businessHoursStart).toBe('08:30');
    expect(unified.businessHoursEnd).toBe('16:30');
    expect(unified.sunday.enabled).toBe(true);
    expect(unified.friday.enabled).toBe(false);
  });

  it('should convert aggregate format (AutomationsPage) to 7-day schedule map (SettingsPage)', () => {
    const automationsFormat = {
      start: '10:00',
      end: '19:00',
      workDays: [0, 1, 2, 3, 4], // Sunday to Thursday (Friday 5 and Saturday 6 disabled)
    };

    const unified = unifyBusinessHours(automationsFormat);

    expect(unified.start).toBe('10:00');
    expect(unified.end).toBe('19:00');
    expect(unified.workDays).toEqual([0, 1, 2, 3, 4]);

    // Check 7-day schedule conversion
    expect(unified.sunday.enabled).toBe(true);
    expect(unified.sunday.start).toBe('10:00');
    expect(unified.sunday.end).toBe('19:00');

    expect(unified.thursday.enabled).toBe(true);
    expect(unified.friday.enabled).toBe(false);
    expect(unified.saturday.enabled).toBe(false);
  });

  it('should handle empty or undefined input with safe sensible defaults', () => {
    const unified = unifyBusinessHours(undefined);

    expect(unified.start).toBe('09:00');
    expect(unified.end).toBe('18:00');
    expect(unified.workDays).toEqual([0, 1, 2, 3, 4, 6]);
    expect(unified.sunday.enabled).toBe(true);
    expect(unified.friday.enabled).toBe(false);
  });
});
