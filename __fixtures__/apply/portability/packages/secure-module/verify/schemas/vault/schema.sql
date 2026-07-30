-- Verify schemas/vault/schema on pg

BEGIN;

SELECT pg_catalog.has_schema_privilege('vault', 'usage');

ROLLBACK;
