import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DEPLOYMENT_MODE: z.enum(['local', 'online']).default('local'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  APP_URL: z.string().default('http://localhost:3000'),

  DATABASE_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  ENCRYPTION_KEY: z.string().length(64), // 32 bytes in hex
  COOKIE_SECRET: z.string().min(16),

  DEFAULT_COMPANY_NAME: z.string().default('Trenty Vision'),
  DEFAULT_TIMEZONE: z.string().default('Asia/Kuwait'),

  STORAGE_DRIVER: z.enum(['local', 'r2']).default('local'),
  STORAGE_LOCAL_PATH: z.string().default('./storage/uploads'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  LANDING_SYNC_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .or(z.boolean())
    .default(true),
  LANDING_SYNC_URL: z
    .string()
    .url()
    .default('https://trintyvision.com/landing/api/submit.php'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  throw new Error('Invalid environment configuration');
}

export const config = parsed.data;
export type Config = z.infer<typeof envSchema>;
