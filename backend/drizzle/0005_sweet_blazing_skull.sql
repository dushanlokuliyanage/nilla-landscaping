CREATE TABLE "videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"category" text DEFAULT 'Landscaping' NOT NULL,
	"facebook_url" text NOT NULL,
	"thumbnail_url" text DEFAULT '' NOT NULL,
	"preview_url" text,
	"orientation" text DEFAULT 'vertical' NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
