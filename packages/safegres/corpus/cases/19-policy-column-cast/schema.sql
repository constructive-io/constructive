DROP SCHEMA IF EXISTS c_policy_cast CASCADE;
CREATE SCHEMA c_policy_cast;
GRANT USAGE ON SCHEMA c_policy_cast TO corpus_user, corpus_anon;

CREATE TABLE c_policy_cast.accounts (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  email text
);
CREATE INDEX accounts_tenant_idx ON c_policy_cast.accounts (tenant_id);
ALTER TABLE c_policy_cast.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_policy_cast.accounts FORCE ROW LEVEL SECURITY;

-- The flaw: casting the *column* (rather than the parameter) makes the
-- b-tree index above unusable. The index exists and is never chosen.
CREATE POLICY accounts_tenant ON c_policy_cast.accounts FOR SELECT TO corpus_user
  USING (tenant_id::text = current_setting('jwt.claims.tenant_id', true));

GRANT SELECT ON c_policy_cast.accounts TO corpus_user;
