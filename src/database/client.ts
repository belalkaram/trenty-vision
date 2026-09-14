import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from '../config/index';
import * as schema from './schema/index';
import { logger } from '../utils/logger';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl:
    config.DATABASE_URL.includes('neon.tech') ||
    config.DATABASE_URL.includes('supabase.co') ||
    config.DATABASE_URL.includes('supabase.com') ||
    config.DATABASE_URL.includes('sslmode=require') ||
    config.DATABASE_URL.includes('ssl=true') ||
    (process.env.NODE_ENV === 'production' && !config.DATABASE_URL.includes('localhost'))
      ? { rejectUnauthorized: false }
      : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected PostgreSQL pool error');
});

export const db = drizzle(pool, { schema });
