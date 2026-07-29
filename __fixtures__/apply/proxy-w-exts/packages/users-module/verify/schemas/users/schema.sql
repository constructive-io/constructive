-- Verify schemas/users/schema on pg

BEGIN;

SELECT pg_catalog.has_schema_privilege('users', 'usage');

ROLLBACK;
