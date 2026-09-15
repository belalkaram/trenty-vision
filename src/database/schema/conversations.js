"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversations = exports.assignmentSourceEnum = exports.conversationStatusEnum = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var companies_1 = require("./companies");
var contacts_1 = require("./contacts");
var employees_1 = require("./employees");
var stations_1 = require("./stations");
var whatsapp_accounts_1 = require("./whatsapp-accounts");
exports.conversationStatusEnum = (0, pg_core_1.pgEnum)('conversation_status', ['open', 'pending', 'waiting', 'closed']);
exports.assignmentSourceEnum = (0, pg_core_1.pgEnum)('assignment_source', ['manual', 'round_robin', 'least_busy', 'direct', 'system']);
exports.conversations = (0, pg_core_1.pgTable)('conversations', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .references(function () { return companies_1.companies.id; }, { onDelete: 'cascade' })
        .notNull(),
    contactId: (0, pg_core_1.uuid)('contact_id')
        .references(function () { return contacts_1.contacts.id; }, { onDelete: 'cascade' })
        .notNull(),
    whatsappAccountId: (0, pg_core_1.uuid)('whatsapp_account_id').references(function () { return whatsapp_accounts_1.whatsappAccounts.id; }, { onDelete: 'set null' }),
    assignedEmployeeId: (0, pg_core_1.uuid)('assigned_employee_id').references(function () { return employees_1.employees.id; }, { onDelete: 'set null' }),
    assignedSupervisorId: (0, pg_core_1.uuid)('assigned_supervisor_id').references(function () { return employees_1.employees.id; }, { onDelete: 'set null' }),
    assignedStationId: (0, pg_core_1.uuid)('assigned_station_id').references(function () { return stations_1.stations.id; }, { onDelete: 'set null' }),
    assignmentSource: (0, exports.assignmentSourceEnum)('assignment_source').default('manual').notNull(),
    assignedAt: (0, pg_core_1.timestamp)('assigned_at', { withTimezone: true }),
    status: (0, exports.conversationStatusEnum)('status').default('open').notNull(),
    lastMessageText: (0, pg_core_1.text)('last_message_text'),
    lastMessageAt: (0, pg_core_1.timestamp)('last_message_at', { withTimezone: true }),
    unreadCount: (0, pg_core_1.varchar)('unread_count', { length: 10 }).default('0').notNull(),
    automationEnabled: (0, pg_core_1.boolean)('automation_enabled').default(true).notNull(),
    humanMode: (0, pg_core_1.boolean)('human_mode').default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, function (table) {
    return {
        contactIdIdx: (0, pg_core_1.index)('conversations_contact_id_idx').on(table.contactId),
        assignedEmployeeIdIdx: (0, pg_core_1.index)('conversations_assigned_employee_id_idx').on(table.assignedEmployeeId),
        statusIdx: (0, pg_core_1.index)('conversations_status_idx').on(table.status),
        createdAtIndex: (0, pg_core_1.index)('conversations_created_at_idx').on(table.createdAt),
    };
});
