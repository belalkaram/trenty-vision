import { pgTable, uuid, varchar, boolean, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';

export const automationRules = pgTable('automation_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  triggerType: varchar('trigger_type', { length: 50 }).notNull(), // 'incoming_message', 'keyword', 'new_lead', etc.
  conditions: jsonb('conditions').$type<Record<string, any>>().notNull().default({}),
  actions: jsonb('actions').$type<Record<string, any>[]>().notNull().default([]),
  priority: integer('priority').default(0).notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  scope: varchar('scope', { length: 50 }).default('global').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type AutomationRule = typeof automationRules.$inferSelect;
export type NewAutomationRule = typeof automationRules.$inferInsert;
