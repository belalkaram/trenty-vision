ALTER TABLE "stations" ADD COLUMN IF NOT EXISTS "code" varchar(50);--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN IF NOT EXISTS "color" varchar(50) DEFAULT '#1c9770';--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN IF NOT EXISTS "max_capacity" integer DEFAULT 20;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN IF NOT EXISTS "routing_weight" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb;
