-- Revert schemas/app/functions/hash_pw from pg

BEGIN;

DROP FUNCTION app.hash_pw(text);

COMMIT;
