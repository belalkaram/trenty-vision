import { pgTable, uuid, varchar, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { companies } from './companies';
import { whatsappAccounts } from './whatsapp-accounts';
import { conversations } from './conversations';
import { messages } from './messages';

export const outboundQueue = pgTable('outbound_queue', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  accountId: uuid('account_id')
    .references(() => whatsappAccounts.id, { onDelete: 'set null' }),
  conversationId: uuid('conversation_id')
    .references(() => conversations.id, { onDelete: 'set null' }),
  messageId: uuid('message_id')
    .references(() => messages.id, { onDelete: 'set null' }),
  toJid: varchar('to_jid', { length: 100 }).notNull(),
  type: varchar('type', { length: 20 }).default('text').notNull(), // text, image, video, audio, voice_note, document
  text: text('text'),
  mediaData: text('media_data'), // Base64 or URL
  mediaMime: varchar('media_mime', { length: 100 }),
  mediaFilename: varchar('media_filename', { length: 255 }),
  caption: text('caption'),
  quotedMessageId: varchar('quoted_message_id', { length: 150 }),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, processing, sent, failed
  priority: integer('priority').default(0).notNull(), // 0 = normal, 1 = high (auto-replies, system alerts)
  attempts: integer('attempts').default(0).notNull(),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    statusIdx: index('outbound_queue_status_idx').on(table.status),
    companyIdx: index('outbound_queue_company_idx').on(table.companyId),
    createdAtIdx: index('outbound_queue_created_at_idx').on(table.createdAt),
    accountIdx: index('outbound_queue_account_idx').on(table.accountId),
  };
});

export type OutboundQueueItem = typeof outboundQueue.$inferSelect;
export type NewOutboundQueueItem = typeof outboundQueue.$inferInsert;
