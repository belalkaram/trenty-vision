import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from '../config/index';
import * as schema from './schema/index';
import { logger } from '../utils/logger';

const { Pool } = pg;

// Sanitize DATABASE_URL: node-postgres (pg) does not support channel_binding
const sanitizedDatabaseUrl = config.DATABASE_URL.replace(/[?&]channel_binding=[^&]+/g, (match) =>
  match.startsWith('?') ? '?' : ''
).replace(/\?$/, '');

export const pool = new Pool({
  connectionString: sanitizedDatabaseUrl,
  ssl:
    sanitizedDatabaseUrl.includes('neon.tech') ||
    sanitizedDatabaseUrl.includes('supabase.co') ||
    sanitizedDatabaseUrl.includes('supabase.com') ||
    sanitizedDatabaseUrl.includes('sslmode=require') ||
    sanitizedDatabaseUrl.includes('ssl=true') ||
    (process.env.NODE_ENV === 'production' && !sanitizedDatabaseUrl.includes('localhost'))
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
