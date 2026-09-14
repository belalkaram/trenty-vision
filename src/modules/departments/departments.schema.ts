import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z.string().min(2).max(150),
  code: z.string().optional(),
  description: z.string().optional(),
  active: z.boolean().default(true),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  active: z.boolean().optional(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
