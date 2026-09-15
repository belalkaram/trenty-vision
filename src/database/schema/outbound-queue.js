"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.outboundQueue = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var companies_1 = require("./companies");
var whatsapp_accounts_1 = require("./whatsapp-accounts");
var conversations_1 = require("./conversations");
var messages_1 = require("./messages");
exports.outboundQueue = (0, pg_core_1.pgTable)('outbound_queue', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .references(function () { return companies_1.companies.id; }, { onDelete: 'cascade' })
        .notNull(),
    accountId: (0, pg_core_1.uuid)('account_id')
        .references(function () { return whatsapp_accounts_1.whatsappAccounts.id; }, { onDelete: 'set null' }),
    conversationId: (0, pg_core_1.uuid)('conversation_id')
        .references(function () { return conversations_1.conversations.id; }, { onDelete: 'set null' }),
    messageId: (0, pg_core_1.uuid)('message_id')
        .references(function () { return messages_1.messages.id; }, { onDelete: 'set null' }),
    toJid: (0, pg_core_1.varchar)('to_jid', { length: 100 }).notNull(),
    type: (0, pg_core_1.varchar)('type', { length: 20 }).default('text').notNull(), // text, image, video, audio, voice_note, document
    text: (0, pg_core_1.text)('text'),
    mediaData: (0, pg_core_1.text)('media_data'), // Base64 or URL
    mediaMime: (0, pg_core_1.varchar)('media_mime', { length: 100 }),
    mediaFilename: (0, pg_core_1.varchar)('media_filename', { length: 255 }),
    caption: (0, pg_core_1.text)('caption'),
    quotedMessageId: (0, pg_core_1.varchar)('quoted_message_id', { length: 150 }),
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('pending').notNull(), // pending, processing, sent, failed
    priority: (0, pg_core_1.integer)('priority').default(0).notNull(), // 0 = normal, 1 = high (auto-replies, system alerts)
    attempts: (0, pg_core_1.integer)('attempts').default(0).notNull(),
    error: (0, pg_core_1.text)('error'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    sentAt: (0, pg_core_1.timestamp)('sent_at', { withTimezone: true }),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, function (table) {
    return {
        statusIdx: (0, pg_core_1.index)('outbound_queue_status_idx').on(table.status),
        companyIdx: (0, pg_core_1.index)('outbound_queue_company_idx').on(table.companyId),
        createdAtIdx: (0, pg_core_1.index)('outbound_queue_created_at_idx').on(table.createdAt),
        accountIdx: (0, pg_core_1.index)('outbound_queue_account_idx').on(table.accountId),
    };
});
