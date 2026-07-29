-- Verify schemas/users/procedures/account_count on pg

BEGIN;

SELECT users.account_count();

ROLLBACK;
