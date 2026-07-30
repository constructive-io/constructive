-- Verify schemas/app_auth/schema on pg

BEGIN;

SELECT pg_catalog.has_schema_privilege('app_auth', 'usage');

ROLLBACK;
