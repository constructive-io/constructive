-- Test table for child inflection (testing singular table name)
BEGIN;
CREATE EXTENSION IF NOT EXISTS citext;
DROP SCHEMA IF EXISTS app_public CASCADE;
CREATE SCHEMA app_public;

CREATE TABLE app_public.child (
    id serial PRIMARY KEY,
    name text NOT NULL,
    parent_id bigint
);

COMMIT;

