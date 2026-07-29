-- Verify schemas/reporting/schema on pg

BEGIN;

SELECT pg_catalog.has_schema_privilege('reporting', 'usage');

ROLLBACK;
