-- X9: a STABLE, row-independent call in a policy qual that the planner will
-- re-evaluate per row because it is not wrapped in a scalar sub-select.
DROP SCHEMA IF EXISTS fx_x9 CASCADE;
CREATE SCHEMA fx_x9;

CREATE FUNCTION fx_x9.current_tenant() RETURNS uuid AS $$
  SELECT nullif(current_setting('jwt.claims.tenant_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

-- Row-dependent: the argument references a column, so there is nothing to hoist.
CREATE FUNCTION fx_x9.owns(row_tenant uuid) RETURNS boolean AS $$
  SELECT row_tenant IS NOT NULL;
$$ LANGUAGE sql STABLE;

-- Volatile: per-row evaluation is its defined behaviour (P1's business, not X9's).
CREATE FUNCTION fx_x9.roll() RETURNS uuid AS $$
  SELECT gen_random_uuid();
$$ LANGUAGE sql VOLATILE;

-- Immutable: folded at plan time, never flagged.
CREATE FUNCTION fx_x9.zero() RETURNS uuid AS $$
  SELECT '00000000-0000-0000-0000-000000000000'::uuid;
$$ LANGUAGE sql IMMUTABLE;

CREATE TABLE fx_x9.tenants (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL
);
CREATE INDEX tenants_tenant_idx ON fx_x9.tenants (tenant_id);

-- X9: bare call, evaluated per row.
CREATE TABLE fx_x9.bare (LIKE fx_x9.tenants INCLUDING ALL);
ALTER TABLE fx_x9.bare ENABLE ROW LEVEL SECURITY;
CREATE POLICY bare_tenant ON fx_x9.bare
  USING (tenant_id = fx_x9.current_tenant());

-- No X9: already wrapped in an uncorrelated scalar sub-select (InitPlan).
CREATE TABLE fx_x9.hoisted (LIKE fx_x9.tenants INCLUDING ALL);
ALTER TABLE fx_x9.hoisted ENABLE ROW LEVEL SECURITY;
CREATE POLICY hoisted_tenant ON fx_x9.hoisted
  USING (tenant_id = (SELECT fx_x9.current_tenant()));

-- X9: inside an EXISTS sub-select. That subquery is correlated with the outer
-- row, so it runs per row and takes the unhoisted call with it.
CREATE TABLE fx_x9.correlated (LIKE fx_x9.tenants INCLUDING ALL);
ALTER TABLE fx_x9.correlated ENABLE ROW LEVEL SECURITY;
CREATE POLICY correlated_tenant ON fx_x9.correlated
  USING (EXISTS (
    SELECT 1 FROM fx_x9.tenants t
    WHERE t.id = correlated.id AND t.tenant_id = fx_x9.current_tenant()
  ));

-- No X9: the argument references a column, so the call cannot be hoisted.
CREATE TABLE fx_x9.row_dependent (LIKE fx_x9.tenants INCLUDING ALL);
ALTER TABLE fx_x9.row_dependent ENABLE ROW LEVEL SECURITY;
CREATE POLICY row_dependent_tenant ON fx_x9.row_dependent
  USING (fx_x9.owns(tenant_id));

-- No X9: VOLATILE and IMMUTABLE calls are both out of scope.
CREATE TABLE fx_x9.other_volatility (LIKE fx_x9.tenants INCLUDING ALL);
ALTER TABLE fx_x9.other_volatility ENABLE ROW LEVEL SECURITY;
CREATE POLICY other_volatility_tenant ON fx_x9.other_volatility
  USING (tenant_id = fx_x9.roll() OR tenant_id = fx_x9.zero());

-- X9: current_setting() is STABLE too — dropping the wrapper does not fix it.
CREATE TABLE fx_x9.raw_guc (
  id uuid PRIMARY KEY,
  tenant_name text NOT NULL
);
ALTER TABLE fx_x9.raw_guc ENABLE ROW LEVEL SECURITY;
CREATE POLICY raw_guc_tenant ON fx_x9.raw_guc
  USING (tenant_name = current_setting('jwt.claims.tenant', true));

-- X9 on WITH CHECK as well as USING.
CREATE TABLE fx_x9.writes (LIKE fx_x9.tenants INCLUDING ALL);
ALTER TABLE fx_x9.writes ENABLE ROW LEVEL SECURITY;
CREATE POLICY writes_tenant ON fx_x9.writes FOR INSERT
  WITH CHECK (tenant_id = fx_x9.current_tenant());
