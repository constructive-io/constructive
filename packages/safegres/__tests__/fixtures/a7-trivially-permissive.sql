-- A7 seed: permissive policy whose body is the literal `true` —
-- effectively "RLS enabled, nothing gated" ⇒ fail-open.
-- Expected finding: A7 (high)

CREATE SCHEMA IF NOT EXISTS fx_a7;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fx_a7_reader') THEN
    CREATE ROLE fx_a7_reader;
  END IF;
END $$;

CREATE TABLE fx_a7.posts (
  id bigserial PRIMARY KEY,
  body text
);

ALTER TABLE fx_a7.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fx_a7.posts FORCE ROW LEVEL SECURITY;

CREATE POLICY fx_a7_open ON fx_a7.posts FOR SELECT TO fx_a7_reader USING (true);

GRANT USAGE ON SCHEMA fx_a7 TO fx_a7_reader;
GRANT SELECT ON fx_a7.posts TO fx_a7_reader;
