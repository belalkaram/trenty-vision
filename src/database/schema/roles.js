"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roles = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
exports.roles = (0, pg_core_1.pgTable)('roles', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 50 }).notNull().unique(),
    displayName: (0, pg_core_1.varchar)('display_name', { length: 100 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    isSystem: (0, pg_core_1.boolean)('is_system').default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
});
