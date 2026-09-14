import { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { companies } from './companies';
import { contacts } from './contacts';
import { employees } from './employees';
import { stations } from './stations';
import { whatsappAccounts } from './whatsapp-accounts';

export const conversationStatusEnum = pgEnum('conversation_status', ['open', 'pending', 'waiting', 'closed']);
export const assignmentSourceEnum = pgEnum('assignment_source', ['manual', 'round_robin', 'least_busy', 'direct', 'system']);

export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  contactId: uuid('contact_id')
    .references(() => contacts.id, { onDelete: 'cascade' })
    .notNull(),
  whatsappAccountId: uuid('whatsapp_account_id').references(() => whatsappAccounts.id, { onDelete: 'set null' }),
  assignedEmployeeId: uuid('assigned_employee_id').references(() => employees.id, { onDelete: 'set null' }),
  assignedSupervisorId: uuid('assigned_supervisor_id').references(() => employees.id, { onDelete: 'set null' }),
  assignedStationId: uuid('assigned_station_id').references(() => stations.id, { onDelete: 'set null' }),
  assignmentSource: assignmentSourceEnum('assignment_source').default('manual').notNull(),
  assignedAt: timestamp('assigned_at', { withTimezone: true }),
  status: conversationStatusEnum('status').default('open').notNull(),
  lastMessageText: text('last_message_text'),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  unreadCount: varchar('unread_count', { length: 10 }).default('0').notNull(),
  automationEnabled: boolean('automation_enabled').default(true).notNull(),
  humanMode: boolean('human_mode').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    contactIdIdx: index('conversations_contact_id_idx').on(table.contactId),
    assignedEmployeeIdIdx: index('conversations_assigned_employee_id_idx').on(table.assignedEmployeeId),
    statusIdx: index('conversations_status_idx').on(table.status),
    createdAtIndex: index('conversations_created_at_idx').on(table.createdAt),
  };
});

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
