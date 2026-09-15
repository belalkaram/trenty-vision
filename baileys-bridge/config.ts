import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

// Load .env from current working directory or relative directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
if (!process.env.DATABASE_URL) {
  try {
    dotenv.config({ path: path.resolve(__dirname, '../.env') });
  } catch (_) {}
}

const bridgeConfigSchema = z.object({
  DATABASE_URL: z.string().url(),
  ENCRYPTION_KEY: z.string().length(64).default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  BRIDGE_PORT: z.coerce.number().default(3001),
  BRIDGE_HOST: z.string().default('0.0.0.0'),
  BRIDGE_ID: z.string().default('bridge_main'),
  COMPANY_ID: z.string().uuid().optional(),
  OUTBOUND_POLL_INTERVAL_MS: z.coerce.number().default(2000),
  COMMAND_POLL_INTERVAL_MS: z.coerce.number().default(2000),
  HEARTBEAT_INTERVAL_MS: z.coerce.number().default(15000),
});

const parsed = bridgeConfigSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid Bridge configuration:', parsed.error.format());
  throw new Error('Invalid Bridge configuration');
}

export const bridgeConfig = parsed.data;
export type BridgeConfig = z.infer<typeof bridgeConfigSchema>;
