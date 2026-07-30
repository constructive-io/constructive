-- Revert schemas/catalog/tables/products/table from pg

BEGIN;

DROP TABLE catalog.products;

COMMIT;
