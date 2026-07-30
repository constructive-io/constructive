-- Verify schemas/identity/tables/users/table on pg

BEGIN;

SELECT id FROM identity.users WHERE FALSE;

ROLLBACK;
