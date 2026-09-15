"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappAccounts = exports.whatsappAccountStatusEnum = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var companies_1 = require("./companies");
exports.whatsappAccountStatusEnum = (0, pg_core_1.pgEnum)('whatsapp_account_status', [
    'disconnected',
    'initializing',
    'qr_required',
    'connecting',
    'connected',
    'logged_out',
    'error',
]);
exports.whatsappAccounts = (0, pg_core_1.pgTable)('whatsapp_accounts', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .references(function () { return companies_1.companies.id; }, { onDelete: 'cascade' })
        .notNull(),
    displayName: (0, pg_core_1.varchar)('display_name', { length: 150 }).notNull(),
    phoneNumber: (0, pg_core_1.varchar)('phone_number', { length: 50 }),
    jid: (0, pg_core_1.varchar)('jid', { length: 100 }),
    status: (0, exports.whatsappAccountStatusEnum)('status').default('disconnected').notNull(),
    deviceName: (0, pg_core_1.varchar)('device_name', { length: 150 }),
    gatewayInstanceId: (0, pg_core_1.varchar)('gateway_instance_id', { length: 100 }),
    isPrimaryDispatcher: (0, pg_core_1.boolean)('is_primary_dispatcher').default(false).notNull(),
    dispatcherSlot: (0, pg_core_1.integer)('dispatcher_slot'),
    connectedAt: (0, pg_core_1.timestamp)('connected_at', { withTimezone: true }),
    lastSeenAt: (0, pg_core_1.timestamp)('last_seen_at', { withTimezone: true }),
    bridgeStatus: (0, pg_core_1.varchar)('bridge_status', { length: 20 }).default('unknown'),
    bridgeLastSeen: (0, pg_core_1.timestamp)('bridge_last_seen', { withTimezone: true }),
    bridgeQrCode: (0, pg_core_1.text)('bridge_qr_code'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
