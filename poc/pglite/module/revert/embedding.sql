-- Revert test-simple:embedding from pg
BEGIN;
ALTER TABLE test_app.users DROP COLUMN embedding;
COMMIT;
