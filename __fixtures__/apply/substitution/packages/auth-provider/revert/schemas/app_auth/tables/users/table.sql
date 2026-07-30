-- Revert schemas/app_auth/tables/users/table from pg

BEGIN;

DROP TABLE app_auth.users;

COMMIT;
