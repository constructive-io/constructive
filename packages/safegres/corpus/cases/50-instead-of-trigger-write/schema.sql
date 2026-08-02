DROP SCHEMA IF EXISTS c_trigger_write CASCADE;
CREATE SCHEMA c_trigger_write;

DO $$ BEGIN
  CREATE ROLE c_trigger_write_owner NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA c_trigger_write TO corpus_anon, corpus_user, c_trigger_write_owner;

CREATE TABLE c_trigger_write.submissions (
  id bigserial PRIMARY KEY,
  author text NOT NULL,
  body text NOT NULL
);
ALTER TABLE c_trigger_write.submissions OWNER TO c_trigger_write_owner;
ALTER TABLE c_trigger_write.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY submissions_own_rows ON c_trigger_write.submissions
  FOR ALL TO corpus_user
  USING (author = (SELECT current_setting('app.author', true)))
  WITH CHECK (author = (SELECT current_setting('app.author', true)));
CREATE INDEX submissions_author_idx ON c_trigger_write.submissions (author);
GRANT SELECT, INSERT ON c_trigger_write.submissions TO corpus_user;
GRANT USAGE ON SEQUENCE c_trigger_write.submissions_id_seq TO corpus_user;

-- The flaw, in the function rather than the view: an INSTEAD OF trigger
-- replaces the write against the view with this body, and the body is
-- permission-checked against whoever the *function* runs as. SECURITY DEFINER
-- makes that c_trigger_write_owner, so corpus_anon's INSERT on the view lands
-- in `submissions` under the table owner. The view's own owner and its
-- security_invoker setting do not enter into it.
CREATE FUNCTION c_trigger_write.tg_submission_inbox()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO c_trigger_write, pg_catalog
AS $$
BEGIN
  INSERT INTO c_trigger_write.submissions (author, body) VALUES (NEW.author, NEW.body);
  RETURN NEW;
END;
$$;
ALTER FUNCTION c_trigger_write.tg_submission_inbox() OWNER TO c_trigger_write_owner;

-- security_invoker, precisely so the finding cannot be attributed to the view:
-- the escalation is the trigger function's, and L9's auto-update path does not
-- apply to a view carrying INSTEAD OF triggers at all.
CREATE VIEW c_trigger_write.submission_inbox
  WITH (security_invoker = true) AS
  SELECT id, author, body FROM c_trigger_write.submissions;
ALTER VIEW c_trigger_write.submission_inbox OWNER TO c_trigger_write_owner;

CREATE TRIGGER submission_inbox_insert
  INSTEAD OF INSERT ON c_trigger_write.submission_inbox
  FOR EACH ROW EXECUTE FUNCTION c_trigger_write.tg_submission_inbox();

GRANT INSERT ON c_trigger_write.submission_inbox TO corpus_anon;
