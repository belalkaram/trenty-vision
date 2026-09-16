import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DEPLOYMENT_MODE: z.enum(['local', 'online']).default('local'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  APP_URL: z.string().default('http://localhost:3000'),

  DATABASE_URL: z
    .string()
    .default(
      'postgresql://neondb_owner:npg_AitEcqvL8d0T@ep-curly-mud-b24t81iw-pooler.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require'
    ),

  JWT_ACCESS_SECRET: z.string().min(16).default('kenooz_jwt_access_secret_super_secure_key_2026_xyz!'),
  JWT_REFRESH_SECRET: z.string().min(16).default('kenooz_jwt_refresh_secret_super_secure_key_2026_abc!'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('365d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('365d'),

  ENCRYPTION_KEY: z.string().length(64).default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  COOKIE_SECRET: z.string().min(16).default('kenooz_cookie_secret_super_long_random_string_2026'),

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
  console.warn('Environment variables validation warnings:', parsed.error.format());
}

export const config = parsed.success ? parsed.data : envSchema.parse({});
export type Config = z.infer<typeof envSchema>;
