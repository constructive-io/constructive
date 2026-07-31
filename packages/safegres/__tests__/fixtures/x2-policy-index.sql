-- Policy-aware perf fixtures: X2 (unindexed policy column), X3 (cast/function
-- on a policy column), X4 (non-LEAKPROOF function in a policy).
DROP SCHEMA IF EXISTS fx_x2 CASCADE;
CREATE SCHEMA fx_x2;

CREATE FUNCTION fx_x2.current_tenant() RETURNS uuid AS $$
  SELECT nullif(current_setting('jwt.claims.tenant_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

-- Not marked LEAKPROOF: X4 fodder.
CREATE FUNCTION fx_x2.is_member(tenant uuid) RETURNS boolean AS $$
  SELECT tenant IS NOT NULL;
$$ LANGUAGE sql STABLE;

CREATE FUNCTION fx_x2.is_admin() RETURNS boolean AS $$
  SELECT true;
$$ LANGUAGE sql STABLE LEAKPROOF;

-- X2: policy filters on tenant_id, which has no index at all.
CREATE TABLE fx_x2.documents (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  title text NOT NULL
);
ALTER TABLE fx_x2.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY documents_tenant ON fx_x2.documents
  USING (tenant_id = fx_x2.current_tenant());

-- No X2: same shape, but the policy column leads an index.
CREATE TABLE fx_x2.invoices (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  total numeric NOT NULL
);
CREATE INDEX invoices_tenant_idx ON fx_x2.invoices (tenant_id, total);
ALTER TABLE fx_x2.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoices_tenant ON fx_x2.invoices
  USING (tenant_id = fx_x2.current_tenant());

-- No X2: the policy column is only a trailing index column, so the index
-- cannot serve the security qual on its own.
CREATE TABLE fx_x2.receipts (
  id uuid PRIMARY KEY,
  kind text NOT NULL,
  tenant_id uuid NOT NULL
);
CREATE INDEX receipts_kind_tenant_idx ON fx_x2.receipts (kind, tenant_id);
ALTER TABLE fx_x2.receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY receipts_tenant ON fx_x2.receipts
  USING (tenant_id = fx_x2.current_tenant());

-- X3: the policy casts its own column, so the plain b-tree index is unusable.
CREATE TABLE fx_x2.accounts (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  email text NOT NULL
);
CREATE INDEX accounts_tenant_idx ON fx_x2.accounts (tenant_id);
ALTER TABLE fx_x2.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY accounts_tenant ON fx_x2.accounts
  USING (tenant_id::text = current_setting('jwt.claims.tenant_id', true));

-- No X3: lower(email) is backed by a matching expression index.
CREATE TABLE fx_x2.contacts (
  id uuid PRIMARY KEY,
  email text NOT NULL
);
CREATE INDEX contacts_email_lower_idx ON fx_x2.contacts (lower(email));
ALTER TABLE fx_x2.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY contacts_email ON fx_x2.contacts
  USING (lower(email) = current_setting('jwt.claims.email', true));

-- X4: policy calls a non-LEAKPROOF user function. fx_x2.is_admin() is
-- LEAKPROOF and must not be flagged.
CREATE TABLE fx_x2.memberships (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL
);
CREATE INDEX memberships_tenant_idx ON fx_x2.memberships (tenant_id);
ALTER TABLE fx_x2.memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY memberships_member ON fx_x2.memberships
  USING (fx_x2.is_member(tenant_id) OR fx_x2.is_admin());
