/**
 * Unified Phone Number Validator & E.164 Formatter
 * Handles national numbers, country codes, trunk-0 stripping, and WhatsApp JID formatting.
 */

export interface PhoneValidationResult {
  isValid: boolean;
  formatted: string; // E.164 format with leading + (e.g. +966501234567, +201012345678)
  e164: string; // Direct E.164 alias for formatted
  digitsOnly: string; // Digits only without + (e.g. 966501234567)
  whatsappJid: string; // Standard WhatsApp JID (e.g. 966501234567@s.whatsapp.net)
  nationalNumber: string; // Local number without country code
  countryCode: string;
  countryName: string;
  error?: string;
}

export const KNOWN_COUNTRY_CODES = [
  { code: '966', country: 'السعودية', flag: '🇸🇦', localLen: 9, localPrefixes: ['5'] },
  { code: '20', country: 'مصر', flag: '🇪🇬', localLen: 10, localPrefixes: ['10', '11', '12', '15'] },
  { code: '965', country: 'الكويت', flag: '🇰🇼', localLen: 8, localPrefixes: ['5', '6', '9'] },
  { code: '971', country: 'الإمارات', flag: '🇦🇪', localLen: 9, localPrefixes: ['5'] },
  { code: '974', country: 'قطر', flag: '🇶🇦', localLen: 8, localPrefixes: ['3', '5', '6', '7'] },
  { code: '968', country: 'عُمان', flag: '🇴🇲', localLen: 8, localPrefixes: ['7', '9'] },
  { code: '973', country: 'البحرين', flag: '🇧🇭', localLen: 8, localPrefixes: ['3', '6'] },
  { code: '962', country: 'الأردن', flag: '🇯🇴', localLen: 9, localPrefixes: ['7'] },
  { code: '964', country: 'العراق', flag: '🇮🇶', localLen: 10, localPrefixes: ['7'] },
];

/**
 * Intelligently normalizes and formats any phone number
 */
export function validateAndFormatPhone(
  rawInput: string,
  defaultCountryCode = '966'
): PhoneValidationResult {
  if (!rawInput || typeof rawInput !== 'string') {
    return {
      isValid: false,
      formatted: '',
      e164: '',
      digitsOnly: '',
      whatsappJid: '',
      nationalNumber: '',
      countryCode: '',
      countryName: '',
      error: 'يرجى إدخال رقم الهاتف.',
    };
  }

  // 1. Remove all spaces, dashes, dots, parentheses, brackets
  let cleaned = rawInput.trim().replace(/[\s\-\(\)\.\[\]]/g, '');

  // 2. Normalize leading double zeros (00 -> +)
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  const hasPlus = cleaned.startsWith('+');
  let digits = cleaned.replace(/\D/g, '');

  if (!digits || digits.length < 7) {
    return {
      isValid: false,
      formatted: cleaned,
      e164: cleaned,
      digitsOnly: digits,
      whatsappJid: '',
      nationalNumber: digits,
      countryCode: '',
      countryName: '',
      error: 'رقم الهاتف قصير جداً وغير صالح.',
    };
  }

  let matchedCountry = KNOWN_COUNTRY_CODES.find((c) => digits.startsWith(c.code));

  // 3. Handle numbers that had a country code but also included the national trunk zero
  // E.g. 9660501234567 -> 966501234567, 2001012345678 -> 201012345678
  if (matchedCountry) {
    const afterCode = digits.slice(matchedCountry.code.length);
    if (afterCode.startsWith('0')) {
      digits = matchedCountry.code + afterCode.replace(/^0+/, '');
    }
  } else if (hasPlus) {
    // Has plus but unknown country code; strip accidental double zeros
    digits = digits.replace(/^0+/, '');
  } else {
    // 4. No country code prefix matched and no plus prefix
    // Check if it's a local number starting with 0
    if (digits.startsWith('0')) {
      const withoutZero = digits.slice(1);
      // Try to auto-detect country from known prefixes
      if (withoutZero.startsWith('5') && withoutZero.length === 9) {
        // Saudi Arabia local mobile: 05XXXXXXXX
        digits = '966' + withoutZero;
        matchedCountry = KNOWN_COUNTRY_CODES.find((c) => c.code === '966');
      } else if ((withoutZero.startsWith('10') || withoutZero.startsWith('11') || withoutZero.startsWith('12') || withoutZero.startsWith('15')) && withoutZero.length === 10) {
        // Egypt local mobile: 010..., 011..., 012..., 015...
        digits = '20' + withoutZero;
        matchedCountry = KNOWN_COUNTRY_CODES.find((c) => c.code === '20');
      } else if (defaultCountryCode) {
        digits = defaultCountryCode.replace(/\D/g, '') + withoutZero;
        matchedCountry = KNOWN_COUNTRY_CODES.find((c) => c.code === defaultCountryCode);
      }
    } else {
      // Local number without 0, e.g. 501234567 or 1012345678
      if (digits.startsWith('5') && digits.length === 9) {
        digits = '966' + digits;
        matchedCountry = KNOWN_COUNTRY_CODES.find((c) => c.code === '966');
      } else if ((digits.startsWith('10') || digits.startsWith('11') || digits.startsWith('12') || digits.startsWith('15')) && digits.length === 10) {
        digits = '20' + digits;
        matchedCountry = KNOWN_COUNTRY_CODES.find((c) => c.code === '20');
      } else if (defaultCountryCode) {
        digits = defaultCountryCode.replace(/\D/g, '') + digits;
        matchedCountry = KNOWN_COUNTRY_CODES.find((c) => c.code === defaultCountryCode);
      }
    }
  }

  // Re-detect country code if it was changed
  if (!matchedCountry) {
    matchedCountry = KNOWN_COUNTRY_CODES.find((c) => digits.startsWith(c.code));
  }

  if (digits.length > 15) {
    return {
      isValid: false,
      formatted: `+${digits}`,
      e164: `+${digits}`,
      digitsOnly: digits,
      whatsappJid: `${digits}@s.whatsapp.net`,
      nationalNumber: digits,
      countryCode: matchedCountry?.code || '',
      countryName: matchedCountry?.country || 'دولي',
      error: 'رقم الهاتف يتجاوز الحد الأقصى للأرقام الدولية (15 رقماً وفقاً للمعيار الدولي E.164).',
    };
  }

  const countryCode = matchedCountry?.code || '';
  const nationalNumber = countryCode ? digits.slice(countryCode.length) : digits;

  return {
    isValid: true,
    formatted: `+${digits}`,
    e164: `+${digits}`,
    digitsOnly: digits,
    whatsappJid: `${digits}@s.whatsapp.net`,
    nationalNumber,
    countryCode,
    countryName: matchedCountry ? `${matchedCountry.country} ${matchedCountry.flag}` : 'دولي 🌐',
  };
}

/**
 * Normalizes any phone number into canonical E.164 (+<country><number>)
 */
export function normalizePhoneNumber(rawInput: string, defaultCountryCode = '966'): string {
  const result = validateAndFormatPhone(rawInput, defaultCountryCode);
  return result.isValid ? result.formatted : rawInput.trim();
}

/**
 * Extracts pure digits from phone number for WhatsApp JID or comparison
 */
export function getCleanDigits(rawInput: string): string {
  const result = validateAndFormatPhone(rawInput);
  return result.digitsOnly || rawInput.replace(/\D/g, '');
}
