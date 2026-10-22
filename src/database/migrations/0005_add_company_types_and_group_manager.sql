-- Add company type column
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "type" varchar(30) DEFAULT 'crm' NOT NULL;

-- Create group_jobs table for tracking extract/add operations
CREATE TABLE IF NOT EXISTS "group_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "type" varchar(30) NOT NULL,
  "source_group_jid" varchar(255),
  "target_group_jid" varchar(255),
  "source_group_name" varchar(500),
  "target_group_name" varchar(500),
  "status" varchar(30) DEFAULT 'pending' NOT NULL,
  "total_contacts" integer DEFAULT 0,
  "processed_contacts" integer DEFAULT 0,
  "failed_contacts" integer DEFAULT 0,
  "error_message" text,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone
);

-- Create group_extracted_contacts table
CREATE TABLE IF NOT EXISTS "group_extracted_contacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "job_id" uuid REFERENCES "group_jobs"("id") ON DELETE CASCADE,
  "phone_number" varchar(50) NOT NULL,
  "display_name" varchar(255),
  "group_jid" varchar(255) NOT NULL,
  "group_name" varchar(500),
  "is_admin" boolean DEFAULT false,
  "added_to_target" boolean DEFAULT false,
  "add_error" text,
  "extracted_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_group_jobs_company" ON "group_jobs" ("company_id");
CREATE INDEX IF NOT EXISTS "idx_group_jobs_status" ON "group_jobs" ("status");
CREATE INDEX IF NOT EXISTS "idx_group_extracted_company" ON "group_extracted_contacts" ("company_id");
CREATE INDEX IF NOT EXISTS "idx_group_extracted_job" ON "group_extracted_contacts" ("job_id");
CREATE INDEX IF NOT EXISTS "idx_group_extracted_phone" ON "group_extracted_contacts" ("phone_number");
CREATE INDEX IF NOT EXISTS "idx_companies_type" ON "companies" ("type");
