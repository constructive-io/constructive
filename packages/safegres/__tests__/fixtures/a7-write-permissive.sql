-- A7 seed: permissive WRITE policy whose body is the literal `true` —
-- every applicable role can mutate every row, and because permissive
-- policies OR together it defeats any scoped policies on the table.
-- Expected finding: A7 (critical, fail-open)

CREATE SCHEMA IF NOT EXISTS fx_a7w;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fx_a7w_writer') THEN
    CREATE ROLE fx_a7w_writer;
  END IF;
END $$;

CREATE TABLE fx_a7w.actions (
  id bigserial PRIMARY KEY,
  payload text
);

ALTER TABLE fx_a7w.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fx_a7w.actions FORCE ROW LEVEL SECURITY;

CREATE POLICY fx_a7w_open_write ON fx_a7w.actions FOR INSERT TO fx_a7w_writer WITH CHECK (true);

GRANT USAGE ON SCHEMA fx_a7w TO fx_a7w_writer;
GRANT INSERT ON fx_a7w.actions TO fx_a7w_writer;
