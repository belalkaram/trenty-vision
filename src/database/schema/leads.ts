import { pgTable, uuid, varchar, timestamp, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { contacts } from './contacts';
import { employees } from './employees';
import { stations } from './stations';

export const leadStageEnum = pgEnum('lead_stage', ['new', 'contacted', 'qualified', 'waiting', 'converted', 'lost']);

export const leads = pgTable('leads', {
  id: uuid('id').defaultRandom().primaryKey(),
  externalId: varchar('external_id', { length: 150 }).unique(),
  contactId: uuid('contact_id')
    .references(() => contacts.id, { onDelete: 'cascade' })
    .notNull(),
  source: varchar('source', { length: 100 }).default('landing_page'),
  campaign: varchar('campaign', { length: 150 }),
  destination: varchar('destination', { length: 150 }),
  travelDate: varchar('travel_date', { length: 50 }),
  assignedEmployeeId: uuid('assigned_employee_id').references(() => employees.id, { onDelete: 'set null' }),
  supervisorId: uuid('supervisor_id').references(() => employees.id, { onDelete: 'set null' }),
  stationId: uuid('station_id').references(() => stations.id, { onDelete: 'set null' }),
  crmId: varchar('crm_id', { length: 150 }),
  stage: leadStageEnum('stage').default('new').notNull(),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
