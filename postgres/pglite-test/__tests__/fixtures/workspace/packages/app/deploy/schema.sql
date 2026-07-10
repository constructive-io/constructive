-- Deploy app:schema to pg

BEGIN;

CREATE SCHEMA app;
GRANT USAGE ON SCHEMA app TO authenticated;

COMMIT;
