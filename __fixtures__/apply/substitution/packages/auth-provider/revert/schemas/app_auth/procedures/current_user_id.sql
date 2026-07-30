-- Revert schemas/app_auth/procedures/current_user_id from pg

BEGIN;

DROP FUNCTION app_auth.current_user_id();

COMMIT;
