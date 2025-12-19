BEGIN;

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP SCHEMA IF EXISTS constructive_gen CASCADE;
CREATE SCHEMA constructive_gen;

-- Users table
CREATE TABLE constructive_gen.users (
    id serial PRIMARY KEY,
    username citext NOT NULL UNIQUE CHECK (length(username) < 127),
    email citext,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Posts table
CREATE TABLE constructive_gen.posts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id int NOT NULL REFERENCES constructive_gen.users(id),
    title text NOT NULL,
    body text,
    published boolean DEFAULT false,
    published_at timestamptz
);

-- A simple view (to test classKind !== 'r')
CREATE VIEW constructive_gen.active_users AS
SELECT id, username FROM constructive_gen.users WHERE username IS NOT NULL;

-- A function (to test procedure introspection)
CREATE FUNCTION constructive_gen.user_count() RETURNS integer AS $$
BEGIN
  RETURN (SELECT count(*) FROM constructive_gen.users);
END;
$$ LANGUAGE plpgsql STABLE;

COMMIT;
