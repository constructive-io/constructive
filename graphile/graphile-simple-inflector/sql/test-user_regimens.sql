-- Test table for user_regimens inflection (testing plural compound table name)
BEGIN;
CREATE EXTENSION IF NOT EXISTS citext;
DROP SCHEMA IF EXISTS app_public CASCADE;
CREATE SCHEMA app_public;

CREATE TABLE app_public.user_regimens (
    id serial PRIMARY KEY,
    user_id bigint NOT NULL,
    name text NOT NULL
);

COMMIT;

