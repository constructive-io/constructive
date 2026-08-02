DROP SCHEMA IF EXISTS c_dead_policy CASCADE;
CREATE SCHEMA c_dead_policy;
GRANT USAGE ON SCHEMA c_dead_policy TO corpus_user, corpus_anon;

CREATE TABLE c_dead_policy.drafts (
  id bigserial PRIMARY KEY,
  owner_id uuid NOT NULL
);
CREATE INDEX drafts_owner_idx ON c_dead_policy.drafts (owner_id);
ALTER TABLE c_dead_policy.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_dead_policy.drafts FORCE ROW LEVEL SECURITY;

-- The flaw: the policy names a role that holds no grant on the table, so it
-- can never admit a row. Usually a rename that only got applied on one side.
CREATE POLICY drafts_owner ON c_dead_policy.drafts FOR SELECT TO corpus_anon
  USING (owner_id = (SELECT nullif(current_setting('jwt.claims.user_id', true), '')::uuid));

GRANT SELECT ON c_dead_policy.drafts TO corpus_user;
