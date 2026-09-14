import { pgTable, uuid, varchar, timestamp, pgEnum, jsonb, AnyPgColumn } from 'drizzle-orm/pg-core';
import { users } from './users';
import { companies } from './companies';
import { departments } from './departments';
import { stations } from './stations';

export const employeeStatusEnum = pgEnum('employee_status', ['active', 'inactive', 'away', 'offline']);

export const employees = pgTable('employees', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  companyId: uuid('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
  stationId: uuid('station_id').references(() => stations.id, { onDelete: 'set null' }),
  supervisorId: uuid('supervisor_id').references((): AnyPgColumn => employees.id, { onDelete: 'set null' }),
  whatsappNumber: varchar('whatsapp_number', { length: 50 }),
  status: employeeStatusEnum('status').default('offline').notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
