import { pgTable, uuid, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { companies } from './companies';
import { whatsappAccounts } from './whatsapp-accounts';

// Broadcast campaigns table
export const broadcastCampaigns = pgTable('broadcast_campaigns', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }).notNull(),
  whatsappAccountId: uuid('whatsapp_account_id').references(() => whatsappAccounts.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  messageType: varchar('message_type', { length: 30 }).default('text').notNull(), // 'text' | 'image' | 'video' | 'document'
  messageContent: text('message_content').notNull(),
  mediaUrl: text('media_url'),
  mediaFilename: varchar('media_filename', { length: 255 }),
  status: varchar('status', { length: 30 }).default('draft').notNull(), // 'draft' | 'running' | 'paused' | 'completed' | 'cancelled' | 'failed'

  // Anti-ban & safety controls
  minDelaySeconds: integer('min_delay_seconds').default(5).notNull(),
  maxDelaySeconds: integer('max_delay_seconds').default(12).notNull(),
  batchSize: integer('batch_size').default(25).notNull(),
  batchSleepSeconds: integer('batch_sleep_seconds').default(30).notNull(),

  // Counters & Metrics
  totalRecipients: integer('total_recipients').default(0).notNull(),
  sentCount: integer('sent_count').default(0).notNull(),
  failedCount: integer('failed_count').default(0).notNull(),
  pendingCount: integer('pending_count').default(0).notNull(),

  // Timestamps
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Broadcast recipients table
export const broadcastRecipients = pgTable('broadcast_recipients', {
  id: uuid('id').defaultRandom().primaryKey(),
  campaignId: uuid('campaign_id').references(() => broadcastCampaigns.id, { onDelete: 'cascade' }).notNull(),
  phoneNumber: varchar('phone_number', { length: 50 }).notNull(),
  recipientName: varchar('recipient_name', { length: 255 }),
  status: varchar('status', { length: 30 }).default('pending').notNull(), // 'pending' | 'sent' | 'failed' | 'skipped'
  errorReason: text('error_reason'),
  messageId: varchar('message_id', { length: 255 }),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type BroadcastCampaign = typeof broadcastCampaigns.$inferSelect;
export type NewBroadcastCampaign = typeof broadcastCampaigns.$inferInsert;
export type BroadcastRecipient = typeof broadcastRecipients.$inferSelect;
export type NewBroadcastRecipient = typeof broadcastRecipients.$inferInsert;
