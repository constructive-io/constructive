DROP SCHEMA IF EXISTS c_anon_write_grant CASCADE;
CREATE SCHEMA c_anon_write_grant;
GRANT USAGE ON SCHEMA c_anon_write_grant TO corpus_user, corpus_anon;

CREATE TABLE c_anon_write_grant.posts (
  id bigserial PRIMARY KEY,
  author_id uuid NOT NULL,
  body text NOT NULL
);
ALTER TABLE c_anon_write_grant.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_anon_write_grant.posts FORCE ROW LEVEL SECURITY;

CREATE POLICY posts_read ON c_anon_write_grant.posts FOR SELECT TO corpus_anon USING (true);
CREATE POLICY posts_write ON c_anon_write_grant.posts FOR INSERT TO corpus_user
  WITH CHECK (author_id = nullif(current_setting('jwt.claims.user_id', true), '')::uuid);

GRANT SELECT ON c_anon_write_grant.posts TO corpus_anon;
-- The flaw: the anonymous role can write, not just read.
GRANT INSERT ON c_anon_write_grant.posts TO corpus_anon;
