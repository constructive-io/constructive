-- Scenario: a well-designed RLS app schema. Should score near-perfect under
-- every preset. Each table has RLS enabled + forced, permissive policies
-- scoped to a trusted role covering exactly the granted verbs, WITH CHECK on
-- writes, and no untrusted-role or PUBLIC grants. Policies use a JWT claim
-- (not current_user/session_user) so P5 stays quiet.

CREATE SCHEMA IF NOT EXISTS eval_secure;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eval_secure_user') THEN
    CREATE ROLE eval_secure_user NOLOGIN;
  END IF;
END $$;

CREATE TABLE eval_secure.documents (
  id bigserial PRIMARY KEY,
  owner text NOT NULL,
  body text
);

ALTER TABLE eval_secure.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_secure.documents FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON eval_secure.documents TO eval_secure_user;

CREATE POLICY sel ON eval_secure.documents FOR SELECT TO eval_secure_user
  USING (owner = current_setting('jwt.claims.user_id', true));
CREATE POLICY ins ON eval_secure.documents FOR INSERT TO eval_secure_user
  WITH CHECK (owner = current_setting('jwt.claims.user_id', true));
CREATE POLICY upd ON eval_secure.documents FOR UPDATE TO eval_secure_user
  USING (owner = current_setting('jwt.claims.user_id', true))
  WITH CHECK (owner = current_setting('jwt.claims.user_id', true));
CREATE POLICY del ON eval_secure.documents FOR DELETE TO eval_secure_user
  USING (owner = current_setting('jwt.claims.user_id', true));
