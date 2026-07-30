-- Verify schemas/catalog/functions/product_slug on pg

BEGIN;

SELECT catalog.product_slug('00000000-0000-0000-0000-000000000000'::uuid);

ROLLBACK;
