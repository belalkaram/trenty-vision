"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settings = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
exports.settings = (0, pg_core_1.pgTable)('settings', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    key: (0, pg_core_1.varchar)('key', { length: 100 }).notNull().unique(),
    value: (0, pg_core_1.jsonb)('value').notNull(),
    groupName: (0, pg_core_1.varchar)('group_name', { length: 50 }).notNull().default('general'),
    description: (0, pg_core_1.text)('description'),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
