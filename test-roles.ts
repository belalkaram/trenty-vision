import { db } from './src/database/client';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const roles = await db.execute(sql`SELECT * FROM roles`);
    console.log("ROLES:", roles.rows);
  } catch (err: any) {
    console.error("ERROR:", err.message);
  }
  process.exit(0);
}

run();
