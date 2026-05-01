ALTER TABLE "responses" ADD COLUMN "attempts_count" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN "approved_at" timestamp;