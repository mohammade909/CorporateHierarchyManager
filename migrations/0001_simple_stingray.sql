ALTER TABLE "users" ALTER COLUMN "zoom_user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "zoom_email" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "zoom_created_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "zoom_created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "zoom_integration_pending" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "zoom_integration_error" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;