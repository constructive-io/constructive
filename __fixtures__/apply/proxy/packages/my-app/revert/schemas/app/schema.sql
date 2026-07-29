-- Revert schemas/app/schema from pg

BEGIN;

DROP SCHEMA app;

COMMIT;
