import { pgTable, uuid, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { departments } from './departments';

export const quickReplies = pgTable('quick_replies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  shortcut: varchar('shortcut', { length: 50 }).notNull().unique(),
  body: text('body').notNull(),
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type QuickReply = typeof quickReplies.$inferSelect;
export type NewQuickReply = typeof quickReplies.$inferInsert;
