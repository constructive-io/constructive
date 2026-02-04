-- Test table for user_regimen inflection (testing singular compound table name)
BEGIN;
CREATE EXTENSION IF NOT EXISTS citext;
DROP SCHEMA IF EXISTS app_public CASCADE;
CREATE SCHEMA app_public;

CREATE TABLE app_public.user_regimen (
    id serial PRIMARY KEY,
    user_id bigint NOT NULL,
    name text NOT NULL
);

COMMIT;

