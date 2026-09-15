"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappAuthKeys = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var whatsapp_accounts_1 = require("./whatsapp-accounts");
/**
 * Baileys Auth Keys Store — stores individual encryption keys for the WhatsApp session.
 * Each key is AES-256-GCM encrypted before storage.
 * Supports efficient reads/writes without bloating the main sessions table.
 */
exports.whatsappAuthKeys = (0, pg_core_1.pgTable)('whatsapp_auth_keys', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    accountId: (0, pg_core_1.uuid)('account_id')
        .references(function () { return whatsapp_accounts_1.whatsappAccounts.id; }, { onDelete: 'cascade' })
        .notNull(),
    keyType: (0, pg_core_1.varchar)('key_type', { length: 100 }).notNull(),
    keyId: (0, pg_core_1.varchar)('key_id', { length: 255 }).notNull(),
    valueEncrypted: (0, pg_core_1.text)('value_encrypted').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
