-- Verify schemas/users/tables/accounts/table on pg

BEGIN;

SELECT id, email, created_at FROM users.accounts WHERE FALSE;

ROLLBACK;
