-- Revert schemas/users/schema from pg

BEGIN;

DROP SCHEMA users;

COMMIT;
