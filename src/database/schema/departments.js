"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.departments = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var companies_1 = require("./companies");
exports.departments = (0, pg_core_1.pgTable)('departments', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .references(function () { return companies_1.companies.id; }, { onDelete: 'cascade' })
        .notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 150 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    active: (0, pg_core_1.boolean)('active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
