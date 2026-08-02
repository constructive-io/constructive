DROP SCHEMA IF EXISTS c_invoker_view_no_write CASCADE;
CREATE SCHEMA c_invoker_view_no_write;

DO $$ BEGIN
  CREATE ROLE c_invoker_write_owner NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA c_invoker_view_no_write
  TO corpus_anon, corpus_user, c_invoker_write_owner;

CREATE TABLE c_invoker_view_no_write.submissions (
  id bigserial PRIMARY KEY,
  author text NOT NULL,
  body text NOT NULL
);
ALTER TABLE c_invoker_view_no_write.submissions OWNER TO c_invoker_write_owner;
ALTER TABLE c_invoker_view_no_write.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY submissions_own_rows ON c_invoker_view_no_write.submissions
  FOR ALL TO corpus_user
  USING (author = (SELECT current_setting('app.author', true)))
  WITH CHECK (author = (SELECT current_setting('app.author', true)));
CREATE INDEX submissions_author_idx ON c_invoker_view_no_write.submissions (author);
GRANT SELECT, INSERT ON c_invoker_view_no_write.submissions TO corpus_user;
GRANT USAGE ON SEQUENCE c_invoker_view_no_write.submissions_id_seq TO corpus_user;

-- The same auto-updatable shape as case 27, with the one difference that
-- matters: `security_invoker` sends the rewritten insert through the caller's
-- own privileges, so corpus_anon's INSERT on the view is denied on
-- `submissions` exactly as a direct insert would be. There is no write edge
-- here, and a rule that reported one would be flagging a correct schema.
CREATE VIEW c_invoker_view_no_write.submission_inbox
  WITH (security_invoker = true) AS
  SELECT id, author, body FROM c_invoker_view_no_write.submissions;
ALTER VIEW c_invoker_view_no_write.submission_inbox OWNER TO c_invoker_write_owner;
GRANT INSERT ON c_invoker_view_no_write.submission_inbox TO corpus_anon;
