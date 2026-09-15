"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
var dotenv_1 = require("dotenv");
var zod_1 = require("zod");
dotenv_1.default.config();
var envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    DEPLOYMENT_MODE: zod_1.z.enum(['local', 'online']).default('local'),
    PORT: zod_1.z.coerce.number().default(3000),
    HOST: zod_1.z.string().default('0.0.0.0'),
    APP_URL: zod_1.z.string().default('http://localhost:3000'),
    DATABASE_URL: zod_1.z
        .string()
        .default('postgresql://neondb_owner:npg_AitEcqvL8d0T@ep-curly-mud-b24t81iw-pooler.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require'),
    JWT_ACCESS_SECRET: zod_1.z.string().min(16).default('kenooz_jwt_access_secret_super_secure_key_2026_xyz!'),
    JWT_REFRESH_SECRET: zod_1.z.string().min(16).default('kenooz_jwt_refresh_secret_super_secure_key_2026_abc!'),
    JWT_ACCESS_EXPIRES_IN: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('7d'),
    ENCRYPTION_KEY: zod_1.z.string().length(64).default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
    COOKIE_SECRET: zod_1.z.string().min(16).default('kenooz_cookie_secret_super_long_random_string_2026'),
    DEFAULT_COMPANY_NAME: zod_1.z.string().default('Trenty Vision'),
    DEFAULT_TIMEZONE: zod_1.z.string().default('Asia/Kuwait'),
    STORAGE_DRIVER: zod_1.z.enum(['local', 'r2']).default('local'),
    STORAGE_LOCAL_PATH: zod_1.z.string().default('./storage/uploads'),
    LOG_LEVEL: zod_1.z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    LANDING_SYNC_ENABLED: zod_1.z
        .string()
        .transform(function (v) { return v === 'true'; })
        .or(zod_1.z.boolean())
        .default(true),
    LANDING_SYNC_URL: zod_1.z
        .string()
        .url()
        .default('https://trintyvision.com/landing/api/submit.php'),
});
var parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.warn('Environment variables validation warnings:', parsed.error.format());
}
exports.config = parsed.success ? parsed.data : envSchema.parse({});
