DROP SCHEMA IF EXISTS c_owner_bypass CASCADE;
CREATE SCHEMA c_owner_bypass;
GRANT USAGE ON SCHEMA c_owner_bypass TO corpus_user, corpus_anon;

CREATE TABLE c_owner_bypass.secrets (
  id bigserial PRIMARY KEY,
  owner_id uuid NOT NULL,
  token text NOT NULL
);
CREATE INDEX secrets_owner_idx ON c_owner_bypass.secrets (owner_id);
-- The flaw: RLS is enabled but not FORCEd, so the table owner — and anything
-- running as it, including a SECURITY DEFINER function — bypasses every policy.
ALTER TABLE c_owner_bypass.secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY secrets_owner ON c_owner_bypass.secrets FOR SELECT TO corpus_user
  USING (owner_id = (SELECT nullif(current_setting('jwt.claims.user_id', true), '')::uuid));

GRANT SELECT ON c_owner_bypass.secrets TO corpus_user;
