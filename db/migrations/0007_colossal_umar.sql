CREATE TABLE "onedrive_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"microsoft_account_id" text NOT NULL,
	"microsoft_email" text,
	"microsoft_display_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "onedrive_connections_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE INDEX "onedrive_connections_user_id_idx" ON "onedrive_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "onedrive_connections_is_active_idx" ON "onedrive_connections" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "documents" DROP COLUMN "smart_summary";--> statement-breakpoint
ALTER TABLE "documents" DROP COLUMN "full_analysis";