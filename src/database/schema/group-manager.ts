import { pgTable, uuid, varchar, text, integer, jsonb, timestamp, boolean } from 'drizzle-orm/pg-core';
import { companies } from './companies';

// Stores each extraction/add job
export const groupJobs = pgTable('group_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 30 }).notNull(), // 'extract' | 'add'
  sourceGroupJid: varchar('source_group_jid', { length: 255 }), // For extract: the group to extract from
  targetGroupJid: varchar('target_group_jid', { length: 255 }), // For add: the group to add to
  sourceGroupName: varchar('source_group_name', { length: 500 }),
  targetGroupName: varchar('target_group_name', { length: 500 }),
  status: varchar('status', { length: 30 }).default('pending').notNull(), // 'pending' | 'running' | 'completed' | 'failed'
  totalContacts: integer('total_contacts').default(0),
  processedContacts: integer('processed_contacts').default(0),
  failedContacts: integer('failed_contacts').default(0),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

// Stores extracted contacts from groups
export const groupExtractedContacts = pgTable('group_extracted_contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }).notNull(),
  jobId: uuid('job_id').references(() => groupJobs.id, { onDelete: 'cascade' }),
  phoneNumber: varchar('phone_number', { length: 50 }).notNull(),
  displayName: varchar('display_name', { length: 255 }),
  groupJid: varchar('group_jid', { length: 255 }).notNull(),
  groupName: varchar('group_name', { length: 500 }),
  isAdmin: boolean('is_admin').default(false),
  addedToTarget: boolean('added_to_target').default(false),
  addError: text('add_error'),
  extractedAt: timestamp('extracted_at', { withTimezone: true }).defaultNow().notNull(),
});

export type GroupJob = typeof groupJobs.$inferSelect;
export type NewGroupJob = typeof groupJobs.$inferInsert;
export type GroupExtractedContact = typeof groupExtractedContacts.$inferSelect;
export type NewGroupExtractedContact = typeof groupExtractedContacts.$inferInsert;
