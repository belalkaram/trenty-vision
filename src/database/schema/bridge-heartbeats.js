"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bridgeHeartbeats = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var companies_1 = require("./companies");
exports.bridgeHeartbeats = (0, pg_core_1.pgTable)('bridge_heartbeats', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .references(function () { return companies_1.companies.id; }, { onDelete: 'cascade' })
        .notNull(),
    bridgeId: (0, pg_core_1.varchar)('bridge_id', { length: 100 }).notNull(),
    isOnline: (0, pg_core_1.boolean)('is_online').default(true).notNull(),
    version: (0, pg_core_1.varchar)('version', { length: 20 }).default('1.0.0').notNull(),
    uptimeSeconds: (0, pg_core_1.integer)('uptime_seconds').default(0).notNull(),
    accountsSummary: (0, pg_core_1.jsonb)('accounts_summary').$type().default([]).notNull(), // [{ accountId, status, phoneNumber, displayName }]
    lastSeenAt: (0, pg_core_1.timestamp)('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, function (table) {
    return {
        companyIdx: (0, pg_core_1.uniqueIndex)('bridge_heartbeats_company_idx').on(table.companyId),
        lastSeenIdx: (0, pg_core_1.index)('bridge_heartbeats_last_seen_idx').on(table.lastSeenAt),
    };
});
