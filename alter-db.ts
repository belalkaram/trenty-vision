import { db } from './src/database/client';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE`);
    console.log("Column added successfully.");
  } catch (err: any) {
    console.error("ERROR:", err.message);
  }
  process.exit(0);
}

run();
