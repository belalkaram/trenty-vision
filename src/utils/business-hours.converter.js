"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAY_NUMBER_TO_NAME = exports.DAY_NAME_TO_NUMBER = exports.DAY_NAMES = void 0;
exports.unifyBusinessHours = unifyBusinessHours;
exports.DAY_NAMES = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
];
exports.DAY_NAME_TO_NUMBER = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
};
exports.DAY_NUMBER_TO_NAME = {
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
function unifyBusinessHours(input) {
    if (!input || typeof input !== 'object') {
        input = {};
    }
    var has7DayKeys = exports.DAY_NAMES.some(function (d) { return input[d] && typeof input[d] === 'object'; });
    var hasScheduleObj = input.schedule && typeof input.schedule === 'object';
    var defaultStart = input.start || input.businessHoursStart || '09:00';
    var defaultEnd = input.end || input.businessHoursEnd || '18:00';
    var timezone = input.timezone || 'Asia/Kuwait';
    var isEnabled = input.enabled !== false;
    var scheduleMap = {};
    var activeDaysSet = new Set();
    if (has7DayKeys || hasScheduleObj) {
        var source = has7DayKeys ? input : input.schedule;
        for (var _i = 0, DAY_NAMES_1 = exports.DAY_NAMES; _i < DAY_NAMES_1.length; _i++) {
            var day = DAY_NAMES_1[_i];
            var dayData = source[day] || {};
            var dayEnabled = dayData.enabled !== false;
            var dayStart = dayData.start || defaultStart;
            var dayEnd = dayData.end || defaultEnd;
            scheduleMap[day] = {
                enabled: dayEnabled,
                start: dayStart,
                end: dayEnd,
            };
            if (dayEnabled) {
                activeDaysSet.add(exports.DAY_NAME_TO_NUMBER[day]);
            }
        }
        // Determine default start and end times from the active days if available
        var firstActiveDay = exports.DAY_NAMES.find(function (d) { var _a; return (_a = scheduleMap[d]) === null || _a === void 0 ? void 0 : _a.enabled; });
        if (firstActiveDay && scheduleMap[firstActiveDay]) {
            defaultStart = scheduleMap[firstActiveDay].start;
            defaultEnd = scheduleMap[firstActiveDay].end;
        }
    }
    else {
        // Generated from aggregate format (workDays / activeDays, start, end)
        var rawDays = input.workDays || input.activeDays || [0, 1, 2, 3, 4, 6];
        for (var _a = 0, rawDays_1 = rawDays; _a < rawDays_1.length; _a++) {
            var d = rawDays_1[_a];
            activeDaysSet.add(Number(d));
        }
        for (var _b = 0, DAY_NAMES_2 = exports.DAY_NAMES; _b < DAY_NAMES_2.length; _b++) {
            var day = DAY_NAMES_2[_b];
            var dayNum = exports.DAY_NAME_TO_NUMBER[day];
            var dayEnabled = activeDaysSet.has(dayNum);
            scheduleMap[day] = {
                enabled: dayEnabled,
                start: defaultStart,
                end: defaultEnd,
            };
        }
    }
    var activeDaysArray = Array.from(activeDaysSet).sort(function (a, b) { return a - b; });
    return __assign(__assign({ enabled: isEnabled, timezone: timezone, start: defaultStart, end: defaultEnd, workDays: activeDaysArray, activeDays: activeDaysArray, businessHoursStart: defaultStart, businessHoursEnd: defaultEnd }, scheduleMap), { schedule: scheduleMap });
}
