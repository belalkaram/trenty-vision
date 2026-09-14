import { db } from '../src/database/client';
import { contacts, conversations, messages, settings } from '../src/database/schema';
import { eq, or, sql } from 'drizzle-orm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { validateAndFormatPhone } from '../src/utils/phone.validator';

async function scanLidMappings() {
  const mapping: Record<string, string> = {};
  const baseDir = path.join(process.cwd(), 'storage', 'whatsapp_sessions');
  try {
    const sessionDirs = await fs.readdir(baseDir);
    for (const sDir of sessionDirs) {
      const fullDir = path.join(baseDir, sDir);
      const stat = await fs.stat(fullDir);
      if (!stat.isDirectory()) continue;

      const files = await fs.readdir(fullDir);
      for (const file of files) {
        if (file.startsWith('lid-mapping-') && file.endsWith('_reverse.json')) {
          const cleanLid = file.replace('lid-mapping-', '').replace('_reverse.json', '');
          try {
            const content = await fs.readFile(path.join(fullDir, file), 'utf-8');
            const phone = JSON.parse(content.trim());
            if (phone) {
              mapping[cleanLid] = String(phone).replace(/\D/g, '');
            }
          } catch {}
        } else if (file.startsWith('lid-mapping-') && file.endsWith('.json') && !file.includes('_reverse')) {
          const phone = file.replace('lid-mapping-', '').replace('.json', '');
          try {
            const content = await fs.readFile(path.join(fullDir, file), 'utf-8');
            const lid = JSON.parse(content.trim());
            if (lid) {
              const cleanLid = String(lid).replace(/\D/g, '');
              mapping[cleanLid] = phone;
            }
          } catch {}
        }
      }
    }
  } catch (err) {
    console.error('Error scanning lid mappings:', err);
  }
  return mapping;
}

async function runDataRepair() {
  console.log('=== 1. SCANNING LID MAPPINGS FROM SESSIONS ===');
  const lidMap = await scanLidMappings();
  console.log(`Found ${Object.keys(lidMap).length} LID mappings.`);
  for (const [lid, pn] of Object.entries(lidMap)) {
    console.log(`LID: ${lid} -> PN: ${pn}`);
  }

  console.log('\n=== 2. PURGING JUNK KEYS FROM SETTINGS ===');
  const junkKeys = ['list', 'map', 'results'];
  for (const key of junkKeys) {
    await db.delete(settings).where(eq(settings.key, key));
  }
  console.log('Junk settings cleaned.');

  console.log('\n=== 3. AUDITING AND REPAIRING CONTACTS ===');
  const allContacts = await db.select().from(contacts);
  for (const c of allContacts) {
    const rawPhone = c.phoneNumber;
    const cleanDigits = rawPhone.replace(/\D/g, '');
    let realPhoneDigits = cleanDigits;
    let isLid = false;

    // Check if phone number is an LID
    if (lidMap[cleanDigits]) {
      console.log(`Contact "${c.name}" has LID phone ${rawPhone}, resolved to ${lidMap[cleanDigits]}`);
      realPhoneDigits = lidMap[cleanDigits];
      isLid = true;
    }

    const formatted = validateAndFormatPhone(realPhoneDigits);
    const targetE164 = formatted.isValid ? formatted.formatted : `+${realPhoneDigits}`;
    const targetJid = formatted.whatsappJid || `${realPhoneDigits}@s.whatsapp.net`;

    console.log(`Processing contact ID: ${c.id} ("${c.name}"): current=${rawPhone} -> target=${targetE164}`);

    if (rawPhone !== targetE164 || isLid) {
      // Check if another contact already exists with targetE164
      const existing = await db
        .select()
        .from(contacts)
        .where(eq(contacts.phoneNumber, targetE164))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== c.id) {
        console.log(`MERGE: Target ${targetE164} already belongs to contact ${existing[0].id}. Re-pointing conversations & messages...`);
        const primaryId = existing[0].id;
        const duplicateId = c.id;

        // Re-point conversations
        await db
          .update(conversations)
          .set({ contactId: primaryId })
          .where(eq(conversations.contactId, duplicateId));

        // Re-point messages
        await db
          .update(messages)
          .set({ contactId: primaryId })
          .where(eq(messages.contactId, duplicateId));

        // Delete duplicate contact
        await db.delete(contacts).where(eq(contacts.id, duplicateId));
        console.log(`Merged and deleted duplicate contact ${duplicateId}.`);
      } else {
        // Update contact in-place
        await db
          .update(contacts)
          .set({
            phoneNumber: targetE164,
            whatsappJid: targetJid,
            metadata: {
              ...(c.metadata || {}),
              lid: isLid ? `${cleanDigits}@lid` : (c.metadata as any)?.lid,
            },
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, c.id));
        console.log(`Updated contact ${c.id} to ${targetE164}.`);
      }
    }
  }

  console.log('\n=== 4. AUDITING CONVERSATIONS ASSIGNMENTS ===');
  const allConvs = await db.select().from(conversations);
  for (const conv of allConvs) {
    if (conv.assignedEmployeeId) {
      // Ensure contact metadata also reflects the persistent assigned employee
      const [cont] = await db.select().from(contacts).where(eq(contacts.id, conv.contactId)).limit(1);
      if (cont) {
        const meta = (cont.metadata || {}) as Record<string, any>;
        if (meta.assignedEmployeeId !== conv.assignedEmployeeId) {
          meta.assignedEmployeeId = conv.assignedEmployeeId;
          await db
            .update(contacts)
            .set({ metadata: meta, updatedAt: new Date() })
            .where(eq(contacts.id, cont.id));
          console.log(`Set persistent assignedEmployeeId ${conv.assignedEmployeeId} on contact ${cont.name} (${cont.phoneNumber})`);
        }
      }
    }
  }

  console.log('\nData repair completed successfully.');
  process.exit(0);
}

runDataRepair().catch((err) => {
  console.error('Data repair failed:', err);
  process.exit(1);
});
