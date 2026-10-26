ALTER TABLE "products"
ADD COLUMN "stock_quantity" integer DEFAULT 0 NOT NULL;

--> statement-breakpoint
-- Existing products had only a stock yes/no flag, so their exact counts are unknown.
-- Keep them unavailable until the owner enters each real count in the admin panel.
UPDATE "products"
SET "in_stock" = false,
    "stock_quantity" = 0;
