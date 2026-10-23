-- Create broadcast_campaigns table
CREATE TABLE IF NOT EXISTS "broadcast_campaigns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "whatsapp_account_id" uuid REFERENCES "whatsapp_accounts"("id") ON DELETE SET NULL,
  "name" varchar(255) NOT NULL,
  "message_type" varchar(30) DEFAULT 'text' NOT NULL,
  "message_content" text NOT NULL,
  "media_url" text,
  "media_filename" varchar(255),
  "status" varchar(30) DEFAULT 'draft' NOT NULL,
  "min_delay_seconds" integer DEFAULT 5 NOT NULL,
  "max_delay_seconds" integer DEFAULT 12 NOT NULL,
  "batch_size" integer DEFAULT 25 NOT NULL,
  "batch_sleep_seconds" integer DEFAULT 30 NOT NULL,
  "total_recipients" integer DEFAULT 0 NOT NULL,
  "sent_count" integer DEFAULT 0 NOT NULL,
  "failed_count" integer DEFAULT 0 NOT NULL,
  "pending_count" integer DEFAULT 0 NOT NULL,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create broadcast_recipients table
CREATE TABLE IF NOT EXISTS "broadcast_recipients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "campaign_id" uuid NOT NULL REFERENCES "broadcast_campaigns"("id") ON DELETE CASCADE,
  "phone_number" varchar(50) NOT NULL,
  "recipient_name" varchar(255),
  "status" varchar(30) DEFAULT 'pending' NOT NULL,
  "error_reason" text,
  "message_id" varchar(255),
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for high performance
CREATE INDEX IF NOT EXISTS "idx_broadcast_campaigns_company" ON "broadcast_campaigns" ("company_id");
CREATE INDEX IF NOT EXISTS "idx_broadcast_campaigns_status" ON "broadcast_campaigns" ("status");
CREATE INDEX IF NOT EXISTS "idx_broadcast_recipients_campaign" ON "broadcast_recipients" ("campaign_id");
CREATE INDEX IF NOT EXISTS "idx_broadcast_recipients_status" ON "broadcast_recipients" ("status");
CREATE INDEX IF NOT EXISTS "idx_broadcast_recipients_phone" ON "broadcast_recipients" ("phone_number");
