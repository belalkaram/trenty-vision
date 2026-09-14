ALTER TABLE "whatsapp_accounts" ADD COLUMN IF NOT EXISTS "is_primary_dispatcher" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_accounts" ADD COLUMN IF NOT EXISTS "dispatcher_slot" integer;
