import { eq, like } from 'drizzle-orm';
import { db } from './src/database/client';
import { contacts } from './src/database/schema';

async function run() {
  const res = await db.select().from(contacts).where(like(contacts.phoneNumber, '%201019033661%'));
  console.log('Found:', res.length);
  console.log(res);
  process.exit(0);
}
run();
