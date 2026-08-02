DROP SCHEMA IF EXISTS c_write_no_policy CASCADE;
CREATE SCHEMA c_write_no_policy;
GRANT USAGE ON SCHEMA c_write_no_policy TO corpus_user, corpus_anon;

CREATE TABLE c_write_no_policy.comments (
  id bigserial PRIMARY KEY,
  author_id uuid NOT NULL,
  body text
);
CREATE INDEX comments_author_idx ON c_write_no_policy.comments (author_id);
ALTER TABLE c_write_no_policy.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_write_no_policy.comments FORCE ROW LEVEL SECURITY;

CREATE POLICY comments_read ON c_write_no_policy.comments FOR SELECT TO corpus_user
  USING (author_id = (SELECT nullif(current_setting('jwt.claims.user_id', true), '')::uuid));

-- The flaw: INSERT/UPDATE are granted with no policy covering them.
GRANT SELECT, INSERT, UPDATE ON c_write_no_policy.comments TO corpus_user;
