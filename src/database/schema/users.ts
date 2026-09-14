import { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { roles } from './roles';

export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'suspended']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  roleId: uuid('role_id')
    .references(() => roles.id, { onDelete: 'restrict' })
    .notNull(),
  avatar: text('avatar'),
  emailVerified: boolean('email_verified').default(false).notNull(),
  emailToken: varchar('email_token', { length: 255 }),
  resetToken: varchar('reset_token', { length: 255 }),
  resetExpires: timestamp('reset_expires', { withTimezone: true }),
  totpSecret: text('totp_secret'),
  totpEnabled: boolean('totp_enabled').default(false).notNull(),
  status: userStatusEnum('status').default('active').notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
