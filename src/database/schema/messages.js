"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messages = exports.messageStatusEnum = exports.messageTypeEnum = exports.messageSenderTypeEnum = exports.messageDirectionEnum = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var conversations_1 = require("./conversations");
var contacts_1 = require("./contacts");
var users_1 = require("./users");
exports.messageDirectionEnum = (0, pg_core_1.pgEnum)('message_direction', ['incoming', 'outgoing']);
exports.messageSenderTypeEnum = (0, pg_core_1.pgEnum)('message_sender_type', ['customer', 'employee', 'automation', 'system']);
exports.messageTypeEnum = (0, pg_core_1.pgEnum)('message_type', [
    'text',
    'image',
    'video',
    'audio',
    'voice_note',
    'document',
    'location',
    'contact',
    'sticker',
    'system',
]);
exports.messageStatusEnum = (0, pg_core_1.pgEnum)('message_status', ['pending', 'queued', 'sent', 'delivered', 'read', 'failed']);
exports.messages = (0, pg_core_1.pgTable)('messages', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    whatsappMessageId: (0, pg_core_1.varchar)('whatsapp_message_id', { length: 150 }).unique(),
    conversationId: (0, pg_core_1.uuid)('conversation_id')
        .references(function () { return conversations_1.conversations.id; }, { onDelete: 'cascade' })
        .notNull(),
    contactId: (0, pg_core_1.uuid)('contact_id')
        .references(function () { return contacts_1.contacts.id; }, { onDelete: 'cascade' })
        .notNull(),
    senderType: (0, exports.messageSenderTypeEnum)('sender_type').notNull(),
    senderUserId: (0, pg_core_1.uuid)('sender_user_id').references(function () { return users_1.users.id; }, { onDelete: 'set null' }),
    direction: (0, exports.messageDirectionEnum)('direction').notNull(),
    type: (0, exports.messageTypeEnum)('type').default('text').notNull(),
    text: (0, pg_core_1.text)('text'),
    mediaId: (0, pg_core_1.uuid)('media_id'),
    quotedMessageId: (0, pg_core_1.uuid)('quoted_message_id'),
    timestamp: (0, pg_core_1.timestamp)('timestamp', { withTimezone: true }).defaultNow().notNull(),
    status: (0, exports.messageStatusEnum)('status').default('sent').notNull(),
    metadata: (0, pg_core_1.jsonb)('metadata').$type().default({}),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, function (table) {
    return {
        whatsappMsgIdIdx: (0, pg_core_1.index)('messages_whatsapp_msg_id_idx').on(table.whatsappMessageId),
        conversationIdx: (0, pg_core_1.index)('messages_conversation_id_idx').on(table.conversationId),
        senderTypeIdx: (0, pg_core_1.index)('messages_sender_type_idx').on(table.senderType),
        createdAtIndex: (0, pg_core_1.index)('messages_created_at_idx').on(table.createdAt),
    };
});
