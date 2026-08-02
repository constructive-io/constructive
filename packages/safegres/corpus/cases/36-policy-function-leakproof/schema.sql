DROP SCHEMA IF EXISTS c_policy_fn_leakproof CASCADE;
CREATE SCHEMA c_policy_fn_leakproof;
GRANT USAGE ON SCHEMA c_policy_fn_leakproof TO corpus_user, corpus_anon;

CREATE FUNCTION c_policy_fn_leakproof.tenant_of(claim text) RETURNS uuid
  LANGUAGE sql IMMUTABLE LEAKPROOF AS $$
    SELECT nullif(claim, '')::uuid
  $$;

CREATE TABLE c_policy_fn_leakproof.invoices (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  amount numeric
);
CREATE INDEX invoices_tenant_idx ON c_policy_fn_leakproof.invoices (tenant_id);
ALTER TABLE c_policy_fn_leakproof.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_policy_fn_leakproof.invoices FORCE ROW LEVEL SECURITY;

CREATE POLICY invoices_tenant ON c_policy_fn_leakproof.invoices FOR SELECT TO corpus_user
  USING (tenant_id = (SELECT c_policy_fn_leakproof.tenant_of(current_setting('jwt.claims.tenant_id', true))));

GRANT SELECT ON c_policy_fn_leakproof.invoices TO corpus_user;
