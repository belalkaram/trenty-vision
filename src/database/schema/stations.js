"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stations = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var companies_1 = require("./companies");
var departments_1 = require("./departments");
exports.stations = (0, pg_core_1.pgTable)('stations', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .references(function () { return companies_1.companies.id; }, { onDelete: 'cascade' })
        .notNull(),
    departmentId: (0, pg_core_1.uuid)('department_id').references(function () { return departments_1.departments.id; }, { onDelete: 'set null' }),
    name: (0, pg_core_1.varchar)('name', { length: 150 }).notNull(),
    code: (0, pg_core_1.varchar)('code', { length: 50 }),
    color: (0, pg_core_1.varchar)('color', { length: 50 }).default('#1c9770'),
    description: (0, pg_core_1.text)('description'),
    maxCapacity: (0, pg_core_1.integer)('max_capacity').default(20),
    routingWeight: (0, pg_core_1.integer)('routing_weight').default(1),
    active: (0, pg_core_1.boolean)('active').default(true).notNull(),
    metadata: (0, pg_core_1.jsonb)('metadata').$type().default({}),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
