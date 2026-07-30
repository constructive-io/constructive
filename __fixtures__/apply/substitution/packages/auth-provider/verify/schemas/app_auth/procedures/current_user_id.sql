-- Verify schemas/app_auth/procedures/current_user_id on pg

BEGIN;

SELECT app_auth.current_user_id();

ROLLBACK;
