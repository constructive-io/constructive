-- Test table for regimens inflection (testing plural table name)
BEGIN;
CREATE EXTENSION IF NOT EXISTS citext;
DROP SCHEMA IF EXISTS app_public CASCADE;
CREATE SCHEMA app_public;

CREATE TABLE app_public.regimens (
    id serial PRIMARY KEY,
    name text NOT NULL
);

COMMIT;

