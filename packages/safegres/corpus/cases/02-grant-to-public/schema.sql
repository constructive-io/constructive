DROP SCHEMA IF EXISTS c_public_grant CASCADE;
CREATE SCHEMA c_public_grant;
GRANT USAGE ON SCHEMA c_public_grant TO corpus_user, corpus_anon;

CREATE TABLE c_public_grant.invoices (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  total numeric NOT NULL
);
CREATE INDEX invoices_tenant_idx ON c_public_grant.invoices (tenant_id);
ALTER TABLE c_public_grant.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_public_grant.invoices FORCE ROW LEVEL SECURITY;

CREATE POLICY invoices_tenant ON c_public_grant.invoices
  USING (tenant_id = (SELECT nullif(current_setting('jwt.claims.tenant_id', true), '')::uuid));

-- The flaw: PUBLIC is every role that exists and every role that ever will.
GRANT SELECT ON c_public_grant.invoices TO PUBLIC;
