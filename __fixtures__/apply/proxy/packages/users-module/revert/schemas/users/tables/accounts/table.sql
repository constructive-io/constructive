-- Revert schemas/users/tables/accounts/table from pg

BEGIN;

DROP TABLE users.accounts;

COMMIT;
