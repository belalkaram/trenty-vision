import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './client';
import { logger } from '../utils/logger';

async function runMigrations() {
  logger.info('Starting database migrations...');
  try {
    await migrate(db, { migrationsFolder: './src/database/migrations' });
    logger.info('Database migrations applied successfully.');
  } catch (error) {
    logger.error({ error }, 'Database migration failed');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
