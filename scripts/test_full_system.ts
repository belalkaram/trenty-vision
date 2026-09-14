import { db } from '../src/database/client';
import { contacts, settings, conversations, employees, users, roles, whatsappAccounts, automationRules } from '../src/database/schema';
import { eq, or, sql } from 'drizzle-orm';
import { validateAndFormatPhone } from '../src/utils/phone.validator';
import { RulesEngine } from '../src/modules/automations/rules.engine';
import { AssignmentService } from '../src/modules/automations/assignment.service';

async function main() {
  console.log('=== 1. CHECK ROLES ===');
  const allRoles = await db.select().from(roles);
  for (const r of allRoles) {
    console.log(`Role: ${r.name} (${r.displayName}) ID: ${r.id}`);
  }

  console.log('\n=== 2. CHECK USERS & EMPLOYEES ===');
  const allUsers = await db.select().from(users);
  for (const u of allUsers) {
    const [emp] = await db.select().from(employees).where(eq(employees.userId, u.id));
    console.log(`User: ${u.email} | Name: ${u.name} | RoleId: ${u.roleId} | EmpId: ${emp?.id || 'none'} | Station: ${emp?.stationId || 'none'}`);
  }

  console.log('\n=== 3. CHECK WHATSAPP ACCOUNTS ===');
  const accounts = await db.select().from(whatsappAccounts);
  for (const acc of accounts) {
    console.log(`WA Account: ${acc.displayName} | Phone: ${acc.phoneNumber} | Status: ${acc.status} | ID: ${acc.id}`);
  }

  console.log('\n=== 4. CHECK AUTOMATION RULES IN DB ===');
  const rules = await db.select().from(automationRules);
  console.log(`Found ${rules.length} automation rules:`);
  for (const r of rules) {
    console.log(`Rule: "${r.name}" | Active: ${r.active} | Event: ${r.triggerEvent} | Conditions:`, JSON.stringify(r.conditions), '| Actions:', JSON.stringify(r.actions));
  }

  console.log('\n=== 5. CHECK CONTACTS IN DB ===');
  const allContacts = await db.select().from(contacts);
  console.log(`Found ${allContacts.length} contacts:`);
  for (const c of allContacts) {
    console.log(`Contact: "${c.name}" | Phone: ${c.phoneNumber} | JID: ${c.whatsappJid} | Metadata:`, JSON.stringify(c.metadata));
  }

  console.log('\n=== 6. CHECK CONVERSATIONS IN DB ===');
  const allConvs = await db.select().from(conversations);
  console.log(`Found ${allConvs.length} conversations:`);
  for (const cv of allConvs) {
    console.log(`Conv: ${cv.id} | Contact: ${cv.contactId} | Emp: ${cv.assignedEmployeeId} | Source: ${cv.assignmentSource} | Status: ${cv.status} | LastMsg: ${cv.lastMessageText}`);
  }

  console.log('\n=== 7. CHECK SETTINGS IN DB ===');
  const allSettings = await db.select().from(settings);
  for (const s of allSettings) {
    console.log(`Setting: ${s.key} =`, JSON.stringify(s.value));
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error in test script:', err);
  process.exit(1);
});
