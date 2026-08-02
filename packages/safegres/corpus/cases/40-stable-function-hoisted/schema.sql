DROP SCHEMA IF EXISTS c_stable_hoisted CASCADE;
CREATE SCHEMA c_stable_hoisted;
GRANT USAGE ON SCHEMA c_stable_hoisted TO corpus_user, corpus_anon;

-- LEAKPROOF as well as STABLE: reading a GUC and casting it tells a caller
-- nothing about any row, and without the marking X4 would fire here on top of
-- the X9 this case is about.
CREATE FUNCTION c_stable_hoisted.current_tenant() RETURNS uuid
  LANGUAGE sql STABLE LEAKPROOF AS $$
    SELECT nullif(current_setting('jwt.claims.tenant_id', true), '')::uuid
  $$;

CREATE TABLE c_stable_hoisted.ledger (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  amount numeric
);
CREATE INDEX ledger_tenant_idx ON c_stable_hoisted.ledger (tenant_id);
ALTER TABLE c_stable_hoisted.ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_stable_hoisted.ledger FORCE ROW LEVEL SECURITY;

CREATE POLICY ledger_tenant ON c_stable_hoisted.ledger FOR SELECT TO corpus_user
  USING (tenant_id = (SELECT c_stable_hoisted.current_tenant()));

GRANT SELECT ON c_stable_hoisted.ledger TO corpus_user;
