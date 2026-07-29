-- Revert schemas/catalog/procedures/product_count from pg

BEGIN;

DROP FUNCTION catalog.product_count;

COMMIT;
