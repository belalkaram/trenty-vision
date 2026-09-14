import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { whatsappAccounts } from './whatsapp-accounts';

/**
 * Baileys Auth Keys Store — stores individual encryption keys for the WhatsApp session.
 * Each key is AES-256-GCM encrypted before storage.
 * Supports efficient reads/writes without bloating the main sessions table.
 */
export const whatsappAuthKeys = pgTable('whatsapp_auth_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: uuid('account_id')
    .references(() => whatsappAccounts.id, { onDelete: 'cascade' })
    .notNull(),
  keyType: varchar('key_type', { length: 100 }).notNull(),
  keyId: varchar('key_id', { length: 255 }).notNull(),
  valueEncrypted: text('value_encrypted').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type WhatsappAuthKey = typeof whatsappAuthKeys.$inferSelect;
export type NewWhatsappAuthKey = typeof whatsappAuthKeys.$inferInsert;
