import { z } from 'zod';

import { validateAndFormatPhone } from '../../utils/phone.validator';

const emptyToNull = (val: any) => (val === '' || val === undefined ? null : val);
const emptyToUndefined = (val: any) => (val === '' || val === null ? undefined : val);

export const createEmployeeSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  fullName: z.string().min(2).max(150).optional(),
  email: z.string().email(),
  password: z.string().min(6).optional().default('Password123!'),
  roleId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  departmentId: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  stationId: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  stationIds: z.array(z.string()).optional(),
  supervisorId: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  whatsappNumber: z.string().max(50).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  status: z.enum(['active', 'inactive', 'away', 'offline']).default('active'),
}).transform((data) => {
  const finalName = (data.name || data.fullName || '').trim();
  const rawPhone = (data.whatsappNumber || data.phone || '').trim();
  let normalizedPhone: string | null = null;
  if (rawPhone) {
    const val = validateAndFormatPhone(rawPhone);
    normalizedPhone = val.isValid ? val.formatted : rawPhone;
  }
  const finalStationId = data.stationId || (data.stationIds && data.stationIds.length > 0 ? data.stationIds[0] : null);

  return {
    ...data,
    name: finalName,
    whatsappNumber: normalizedPhone,
    phone: normalizedPhone,
    stationId: finalStationId,
  };
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  fullName: z.string().min(2).max(150).optional(),
  email: z.string().email().optional(),
  roleId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  departmentId: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  stationId: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  stationIds: z.array(z.string()).optional(),
  supervisorId: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  whatsappNumber: z.string().max(50).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  status: z.enum(['active', 'inactive', 'away', 'offline']).optional(),
}).transform((data) => {
  const transformed: Record<string, any> = { ...data };
  if (data.name || data.fullName) {
    transformed.name = (data.name || data.fullName || '').trim();
  }
  if (data.whatsappNumber !== undefined || data.phone !== undefined) {
    const raw = (data.whatsappNumber !== undefined ? data.whatsappNumber : data.phone) || '';
    if (raw && typeof raw === 'string' && raw.trim()) {
      const val = validateAndFormatPhone(raw.trim());
      transformed.whatsappNumber = val.isValid ? val.formatted : raw.trim();
      transformed.phone = transformed.whatsappNumber;
    } else {
      transformed.whatsappNumber = null;
      transformed.phone = null;
    }
  }
  if (data.stationId !== undefined || (data.stationIds && data.stationIds.length > 0)) {
    transformed.stationId = data.stationId || (data.stationIds && data.stationIds.length > 0 ? data.stationIds[0] : null);
  }
  return transformed;
});

export const updateEmployeeStatusSchema = z.object({
  status: z.enum(['active', 'inactive', 'away', 'offline']),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type UpdateEmployeeStatusInput = z.infer<typeof updateEmployeeStatusSchema>;
