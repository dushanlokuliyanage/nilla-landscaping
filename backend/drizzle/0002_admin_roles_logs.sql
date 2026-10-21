ALTER TABLE "admins" ADD COLUMN "role" text DEFAULT 'owner' NOT NULL;
ALTER TABLE "admins" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer,
	"admin_email" text NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "access_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer,
	"email" text NOT NULL,
	"event" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
