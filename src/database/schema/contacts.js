"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contacts = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var companies_1 = require("./companies");
exports.contacts = (0, pg_core_1.pgTable)('contacts', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .references(function () { return companies_1.companies.id; }, { onDelete: 'cascade' })
        .notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    phoneNumber: (0, pg_core_1.varchar)('phone_number', { length: 50 }).notNull().unique(),
    whatsappJid: (0, pg_core_1.varchar)('whatsapp_jid', { length: 100 }),
    avatarUrl: (0, pg_core_1.text)('avatar_url'),
    source: (0, pg_core_1.varchar)('source', { length: 100 }).default('direct'),
    metadata: (0, pg_core_1.jsonb)('metadata').$type().default({}),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
