DROP SCHEMA IF EXISTS c_definer_wrapper CASCADE;
CREATE SCHEMA c_definer_wrapper;
GRANT USAGE ON SCHEMA c_definer_wrapper TO corpus_user, corpus_anon;

CREATE FUNCTION c_definer_wrapper.is_member(tenant uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT tenant IS NOT NULL $$;

CREATE TABLE c_definer_wrapper.memberships (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL
);
CREATE INDEX memberships_tenant_idx ON c_definer_wrapper.memberships (tenant_id);
ALTER TABLE c_definer_wrapper.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_definer_wrapper.memberships FORCE ROW LEVEL SECURITY;

-- The flaw: a SECURITY DEFINER function is a plan fence — it cannot be
-- inlined, so the qual never reaches the index.
CREATE POLICY memberships_member ON c_definer_wrapper.memberships FOR SELECT TO corpus_user
  USING (c_definer_wrapper.is_member(tenant_id));

GRANT SELECT ON c_definer_wrapper.memberships TO corpus_user;
