DROP SCHEMA IF EXISTS c_index_not_redundant CASCADE;
CREATE SCHEMA c_index_not_redundant;
GRANT USAGE ON SCHEMA c_index_not_redundant TO corpus_user, corpus_anon;

CREATE TABLE c_index_not_redundant.shipments (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  region text NOT NULL
);
-- Neither index covers the other: tenant_id leads the first and trails the
-- second, so only the first can serve a lookup by tenant alone.
CREATE INDEX shipments_tenant_idx ON c_index_not_redundant.shipments (tenant_id);
CREATE INDEX shipments_region_tenant_idx ON c_index_not_redundant.shipments (region, tenant_id);

GRANT SELECT ON c_index_not_redundant.shipments TO corpus_user;
