-- Revert schemas/vault/functions/hash_pw from pg

BEGIN;

DROP FUNCTION vault.hash_pw(text);

COMMIT;
