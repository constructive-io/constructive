DROP SCHEMA IF EXISTS c_invoker_unaudited CASCADE;
DROP SCHEMA IF EXISTS c_invoker_hidden CASCADE;
CREATE SCHEMA c_invoker_unaudited;
CREATE SCHEMA c_invoker_hidden;

DO $$ BEGIN
  CREATE ROLE c_invoker_unaudited_owner NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA c_invoker_unaudited TO corpus_anon, corpus_user, c_invoker_unaudited_owner;

CREATE TABLE c_invoker_hidden.credentials (
  id bigserial PRIMARY KEY,
  subject text NOT NULL,
  secret text NOT NULL
);
ALTER TABLE c_invoker_hidden.credentials OWNER TO c_invoker_unaudited_owner;

CREATE TABLE c_invoker_unaudited.sessions (
  id bigserial PRIMARY KEY,
  subject text NOT NULL
);
ALTER TABLE c_invoker_unaudited.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sessions_own ON c_invoker_unaudited.sessions
  FOR SELECT TO corpus_user
  USING (subject = (SELECT current_setting('app.subject', true)));
CREATE INDEX sessions_subject_idx ON c_invoker_unaudited.sessions (subject);
GRANT SELECT ON c_invoker_unaudited.sessions TO corpus_user;

-- The same cross-schema shape as case 37, with `security_invoker`. The view
-- confers nothing: corpus_anon reads the hidden table only if it holds its own
-- grant on it (it does not, and it has no USAGE on the schema either), so
-- there is no reach to report and L14 must stay silent. An out-of-scope
-- *reference* is not a finding; an out-of-scope *reach* is.
CREATE VIEW c_invoker_unaudited.subject_directory WITH (security_invoker = true) AS
  SELECT subject FROM c_invoker_hidden.credentials;
ALTER VIEW c_invoker_unaudited.subject_directory OWNER TO c_invoker_unaudited_owner;
GRANT SELECT ON c_invoker_unaudited.subject_directory TO corpus_anon, corpus_user;
