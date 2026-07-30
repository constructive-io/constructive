-- Revert schemas/app_auth/schema from pg

BEGIN;

DROP SCHEMA app_auth;

COMMIT;
