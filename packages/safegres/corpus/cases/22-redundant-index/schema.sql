DROP SCHEMA IF EXISTS c_redundant_index CASCADE;
CREATE SCHEMA c_redundant_index;
GRANT USAGE ON SCHEMA c_redundant_index TO corpus_user, corpus_anon;

CREATE TABLE c_redundant_index.shipments (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  status text NOT NULL
);

-- The flaw: the first index is a leading-column prefix of the second, so it
-- serves no query the second cannot — it only costs write throughput.
CREATE INDEX shipments_tenant_idx ON c_redundant_index.shipments (tenant_id);
CREATE INDEX shipments_tenant_status_idx ON c_redundant_index.shipments (tenant_id, status);

GRANT SELECT ON c_redundant_index.shipments TO corpus_user;
