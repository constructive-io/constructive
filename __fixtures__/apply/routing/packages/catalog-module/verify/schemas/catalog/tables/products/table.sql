-- Verify schemas/catalog/tables/products/table on pg

BEGIN;

SELECT id, name FROM catalog.products WHERE FALSE;

ROLLBACK;
