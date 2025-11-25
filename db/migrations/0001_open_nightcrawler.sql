ALTER TABLE "documents" ADD COLUMN "dropbox_path" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "dropbox_content_hash" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "synced_at" timestamp;