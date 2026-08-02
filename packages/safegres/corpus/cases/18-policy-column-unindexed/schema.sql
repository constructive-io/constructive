DROP SCHEMA IF EXISTS c_policy_unindexed CASCADE;
CREATE SCHEMA c_policy_unindexed;
GRANT USAGE ON SCHEMA c_policy_unindexed TO corpus_user, corpus_anon;

CREATE FUNCTION c_policy_unindexed.current_tenant() RETURNS uuid
  LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('jwt.claims.tenant_id', true), '')::uuid
  $$;

CREATE TABLE c_policy_unindexed.documents (
  id bigserial PRIMARY KEY,
  -- The flaw: every query against this table carries the policy's
  -- tenant_id predicate, and no index leads with tenant_id.
  tenant_id uuid NOT NULL,
  title text
);
ALTER TABLE c_policy_unindexed.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_policy_unindexed.documents FORCE ROW LEVEL SECURITY;

CREATE POLICY documents_tenant ON c_policy_unindexed.documents FOR SELECT TO corpus_user
  USING (tenant_id = (SELECT c_policy_unindexed.current_tenant()));

GRANT SELECT ON c_policy_unindexed.documents TO corpus_user;
