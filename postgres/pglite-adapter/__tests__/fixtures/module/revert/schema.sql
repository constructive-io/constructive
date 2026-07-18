-- Revert pglite-adapter-fixture:schema from pg

BEGIN;

DROP SCHEMA test_app CASCADE;

COMMIT;
