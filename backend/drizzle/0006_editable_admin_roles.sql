CREATE TABLE "admin_roles" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

INSERT INTO "admin_roles" ("key", "name", "description", "is_active", "is_system", "permissions") VALUES
	('owner', 'Owner', 'Full access to every admin area and setting.', true, true, '["*"]'::jsonb),
	('manager', 'Manager', 'Manage inquiries, products, orders, and review logs.', true, true, '["inquiries.read", "inquiries.manage", "products.manage", "orders.read", "orders.manage", "logs.read"]'::jsonb),
	('staff', 'Staff', 'Handle customer inquiries and orders.', true, true, '["inquiries.read", "inquiries.manage", "orders.read", "orders.manage"]'::jsonb);
