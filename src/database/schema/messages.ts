import { pgTable, uuid, varchar, text, timestamp, pgEnum, jsonb, index } from 'drizzle-orm/pg-core';
import { conversations } from './conversations';
import { contacts } from './contacts';
import { users } from './users';

export const messageDirectionEnum = pgEnum('message_direction', ['incoming', 'outgoing']);
export const messageSenderTypeEnum = pgEnum('message_sender_type', ['customer', 'employee', 'automation', 'system']);
export const messageTypeEnum = pgEnum('message_type', [
  'text',
  'image',
  'video',
  'audio',
  'voice_note',
  'document',
  'location',
  'contact',
  'sticker',
  'system',
]);
export const messageStatusEnum = pgEnum('message_status', ['pending', 'queued', 'sent', 'delivered', 'read', 'failed']);

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  whatsappMessageId: varchar('whatsapp_message_id', { length: 150 }).unique(),
  conversationId: uuid('conversation_id')
    .references(() => conversations.id, { onDelete: 'cascade' })
    .notNull(),
  contactId: uuid('contact_id')
    .references(() => contacts.id, { onDelete: 'cascade' })
    .notNull(),
  senderType: messageSenderTypeEnum('sender_type').notNull(),
  senderUserId: uuid('sender_user_id').references(() => users.id, { onDelete: 'set null' }),
  direction: messageDirectionEnum('direction').notNull(),
  type: messageTypeEnum('type').default('text').notNull(),
  text: text('text'),
  mediaId: uuid('media_id'),
  quotedMessageId: uuid('quoted_message_id'),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  status: messageStatusEnum('status').default('sent').notNull(),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    whatsappMsgIdIdx: index('messages_whatsapp_msg_id_idx').on(table.whatsappMessageId),
    conversationIdx: index('messages_conversation_id_idx').on(table.conversationId),
    senderTypeIdx: index('messages_sender_type_idx').on(table.senderType),
    createdAtIndex: index('messages_created_at_idx').on(table.createdAt),
  };
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
