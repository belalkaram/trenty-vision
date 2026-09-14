export interface BusinessHoursDay {
  enabled: boolean;
  start: string;
  end: string;
}

export interface BusinessHoursSchedule {
  sunday: BusinessHoursDay;
  monday: BusinessHoursDay;
  tuesday: BusinessHoursDay;
  wednesday: BusinessHoursDay;
  thursday: BusinessHoursDay;
  friday: BusinessHoursDay;
  saturday: BusinessHoursDay;
}

export const DAY_NAMES: (keyof BusinessHoursSchedule)[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export const DAY_NAME_TO_NUMBER: Record<keyof BusinessHoursSchedule, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export const DAY_NUMBER_TO_NAME: Record<number, keyof BusinessHoursSchedule> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

/**
 * Unify and synchronize business hours across both representation formats:
 * 1. Detailed 7-day schedule map (SettingsPage format: { sunday: { enabled, start, end }, ... })
 * 2. Aggregate format (AutomationsPage format: { start, end, workDays, activeDays })
 * 
 * Returns a hybrid structure that seamlessly satisfies both pages and the rules engine.
 */
export function unifyBusinessHours(input: any): any {
  if (!input || typeof input !== 'object') {
    input = {};
  }

  const has7DayKeys = DAY_NAMES.some((d) => input[d] && typeof input[d] === 'object');
  const hasScheduleObj = input.schedule && typeof input.schedule === 'object';

  let defaultStart = input.start || input.businessHoursStart || '09:00';
  let defaultEnd = input.end || input.businessHoursEnd || '18:00';
  const timezone = input.timezone || 'Asia/Kuwait';
  const isEnabled = input.enabled !== false;

  const scheduleMap: Partial<BusinessHoursSchedule> = {};
  const activeDaysSet = new Set<number>();

  if (has7DayKeys || hasScheduleObj) {
    const source = has7DayKeys ? input : input.schedule;

    for (const day of DAY_NAMES) {
      const dayData = source[day] || {};
      const dayEnabled = dayData.enabled !== false;
      const dayStart = dayData.start || defaultStart;
      const dayEnd = dayData.end || defaultEnd;

      scheduleMap[day] = {
        enabled: dayEnabled,
        start: dayStart,
        end: dayEnd,
      };

      if (dayEnabled) {
        activeDaysSet.add(DAY_NAME_TO_NUMBER[day]);
      }
    }

    // Determine default start and end times from the active days if available
    const firstActiveDay = DAY_NAMES.find((d) => scheduleMap[d]?.enabled);
    if (firstActiveDay && scheduleMap[firstActiveDay]) {
      defaultStart = scheduleMap[firstActiveDay]!.start;
      defaultEnd = scheduleMap[firstActiveDay]!.end;
    }
  } else {
    // Generated from aggregate format (workDays / activeDays, start, end)
    const rawDays = input.workDays || input.activeDays || [0, 1, 2, 3, 4, 6];
    for (const d of rawDays) {
      activeDaysSet.add(Number(d));
    }

    for (const day of DAY_NAMES) {
      const dayNum = DAY_NAME_TO_NUMBER[day];
      const dayEnabled = activeDaysSet.has(dayNum);
      scheduleMap[day] = {
        enabled: dayEnabled,
        start: defaultStart,
        end: defaultEnd,
      };
    }
  }

  const activeDaysArray = Array.from(activeDaysSet).sort((a, b) => a - b);

  return {
    enabled: isEnabled,
    timezone,
    start: defaultStart,
    end: defaultEnd,
    workDays: activeDaysArray,
    activeDays: activeDaysArray,
    businessHoursStart: defaultStart,
    businessHoursEnd: defaultEnd,
    ...scheduleMap,
    schedule: scheduleMap,
  };
}
