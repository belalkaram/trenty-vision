import { db } from '../src/database/client';
import * as schema from '../src/database/schema/index';
import { eq, or, sql } from 'drizzle-orm';
import { validateAndFormatPhone } from '../src/utils/phone.validator';
import { RulesEngine } from '../src/modules/automations/rules.engine';
import { AssignmentService } from '../src/modules/automations/assignment.service';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING COMPREHENSIVE SYSTEM VERIFICATION TESTS 🚀');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // TEST SUITE 1: Phone Normalization & Formatting
  // ─────────────────────────────────────────────────────────────
  console.log('--- TEST SUITE 1: Phone Normalization & E.164 Formatting ---');

  const p1 = validateAndFormatPhone('01019033661');
  assert(p1.isValid && p1.formatted === '+201019033661', 'Egyptian local number converts to E.164 (+201019033661)', p1.formatted);

  const p2 = validateAndFormatPhone('0501234567');
  assert(p2.isValid && p2.formatted === '+966501234567', 'Saudi local number converts to E.164 (+966501234567)', p2.formatted);

  const p3 = validateAndFormatPhone('+9660501234567');
  assert(p3.isValid && p3.formatted === '+966501234567', 'Strips accidental trunk zero after Saudi country code (+96605... -> +9665...)', p3.formatted);

  const p4 = validateAndFormatPhone('+2001019033661');
  assert(p4.isValid && p4.formatted === '+201019033661', 'Strips accidental trunk zero after Egypt country code (+2001... -> +201...)', p4.formatted);

  const p5 = validateAndFormatPhone('+20 101-903-3661');
  assert(p5.isValid && p5.formatted === '+201019033661', 'Handles formatted input with spaces and dashes', p5.formatted);

  assert(p1.whatsappJid === '201019033661@s.whatsapp.net', 'Generates standard WhatsApp JID', p1.whatsappJid);

  // ─────────────────────────────────────────────────────────────
  // TEST SUITE 2: Arabic Text Normalization & Keyword Automations
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 2: Arabic Text Normalization & Auto-Replies ---');

  const norm1 = RulesEngine.normalizeText('أهْلاً و سَهْلاً بكَ!');
  assert(norm1.includes('اهلا') && norm1.includes('سهلا'), 'Strips Arabic tashkeel & unifies Alefs', norm1);

  // Test exact match rule ("تفاصيل")
  const rExact = await RulesEngine.matchKeywordRules('تفاصيل');
  assert(
    rExact.matchedRules.length > 0 && rExact.autoReplyText === 'التفاصيل اهي يفندم',
    'Exact keyword match for "تفاصيل" triggers configured reply',
    JSON.stringify(rExact)
  );

  // Test contains match rule ("سعر")
  const rContains = await RulesEngine.matchKeywordRules('ممكن اعرف السعر لو سمحت');
  assert(
    rContains.matchedRules.length > 0 && rContains.autoReplyText === '50',
    'Contains keyword match for "سعر" inside longer sentence triggers reply "50"',
    JSON.stringify(rContains)
  );

  // Test starts_with match rule ("الحجم")
  const rStarts = await RulesEngine.matchKeywordRules('الحجم الكبير متاح عندك؟');
  assert(
    rStarts.matchedRules.length > 0 && rStarts.autoReplyText === '40',
    'Starts_with keyword match for "الحجم" triggers reply "40"',
    JSON.stringify(rStarts)
  );

  // Test non-matching text
  const rNone = await RulesEngine.matchKeywordRules('صباح الخير يا فندم');
  assert(!rNone.autoReplyText, 'Non-matching message does not trigger auto-reply');

  // ─────────────────────────────────────────────────────────────
  // TEST SUITE 3: Persistent Assignment & Sticky Agent Logic
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 3: Persistent Assignment & Sticky Agent ---');

  // Find an existing contact in DB
  const [existingContact] = await db.select().from(schema.contacts).limit(1);
  if (existingContact) {
    const sticky = await AssignmentService.findStickyAgent(existingContact.id);
    assert(
      sticky !== null && !!sticky.employeeId,
      `Contact "${existingContact.name}" has persistent assigned employee (${sticky?.employeeId})`
    );

    // Find or test conversation assignment idempotency
    const [conv] = await db
      .select()
      .from(schema.conversations)
      .where(eq(schema.conversations.contactId, existingContact.id))
      .limit(1);

    if (conv && conv.assignedEmployeeId) {
      const initialEmployee = conv.assignedEmployeeId;
      const reassignAttempt = await AssignmentService.autoAssignConversation(conv.id);
      assert(
        reassignAttempt.assignedEmployeeId === initialEmployee,
        'Idempotency: Re-running autoAssign on already assigned conversation PRESERVES the same employee',
        `expected=${initialEmployee}, got=${reassignAttempt.assignedEmployeeId}`
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // TEST SUITE 4: Settings Persistence & Bi-Directional Mirroring
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 4: Settings Bi-Directional Mirroring ---');

  const modeSnake = await AssignmentService.getSetting('assignment_mode', null);
  const modeCamel = await AssignmentService.getSetting('routingStrategy', null);
  assert(
    modeSnake !== null && modeCamel !== null && modeSnake === modeCamel,
    `Routing strategy mirrored: assignment_mode (${modeSnake}) == routingStrategy (${modeCamel})`
  );

  const assignSnake = await AssignmentService.getSetting('assignment_enabled', null);
  const assignCamel = await AssignmentService.getSetting('autoAssignmentEnabled', null);
  assert(
    assignSnake !== null && assignCamel !== null && assignSnake === assignCamel,
    `Auto-assignment toggle mirrored: assignment_enabled (${assignSnake}) == autoAssignmentEnabled (${assignCamel})`
  );

  // Check no junk settings in DB
  const junkCheck = await db.select().from(schema.settings).where(
    or(
      eq(schema.settings.key, 'list'),
      eq(schema.settings.key, 'map'),
      eq(schema.settings.key, 'results')
    )
  );
  assert(junkCheck.length === 0, 'Database settings are clean with 0 junk keys (list, map, results)');

  // ─────────────────────────────────────────────────────────────
  // FINAL SUMMARY
  // ─────────────────────────────────────────────────────────────
  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('====================================================');

  if (failed === 0) {
    console.log('🎉 ALL SYSTEM COMPONENTS VERIFIED 100% OPERATIONAL! 🎉');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
