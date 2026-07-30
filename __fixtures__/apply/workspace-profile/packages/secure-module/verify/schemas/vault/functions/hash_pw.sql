-- Verify schemas/vault/functions/hash_pw on pg

BEGIN;

SELECT vault.hash_pw('probe');

ROLLBACK;
