-- Revert pglite-adapter-fixture:table from pg

BEGIN;

DROP TABLE test_app.users;

COMMIT;
