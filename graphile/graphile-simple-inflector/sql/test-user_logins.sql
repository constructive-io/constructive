-- Test table for user_logins inflection (testing plural table name)
BEGIN;
CREATE EXTENSION IF NOT EXISTS citext;
DROP SCHEMA IF EXISTS app_public CASCADE;
CREATE SCHEMA app_public;

CREATE TABLE app_public.user_logins (
    id serial PRIMARY KEY,
    user_id bigint NOT NULL,
    login_time timestamptz NOT NULL DEFAULT now()
);

COMMIT;

