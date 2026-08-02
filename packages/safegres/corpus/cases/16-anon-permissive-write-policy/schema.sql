DROP SCHEMA IF EXISTS c_anon_permissive_write CASCADE;
CREATE SCHEMA c_anon_permissive_write;
GRANT USAGE ON SCHEMA c_anon_permissive_write TO corpus_user, corpus_anon;

CREATE TABLE c_anon_permissive_write.signups (
  id bigserial PRIMARY KEY,
  email text NOT NULL,
  approved boolean NOT NULL DEFAULT false
);
ALTER TABLE c_anon_permissive_write.signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_anon_permissive_write.signups FORCE ROW LEVEL SECURITY;

-- The flaw: the open write policy applies to the *anonymous* role. Accepting
-- an anonymous signup row is fine; accepting `approved = true` is not.
CREATE POLICY signups_insert ON c_anon_permissive_write.signups FOR INSERT TO corpus_anon WITH CHECK (true);

GRANT INSERT ON c_anon_permissive_write.signups TO corpus_anon;
