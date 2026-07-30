-- Revert schemas/identity/tables/users/table from pg

BEGIN;

DROP TABLE identity.users;

COMMIT;
