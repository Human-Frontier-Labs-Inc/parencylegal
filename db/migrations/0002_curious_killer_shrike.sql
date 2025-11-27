CREATE TYPE "public"."processing_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "document_processing_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"case_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"next_retry_at" timestamp,
	"processing_time_ms" integer,
	"tokens_used" integer,
	"model_used" text
);
--> statement-breakpoint
ALTER TABLE "document_processing_queue" ADD CONSTRAINT "document_processing_queue_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_processing_queue" ADD CONSTRAINT "document_processing_queue_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dpq_status_idx" ON "document_processing_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dpq_case_id_idx" ON "document_processing_queue" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "dpq_document_id_idx" ON "document_processing_queue" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "dpq_priority_status_idx" ON "document_processing_queue" USING btree ("priority","status");--> statement-breakpoint
CREATE INDEX "dpq_next_retry_idx" ON "document_processing_queue" USING btree ("next_retry_at");