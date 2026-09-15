"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifications = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var users_1 = require("./users");
exports.notifications = (0, pg_core_1.pgTable)('notifications', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id')
        .references(function () { return users_1.users.id; }, { onDelete: 'cascade' })
        .notNull(),
    title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
    message: (0, pg_core_1.text)('message').notNull(),
    type: (0, pg_core_1.varchar)('type', { length: 50 }).notNull(),
    link: (0, pg_core_1.text)('link'),
    read: (0, pg_core_1.boolean)('read').default(false).notNull(),
    data: (0, pg_core_1.jsonb)('data').$type().default({}),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
});
