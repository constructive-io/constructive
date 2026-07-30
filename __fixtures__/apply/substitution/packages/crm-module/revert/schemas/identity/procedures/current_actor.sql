-- Revert schemas/identity/procedures/current_actor from pg

BEGIN;

DROP FUNCTION identity.current_actor();

COMMIT;
