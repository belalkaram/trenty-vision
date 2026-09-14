import { pgTable, uuid, varchar, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { companies } from './companies';
import { whatsappAccounts } from './whatsapp-accounts';

export const bridgeCommands = pgTable('bridge_commands', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  accountId: uuid('account_id')
    .references(() => whatsappAccounts.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 50 }).notNull(), // connect, disconnect, logout, reset, restart, pairing_code
  payload: jsonb('payload').$type<Record<string, any>>().default({}).notNull(), // e.g. { phoneNumber: "..." }
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, processing, completed, failed
  result: jsonb('result').$type<Record<string, any>>(), // e.g. { pairingCode: "1234-5678" }
  error: varchar('error', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => {
  return {
    statusIdx: index('bridge_commands_status_idx').on(table.status),
    companyIdx: index('bridge_commands_company_idx').on(table.companyId),
    createdAtIdx: index('bridge_commands_created_at_idx').on(table.createdAt),
  };
});

export type BridgeCommand = typeof bridgeCommands.$inferSelect;
export type NewBridgeCommand = typeof bridgeCommands.$inferInsert;
