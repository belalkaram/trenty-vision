"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isReminderMessage = isReminderMessage;
exports.parseDateTime = parseDateTime;
exports.extractClientPhoneNumber = extractClientPhoneNumber;
exports.parseReminderCommand = parseReminderCommand;
var phone_validator_1 = require("../../utils/phone.validator");
var REMINDER_PREFIXES = [
    '#تذكير',
    '#ملاحظة',
    '#ملاحظه',
    '#ريميندر',
    'تذكير:',
    'ملاحظة:',
    'ملاحظه:',
    'ريميندر:',
    '/reminder',
    '/note',
    '#reminder',
    '#note',
];
/**
 * Checks if a text message is intended as a reminder command.
 */
function isReminderMessage(text, hasQuotedMessage) {
    if (hasQuotedMessage === void 0) { hasQuotedMessage = false; }
    if (!text || typeof text !== 'string')
        return false;
    var trimmed = text.trim();
    var lower = trimmed.toLowerCase();
    for (var _i = 0, REMINDER_PREFIXES_1 = REMINDER_PREFIXES; _i < REMINDER_PREFIXES_1.length; _i++) {
        var prefix = REMINDER_PREFIXES_1[_i];
        if (lower.startsWith(prefix.toLowerCase()))
            return true;
    }
    // If quoting a CRM customer alert, allow looser prefixes like "تذكير " or "ملاحظة "
    if (hasQuotedMessage) {
        if (trimmed.startsWith('تذكير ') || trimmed.startsWith('ملاحظة ') || trimmed.startsWith('ملاحظه ')) {
            return true;
        }
    }
    return false;
}
// Helper dictionaries for Arabic natural language processing
function normalizeArabicDigits(str) {
    var easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    var res = str;
    for (var i = 0; i < 10; i++) {
        res = res.replaceAll(easternDigits[i], String(i));
    }
    return res;
}
var wordToNumber = {
    'واحد': 1, 'واحدة': 1, 'يوم': 1, 'شهر': 1, 'ساعة': 1, 'اسبوع': 1, 'أسبوع': 1,
    'يومين': 2, 'ساعتين': 2, 'اسبوعين': 2, 'أسبوعين': 2, 'شهرين': 2, 'اتنين': 2, 'اثنين': 2,
    'تلات': 3, 'تلاتة': 3, 'ثلاث': 3, 'ثلاثة': 3,
    'اربع': 4, 'اربعة': 4, 'أربع': 4, 'أربعة': 4,
    'خمس': 5, 'خمسة': 5,
    'ست': 6, 'ستة': 6,
    'سبع': 7, 'سبعة': 7,
    'تمن': 8, 'تمانية': 8, 'ثمان': 8, 'ثمانية': 8,
    'تسع': 9, 'تسعة': 9,
    'عشر': 10, 'عشرة': 10,
};
var arabicMonths = {
    'يناير': 0, 'كانون الثاني': 0,
    'فبراير': 1, 'شباط': 1,
    'مارس': 2, 'اذار': 2, 'آذار': 2,
    'ابريل': 3, 'أبريل': 3, 'نيسان': 3,
    'مايو': 4, 'ايار': 4, 'أيار': 4,
    'يونيو': 5, 'حزيران': 5,
    'يوليو': 6, 'تموز': 6,
    'اغسطس': 7, 'أغسطس': 7, 'اب': 7, 'آب': 7,
    'سبتمبر': 8, 'ايلول': 8, 'أيلول': 8,
    'اكتوبر': 9, 'أكتوبر': 9, 'تشرين الاول': 9, 'تشرين الأول': 9,
    'نوفمبر': 10, 'تشرين الثاني': 10,
    'ديسمبر': 11, 'كانون الاول': 11, 'كانون الأول': 11,
};
var weekdays = {
    'الاحد': 0, 'الأحد': 0, 'احد': 0, 'أحد': 0,
    'الاثنين': 1, 'الإثنين': 1, 'اثنين': 1, 'إثنين': 1, 'تنين': 1,
    'الثلاثاء': 2, 'التلات': 2, 'ثلاثاء': 2, 'تلات': 2, 'ثلاث': 2,
    'الاربعاء': 3, 'الأربعاء': 3, 'الاربع': 3, 'الأربع': 3, 'اربعاء': 3, 'أربعاء': 3,
    'الخميس': 4, 'خميس': 4,
    'الجمعة': 5, 'الجمعه': 5, 'جمعة': 5, 'جمعه': 5,
    'السبت': 6, 'سبت': 6,
};
function extractTimeHoursMinutes(str) {
    var isPM = str.includes('مساء') || str.includes('عصرا') || str.includes('عصراً') || str.includes('ليلا') || str.includes('ليلاً') || str.includes('بليل') || str.includes('بالليل') || str.includes('pm');
    var isAM = str.includes('صباحا') || str.includes('صباحاً') || str.includes('الصبح') || str.includes('فجرا') || str.includes('فجراً') || str.includes('الفجر') || str.includes('am');
    if (str.includes('فجر') || str.includes('فجراً'))
        return { hours: 5, minutes: 0 };
    if (str.includes('ظهر') || str.includes('ظهراً') || str.includes('الظهر'))
        return { hours: 12, minutes: 30 };
    if (str.includes('مغرب') || str.includes('المغرب'))
        return { hours: 18, minutes: 30 };
    // Look for explicit "الساعة X" or "الساعة X:Y"
    var sa3aMatch = str.match(/الساعة\s*(\d{1,2})(?::(\d{2}))?/);
    var timeMatch = sa3aMatch;
    if (!timeMatch) {
        // Look for clock time with period suffix
        timeMatch = str.match(/(\d{1,2})(?::(\d{2}))?\s*(?:صباحا|صباحاً|عصرا|عصراً|مساء|مساءً|ليلا|ليلاً|بليل|بالليل|am|pm)/i);
    }
    if (!timeMatch) {
        if (str.includes('عصر') || str.includes('عصراً') || str.includes('العصر'))
            return { hours: 16, minutes: 0 };
        if (str.includes('عشاء') || str.includes('العشاء') || str.includes('عشا') || str.includes('العشا'))
            return { hours: 20, minutes: 30 };
        if (isPM)
            return { hours: 20, minutes: 0 };
        if (isAM)
            return { hours: 10, minutes: 0 };
        return null;
    }
    var h = parseInt(timeMatch[1], 10);
    var m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    if (isPM && h < 12)
        h += 12;
    if (isAM && h === 12)
        h = 0;
    if (!isAM && !isPM && h >= 1 && h <= 6)
        h += 12;
    return { hours: h, minutes: m };
}
/**
 * Parses relative and absolute Arabic / International date and time strings into a valid JS Date.
 */
