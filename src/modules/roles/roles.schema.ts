import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(2).max(50).regex(/^[a-z0-9_]+$/, 'Name must be lowercase alphanumeric with underscores'),
  displayName: z.string().min(2).max(100),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1, 'At least one permission must be assigned'),
});

export const updateRoleSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
