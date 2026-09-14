import { pgTable, uuid, varchar, timestamp, boolean, integer, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { companies } from './companies';

export const bridgeHeartbeats = pgTable('bridge_heartbeats', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  bridgeId: varchar('bridge_id', { length: 100 }).notNull(),
  isOnline: boolean('is_online').default(true).notNull(),
  version: varchar('version', { length: 20 }).default('1.0.0').notNull(),
  uptimeSeconds: integer('uptime_seconds').default(0).notNull(),
  accountsSummary: jsonb('accounts_summary').$type<any[]>().default([]).notNull(), // [{ accountId, status, phoneNumber, displayName }]
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    companyIdx: uniqueIndex('bridge_heartbeats_company_idx').on(table.companyId),
    lastSeenIdx: index('bridge_heartbeats_last_seen_idx').on(table.lastSeenAt),
  };
});

export type BridgeHeartbeat = typeof bridgeHeartbeats.$inferSelect;
export type NewBridgeHeartbeat = typeof bridgeHeartbeats.$inferInsert;
