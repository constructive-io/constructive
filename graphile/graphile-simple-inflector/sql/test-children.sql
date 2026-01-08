-- Test table for children inflection (testing plural table name)
BEGIN;
CREATE EXTENSION IF NOT EXISTS citext;
DROP SCHEMA IF EXISTS app_public CASCADE;
CREATE SCHEMA app_public;

CREATE TABLE app_public.children (
    id serial PRIMARY KEY,
    name text NOT NULL,
    parent_id bigint
);

COMMIT;

