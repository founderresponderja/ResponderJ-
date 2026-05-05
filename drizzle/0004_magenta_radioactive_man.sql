CREATE TABLE "oauth_states" (
	"id" serial PRIMARY KEY NOT NULL,
	"state" text NOT NULL,
	"user_external_id" text NOT NULL,
	"platform" text NOT NULL,
	"establishment_id" integer,
	"meta" jsonb,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_states_state_unique" ON "oauth_states" USING btree ("state");--> statement-breakpoint
CREATE INDEX "oauth_states_expires_idx" ON "oauth_states" USING btree ("expires_at");