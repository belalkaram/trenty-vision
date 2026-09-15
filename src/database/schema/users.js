"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = exports.userStatusEnum = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var roles_1 = require("./roles");
exports.userStatusEnum = (0, pg_core_1.pgEnum)('user_status', ['active', 'inactive', 'suspended']);
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 150 }).notNull(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull().unique(),
    passwordHash: (0, pg_core_1.varchar)('password_hash', { length: 255 }).notNull(),
    roleId: (0, pg_core_1.uuid)('role_id')
        .references(function () { return roles_1.roles.id; }, { onDelete: 'restrict' })
        .notNull(),
    avatar: (0, pg_core_1.text)('avatar'),
    emailVerified: (0, pg_core_1.boolean)('email_verified').default(false).notNull(),
    emailToken: (0, pg_core_1.varchar)('email_token', { length: 255 }),
    resetToken: (0, pg_core_1.varchar)('reset_token', { length: 255 }),
    resetExpires: (0, pg_core_1.timestamp)('reset_expires', { withTimezone: true }),
    totpSecret: (0, pg_core_1.text)('totp_secret'),
    totpEnabled: (0, pg_core_1.boolean)('totp_enabled').default(false).notNull(),
    status: (0, exports.userStatusEnum)('status').default('active').notNull(),
    lastLoginAt: (0, pg_core_1.timestamp)('last_login_at', { withTimezone: true }),
    trialEndsAt: (0, pg_core_1.timestamp)('trial_ends_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
