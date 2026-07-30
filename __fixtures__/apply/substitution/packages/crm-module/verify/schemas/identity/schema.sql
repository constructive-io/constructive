-- Verify schemas/identity/schema on pg

BEGIN;

SELECT pg_catalog.has_schema_privilege('identity', 'usage');

ROLLBACK;
