-- Verify test-simple:embedding on pg
BEGIN;
SELECT embedding::public.vector FROM test_app.users WHERE false;
COMMIT;
