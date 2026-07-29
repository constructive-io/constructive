-- Verify schemas/catalog/procedures/product_count on pg

BEGIN;

SELECT catalog.product_count();

ROLLBACK;
