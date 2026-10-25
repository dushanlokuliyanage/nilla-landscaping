ALTER TABLE "inquiries" ADD COLUMN "follow_up_status" text DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "follow_up_note" text;