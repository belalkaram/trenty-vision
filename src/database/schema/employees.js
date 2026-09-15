"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employees = exports.employeeStatusEnum = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var users_1 = require("./users");
var companies_1 = require("./companies");
var departments_1 = require("./departments");
var stations_1 = require("./stations");
exports.employeeStatusEnum = (0, pg_core_1.pgEnum)('employee_status', ['active', 'inactive', 'away', 'offline']);
exports.employees = (0, pg_core_1.pgTable)('employees', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id')
        .references(function () { return users_1.users.id; }, { onDelete: 'cascade' })
        .notNull()
        .unique(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .references(function () { return companies_1.companies.id; }, { onDelete: 'cascade' })
        .notNull(),
    departmentId: (0, pg_core_1.uuid)('department_id').references(function () { return departments_1.departments.id; }, { onDelete: 'set null' }),
    stationId: (0, pg_core_1.uuid)('station_id').references(function () { return stations_1.stations.id; }, { onDelete: 'set null' }),
    supervisorId: (0, pg_core_1.uuid)('supervisor_id').references(function () { return exports.employees.id; }, { onDelete: 'set null' }),
    whatsappNumber: (0, pg_core_1.varchar)('whatsapp_number', { length: 50 }),
    status: (0, exports.employeeStatusEnum)('status').default('offline').notNull(),
    lastSeenAt: (0, pg_core_1.timestamp)('last_seen_at', { withTimezone: true }),
    metadata: (0, pg_core_1.jsonb)('metadata').$type().default({}),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
