-- Revert schemas/vault/schema from pg

BEGIN;

DROP SCHEMA vault;

COMMIT;
