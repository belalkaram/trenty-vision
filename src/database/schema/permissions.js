"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissions = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
exports.permissions = (0, pg_core_1.pgTable)('permissions', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull().unique(),
    displayName: (0, pg_core_1.varchar)('display_name', { length: 150 }).notNull(),
    groupName: (0, pg_core_1.varchar)('group_name', { length: 50 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
});
