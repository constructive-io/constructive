-- Verify schemas/catalog/schema on pg

BEGIN;

SELECT pg_catalog.has_schema_privilege('catalog', 'usage');

ROLLBACK;
