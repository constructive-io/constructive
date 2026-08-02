DROP SCHEMA IF EXISTS c_public_read_policy CASCADE;
CREATE SCHEMA c_public_read_policy;
GRANT USAGE ON SCHEMA c_public_read_policy TO corpus_user, corpus_anon;

CREATE TABLE c_public_read_policy.profiles (
  id bigserial PRIMARY KEY,
  email text NOT NULL,
  display_name text
);
ALTER TABLE c_public_read_policy.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_public_read_policy.profiles FORCE ROW LEVEL SECURITY;

-- The flaw: every row is world-readable, including the email column.
CREATE POLICY profiles_read ON c_public_read_policy.profiles FOR SELECT TO corpus_anon USING (true);

GRANT SELECT ON c_public_read_policy.profiles TO corpus_anon;
