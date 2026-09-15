"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companies = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
exports.companies = (0, pg_core_1.pgTable)('companies', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    timezone: (0, pg_core_1.varchar)('timezone', { length: 100 }).notNull().default('Asia/Kuwait'),
    settings: (0, pg_core_1.jsonb)('settings').$type().default({}),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
