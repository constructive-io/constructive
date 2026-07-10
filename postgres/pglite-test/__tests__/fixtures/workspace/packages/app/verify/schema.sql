-- Verify app:schema

BEGIN;

SELECT 1 / count(*) FROM information_schema.schemata WHERE schema_name = 'app';

ROLLBACK;
