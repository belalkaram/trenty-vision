import { z } from 'zod';

const emptyToNull = (val: any) => (val === '' || val === undefined ? null : val);

export const createStationSchema = z.object({
  name: z.string().min(2).max(150),
  departmentId: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  description: z.preprocess(emptyToNull, z.string().nullable().optional()),
  code: z.preprocess(emptyToNull, z.string().nullable().optional()),
  color: z.string().optional().default('#1c9770'),
  maxCapacity: z.preprocess(emptyToNull, z.coerce.number().min(1).max(1000).nullable().optional()),
  routingWeight: z.coerce.number().min(1).max(50).optional().default(1),
  active: z.boolean().default(true),
  status: z.enum(['active', 'inactive']).optional(),
  employeeIds: z.array(z.string().uuid()).optional(),
}).transform((data) => {
  if (data.status !== undefined) {
    data.active = data.status === 'active';
  }
  return data;
});

export const updateStationSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  departmentId: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  description: z.preprocess(emptyToNull, z.string().nullable().optional()),
  code: z.preprocess(emptyToNull, z.string().nullable().optional()),
  color: z.string().optional(),
  maxCapacity: z.preprocess(emptyToNull, z.coerce.number().min(1).max(1000).nullable().optional()),
  routingWeight: z.coerce.number().min(1).max(50).optional(),
  active: z.boolean().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  employeeIds: z.array(z.string().uuid()).optional(),
}).transform((data) => {
  if (data.status !== undefined && data.active === undefined) {
    data.active = data.status === 'active';
  }
  return data;
});

export type CreateStationInput = z.infer<typeof createStationSchema>;
export type UpdateStationInput = z.infer<typeof updateStationSchema>;

