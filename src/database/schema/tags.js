"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversationTags = exports.tags = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var conversations_1 = require("./conversations");
exports.tags = (0, pg_core_1.pgTable)('tags', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 50 }).notNull().unique(),
    color: (0, pg_core_1.varchar)('color', { length: 20 }).default('#10b981').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
});
exports.conversationTags = (0, pg_core_1.pgTable)('conversation_tags', {
    conversationId: (0, pg_core_1.uuid)('conversation_id')
        .references(function () { return conversations_1.conversations.id; }, { onDelete: 'cascade' })
        .notNull(),
    tagId: (0, pg_core_1.uuid)('tag_id')
        .references(function () { return exports.tags.id; }, { onDelete: 'cascade' })
        .notNull(),
}, function (table) { return [
    (0, pg_core_1.primaryKey)({ columns: [table.conversationId, table.tagId] }),
]; });
