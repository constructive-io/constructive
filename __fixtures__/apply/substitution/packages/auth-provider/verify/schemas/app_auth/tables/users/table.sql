-- Verify schemas/app_auth/tables/users/table on pg

BEGIN;

SELECT id, created_at FROM app_auth.users WHERE FALSE;

ROLLBACK;
