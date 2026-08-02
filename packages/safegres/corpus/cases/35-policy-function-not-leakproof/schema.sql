DROP SCHEMA IF EXISTS c_policy_fn_leaky CASCADE;
CREATE SCHEMA c_policy_fn_leaky;
GRANT USAGE ON SCHEMA c_policy_fn_leaky TO corpus_user, corpus_anon;

-- IMMUTABLE, so this is not the per-row-evaluation flaw of case 20: the only
-- thing wrong with it is that nothing has promised it doesn't leak its
-- argument, and the planner takes that promise seriously.
CREATE FUNCTION c_policy_fn_leaky.tenant_of(claim text) RETURNS uuid
  LANGUAGE sql IMMUTABLE AS $$
    SELECT nullif(claim, '')::uuid
  $$;

CREATE TABLE c_policy_fn_leaky.invoices (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  amount numeric
);
CREATE INDEX invoices_tenant_idx ON c_policy_fn_leaky.invoices (tenant_id);
ALTER TABLE c_policy_fn_leaky.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_policy_fn_leaky.invoices FORCE ROW LEVEL SECURITY;

-- Hoisted into an InitPlan and comparing an indexed column: everything else
-- about this predicate is right. The flaw is the missing LEAKPROOF.
CREATE POLICY invoices_tenant ON c_policy_fn_leaky.invoices FOR SELECT TO corpus_user
  USING (tenant_id = (SELECT c_policy_fn_leaky.tenant_of(current_setting('jwt.claims.tenant_id', true))));

GRANT SELECT ON c_policy_fn_leaky.invoices TO corpus_user;
