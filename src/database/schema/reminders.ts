import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { conversations } from './conversations';
import { leads } from './leads';
import { users } from './users';

export const reminderStatusEnum = pgEnum('reminder_status', ['pending', 'completed', 'cancelled', 'overdue']);

export const reminders = pgTable('reminders', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }),
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  assignedUserId: uuid('assigned_user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  note: text('note'),
  dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
  status: reminderStatusEnum('status').default('pending').notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Reminder = typeof reminders.$inferSelect;
export type NewReminder = typeof reminders.$inferInsert;
