import { z } from 'zod';

export const updateSettingSchema = z.object({
  value: z.any(),
});

export const updateMultipleSettingsSchema = z.object({
  settings: z.record(z.any()),
});

export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;
export type UpdateMultipleSettingsInput = z.infer<typeof updateMultipleSettingsSchema>;