function parseDateTime(rawInput) {
    var now = new Date();
    if (!rawInput || !rawInput.trim()) {
        var fallback_1 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        return { date: fallback_1, raw: 'بعد 24 ساعة (افتراضي)' };
    }
    // Normalize eastern Arabic numerals and map "كمان" to "بعد"
    var clean = normalizeArabicDigits(rawInput.trim().toLowerCase());
    clean = clean.replace(/كمان/g, 'بعد');
    // 1. Past dates: "اول امبارح" / "أول أمس" / "امبارح" / "أمس"
    if (clean.includes('اول امبارح') || clean.includes('أول امبارح') || clean.includes('اول امس') || clean.includes('أول أمس') || clean.includes('قبل امس') || clean.includes('قبل أمس')) {
        var target = new Date(now);
        target.setDate(target.getDate() - 2);
        var t = extractTimeHoursMinutes(clean);
        target.setHours(t ? t.hours : 12, t ? t.minutes : 0, 0, 0);
        return { date: target, raw: rawInput };
    }
    if (clean.includes('امبارح') || clean.includes('أمس') || clean.includes('امس')) {
        var target = new Date(now);
        target.setDate(target.getDate() - 1);
        var t = extractTimeHoursMinutes(clean);
        target.setHours(t ? t.hours : 12, t ? t.minutes : 0, 0, 0);
        return { date: target, raw: rawInput };
    }
    // 2. Relative minutes & hours: "بعد ربع ساعة", "بعد نص ساعة", "بعد ساعتين", "بعد 3 ساعات"
    if (clean.includes('ربع ساعة') || clean.includes('15 دقيقة')) {
        return { date: new Date(now.getTime() + 15 * 60 * 1000), raw: rawInput };
    }
    if (clean.includes('ثلث ساعة') || clean.includes('20 دقيقة')) {
        return { date: new Date(now.getTime() + 20 * 60 * 1000), raw: rawInput };
    }
    if (clean.includes('نصف ساعة') || clean.includes('نص ساعة') || clean.includes('30 دقيقة')) {
        return { date: new Date(now.getTime() + 30 * 60 * 1000), raw: rawInput };
    }
    var minuteMatch = clean.match(/بعد\s+(\d+|تلات|تلاتة|ثلاث|ثلاثة|اربع|اربعة|أربع|أربعة|خمس|خمسة|عشر|عشرة)\s*(دقيقة|دقايق|دقائق)/);
    if (minuteMatch) {
        var mins = wordToNumber[minuteMatch[1]] || parseInt(minuteMatch[1], 10);
        return { date: new Date(now.getTime() + mins * 60 * 1000), raw: rawInput };
    }
    if (clean === 'بعد ساعة' || clean.includes('بعد ساعه') || clean.includes('بعد ساعه واحده')) {
        return { date: new Date(now.getTime() + 60 * 60 * 1000), raw: rawInput };
    }
    if (clean.includes('بعد ساعتين')) {
        return { date: new Date(now.getTime() + 2 * 60 * 60 * 1000), raw: rawInput };
    }
    var hourMatch = clean.match(/بعد\s+(\d+|تلات|تلاتة|ثلاث|ثلاثة|اربع|اربعة|أربع|أربعة|خمس|خمسة|ست|ستة|سبع|سبعة|تمن|تمانية|ثمان|ثمانية|تسع|تسعة|عشر|عشرة)\s*(ساعات|ساعة|ساعه)/);
    if (hourMatch) {
        var hours = wordToNumber[hourMatch[1]] || parseInt(hourMatch[1], 10);
        return { date: new Date(now.getTime() + hours * 60 * 60 * 1000), raw: rawInput };
    }
    // 3. Relative Days: "بعد يوم", "بعد يومين", "بعد 3 أيام", "بعد تلات أيام"
    if (clean.includes('بعد يومين')) {
        var target = new Date(now);
        target.setDate(target.getDate() + 2);
        var t = extractTimeHoursMinutes(clean);
        target.setHours(t ? t.hours : 10, t ? t.minutes : 0, 0, 0);
        return { date: target, raw: rawInput };
    }
    if (clean.includes('بعد يوم') || clean.includes('بعد يوم واحد')) {
        var target = new Date(now);
        target.setDate(target.getDate() + 1);
        var t = extractTimeHoursMinutes(clean);
        target.setHours(t ? t.hours : 10, t ? t.minutes : 0, 0, 0);
        return { date: target, raw: rawInput };
    }
    var dayMatch = clean.match(/بعد\s+(\d+|تلات|تلاتة|ثلاث|ثلاثة|اربع|اربعة|أربع|أربعة|خمس|خمسة|ست|ستة|سبع|سبعة|تمن|تمانية|ثمان|ثمانية|تسع|تسعة|عشر|عشرة)\s*(أيام|ايام|يوم)/);
    if (dayMatch) {
        var days = wordToNumber[dayMatch[1]] || parseInt(dayMatch[1], 10);
        var target = new Date(now);
        target.setDate(target.getDate() + days);
        var t = extractTimeHoursMinutes(clean);
        target.setHours(t ? t.hours : 10, t ? t.minutes : 0, 0, 0);
        return { date: target, raw: rawInput };
    }
    // 4. "بعد بكرة" / "بعد غد"
    if (clean.includes('بعد غد') || clean.includes('بعد بكرة') || clean.includes('بعد بكره')) {
        var target = new Date(now);
        target.setDate(target.getDate() + 2);
        var t = extractTimeHoursMinutes(clean);
        target.setHours(t ? t.hours : 10, t ? t.minutes : 0, 0, 0);
        return { date: target, raw: rawInput };
    }
    // 5. "بكرة" / "غداً"
    if (clean.includes('غدا') || clean.includes('غداً') || clean.includes('بكرة') || clean.includes('بكره')) {
        var target = new Date(now);
        target.setDate(target.getDate() + 1);
        var t = extractTimeHoursMinutes(clean);
        target.setHours(t ? t.hours : 10, t ? t.minutes : 0, 0, 0);
        return { date: target, raw: rawInput };
    }
    // 6. "النهاردة" / "اليوم"
    if (clean.includes('اليوم') || clean.includes('النهاردة') || clean.includes('النهارده')) {
        var target = new Date(now);
        var t = extractTimeHoursMinutes(clean);
        if (t) {
            target.setHours(t.hours, t.minutes, 0, 0);
            if (target.getTime() <= now.getTime()) {
                target.setDate(target.getDate() + 1);
            }
            return { date: target, raw: rawInput };
        }
    }
    // 7. Week phrases: "أول الأسبوع الجاي", "الأسبوع الجاي", "خلال الأسبوع الجاي", "خلال الأسبوع", "نهاية الأسبوع"
    if (clean.includes('اول الاسبوع الجاي') || clean.includes('أول الأسبوع الجاي') || clean.includes('اول الاسبوع القادم') || clean.includes('أول الأسبوع القادم')) {
        var target = new Date(now);
        var currentDay = target.getDay(); // 0 is Sunday
        var daysUntilNextSunday = (7 - currentDay) % 7 === 0 ? 7 : (7 - currentDay);
        target.setDate(target.getDate() + daysUntilNextSunday);
        var t = extractTimeHoursMinutes(clean);
        target.setHours(t ? t.hours : 10, t ? t.minutes : 0, 0, 0);
        return { date: target, raw: rawInput };
    }
    if (clean.includes('خلال الاسبوع الجاي') || clean.includes('خلال الأسبوع الجاي') || clean.includes('خلال الاسبوع القادم') || clean.includes('خلال الأسبوع القادم')) {
        // Next Wednesday 12:00 PM
        var target = new Date(now);
        var currentDay = target.getDay();
        var daysUntilNextSunday = (7 - currentDay) % 7 === 0 ? 7 : (7 - currentDay);
        target.setDate(target.getDate() + daysUntilNextSunday + 3);
        target.setHours(12, 0, 0, 0);
        return { date: target, raw: rawInput };
    }
    if (clean.includes('خلال الاسبوع') || clean.includes('خلال الأسبوع')) {
        // 3 days from now at 12:00 PM
        var target = new Date(now);
        target.setDate(target.getDate() + 3);
        target.setHours(12, 0, 0, 0);
        return { date: target, raw: rawInput };
    }
    if (clean.includes('اخر الاسبوع') || clean.includes('آخر الأسبوع') || clean.includes('نهاية الاسبوع') || clean.includes('نهاية الأسبوع')) {
        // Next Thursday at 14:00
        var target = new Date(now);
        var currentDay = target.getDay();
        var daysUntilThursday = (4 - currentDay + 7) % 7 || 7;
        target.setDate(target.getDate() + daysUntilThursday);
        target.setHours(14, 0, 0, 0);
        return { date: target, raw: rawInput };
    }
    if (clean.includes('بعد اسبوعين') || clean.includes('بعد أسبوعين')) {
        var target = new Date(now);
        target.setDate(target.getDate() + 14);
        var t = extractTimeHoursMinutes(clean);
        target.setHours(t ? t.hours : 10, t ? t.minutes : 0, 0, 0);
        return { date: target, raw: rawInput };
    }
    if (clean.includes('بعد اسبوع') || clean.includes('بعد أسبوع') || clean.includes('الاسبوع الجاي') || clean.includes('الأسبوع الجاي') || clean.includes('الاسبوع القادم') || clean.includes('الأسبوع القادم')) {
        var target = new Date(now);
        target.setDate(target.getDate() + 7);
        var t = extractTimeHoursMinutes(clean);
        target.setHours(t ? t.hours : 10, t ? t.minutes : 0, 0, 0);
        return { date: target, raw: rawInput };
    }
    // 8. Month phrases: "أول الشهر الجاي", "الشهر الجاي", "خلال الشهر الجاي", "خلال الشهر", "آخر الشهر"
    if (clean.includes('اول الشهر الجاي') || clean.includes('أول الشهر الجاي') || clean.includes('اول الشهر القادم') || clean.includes('أول الشهر القادم')) {
        var target = new Date(now.getFullYear(), now.getMonth() + 1, 1, 10, 0, 0);
        var t = extractTimeHoursMinutes(clean);
        if (t)
            target.setHours(t.hours, t.minutes, 0, 0);
        return { date: target, raw: rawInput };
    }
    if (clean.includes('خلال الشهر الجاي') || clean.includes('خلال الشهر القادم')) {
        var target = new Date(now.getFullYear(), now.getMonth() + 1, 15, 12, 0, 0);
        return { date: target, raw: rawInput };
    }
    if (clean.includes('خلال الشهر')) {
        var target = new Date(now);
        target.setDate(target.getDate() + 14);
        target.setHours(12, 0, 0, 0);
        return { date: target, raw: rawInput };
    }
    if (clean.includes('اخر الشهر') || clean.includes('آخر الشهر') || clean.includes('نهاية الشهر')) {
        var target = new Date(now.getFullYear(), now.getMonth() + 1, 0, 14, 0, 0);
        return { date: target, raw: rawInput };
    }
    if (clean.includes('بعد شهرين')) {
        var target = new Date(now);
        target.setMonth(target.getMonth() + 2);
        var t = extractTimeHoursMinutes(clean);
        target.setHours(t ? t.hours : 10, t ? t.minutes : 0, 0, 0);
        return { date: target, raw: rawInput };
    }
    if (clean.includes('بعد شهر') || clean.includes('الشهر الجاي') || clean.includes('الشهر القادم')) {
        var target = new Date(now);
        target.setMonth(target.getMonth() + 1);
        var t = extractTimeHoursMinutes(clean);
        target.setHours(t ? t.hours : 10, t ? t.minutes : 0, 0, 0);
        return { date: target, raw: rawInput };
    }
    // 9. Day of week: "يوم الأحد", "يوم التلات", "السبت الجاي"
    for (var _i = 0, _a = Object.entries(weekdays); _i < _a.length; _i++) {
        var _b = _a[_i], dayName = _b[0], dayIndex = _b[1];
        if (clean.includes("\u064A\u0648\u0645 ".concat(dayName)) || clean.includes("".concat(dayName, " \u0627\u0644\u062C\u0627\u064A")) || clean.includes("".concat(dayName, " \u0627\u0644\u0642\u0627\u062F\u0645"))) {
            var target = new Date(now);
            var currentDay = target.getDay();
            var diff = (dayIndex - currentDay + 7) % 7 || 7;
            target.setDate(target.getDate() + diff);
            var t = extractTimeHoursMinutes(clean);
            target.setHours(t ? t.hours : 10, t ? t.minutes : 0, 0, 0);
            return { date: target, raw: rawInput };
        }
    }
    // 10. Explicit Named Month: "يوم 15 نوفمبر", "15 نوفمبر الساعة 4 عصراً", "10 أكتوبر"
    var monthNamesPattern = Object.keys(arabicMonths).join('|');
    var namedDateRegex = new RegExp("(?:\u064A\u0648\u0645\\s+)?(\\d{1,2})\\s*(?:\u0645\u0646\\s+)?(".concat(monthNamesPattern, ")(?:\\s+(\\d{4}))?"), 'i');
    var namedMatch = clean.match(namedDateRegex);
    if (namedMatch) {
        var day = parseInt(namedMatch[1], 10);
        var month = arabicMonths[namedMatch[2]];
        var year = namedMatch[3] ? parseInt(namedMatch[3], 10) : now.getFullYear();
        var target = new Date(year, month, day);
        if (!namedMatch[3] && target.getTime() < now.getTime()) {
            target.setFullYear(year + 1);
        }
        var t = extractTimeHoursMinutes(clean);
        target.setHours(t ? t.hours : 10, t ? t.minutes : 0, 0, 0);
        return { date: target, raw: rawInput };
    }
    // 11. Numeric date formats (YYYY-MM-DD or DD/MM/YYYY)
    var dmyMatch = clean.match(/(\d{1,2})[-\/](\d{1,2})(?:[-\/](\d{4}))?/);
    if (dmyMatch) {
        var day = parseInt(dmyMatch[1], 10);
        var month = parseInt(dmyMatch[2], 10) - 1;
        var year = dmyMatch[3] ? parseInt(dmyMatch[3], 10) : now.getFullYear();
        var target = new Date(year, month, day);
        if (!dmyMatch[3] && target.getTime() < now.getTime()) {
            target.setFullYear(year + 1);
        }
        var t = extractTimeHoursMinutes(clean);
        target.setHours(t ? t.hours : 10, t ? t.minutes : 0, 0, 0);
        return { date: target, raw: rawInput };
    }
    // 12. Pure Time today/tomorrow
    var tOnly = extractTimeHoursMinutes(clean);
    if (tOnly) {
        var target = new Date(now);
        target.setHours(tOnly.hours, tOnly.minutes, 0, 0);
        if (target.getTime() <= now.getTime()) {
            target.setDate(target.getDate() + 1);
        }
        return { date: target, raw: rawInput };
    }
    // Fallback: 24 hours from now
    var fallback = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return { date: fallback, raw: rawInput };
}
/**
 * Extracts phone numbers from text or quoted message banners.
 */
