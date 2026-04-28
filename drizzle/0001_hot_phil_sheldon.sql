ALTER TABLE "users" ADD COLUMN "current_period_start" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "current_period_end" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "credits_used_this_period" integer DEFAULT 0;