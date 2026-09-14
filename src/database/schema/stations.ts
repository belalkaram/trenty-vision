import { pgTable, uuid, varchar, text, boolean, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { companies } from './companies';
import { departments } from './departments';

export const stations = pgTable('stations', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 150 }).notNull(),
  code: varchar('code', { length: 50 }),
  color: varchar('color', { length: 50 }).default('#1c9770'),
  description: text('description'),
  maxCapacity: integer('max_capacity').default(20),
  routingWeight: integer('routing_weight').default(1),
  active: boolean('active').default(true).notNull(),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Station = typeof stations.$inferSelect;
export type NewStation = typeof stations.$inferInsert;

