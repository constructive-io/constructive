DROP SCHEMA IF EXISTS c_anon_set_role_escalation CASCADE;
CREATE SCHEMA c_anon_set_role_escalation;

-- A privileged role the anonymous role is not meant to *be*, but can *become*.
DO $$ BEGIN
  CREATE ROLE c_priv_role NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA c_anon_set_role_escalation TO corpus_anon, corpus_user, c_priv_role;

-- The flaw: corpus_anon inherits *nothing* from c_priv_role (INHERIT FALSE), so
-- every passive-grant check sees an anonymous role that holds no privileges on
-- the table below. But SET TRUE lets it `SET ROLE c_priv_role` on demand and
-- execute with that role's grants — an escalation invisible to A2/R1/L5.
GRANT c_priv_role TO corpus_anon WITH INHERIT FALSE, SET TRUE;

CREATE TABLE c_anon_set_role_escalation.secrets (
  id bigserial PRIMARY KEY,
  is_public boolean NOT NULL DEFAULT false,
  detail text
);
ALTER TABLE c_anon_set_role_escalation.secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_anon_set_role_escalation.secrets FORCE ROW LEVEL SECURITY;

-- A properly scoped table for the role that owns the access: c_priv_role can
-- read, corpus_anon cannot — unless it assumes c_priv_role.
CREATE POLICY secrets_read ON c_anon_set_role_escalation.secrets
  FOR SELECT TO c_priv_role USING (is_public);
GRANT SELECT ON c_anon_set_role_escalation.secrets TO c_priv_role;
