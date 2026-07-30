-- Verify schemas/identity/procedures/current_actor on pg

BEGIN;

SELECT identity.current_actor();

ROLLBACK;
