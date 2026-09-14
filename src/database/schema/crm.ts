import { pgTable, uuid, varchar, text, timestamp, pgEnum, jsonb } from 'drizzle-orm/pg-core';

export const crmSyncStatusEnum = pgEnum('crm_sync_status', ['pending', 'success', 'failed', 'retrying']);

export const crmConnections = pgTable('crm_connections', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(), // 'webhook', 'generic_rest', 'hubspot', etc.
  apiUrl: text('api_url'),
  apiKeyEncrypted: text('api_key_encrypted'),
  webhookSecret: text('webhook_secret'),
  active: varchar('active', { length: 10 }).default('true').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const crmSyncLogs = pgTable('crm_sync_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  connectionId: uuid('connection_id').references(() => crmConnections.id, { onDelete: 'set null' }),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'lead', 'contact', 'note'
  entityId: uuid('entity_id').notNull(),
  direction: varchar('direction', { length: 20 }).notNull(), // 'incoming', 'outgoing'
  status: crmSyncStatusEnum('status').default('pending').notNull(),
  payload: jsonb('payload').$type<Record<string, any>>(),
  response: jsonb('response').$type<Record<string, any>>(),
  errorMessage: text('error_message'),
  retryCount: varchar('retry_count', { length: 10 }).default('0').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type CrmConnection = typeof crmConnections.$inferSelect;
export type CrmSyncLog = typeof crmSyncLogs.$inferSelect;
