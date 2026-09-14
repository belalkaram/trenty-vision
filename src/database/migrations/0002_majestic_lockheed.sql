
CREATE INDEX IF NOT EXISTS "conversations_contact_id_idx" ON "conversations" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_assigned_employee_id_idx" ON "conversations" USING btree ("assigned_employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_status_idx" ON "conversations" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_created_at_idx" ON "conversations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_whatsapp_msg_id_idx" ON "messages" USING btree ("whatsapp_message_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_conversation_id_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_sender_type_idx" ON "messages" USING btree ("sender_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_created_at_idx" ON "messages" USING btree ("created_at");