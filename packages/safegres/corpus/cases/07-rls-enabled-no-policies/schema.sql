DROP SCHEMA IF EXISTS c_rls_no_policies CASCADE;
CREATE SCHEMA c_rls_no_policies;
GRANT USAGE ON SCHEMA c_rls_no_policies TO corpus_user, corpus_anon;

CREATE TABLE c_rls_no_policies.settings (
  id bigserial PRIMARY KEY,
  key text NOT NULL,
  value text
);
-- The flaw (or the intent — the finding is fail-closed): RLS is on and no
-- policy exists, so every query returns zero rows for every non-owner.
ALTER TABLE c_rls_no_policies.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_rls_no_policies.settings FORCE ROW LEVEL SECURITY;
GRANT SELECT ON c_rls_no_policies.settings TO corpus_user;
