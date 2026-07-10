-- Verify pglite-adapter-fixture:schema on pg

SELECT 1/COUNT(*) FROM information_schema.schemata WHERE schema_name = 'test_app';
