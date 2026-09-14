import { pool } from './client';

async function run() {
  try {
    await pool.query(`
      ALTER TABLE "whatsapp_accounts" ADD COLUMN IF NOT EXISTS "is_primary_dispatcher" boolean DEFAULT false NOT NULL;
      ALTER TABLE "whatsapp_accounts" ADD COLUMN IF NOT EXISTS "dispatcher_slot" integer;
    `);
    console.log('MIGRATION_0003_SUCCESS');
  } catch (err) {
    console.error('MIGRATION_0003_ERROR:', err);
  } finally {
    await pool.end();
  }
}

run();
