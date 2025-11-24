CREATE TYPE "public"."membership" AS ENUM('trial', 'solo', 'small_firm', 'enterprise');--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email" text,
	"full_name" text,
	"firm_name" text,
	"membership" "membership" DEFAULT 'trial' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_price_id" text,
	"plan_duration" text,
	"billing_cycle_start" timestamp,
	"billing_cycle_end" timestamp,
	"next_credit_renewal" timestamp,
	"documents_processed_this_month" integer DEFAULT 0,
	"document_limit" integer DEFAULT 500,
	"seats_used" integer DEFAULT 1,
	"seats_limit" integer DEFAULT 1,
	"trial_ends_at" timestamp,
	"trial_started_at" timestamp,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"client_name" text,
	"opposing_party" text,
	"case_number" text,
	"status" text DEFAULT 'active' NOT NULL,
	"dropbox_folder_path" text,
	"dropbox_folder_id" text,
	"last_synced_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"user_id" text NOT NULL,
	"source" text DEFAULT 'dropbox' NOT NULL,
	"dropbox_file_id" text,
	"dropbox_file_path" text,
	"dropbox_rev" text,
	"file_name" text NOT NULL,
	"file_type" text,
	"file_size" integer,
	"storage_path" text NOT NULL,
	"storage_url" text,
	"document_date" timestamp,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"category" text,
	"subtype" text,
	"confidence" integer,
	"needs_review" boolean DEFAULT false,
	"reviewed_at" timestamp,
	"reviewed_by" text,
	"metadata" jsonb,
	"classification_history" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discovery_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"number" integer NOT NULL,
	"text" text NOT NULL,
	"category_hint" text,
	"status" text DEFAULT 'incomplete' NOT NULL,
	"completion_percentage" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_request_mappings" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"request_id" text NOT NULL,
	"case_id" text NOT NULL,
	"user_id" text NOT NULL,
	"source" text NOT NULL,
	"confidence" integer,
	"reasoning" text,
	"status" text DEFAULT 'suggested' NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_chat_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb,
	"total_input_tokens" integer DEFAULT 0,
	"total_output_tokens" integer DEFAULT 0,
	"cached_input_tokens" integer DEFAULT 0,
	"total_cost" integer DEFAULT 0,
	"metadata" jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sync_history" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"user_id" text NOT NULL,
	"source" text DEFAULT 'dropbox' NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"files_found" integer DEFAULT 0,
	"files_new" integer DEFAULT 0,
	"files_updated" integer DEFAULT 0,
	"files_skipped" integer DEFAULT 0,
	"files_error" integer DEFAULT 0,
	"errors" jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration_ms" integer,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "dropbox_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"dropbox_account_id" text NOT NULL,
	"dropbox_email" text,
	"dropbox_display_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dropbox_connections_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_requests" ADD CONSTRAINT "discovery_requests_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_request_mappings" ADD CONSTRAINT "document_request_mappings_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_request_mappings" ADD CONSTRAINT "document_request_mappings_request_id_discovery_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."discovery_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_history" ADD CONSTRAINT "sync_history_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cases_user_id_idx" ON "cases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cases_status_idx" ON "cases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "documents_case_id_idx" ON "documents" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "documents_user_id_idx" ON "documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "documents_category_idx" ON "documents" USING btree ("category");--> statement-breakpoint
CREATE INDEX "documents_needs_review_idx" ON "documents" USING btree ("needs_review");--> statement-breakpoint
CREATE INDEX "documents_dropbox_file_id_idx" ON "documents" USING btree ("dropbox_file_id");--> statement-breakpoint
CREATE INDEX "discovery_requests_case_id_idx" ON "discovery_requests" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "discovery_requests_user_id_idx" ON "discovery_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "discovery_requests_status_idx" ON "discovery_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "discovery_requests_unique_number" ON "discovery_requests" USING btree ("case_id","type","number");--> statement-breakpoint
CREATE INDEX "document_mappings_document_id_idx" ON "document_request_mappings" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_mappings_request_id_idx" ON "document_request_mappings" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "document_mappings_case_id_idx" ON "document_request_mappings" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "document_mappings_status_idx" ON "document_request_mappings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "document_mappings_unique" ON "document_request_mappings" USING btree ("document_id","request_id");--> statement-breakpoint
CREATE INDEX "ai_sessions_case_id_idx" ON "ai_chat_sessions" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "ai_sessions_user_id_idx" ON "ai_chat_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_sessions_type_idx" ON "ai_chat_sessions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "ai_sessions_status_idx" ON "ai_chat_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sync_history_case_id_idx" ON "sync_history" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "sync_history_user_id_idx" ON "sync_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sync_history_status_idx" ON "sync_history" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sync_history_started_at_idx" ON "sync_history" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "dropbox_connections_user_id_idx" ON "dropbox_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dropbox_connections_is_active_idx" ON "dropbox_connections" USING btree ("is_active");