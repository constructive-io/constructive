DROP SCHEMA IF EXISTS c_session_user CASCADE;
CREATE SCHEMA c_session_user;
GRANT USAGE ON SCHEMA c_session_user TO corpus_user, corpus_anon;

CREATE TABLE c_session_user.reports (
  id bigserial PRIMARY KEY,
  owner_name name NOT NULL,
  body text
);
ALTER TABLE c_session_user.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_session_user.reports FORCE ROW LEVEL SECURITY;

-- The flaw: identity is taken from the *database* role, but every API request
-- arrives as the same role. current_user is a constant here, not a user.
CREATE POLICY reports_owner ON c_session_user.reports FOR SELECT TO corpus_user
  USING (owner_name = current_user);

GRANT SELECT ON c_session_user.reports TO corpus_user;
