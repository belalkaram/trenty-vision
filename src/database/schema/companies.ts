import { pgTable, uuid, varchar, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique(),
  logoUrl: text('logo_url'),
  status: varchar('status', { length: 30 }).default('active').notNull(),
  subscriptionPlan: varchar('subscription_plan', { length: 50 }).default('standard'),
  maxUsers: integer('max_users').default(10),
  timezone: varchar('timezone', { length: 100 }).notNull().default('Asia/Kuwait'),
  settings: jsonb('settings').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
