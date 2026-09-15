"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quickReplies = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var departments_1 = require("./departments");
exports.quickReplies = (0, pg_core_1.pgTable)('quick_replies', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 150 }).notNull(),
    shortcut: (0, pg_core_1.varchar)('shortcut', { length: 50 }).notNull().unique(),
    body: (0, pg_core_1.text)('body').notNull(),
    departmentId: (0, pg_core_1.uuid)('department_id').references(function () { return departments_1.departments.id; }, { onDelete: 'set null' }),
    active: (0, pg_core_1.boolean)('active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
