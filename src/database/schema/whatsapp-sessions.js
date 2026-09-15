"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappSessions = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var whatsapp_accounts_1 = require("./whatsapp-accounts");
exports.whatsappSessions = (0, pg_core_1.pgTable)('whatsapp_sessions', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    accountId: (0, pg_core_1.uuid)('account_id')
        .references(function () { return whatsapp_accounts_1.whatsappAccounts.id; }, { onDelete: 'cascade' })
        .notNull()
        .unique(),
    qrCode: (0, pg_core_1.text)('qr_code'),
    qrGeneratedAt: (0, pg_core_1.timestamp)('qr_generated_at', { withTimezone: true }),
    encryptedAuthState: (0, pg_core_1.text)('encrypted_auth_state'),
    lastHeartbeat: (0, pg_core_1.timestamp)('last_heartbeat', { withTimezone: true }),
    reconnectAttempts: (0, pg_core_1.varchar)('reconnect_attempts', { length: 10 }).default('0'),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
