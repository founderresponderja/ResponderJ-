CREATE TABLE "agencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"owner_id" integer NOT NULL,
	"logo_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agency_admin_delegations" (
	"id" serial PRIMARY KEY NOT NULL,
	"agency_id" integer NOT NULL,
	"delegated_by" integer NOT NULL,
	"delegated_to" integer NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'active',
	"start_date" timestamp DEFAULT now(),
	"end_date" timestamp,
	"permissions" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agency_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"agency_id" integer NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"role" text DEFAULT 'member',
	"token" text NOT NULL,
	"status" text DEFAULT 'pending',
	"invited_by" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"accepted_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agency_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"agency_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'member',
	"status" text DEFAULT 'active',
	"permissions" text,
	"invited_by" integer,
	"joined_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"platform" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"trigger" jsonb NOT NULL,
	"action" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_triggered" timestamp,
	"trigger_count" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "corporate_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text,
	"media_urls" jsonb,
	"platforms" jsonb,
	"publish_results" jsonb,
	"status" text DEFAULT 'draft',
	"scheduled_for" timestamp,
	"published_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corporate_social_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"platform" text NOT NULL,
	"username" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"follower_count" integer DEFAULT 0,
	"is_connected" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"profile_image_url" text,
	"last_sync" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_packages" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"description" text,
	"credits" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"original_price" numeric(10, 2),
	"discount" integer,
	"features" jsonb,
	"is_popular" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"description" text,
	"related_response_id" integer,
	"stripe_payment_id" text,
	"stripe_payment_intent_id" text,
	"package_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_sequences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"status" text DEFAULT 'pending',
	"scheduled_at" timestamp NOT NULL,
	"sent_at" timestamp,
	"template_id" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "establishments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"type" text,
	"brand_tone" text,
	"response_guidelines" text,
	"forbidden_phrases" text,
	"platform_ids" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"vat_rate" numeric(5, 2) NOT NULL,
	"line_total" numeric(10, 2) NOT NULL,
	"vat_amount" numeric(10, 2) NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"product_code" text,
	"product_category" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"company_name" text NOT NULL,
	"company_nif" text NOT NULL,
	"company_address" text NOT NULL,
	"invoice_prefix" text DEFAULT 'FAT',
	"next_number" integer DEFAULT 1,
	"vat_rate" numeric(5, 2) DEFAULT '23.00',
	"withholding_tax_rate" numeric(5, 2) DEFAULT '0.00',
	"invoice_sequence" integer DEFAULT 1,
	"at_username" text,
	"at_password" text,
	"at_test_mode" boolean DEFAULT true,
	"invoice_email_enabled" boolean DEFAULT true,
	"default_vat_rate" numeric(5, 2) DEFAULT '23.00',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"settings_id" integer,
	"invoice_number" text NOT NULL,
	"invoice_series" text,
	"invoice_sequence_number" integer,
	"customer_name" text NOT NULL,
	"customer_vat_number" text,
	"customer_address" text,
	"customer_postal_code" text,
	"customer_city" text,
	"customer_country" text,
	"customer_email" text,
	"issue_date" timestamp NOT NULL,
	"due_date" timestamp NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"vat_amount" numeric(10, 2) NOT NULL,
	"withholding_amount" numeric(10, 2) DEFAULT '0.00',
	"total_amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'EUR',
	"payment_method" text,
	"payment_reference" text,
	"payment_date" timestamp,
	"status" text DEFAULT 'draft',
	"notes" text,
	"metadata" jsonb,
	"at_document_id" text,
	"at_validation_code" text,
	"at_qr_code" text,
	"at_submitted_at" timestamp,
	"at_error" text,
	"pdf_path" text,
	"email_sent" boolean DEFAULT false,
	"email_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"contact_name" text,
	"email" text NOT NULL,
	"phone" text,
	"website" text,
	"industry" text,
	"region" text,
	"business_type" text,
	"source" text DEFAULT 'manual',
	"status" text DEFAULT 'novo',
	"email_status" text DEFAULT 'pending',
	"first_email_sent_at" timestamp,
	"second_email_sent_at" timestamp,
	"third_email_sent_at" timestamp,
	"lead_score" integer DEFAULT 0,
	"ai_confidence" numeric(5, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_contents" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_key" text NOT NULL,
	"title" text,
	"content" text,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "page_contents_page_key_unique" UNIQUE("page_key")
);
--> statement-breakpoint
CREATE TABLE "quality_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"response_id" integer,
	"user_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"sentiment" text NOT NULL,
	"categories" text,
	"improvements" text,
	"comment" text,
	"is_useful" boolean,
	"platform" text,
	"response_time" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_rewards" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"referral_id" integer NOT NULL,
	"type" text NOT NULL,
	"credits" integer NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_id" integer NOT NULL,
	"referred_user_id" integer,
	"referral_code" text NOT NULL,
	"email" text,
	"status" text DEFAULT 'pending',
	"reward_amount" integer DEFAULT 0,
	"credits_earned" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "referrals_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "response_learning_patterns" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"language" text NOT NULL,
	"tone" text NOT NULL,
	"sentiment" text NOT NULL,
	"opening_style" text,
	"closing_style" text,
	"preferred_phrases" jsonb,
	"avoided_phrases" jsonb,
	"edit_count" integer DEFAULT 1,
	"last_edited_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "response_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"tone" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"review_id" integer,
	"user_id" integer NOT NULL,
	"variation_number" integer,
	"response_text" text NOT NULL,
	"tone" text,
	"language" text,
	"response_type" text,
	"customer_name" text,
	"visit_date" text,
	"product" text,
	"location" text,
	"credits_used" integer DEFAULT 1,
	"ai_model" text,
	"is_selected" boolean DEFAULT false,
	"is_published" boolean DEFAULT false,
	"published_at" timestamp,
	"approval_status" text DEFAULT 'pending',
	"original_response_text" text,
	"edit_count" integer DEFAULT 0,
	"learning_meta" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"establishment_id" integer,
	"platform" text NOT NULL,
	"external_id" text,
	"author_name" text,
	"rating" integer,
	"review_text" text,
	"language" text,
	"sentiment" text,
	"review_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sid" text PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp (6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_platform_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_external_id" text NOT NULL,
	"establishment_id" integer,
	"platform" text NOT NULL,
	"status" text DEFAULT 'connected',
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"meta" jsonb,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"price_monthly" numeric(10, 2) NOT NULL,
	"price_yearly" numeric(10, 2) NOT NULL,
	"monthly_responses" integer NOT NULL,
	"max_locations" integer DEFAULT 1,
	"max_users" integer DEFAULT 1,
	"features" jsonb,
	"byok_supported" boolean DEFAULT false,
	"has_api_access" boolean DEFAULT false,
	"has_priority_support" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"order_index" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plan_type" text NOT NULL,
	"status" text DEFAULT 'active',
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"stripe_subscription_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"company_name" text,
	"company_address" text,
	"phone" text,
	"nif" text,
	"role" text DEFAULT 'user',
	"is_active" boolean DEFAULT true,
	"is_admin" boolean DEFAULT false,
	"is_super_admin" boolean DEFAULT false,
	"is_agency_owner" boolean DEFAULT false,
	"email_verified" boolean DEFAULT false,
	"agency_id" integer,
	"credits" integer DEFAULT 0,
	"selected_plan" text DEFAULT 'trial',
	"subscription_plan" text DEFAULT 'trial',
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"email_verification_token" text,
	"password_reset_token" text,
	"password_reset_expires" timestamp,
	"profile_image_url" text,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "token_idx" ON "agency_invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "email_agency_idx" ON "agency_invitations" USING btree ("email","agency_id");--> statement-breakpoint
CREATE INDEX "agency_user_idx" ON "agency_members" USING btree ("agency_id","user_id");--> statement-breakpoint
CREATE INDEX "user_automation_rules_idx" ON "automation_rules" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_credit_tx_idx" ON "credit_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_tx_created_at_idx" ON "credit_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_email_sequence_idx" ON "email_sequences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_sequence_scheduled_idx" ON "email_sequences" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "establishment_user_id_idx" ON "establishments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invoice_items_idx" ON "invoice_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "user_invoice_idx" ON "invoices" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_number_idx" ON "invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "lead_email_idx" ON "leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX "lead_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_status_idx" ON "leads" USING btree ("email_status");--> statement-breakpoint
CREATE INDEX "referrer_idx" ON "referrals" USING btree ("referrer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_code_idx" ON "referrals" USING btree ("referral_code");--> statement-breakpoint
CREATE INDEX "learning_lookup_idx" ON "response_learning_patterns" USING btree ("user_id","language","tone","sentiment");--> statement-breakpoint
CREATE INDEX "user_responses_idx" ON "responses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "review_response_idx" ON "responses" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "review_establishment_id_idx" ON "reviews" USING btree ("establishment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "social_platform_user_unique" ON "social_platform_connections" USING btree ("user_external_id","platform","establishment_id");--> statement-breakpoint
CREATE INDEX "social_platform_platform_idx" ON "social_platform_connections" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "user_subscription_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "stripe_customer_idx" ON "users" USING btree ("stripe_customer_id");