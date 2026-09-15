"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogs = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var users_1 = require("./users");
exports.auditLogs = (0, pg_core_1.pgTable)('audit_logs', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    actorId: (0, pg_core_1.uuid)('actor_id').references(function () { return users_1.users.id; }, { onDelete: 'set null' }),
    action: (0, pg_core_1.varchar)('action', { length: 100 }).notNull(),
    entityType: (0, pg_core_1.varchar)('entity_type', { length: 100 }).notNull(),
    entityId: (0, pg_core_1.uuid)('entity_id'),
    ipAddress: (0, pg_core_1.varchar)('ip_address', { length: 45 }),
    userAgent: (0, pg_core_1.text)('user_agent'),
    oldValues: (0, pg_core_1.jsonb)('old_values').$type(),
    newValues: (0, pg_core_1.jsonb)('new_values').$type(),
    metadata: (0, pg_core_1.jsonb)('metadata').$type().default({}),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
});
