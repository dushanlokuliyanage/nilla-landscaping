UPDATE "quote_rates"
SET "label" = 'Transportation from Hanwella', "unit" = 'km', "rate" = 300, "updated_at" = now()
WHERE "key" = 'transport';
