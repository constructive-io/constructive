-- Revert schemas/catalog/functions/product_slug from pg

BEGIN;

DROP FUNCTION catalog.product_slug(uuid);

COMMIT;
