DROP SCHEMA IF EXISTS c_invoker_trigger CASCADE;
CREATE SCHEMA c_invoker_trigger;

DO $$ BEGIN
  CREATE ROLE c_invoker_trigger_owner NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA c_invoker_trigger
  TO corpus_anon, corpus_user, c_invoker_trigger_owner;

CREATE TABLE c_invoker_trigger.submissions (
  id bigserial PRIMARY KEY,
  author text NOT NULL,
  body text NOT NULL
);
ALTER TABLE c_invoker_trigger.submissions OWNER TO c_invoker_trigger_owner;
ALTER TABLE c_invoker_trigger.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY submissions_own_rows ON c_invoker_trigger.submissions
  FOR ALL TO corpus_user
  USING (author = (SELECT current_setting('app.author', true)))
  WITH CHECK (author = (SELECT current_setting('app.author', true)));
CREATE INDEX submissions_author_idx ON c_invoker_trigger.submissions (author);
GRANT SELECT, INSERT ON c_invoker_trigger.submissions TO corpus_user;
GRANT USAGE ON SEQUENCE c_invoker_trigger.submissions_id_seq TO corpus_user;

-- The same trigger over the same shape, with the one difference that matters:
-- the trigger function is SECURITY INVOKER, so its body runs as the caller and
-- Postgres denies corpus_anon on `submissions` exactly as it would deny a
-- direct insert. The view here is *not* security_invoker, which is the point:
-- a view's owner does not decide who a trigger function's body runs as, and a
-- rule that read the view's setting instead of the function's would fire here.
CREATE FUNCTION c_invoker_trigger.tg_submission_inbox()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO c_invoker_trigger, pg_catalog
AS $$
BEGIN
  INSERT INTO c_invoker_trigger.submissions (author, body) VALUES (NEW.author, NEW.body);
  RETURN NEW;
END;
$$;
ALTER FUNCTION c_invoker_trigger.tg_submission_inbox() OWNER TO c_invoker_trigger_owner;

CREATE VIEW c_invoker_trigger.submission_inbox AS
  SELECT id, author, body FROM c_invoker_trigger.submissions;
ALTER VIEW c_invoker_trigger.submission_inbox OWNER TO c_invoker_trigger_owner;

CREATE TRIGGER submission_inbox_insert
  INSTEAD OF INSERT ON c_invoker_trigger.submission_inbox
  FOR EACH ROW EXECUTE FUNCTION c_invoker_trigger.tg_submission_inbox();

GRANT INSERT ON c_invoker_trigger.submission_inbox TO corpus_anon;
