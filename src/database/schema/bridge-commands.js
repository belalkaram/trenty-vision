"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bridgeCommands = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var companies_1 = require("./companies");
var whatsapp_accounts_1 = require("./whatsapp-accounts");
exports.bridgeCommands = (0, pg_core_1.pgTable)('bridge_commands', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .references(function () { return companies_1.companies.id; }, { onDelete: 'cascade' })
        .notNull(),
    accountId: (0, pg_core_1.uuid)('account_id')
        .references(function () { return whatsapp_accounts_1.whatsappAccounts.id; }, { onDelete: 'set null' }),
    action: (0, pg_core_1.varchar)('action', { length: 50 }).notNull(), // connect, disconnect, logout, reset, restart, pairing_code
    payload: (0, pg_core_1.jsonb)('payload').$type().default({}).notNull(), // e.g. { phoneNumber: "..." }
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('pending').notNull(), // pending, processing, completed, failed
    result: (0, pg_core_1.jsonb)('result').$type(), // e.g. { pairingCode: "1234-5678" }
    error: (0, pg_core_1.varchar)('error', { length: 500 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: (0, pg_core_1.timestamp)('completed_at', { withTimezone: true }),
}, function (table) {
    return {
        statusIdx: (0, pg_core_1.index)('bridge_commands_status_idx').on(table.status),
        companyIdx: (0, pg_core_1.index)('bridge_commands_company_idx').on(table.companyId),
        createdAtIdx: (0, pg_core_1.index)('bridge_commands_created_at_idx').on(table.createdAt),
    };
});
