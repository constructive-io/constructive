-- Revert schemas/catalog/schema from pg

BEGIN;

DROP SCHEMA catalog;

COMMIT;
