DROP SCHEMA IF EXISTS c_stable_per_row CASCADE;
CREATE SCHEMA c_stable_per_row;
GRANT USAGE ON SCHEMA c_stable_per_row TO corpus_user, corpus_anon;

CREATE FUNCTION c_stable_per_row.current_tenant() RETURNS uuid
  LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('jwt.claims.tenant_id', true), '')::uuid
  $$;

CREATE TABLE c_stable_per_row.ledger (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  amount numeric
);
CREATE INDEX ledger_tenant_idx ON c_stable_per_row.ledger (tenant_id);
ALTER TABLE c_stable_per_row.ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_stable_per_row.ledger FORCE ROW LEVEL SECURITY;

-- The flaw: the call is row-independent but not wrapped in a scalar
-- sub-select, so the planner re-evaluates it per row instead of hoisting it
-- into an InitPlan. Same predicate, one extra pair of parentheses apart.
CREATE POLICY ledger_tenant ON c_stable_per_row.ledger FOR SELECT TO corpus_user
  USING (tenant_id = c_stable_per_row.current_tenant());

GRANT SELECT ON c_stable_per_row.ledger TO corpus_user;
