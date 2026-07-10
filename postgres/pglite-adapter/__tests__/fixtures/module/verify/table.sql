-- Verify pglite-adapter-fixture:table on pg

SELECT 1/COUNT(*) FROM information_schema.tables
WHERE table_schema = 'test_app' AND table_name = 'users';
