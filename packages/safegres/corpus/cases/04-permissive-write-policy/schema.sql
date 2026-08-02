DROP SCHEMA IF EXISTS c_permissive_write CASCADE;
CREATE SCHEMA c_permissive_write;
GRANT USAGE ON SCHEMA c_permissive_write TO corpus_user, corpus_anon;

CREATE TABLE c_permissive_write.documents (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  body text
);
CREATE INDEX documents_tenant_idx ON c_permissive_write.documents (tenant_id);
ALTER TABLE c_permissive_write.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_permissive_write.documents FORCE ROW LEVEL SECURITY;

-- The flaw: a permissive FOR ALL policy whose body is the literal `true`.
-- Permissive policies OR together, so this defeats every scoped policy below.
CREATE POLICY documents_all ON c_permissive_write.documents FOR ALL TO corpus_user
  USING (true) WITH CHECK (true);
CREATE POLICY documents_tenant ON c_permissive_write.documents FOR SELECT TO corpus_user
  USING (tenant_id = (SELECT nullif(current_setting('jwt.claims.tenant_id', true), '')::uuid));

GRANT SELECT, INSERT, UPDATE, DELETE ON c_permissive_write.documents TO corpus_user;
