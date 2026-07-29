-- Revert schemas/users/procedures/account_count from pg

BEGIN;

DROP FUNCTION users.account_count;

COMMIT;
