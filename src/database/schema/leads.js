"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leads = exports.leadStageEnum = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var contacts_1 = require("./contacts");
var employees_1 = require("./employees");
var stations_1 = require("./stations");
exports.leadStageEnum = (0, pg_core_1.pgEnum)('lead_stage', ['new', 'contacted', 'qualified', 'waiting', 'converted', 'lost']);
exports.leads = (0, pg_core_1.pgTable)('leads', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    externalId: (0, pg_core_1.varchar)('external_id', { length: 150 }).unique(),
    contactId: (0, pg_core_1.uuid)('contact_id')
        .references(function () { return contacts_1.contacts.id; }, { onDelete: 'cascade' })
        .notNull(),
    source: (0, pg_core_1.varchar)('source', { length: 100 }).default('landing_page'),
    campaign: (0, pg_core_1.varchar)('campaign', { length: 150 }),
    destination: (0, pg_core_1.varchar)('destination', { length: 150 }),
    travelDate: (0, pg_core_1.varchar)('travel_date', { length: 50 }),
    assignedEmployeeId: (0, pg_core_1.uuid)('assigned_employee_id').references(function () { return employees_1.employees.id; }, { onDelete: 'set null' }),
    supervisorId: (0, pg_core_1.uuid)('supervisor_id').references(function () { return employees_1.employees.id; }, { onDelete: 'set null' }),
    stationId: (0, pg_core_1.uuid)('station_id').references(function () { return stations_1.stations.id; }, { onDelete: 'set null' }),
    crmId: (0, pg_core_1.varchar)('crm_id', { length: 150 }),
    stage: (0, exports.leadStageEnum)('stage').default('new').notNull(),
    metadata: (0, pg_core_1.jsonb)('metadata').$type().default({}),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
