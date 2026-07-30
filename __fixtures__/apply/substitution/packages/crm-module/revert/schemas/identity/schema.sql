-- Revert schemas/identity/schema from pg

BEGIN;

DROP SCHEMA identity;

COMMIT;
