-- Verify schemas/app/functions/hash_pw on pg

BEGIN;

SELECT app.hash_pw('probe');

ROLLBACK;
