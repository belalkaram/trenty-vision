"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reminders = exports.reminderStatusEnum = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var conversations_1 = require("./conversations");
var leads_1 = require("./leads");
var users_1 = require("./users");
exports.reminderStatusEnum = (0, pg_core_1.pgEnum)('reminder_status', ['pending', 'completed', 'cancelled', 'overdue']);
exports.reminders = (0, pg_core_1.pgTable)('reminders', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    conversationId: (0, pg_core_1.uuid)('conversation_id').references(function () { return conversations_1.conversations.id; }, { onDelete: 'cascade' }),
    leadId: (0, pg_core_1.uuid)('lead_id').references(function () { return leads_1.leads.id; }, { onDelete: 'set null' }),
    assignedUserId: (0, pg_core_1.uuid)('assigned_user_id')
        .references(function () { return users_1.users.id; }, { onDelete: 'cascade' })
        .notNull(),
    title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
    note: (0, pg_core_1.text)('note'),
    dueAt: (0, pg_core_1.timestamp)('due_at', { withTimezone: true }).notNull(),
    status: (0, exports.reminderStatusEnum)('status').default('pending').notNull(),
    completedAt: (0, pg_core_1.timestamp)('completed_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
