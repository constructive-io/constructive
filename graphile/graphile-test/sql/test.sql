BEGIN;
CREATE EXTENSION IF NOT EXISTS citext;
DROP SCHEMA IF EXISTS app_public CASCADE;
CREATE SCHEMA app_public;

CREATE TABLE app_public.users (
    id serial PRIMARY KEY,
    username citext NOT NULL,
    UNIQUE (username),
    CHECK (length(username) < 127)
);

-- PostGraphile v5 smart tag: use singular 'User' instead of 'UsersRow'
COMMENT ON TABLE app_public.users IS E'@name User';

COMMIT;

