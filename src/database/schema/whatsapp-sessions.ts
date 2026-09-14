import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { whatsappAccounts } from './whatsapp-accounts';

export const whatsappSessions = pgTable('whatsapp_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: uuid('account_id')
    .references(() => whatsappAccounts.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  qrCode: text('qr_code'),
  qrGeneratedAt: timestamp('qr_generated_at', { withTimezone: true }),
  encryptedAuthState: text('encrypted_auth_state'),
  lastHeartbeat: timestamp('last_heartbeat', { withTimezone: true }),
  reconnectAttempts: varchar('reconnect_attempts', { length: 10 }).default('0'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type WhatsappSession = typeof whatsappSessions.$inferSelect;
export type NewWhatsappSession = typeof whatsappSessions.$inferInsert;
