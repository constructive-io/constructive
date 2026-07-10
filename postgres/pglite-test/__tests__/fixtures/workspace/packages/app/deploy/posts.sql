-- Deploy app:posts to pg

-- requires: schema

BEGIN;

CREATE TABLE app.posts (
    id SERIAL PRIMARY KEY,
    owner_id TEXT NOT NULL,
    title TEXT NOT NULL
);

ALTER TABLE app.posts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON app.posts TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE app.posts_id_seq TO authenticated;

CREATE POLICY posts_owner ON app.posts
    USING (owner_id = current_setting('jwt.claims.user_id', true));

COMMIT;
