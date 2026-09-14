import { pgTable, uuid, varchar, text, timestamp, pgEnum, boolean, integer } from 'drizzle-orm/pg-core';
import { companies } from './companies';

export const whatsappAccountStatusEnum = pgEnum('whatsapp_account_status', [
  'disconnected',
  'initializing',
  'qr_required',
  'connecting',
  'connected',
  'logged_out',
  'error',
]);

export const whatsappAccounts = pgTable('whatsapp_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  displayName: varchar('display_name', { length: 150 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 50 }),
  jid: varchar('jid', { length: 100 }),
  status: whatsappAccountStatusEnum('status').default('disconnected').notNull(),
  deviceName: varchar('device_name', { length: 150 }),
  gatewayInstanceId: varchar('gateway_instance_id', { length: 100 }),
  isPrimaryDispatcher: boolean('is_primary_dispatcher').default(false).notNull(),
  dispatcherSlot: integer('dispatcher_slot'),
  connectedAt: timestamp('connected_at', { withTimezone: true }),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  bridgeStatus: varchar('bridge_status', { length: 20 }).default('unknown'),
  bridgeLastSeen: timestamp('bridge_last_seen', { withTimezone: true }),
  bridgeQrCode: text('bridge_qr_code'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type WhatsappAccount = typeof whatsappAccounts.$inferSelect;
export type NewWhatsappAccount = typeof whatsappAccounts.$inferInsert;
