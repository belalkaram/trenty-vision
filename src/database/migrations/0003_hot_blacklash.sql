CREATE TABLE IF NOT EXISTS "outbound_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"account_id" uuid,
	"conversation_id" uuid,
	"message_id" uuid,
	"to_jid" varchar(100) NOT NULL,
	"type" varchar(20) DEFAULT 'text' NOT NULL,
	"text" text,
	"media_data" text,
	"media_mime" varchar(100),
	"media_filename" varchar(255),
	"caption" text,
	"quoted_message_id" varchar(150),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bridge_commands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"account_id" uuid,
	"action" varchar(50) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"result" jsonb,
	"error" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bridge_heartbeats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"bridge_id" varchar(100) NOT NULL,
	"is_online" boolean DEFAULT true NOT NULL,
	"version" varchar(20) DEFAULT '1.0.0' NOT NULL,
	"uptime_seconds" integer DEFAULT 0 NOT NULL,
	"accounts_summary" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trial_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "whatsapp_accounts" ADD COLUMN IF NOT EXISTS "bridge_status" varchar(20) DEFAULT 'unknown';--> statement-breakpoint
ALTER TABLE "whatsapp_accounts" ADD COLUMN IF NOT EXISTS "bridge_last_seen" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "whatsapp_accounts" ADD COLUMN IF NOT EXISTS "bridge_qr_code" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outbound_queue" ADD CONSTRAINT "outbound_queue_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outbound_queue" ADD CONSTRAINT "outbound_queue_account_id_whatsapp_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."whatsapp_accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outbound_queue" ADD CONSTRAINT "outbound_queue_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outbound_queue" ADD CONSTRAINT "outbound_queue_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bridge_commands" ADD CONSTRAINT "bridge_commands_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bridge_commands" ADD CONSTRAINT "bridge_commands_account_id_whatsapp_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."whatsapp_accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bridge_heartbeats" ADD CONSTRAINT "bridge_heartbeats_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outbound_queue_status_idx" ON "outbound_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outbound_queue_company_idx" ON "outbound_queue" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outbound_queue_created_at_idx" ON "outbound_queue" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outbound_queue_account_idx" ON "outbound_queue" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bridge_commands_status_idx" ON "bridge_commands" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bridge_commands_company_idx" ON "bridge_commands" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bridge_commands_created_at_idx" ON "bridge_commands" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bridge_heartbeats_company_idx" ON "bridge_heartbeats" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bridge_heartbeats_last_seen_idx" ON "bridge_heartbeats" USING btree ("last_seen_at");