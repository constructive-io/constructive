DROP SCHEMA IF EXISTS c_policy_cast_indexed CASCADE;
CREATE SCHEMA c_policy_cast_indexed;
GRANT USAGE ON SCHEMA c_policy_cast_indexed TO corpus_user, corpus_anon;

CREATE TABLE c_policy_cast_indexed.accounts (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  email text
);
-- The expression index X3 asks for: it serves the cast comparison below,
-- which a plain index on tenant_id could not.
CREATE INDEX accounts_tenant_text_idx ON c_policy_cast_indexed.accounts ((tenant_id::text));
ALTER TABLE c_policy_cast_indexed.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_policy_cast_indexed.accounts FORCE ROW LEVEL SECURITY;

CREATE POLICY accounts_tenant ON c_policy_cast_indexed.accounts FOR SELECT TO corpus_user
  USING (tenant_id::text = (SELECT current_setting('jwt.claims.tenant_id', true)));

GRANT SELECT ON c_policy_cast_indexed.accounts TO corpus_user;