function extractClientPhoneNumber(text, quotedContext) {
    // 1. Check explicit "العميل: 010..." or "الرقم: 010..." in the text itself
    var explicitMatch = text.match(/(?:العميل|الرقم|الهاتف|رقم|هاتف|client|phone)[\s:]*([+\d\s\-\(\)]{8,20})/i);
    if (explicitMatch && explicitMatch[1]) {
        var val = (0, phone_validator_1.validateAndFormatPhone)(explicitMatch[1]);
        if (val.isValid && val.formatted)
            return val.formatted;
        var digits = explicitMatch[1].replace(/\D/g, '');
        if (digits.length >= 8)
            return digits;
    }
    // 2. Check quoted message context
    if (quotedContext) {
        // Look for wa.me link: https://wa.me/201012345678
        var waLinkMatch = quotedContext.match(/wa\.me\/(\d{8,16})/);
        if (waLinkMatch && waLinkMatch[1]) {
            var val = (0, phone_validator_1.validateAndFormatPhone)(waLinkMatch[1]);
            return val.formatted || waLinkMatch[1];
        }
        // Look for "رقم العميل: +20..."
        var quotedPhoneMatch = quotedContext.match(/(?:رقم العميل|العميل)[\s:*]*([+\d\s\-]{8,20})/);
        if (quotedPhoneMatch && quotedPhoneMatch[1]) {
            var val = (0, phone_validator_1.validateAndFormatPhone)(quotedPhoneMatch[1]);
            if (val.isValid && val.formatted)
                return val.formatted;
        }
        // Generic international phone pattern in quote (+20... or +966...)
        var genericPhone = quotedContext.match(/\+?\d{10,15}/);
        if (genericPhone && genericPhone[0]) {
            var val = (0, phone_validator_1.validateAndFormatPhone)(genericPhone[0]);
            if (val.isValid && val.formatted)
                return val.formatted;
        }
    }
    return undefined;
}
/**
 * Main parser that translates structured or natural language reminder commands into a unified payload.
 */
