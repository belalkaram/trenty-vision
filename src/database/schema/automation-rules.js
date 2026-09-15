"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.automationRules = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
exports.automationRules = (0, pg_core_1.pgTable)('automation_rules', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 150 }).notNull(),
    triggerType: (0, pg_core_1.varchar)('trigger_type', { length: 50 }).notNull(), // 'incoming_message', 'keyword', 'new_lead', etc.
    conditions: (0, pg_core_1.jsonb)('conditions').$type().notNull().default({}),
    actions: (0, pg_core_1.jsonb)('actions').$type().notNull().default([]),
    priority: (0, pg_core_1.integer)('priority').default(0).notNull(),
    enabled: (0, pg_core_1.boolean)('enabled').default(true).notNull(),
    scope: (0, pg_core_1.varchar)('scope', { length: 50 }).default('global').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
