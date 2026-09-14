import { db } from './src/database/client';
import { sql } from 'drizzle-orm';

async function run() {
  const contactIds = ['4f1f2e83-5f55-4531-9be6-c1a98c0042de'];
  const pgArrayLiteral = `{${contactIds.join(',')}}`;
  console.log("pgArrayLiteral:", pgArrayLiteral);
  
  try {
    const latestConversations = await db.execute(sql`
      SELECT DISTINCT ON (c.contact_id)
        c.contact_id,
        u.name AS "assignedEmployeeName"
      FROM conversations c
      LEFT JOIN employees e ON c.assigned_employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE c.contact_id = ANY(${pgArrayLiteral}::uuid[])
      ORDER BY c.contact_id, c.created_at DESC
    `);
    console.log("SUCCESS:", latestConversations.rows);
  } catch (err: any) {
    console.error("ERROR:", err.message);
  }
  
  process.exit(0);
}

run();