function parseReminderCommand(messageText, quotedContext) {
    if (!isReminderMessage(messageText, Boolean(quotedContext))) {
        return null;
    }
    // Pre-normalize inline keywords (e.g. if the user typed everything on one line without newlines)
    // Insert a newline before template keywords like "العنوان:", "الموعد:", "التفاصيل:", "العميل:"
    var normalizedText = messageText;
    var keywordPattern = /\s+(?=(?:العنوان|الموضوع|عنوان|title|الموعد|التاريخ|الوقت|تاريخ|وقت|due|date|time|التفاصيل|الملاحظة|ملاحظة|تفاصيل|الملاحظه|ملاحظه|note|details|العميل|الرقم|الهاتف|رقم|هاتف|client|phone)\s*[:：])/gi;
    normalizedText = normalizedText.replace(keywordPattern, '\n');
    var rawLines = normalizedText.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    var title = '';
    var dueAtText = '';
    var noteText = '';
    var clientPhone;
    // 1. Key-Value Formatted Template Parsing
    for (var _i = 0, rawLines_1 = rawLines; _i < rawLines_1.length; _i++) {
        var line = rawLines_1[_i];
        var cleanLine = line;
        // Strip any reminder command prefixes from beginning of line (e.g. #تذكير العنوان: ...)
        for (var _a = 0, REMINDER_PREFIXES_2 = REMINDER_PREFIXES; _a < REMINDER_PREFIXES_2.length; _a++) {
            var prefix = REMINDER_PREFIXES_2[_a];
            if (cleanLine.toLowerCase().startsWith(prefix.toLowerCase())) {
                cleanLine = cleanLine.slice(prefix.length);
                break;
            }
        }
        cleanLine = cleanLine.replace(/^[#*_\-\s:]+/, '').trim();
        if (/^(العنوان|الموضوع|عنوان|title)\s*[:：]+/i.test(cleanLine)) {
            title = cleanLine.replace(/^(العنوان|الموضوع|عنوان|title)\s*[:：]+/i, '').trim();
        }
        else if (/^(الموعد|التاريخ|الوقت|تاريخ|وقت|due|date|time)\s*[:：]+/i.test(cleanLine)) {
            dueAtText = cleanLine.replace(/^(الموعد|التاريخ|الوقت|تاريخ|وقت|due|date|time)\s*[:：]+/i, '').trim();
        }
        else if (/^(التفاصيل|الملاحظة|ملاحظة|تفاصيل|الملاحظه|ملاحظه|note|details)\s*[:：]+/i.test(cleanLine)) {
            noteText = cleanLine.replace(/^(التفاصيل|الملاحظة|ملاحظة|تفاصيل|الملاحظه|ملاحظه|note|details)\s*[:：]+/i, '').trim();
        }
        else if (/^(العميل|الرقم|الهاتف|رقم|هاتف|client|phone)\s*[:：]+/i.test(cleanLine)) {
            var p = cleanLine.replace(/^(العميل|الرقم|الهاتف|رقم|هاتف|client|phone)\s*[:：]+/i, '').trim();
            var val = (0, phone_validator_1.validateAndFormatPhone)(p);
            if (val.isValid && val.formatted) {
                clientPhone = val.formatted;
            }
            else {
                var digits = p.replace(/\D/g, '');
                if (digits.length >= 8) {
                    clientPhone = digits;
                }
            }
        }
    }
    // 2. If title wasn't found in key-value format, extract from first line
    if (!title && rawLines.length > 0) {
        var firstLine = rawLines[0];
        // Remove trigger word
        var stripped = firstLine;
        for (var _b = 0, REMINDER_PREFIXES_3 = REMINDER_PREFIXES; _b < REMINDER_PREFIXES_3.length; _b++) {
            var prefix = REMINDER_PREFIXES_3[_b];
            if (stripped.toLowerCase().startsWith(prefix.toLowerCase())) {
                stripped = stripped.slice(prefix.length).trim();
                break;
            }
        }
        stripped = stripped.replace(/^[\s:\-_]+/, '').trim();
        // Check if first line contains dash separator: "غداً 3 عصراً - متابعة العرض"
        if (stripped.includes('-')) {
            var parts = stripped.split('-');
            if (!dueAtText && parts.length >= 2) {
                dueAtText = parts[0].trim();
                title = parts.slice(1).join('-').trim();
            }
            else {
                title = stripped;
            }
        }
        else if (!dueAtText && /^(بعد\s+|غدا|غداً|بكرة|بكره|اليوم)/.test(stripped)) {
            // Natural language time without dash, e.g. "#تذكير بعد ساعتين" or "#تذكير غداً 4 عصراً"
            dueAtText = stripped;
            title = 'تذكير متابعة';
        }
        else {
            title = stripped;
        }
    }
    // If subsequent lines were not key-value, treat them as details / note
    if (!noteText && rawLines.length > 1) {
        var restLines = rawLines.slice(1).filter(function (l) {
            var isKv = /^(العنوان|الموعد|التاريخ|الوقت|العميل|الرقم|الهاتف)[\s:]+/i.test(l.replace(/^[#*_\-\s]+/, ''));
            return !isKv;
        });
        if (restLines.length > 0) {
            noteText = restLines.join('\n');
        }
    }
    // Fallback title if empty
    if (!title) {
        title = noteText ? noteText.slice(0, 50) : 'تذكير متابعة';
    }
    // Extract client phone if not yet resolved
    if (!clientPhone) {
        clientPhone = extractClientPhoneNumber(messageText, quotedContext);
    }
    // Parse due date
    var _c = parseDateTime(dueAtText), dueAt = _c.date, parsedRawDue = _c.raw;
    return {
        isReminder: true,
        title: title,
        note: noteText || undefined,
        dueAt: dueAt,
        rawDueAtText: dueAtText || parsedRawDue,
        clientPhone: clientPhone,
    };
}
