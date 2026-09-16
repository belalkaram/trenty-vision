-- Migration 0004: Multi-Tenant Architecture
-- 1. Companies additions
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "slug" varchar(100);
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "logo_url" text;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "status" varchar(30) DEFAULT 'active' NOT NULL;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "subscription_plan" varchar(50) DEFAULT 'standard';
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "max_users" integer DEFAULT 10;
CREATE UNIQUE INDEX IF NOT EXISTS "companies_slug_idx" ON "companies" ("slug");

-- Ensure at least one default company exists
INSERT INTO "companies" ("id", "name", "slug", "status", "timezone")
VALUES ('00000000-0000-0000-0000-000000000001', 'Trenty Vision', 'trenty-vision', 'active', 'Asia/Kuwait')
ON CONFLICT ("id") DO NOTHING;

-- 2. Users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "company_id" uuid;
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
ALTER TABLE "users" ALTER COLUMN "role_id" DROP NOT NULL;
UPDATE "users" SET "company_id" = (SELECT "id" FROM "companies" ORDER BY "created_at" ASC LIMIT 1) WHERE "company_id" IS NULL;

-- 3. Roles
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "company_id" uuid;
DO $$ BEGIN
  ALTER TABLE "roles" ADD CONSTRAINT "roles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "roles_name_unique";
UPDATE "roles" SET "company_id" = (SELECT "id" FROM "companies" ORDER BY "created_at" ASC LIMIT 1) WHERE "company_id" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "roles_company_name_idx" ON "roles" ("company_id", "name");

-- 4. Permissions
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "company_id" uuid;
DO $$ BEGIN
  ALTER TABLE "permissions" ADD CONSTRAINT "permissions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "permissions_name_unique";
UPDATE "permissions" SET "company_id" = (SELECT "id" FROM "companies" ORDER BY "created_at" ASC LIMIT 1) WHERE "company_id" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "permissions_company_name_idx" ON "permissions" ("company_id", "name");

-- 5. Settings
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "company_id" uuid;
DO $$ BEGIN
  ALTER TABLE "settings" ADD CONSTRAINT "settings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
ALTER TABLE "settings" DROP CONSTRAINT IF EXISTS "settings_key_unique";
UPDATE "settings" SET "company_id" = (SELECT "id" FROM "companies" ORDER BY "created_at" ASC LIMIT 1) WHERE "company_id" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "settings_company_key_idx" ON "settings" ("company_id", "key");

-- 6. Tags
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "company_id" uuid;
DO $$ BEGIN
  ALTER TABLE "tags" ADD CONSTRAINT "tags_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
ALTER TABLE "tags" DROP CONSTRAINT IF EXISTS "tags_name_unique";
UPDATE "tags" SET "company_id" = (SELECT "id" FROM "companies" ORDER BY "created_at" ASC LIMIT 1) WHERE "company_id" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "tags_company_name_idx" ON "tags" ("company_id", "name");

-- 7. Quick Replies
ALTER TABLE "quick_replies" ADD COLUMN IF NOT EXISTS "company_id" uuid;
DO $$ BEGIN
  ALTER TABLE "quick_replies" ADD CONSTRAINT "quick_replies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
ALTER TABLE "quick_replies" DROP CONSTRAINT IF EXISTS "quick_replies_shortcut_unique";
UPDATE "quick_replies" SET "company_id" = (SELECT "id" FROM "companies" ORDER BY "created_at" ASC LIMIT 1) WHERE "company_id" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "quick_replies_company_shortcut_idx" ON "quick_replies" ("company_id", "shortcut");

-- 8. Automation Rules
ALTER TABLE "automation_rules" ADD COLUMN IF NOT EXISTS "company_id" uuid;
DO $$ BEGIN
  ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
UPDATE "automation_rules" SET "company_id" = (SELECT "id" FROM "companies" ORDER BY "created_at" ASC LIMIT 1) WHERE "company_id" IS NULL;

-- 9. Audit Logs
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "company_id" uuid;
DO $$ BEGIN
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
UPDATE "audit_logs" SET "company_id" = (SELECT "id" FROM "companies" ORDER BY "created_at" ASC LIMIT 1) WHERE "company_id" IS NULL;

-- 10. Reminders
ALTER TABLE "reminders" ADD COLUMN IF NOT EXISTS "company_id" uuid;
DO $$ BEGIN
  ALTER TABLE "reminders" ADD CONSTRAINT "reminders_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
UPDATE "reminders" SET "company_id" = (SELECT "id" FROM "companies" ORDER BY "created_at" ASC LIMIT 1) WHERE "company_id" IS NULL;

-- 11. Notifications
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "company_id" uuid;
DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
UPDATE "notifications" SET "company_id" = (SELECT "id" FROM "companies" ORDER BY "created_at" ASC LIMIT 1) WHERE "company_id" IS NULL;

-- 12. CRM Connections & Sync Logs
ALTER TABLE "crm_connections" ADD COLUMN IF NOT EXISTS "company_id" uuid;
DO $$ BEGIN
  ALTER TABLE "crm_connections" ADD CONSTRAINT "crm_connections_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
UPDATE "crm_connections" SET "company_id" = (SELECT "id" FROM "companies" ORDER BY "created_at" ASC LIMIT 1) WHERE "company_id" IS NULL;

ALTER TABLE "crm_sync_logs" ADD COLUMN IF NOT EXISTS "company_id" uuid;
DO $$ BEGIN
  ALTER TABLE "crm_sync_logs" ADD CONSTRAINT "crm_sync_logs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
UPDATE "crm_sync_logs" SET "company_id" = (SELECT "id" FROM "companies" ORDER BY "created_at" ASC LIMIT 1) WHERE "company_id" IS NULL;

-- 13. Leads
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "company_id" uuid;
DO $$ BEGIN
  ALTER TABLE "leads" ADD CONSTRAINT "leads_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
UPDATE "leads" SET "company_id" = (SELECT "id" FROM "companies" ORDER BY "created_at" ASC LIMIT 1) WHERE "company_id" IS NULL;
