DROP SCHEMA IF EXISTS c_definer_view_write CASCADE;
CREATE SCHEMA c_definer_view_write;

-- The role the view executes as, and the owner of the table behind it.
DO $$ BEGIN
  CREATE ROLE c_view_write_owner NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA c_definer_view_write TO corpus_anon, corpus_user, c_view_write_owner;

CREATE TABLE c_definer_view_write.submissions (
  id bigserial PRIMARY KEY,
  author text NOT NULL,
  body text NOT NULL
);
ALTER TABLE c_definer_view_write.submissions OWNER TO c_view_write_owner;
ALTER TABLE c_definer_view_write.submissions ENABLE ROW LEVEL SECURITY;

-- Signed-in users write their own rows and read them back. corpus_anon holds
-- no grant on the table at all.
CREATE POLICY submissions_own_rows ON c_definer_view_write.submissions
  FOR ALL TO corpus_user
  USING (author = (SELECT current_setting('app.author', true)))
  WITH CHECK (author = (SELECT current_setting('app.author', true)));
CREATE INDEX submissions_author_idx ON c_definer_view_write.submissions (author);
GRANT SELECT, INSERT ON c_definer_view_write.submissions TO corpus_user;
GRANT USAGE ON SEQUENCE c_definer_view_write.submissions_id_seq TO corpus_user;

-- The flaw: a simple view over one table is *auto-updatable*, so Postgres
-- rewrites an INSERT on the view into an INSERT on `submissions` — and because
-- the view is not `security_invoker`, that insert is permission-checked
-- against the view's owner, who owns the table. corpus_anon holds nothing but
-- INSERT on the view, and writes rows no policy of `submissions` would have
-- admitted from it. Nothing in the body says so: the write path is
-- `pg_relation_is_updatable`, not `pg_get_viewdef`.
CREATE VIEW c_definer_view_write.submission_inbox AS
  SELECT id, author, body FROM c_definer_view_write.submissions;
ALTER VIEW c_definer_view_write.submission_inbox OWNER TO c_view_write_owner;
GRANT INSERT ON c_definer_view_write.submission_inbox TO corpus_anon;
