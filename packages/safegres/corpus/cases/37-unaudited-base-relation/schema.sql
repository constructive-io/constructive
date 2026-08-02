DROP SCHEMA IF EXISTS c_unaudited_view CASCADE;
DROP SCHEMA IF EXISTS c_unaudited_hidden CASCADE;
CREATE SCHEMA c_unaudited_view;
CREATE SCHEMA c_unaudited_hidden;

DO $$ BEGIN
  CREATE ROLE c_unaudited_owner NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA c_unaudited_view TO corpus_anon, corpus_user, c_unaudited_owner;

-- Deliberately *not* in the case's exposure surface, so the audit never
-- introspects it: no ACL, no policy and no owner of this table is ever read.
CREATE TABLE c_unaudited_hidden.credentials (
  id bigserial PRIMARY KEY,
  subject text NOT NULL,
  secret text NOT NULL
);
ALTER TABLE c_unaudited_hidden.credentials OWNER TO c_unaudited_owner;
ALTER TABLE c_unaudited_hidden.credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_unaudited_hidden.credentials FORCE ROW LEVEL SECURITY;

-- A table in scope, so the case has an audited surface of its own and the
-- finding below is clearly about the *other* schema.
CREATE TABLE c_unaudited_view.sessions (
  id bigserial PRIMARY KEY,
  subject text NOT NULL
);
ALTER TABLE c_unaudited_view.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_unaudited_view.sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY sessions_own ON c_unaudited_view.sessions
  FOR SELECT TO corpus_user
  USING (subject = (SELECT current_setting('app.subject', true)));
CREATE INDEX sessions_subject_idx ON c_unaudited_view.sessions (subject);
GRANT SELECT ON c_unaudited_view.sessions TO corpus_user;

-- The flaw: the view is in scope and its body names a relation that is not.
-- It executes as its owner, so corpus_anon reads a table the audit never
-- graded — every rule that needs the base relation's ACL or policies drops
-- the edge, and the view scans clean.
CREATE VIEW c_unaudited_view.subject_directory AS
  SELECT subject FROM c_unaudited_hidden.credentials;
ALTER VIEW c_unaudited_view.subject_directory OWNER TO c_unaudited_owner;
GRANT SELECT ON c_unaudited_view.subject_directory TO corpus_anon, corpus_user;
