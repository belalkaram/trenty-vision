"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crmSyncLogs = exports.crmConnections = exports.crmSyncStatusEnum = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
exports.crmSyncStatusEnum = (0, pg_core_1.pgEnum)('crm_sync_status', ['pending', 'success', 'failed', 'retrying']);
exports.crmConnections = (0, pg_core_1.pgTable)('crm_connections', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 150 }).notNull(),
    provider: (0, pg_core_1.varchar)('provider', { length: 50 }).notNull(), // 'webhook', 'generic_rest', 'hubspot', etc.
    apiUrl: (0, pg_core_1.text)('api_url'),
    apiKeyEncrypted: (0, pg_core_1.text)('api_key_encrypted'),
    webhookSecret: (0, pg_core_1.text)('webhook_secret'),
    active: (0, pg_core_1.varchar)('active', { length: 10 }).default('true').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
exports.crmSyncLogs = (0, pg_core_1.pgTable)('crm_sync_logs', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    connectionId: (0, pg_core_1.uuid)('connection_id').references(function () { return exports.crmConnections.id; }, { onDelete: 'set null' }),
    entityType: (0, pg_core_1.varchar)('entity_type', { length: 50 }).notNull(), // 'lead', 'contact', 'note'
    entityId: (0, pg_core_1.uuid)('entity_id').notNull(),
    direction: (0, pg_core_1.varchar)('direction', { length: 20 }).notNull(), // 'incoming', 'outgoing'
    status: (0, exports.crmSyncStatusEnum)('status').default('pending').notNull(),
    payload: (0, pg_core_1.jsonb)('payload').$type(),
    response: (0, pg_core_1.jsonb)('response').$type(),
    errorMessage: (0, pg_core_1.text)('error_message'),
    retryCount: (0, pg_core_1.varchar)('retry_count', { length: 10 }).default('0').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
});
