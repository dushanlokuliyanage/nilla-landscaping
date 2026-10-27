CREATE TABLE "quote_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"requested_services" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"quote_lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"valid_until" text,
	"terms" text DEFAULT 'Quotation is valid for 60 days.' NOT NULL,
	"warranty" text DEFAULT 'This project is covered by a 1-year warranty.' NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "quote_rates" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"unit" text NOT NULL,
	"rate" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

INSERT INTO "quote_rates" ("key", "label", "unit", "rate") VALUES
	('grass', 'Grass supply and installation', 'sq ft', 0),
	('interlock', 'Interlock paving', 'sq ft', 0),
	('plants', 'Plants', 'plant', 0),
	('other', 'Other works', 'job', 0),
	('transport', 'Transportation', 'job', 0);
